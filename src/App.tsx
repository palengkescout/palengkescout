import { Route, Routes, useLocation } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import BottomNav from "./components/BottomNav";
import HomeScreen from "./screens/HomeScreen";
import ItemPricesScreen from "./screens/ItemPricesScreen";
import ReportScreen from "./screens/ReportScreen";
import ProfileScreen from "./screens/ProfileScreen";
import PlaceholderScreen from "./screens/PlaceholderScreen";
import { AuthProvider } from "./lib/authContext";

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="h-dvh flex flex-col bg-cream max-w-[480px] mx-auto shadow-2xl overflow-hidden">
        <div className="flex-1 min-h-0">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/item/:itemId" element={<ItemPricesScreen />} />
            <Route path="/report" element={<ReportScreen />} />
            <Route
              path="/list"
              element={
                <PlaceholderScreen
                  title="My List"
                  subtitle="Compare a full basket across markets."
                  icon={ClipboardList}
                  comingIn="Build a shopping list and see which market is cheapest overall — arriving in Phase 4."
                />
              }
            />
            <Route path="/profile" element={<ProfileScreen />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}