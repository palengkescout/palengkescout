import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import AuthModal from "../components/AuthModal";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  openAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  openAuthModal: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, openAuthModal: () => setModalOpen(true) }}>
      {children}
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}