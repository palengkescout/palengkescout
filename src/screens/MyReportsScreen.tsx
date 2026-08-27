import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, Pencil, Trash2, X, Check, TriangleAlert, Award } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { listMyReports, updateMyReport, deleteMyReport } from "../lib/dataClient";
import { getItemEmoji } from "../lib/categoryIcons";
import { formatPeso } from "../lib/format";
import EmptyState from "../components/EmptyState";
import type { MyReportRow, PriceStatus } from "../types";

const STATUS_STYLES: Record<PriceStatus, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-fresh-green/10 text-fresh-green" },
  pending: { label: "Unverified", className: "bg-ink-faint/10 text-ink-soft" },
  flagged: { label: "Flagged", className: "bg-fresh-red/10 text-fresh-red" },
};

export default function MyReportsScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [rows, setRows] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await listMyReports(user.id);
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setLoadError("Couldn't load your reports. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  function startEdit(row: MyReportRow) {
    setEditingId(row.id);
    setEditPrice(String(row.price));
    setEditError(null);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(row: MyReportRow) {
    if (!user) return;
    const newPrice = Number(editPrice);
    if (editPrice.trim() === "" || Number.isNaN(newPrice) || newPrice <= 0) {
      setEditError("Enter a valid price greater than ₱0.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const { report, verificationBonusAwarded } = await updateMyReport({ reportId: row.id, userId: user.id, newPrice });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, price: report.price, status: report.status } : r)));
      setEditingId(null);
      showToast(
        verificationBonusAwarded > 0
          ? `Price updated — now Verified! +${verificationBonusAwarded} bonus pts.`
          : `Price updated — now marked ${STATUS_STYLES[report.status].label}.`
      );
    } catch {
      setEditError("Couldn't save that change. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete(row: MyReportRow) {
    if (!user) return;
    setDeletingId(row.id);
    try {
      const { pointsClawedBack } = await deleteMyReport(row.id, user.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showToast(
        pointsClawedBack > 0
          ? `Report removed. −${pointsClawedBack} pts (it wasn't verified yet).`
          : "Report removed. Verified reports keep their points."
      );
    } catch {
      showToast("Couldn't delete that report. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="app-shell bg-cream">
        <header
          className="shrink-0 bg-palengke-green px-5 pt-3 pb-5 rounded-b-[28px] shadow-card"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 -ml-2 mb-2 flex items-center justify-center rounded-full active:bg-white/10"
          >
            <ArrowLeft size={20} className="text-white" strokeWidth={2.2} />
          </button>
          <h1 className="font-display text-white text-xl">My Reports</h1>
        </header>
        <div className="app-content flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-palengke-green/10 flex items-center justify-center mb-4">
            <LogIn size={26} className="text-palengke-green" strokeWidth={2} />
          </div>
          <p className="font-display text-lg text-ink mb-1.5">Log in to see your reports</p>
          <button
            onClick={openAuthModal}
            className="w-full py-3.5 rounded-pill bg-palengke-green text-white font-semibold text-[15px] min-h-[48px]"
          >
            Log in / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-cream">
      <header
        className="shrink-0 bg-palengke-green px-5 pt-3 pb-5 rounded-b-[28px] shadow-card"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 -ml-2 mb-2 flex items-center justify-center rounded-full active:bg-white/10"
        >
          <ArrowLeft size={20} className="text-white" strokeWidth={2.2} />
        </button>
        <h1 className="font-display text-white text-xl">My Reports</h1>
        <p className="text-cream/70 text-xs mt-0.5">Edit or remove prices you've reported.</p>
      </header>

      <div className="app-content px-5 pt-4 pb-8">
        {toast && (
          <div className="flex items-center gap-2 bg-ink text-white text-sm rounded-card px-4 py-3 mb-4">
            <Award size={15} className="shrink-0" strokeWidth={2.2} />
            <span>{toast}</span>
          </div>
        )}

        {loading || authLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[104px] rounded-card bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center text-center px-4 py-10">
            <TriangleAlert size={26} className="text-fresh-red mb-3" strokeWidth={2} />
            <p className="text-ink-soft text-sm mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-pill bg-palengke-green text-white font-semibold text-sm"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="Prices you report will show up here so you can edit or remove them anytime."
            actionLabel="Report a price"
            onAction={() => navigate("/report")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => {
              const isEditing = editingId === row.id;
              const isConfirmingDelete = confirmDeleteId === row.id;
              const isDeleting = deletingId === row.id;
              const status = STATUS_STYLES[row.status];

              return (
                <div key={row.id} className="bg-white rounded-card shadow-card p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-cream-soft flex items-center justify-center shrink-0">
                      <span className="text-lg leading-none" role="img" aria-label={row.item.name}>
                        {getItemEmoji(row.item.name, row.item.category)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink text-sm truncate">{row.item.name}</p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-pill shrink-0 ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-ink-faint text-xs mt-0.5 truncate">
                        {row.market.name} · {row.market.barangay}
                      </p>

                      {isEditing ? (
                        <div className="mt-2.5">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm">
                              ₱
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              autoFocus
                              className="w-full bg-cream-soft rounded-card pl-8 pr-3 py-2.5 text-[15px] outline-none min-h-[44px]"
                            />
                          </div>
                          {editError && (
                            <p role="alert" className="text-fresh-red text-xs mt-1.5">
                              {editError}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={() => saveEdit(row)}
                              disabled={savingEdit}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-pill bg-palengke-green text-white text-sm font-semibold min-h-[40px] disabled:opacity-50"
                            >
                              <Check size={15} strokeWidth={2.4} />
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-pill bg-cream-soft text-ink-soft text-sm font-semibold min-h-[40px]"
                            >
                              <X size={15} strokeWidth={2.4} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="mt-2.5">
                          <p className="text-ink-soft text-xs mb-2">
                            {row.status === "verified"
                              ? "Delete this report? Its points stay yours since it was already verified."
                              : "Delete this report? Any points it earned will be removed."}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmDelete(row)}
                              disabled={isDeleting}
                              className="flex-1 py-2 rounded-pill bg-fresh-red text-white text-sm font-semibold min-h-[40px] disabled:opacity-50"
                            >
                              {isDeleting ? "Deleting..." : "Yes, delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="flex-1 py-2 rounded-pill bg-cream-soft text-ink-soft text-sm font-semibold min-h-[40px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-display text-palengke-green text-lg">{formatPeso(row.price)}</p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(row)}
                              aria-label={`Edit ${row.item.name} report`}
                              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-cream-soft"
                            >
                              <Pencil size={15} className="text-ink-soft" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(row.id)}
                              aria-label={`Delete ${row.item.name} report`}
                              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-fresh-red/10"
                            >
                              <Trash2 size={15} className="text-fresh-red" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}