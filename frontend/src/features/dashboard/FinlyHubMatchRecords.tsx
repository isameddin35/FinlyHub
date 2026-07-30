import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reconciliationApi } from '@/api/reconciliation'

const CSS = `
.fhm-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhm-root *{ box-sizing:border-box; }

.fhm-header{ margin-bottom:24px; }
.fhm-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; }

.fhm-drop-row{ display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:22px; }
.fhm-dropzone{
  border:1.5px dashed #CBD5E1; border-radius:18px; padding:38px 20px; text-align:center;
  background:rgba(255,255,255,0.6); cursor:pointer; transition:border-color 0.2s ease, background 0.2s ease;
}
.fhm-dropzone:hover{ border-color:#2563EB; background:#EFF6FF; }
.fhm-dropzone .fhm-drop-icon{
  width:44px; height:44px; border-radius:13px; margin:0 auto 12px;
  display:flex; align-items:center; justify-content:center; background:rgba(37,99,235,0.09);
}
.fhm-dropzone .fhm-drop-icon svg{ width:21px; height:21px; stroke:#2563EB; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhm-dropzone .fhm-drop-title{ font-size:14px; font-weight:600; color:#1E293B; margin-bottom:3px; }
.fhm-dropzone .fhm-drop-sub{ font-size:12px; color:#94A3B8; }
.fhm-dropzone.fhm-filled{ border-style:solid; border-color:rgba(22,163,74,0.4); background:#ECFDF5; }
.fhm-dropzone.fhm-filled .fhm-drop-icon{ background:rgba(22,163,74,0.14); }
.fhm-dropzone.fhm-filled .fhm-drop-icon svg{ stroke:#16A34A; }

.fhm-panel{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  padding:24px 26px 22px; margin-bottom:22px;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 16px 34px -24px rgba(15,23,42,0.14);
}
.fhm-panel h3{ font-family:'Poppins', sans-serif; font-weight:600; font-size:15.5px; color:#0F172A; margin-bottom:18px; }

.fhm-form-row{ display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:16px; margin-bottom:18px; }
.fhm-field label{ display:block; font-size:12.5px; font-weight:600; color:#1E293B; margin-bottom:7px; }
.fhm-field input{
  width:100%; padding:10px 12px; border-radius:10px; border:1px solid #E2E8F0;
  font-family:'Inter', sans-serif; font-size:13.5px; color:#0F172A; outline:none;
  transition:border-color 0.2s ease, box-shadow 0.2s ease;
}
.fhm-field input:focus{ border-color:rgba(37,99,235,0.5); box-shadow:0 0 0 4px rgba(37,99,235,0.1); }

.fhm-start-btn{
  display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border-radius:11px; border:none;
  background:linear-gradient(120deg, #2563EB, #3B82F6 45%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(37,99,235,0.5); transition:transform 0.2s ease, opacity 0.2s ease;
}
.fhm-start-btn:disabled{ opacity:0.5; cursor:default; }
.fhm-start-btn:not(:disabled):hover{ transform:translateY(-1px); }
.fhm-start-btn svg{ width:15px; height:15px; stroke:#fff; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

.fhm-divider{ height:1px; background:#E2E8F0; margin:22px 0; }

.fhm-section-title{ font-family:'Poppins', sans-serif; font-weight:600; font-size:16px; color:#0F172A; margin-bottom:16px; }

.fhm-recon-card{
  padding:18px 20px; border-radius:16px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  max-width:420px;
}
.fhm-recon-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.fhm-recon-title{ font-size:14.5px; font-weight:700; color:#0F172A; }
.fhm-status-pill{ font-size:10px; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:3px 9px; border-radius:999px; background:#EFF6FF; color:#2563EB; }
.fhm-recon-range{ font-size:12.5px; color:#64748B; margin-bottom:3px; }
.fhm-recon-created{ font-size:11.5px; color:#94A3B8; }
.fhm-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhm-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhm-spin 0.6s linear infinite; }
@keyframes fhm-spin{ to{ transform:rotate(360deg); } }

.dark .fhm-panel{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhm-panel h3{ color:#F1F5F9; }
.dark .fhm-recon-card{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhm-recon-title{ color:#F1F5F9; }
.dark .fhm-recon-range{ color:#94A3B8; }
.dark .fhm-recon-created{ color:#64748B; }
.dark .fhm-dropzone{ border-color:#334155; background:rgba(15,23,42,0.6); }
.dark .fhm-dropzone:hover{ border-color:#3B82F6; background:rgba(37,99,235,0.08); }
.dark .fhm-dropzone .fhm-drop-title{ color:#E2E8F0; }
.dark .fhm-dropzone .fhm-drop-sub{ color:#94A3B8; }
.dark .fhm-field label{ color:#E2E8F0; }
.dark .fhm-field input{ background:#1E293B; border-color:#334155; color:#F1F5F9; }
.dark .fhm-section-title{ color:#F1F5F9; }
.dark .fhm-header h2{ color:#F1F5F9; }
`;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  IN_PROGRESS: { bg: '#EFF6FF', color: '#2563EB' },
  APPROVED: { bg: '#ECFDF5', color: '#16A34A' },
  REVIEW: { bg: '#FFF7ED', color: '#C2610A' },
  FAILED: { bg: '#FEF2F2', color: '#DC2626' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function FinlyHubMatchRecords() {
  const queryClient = useQueryClient()
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [acctFile, setAcctFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const canStart = bankFile && acctFile && title && periodStart && periodEnd;

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => {
      const res = await reconciliationApi.list()
      return res.data.data
    },
  })

  const matchMutation = useMutation({
    mutationFn: () => reconciliationApi.match(bankFile!, acctFile!, title, periodStart, periodEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      toast.success('Reconciliation started')
      setTitle(""); setPeriodStart(""); setPeriodEnd(""); setBankFile(null); setAcctFile(null);
    },
    onError: () => toast.error('Failed to start reconciliation'),
  })

  const startMatching = () => {
    if (!canStart) return
    matchMutation.mutate()
  };

  const statusStyle = (status: string) => STATUS_COLORS[status] || { bg: '#F1F5F9', color: '#64748B' };

  return (
    <div className="fhm-root">
      <style>{CSS}</style>
      <div className="fhm-header"><h2>Reconciliation</h2></div>

      <div className="fhm-drop-row">
        <label className={"fhm-dropzone" + (bankFile ? " fhm-filled" : "")} aria-label="Upload bank statement CSV">
          <input type="file" style={{ display: "none" }} onChange={(e) => setBankFile(e.target.files?.[0] || null)} />
          <div className="fhm-drop-icon">
            <svg viewBox="0 0 24 24">{bankFile ? <path d="m5 13 4 4L19 7" /> : <><rect x="3.5" y="6.5" width="17" height="11" rx="2.2" /><circle cx="12" cy="12" r="2.4" /></>}</svg>
          </div>
          <div className="fhm-drop-title">Bank Statement</div>
          <div className="fhm-drop-sub">{bankFile ? bankFile.name : "Drop file or click to browse"}</div>
        </label>

        <label className={"fhm-dropzone" + (acctFile ? " fhm-filled" : "")} aria-label="Upload accounting records CSV">
          <input type="file" style={{ display: "none" }} onChange={(e) => setAcctFile(e.target.files?.[0] || null)} />
          <div className="fhm-drop-icon">
            <svg viewBox="0 0 24 24">{acctFile ? <path d="m5 13 4 4L19 7" /> : <><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></>}</svg>
          </div>
          <div className="fhm-drop-title">Accounting Records</div>
          <div className="fhm-drop-sub">{acctFile ? acctFile.name : "Drop file or click to browse"}</div>
        </label>
      </div>

      <div className="fhm-panel">
        <h3>Reconciliation Details</h3>
        <div className="fhm-form-row">
          <div className="fhm-field">
            <label>Title</label>
            <input type="text" placeholder="e.g. Monthly Bank Reconciliation" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="fhm-field">
            <label>Period Start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="fhm-field">
            <label>Period End</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <button type="button" className="fhm-start-btn" disabled={!canStart || matchMutation.isPending} onClick={startMatching}>
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          {matchMutation.isPending ? "Starting..." : "Start Matching"}
        </button>
      </div>

      <div className="fhm-divider" />

      <div className="fhm-section-title">Previous Reconciliations</div>
      {isLoading ? (
        <div className="fhm-spinner" />
      ) : !reconciliations || reconciliations.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94A3B8", padding: "10px 0" }}>No reconciliations yet.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {reconciliations.map((r) => {
            const ss = statusStyle(r.status)
            return (
              <div className="fhm-recon-card" key={r.id}>
                <div className="fhm-recon-top">
                  <span className="fhm-recon-title">{r.title}</span>
                  <span className="fhm-status-pill" style={{ background: ss.bg, color: ss.color }}>{r.status}</span>
                </div>
                <div className="fhm-recon-range">{r.periodStart} — {r.periodEnd}</div>
                <div className="fhm-recon-created">{formatDate(r.createdAt)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
