// @ts-nocheck
import { useState } from 'react'

/**
 * Finly Hub — Match Records (Reconciliation) page
 * Renders inside <DashboardLayout page="match">...</DashboardLayout>.
 */

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
`;

export function FinlyHubMatchRecords() {
  const [bankFile, setBankFile] = useState(null);
  const [acctFile, setAcctFile] = useState(null);
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reconciliations, setReconciliations] = useState([
    { title: "January 2026 Bank Reconciliation", range: "Jan 1, 2026 - Jan 31, 2026", created: "Jul 8, 2026", status: "IN_PROGRESS" },
  ]);

  const canStart = bankFile && acctFile && title && periodStart && periodEnd;

  const startMatching = () => {
    if (!canStart) return;
    setReconciliations((r) => [
      { title, range: `${periodStart} - ${periodEnd}`, created: new Date().toLocaleDateString(), status: "IN_PROGRESS" },
      ...r,
    ]);
    setTitle(""); setPeriodStart(""); setPeriodEnd(""); setBankFile(null); setAcctFile(null);
  };

  return (
    <div className="fhm-root">
      <style>{CSS}</style>
      <div className="fhm-header"><h2>Reconciliation</h2></div>

      <div className="fhm-drop-row">
        <label className={"fhm-dropzone" + (bankFile ? " fhm-filled" : "")}>
          <input type="file" style={{ display: "none" }} onChange={(e) => setBankFile(e.target.files?.[0] || null)} />
          <div className="fhm-drop-icon">
            <svg viewBox="0 0 24 24">{bankFile ? <path d="m5 13 4 4L19 7" /> : <><rect x="3.5" y="6.5" width="17" height="11" rx="2.2" /><circle cx="12" cy="12" r="2.4" /></>}</svg>
          </div>
          <div className="fhm-drop-title">Bank Statement</div>
          <div className="fhm-drop-sub">{bankFile ? bankFile.name : "Drop file or click to browse"}</div>
        </label>

        <label className={"fhm-dropzone" + (acctFile ? " fhm-filled" : "")}>
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
        <button type="button" className="fhm-start-btn" disabled={!canStart} onClick={startMatching}>
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          Start Matching
        </button>
      </div>

      <div className="fhm-divider" />

      <div className="fhm-section-title">Previous Reconciliations</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {reconciliations.map((r, i) => (
          <div className="fhm-recon-card" key={i}>
            <div className="fhm-recon-top">
              <span className="fhm-recon-title">{r.title}</span>
              <span className="fhm-status-pill">{r.status}</span>
            </div>
            <div className="fhm-recon-range">{r.range}</div>
            <div className="fhm-recon-created">{r.created}</div>
          </div>
        ))}
      </div>
    </div>
  );
}