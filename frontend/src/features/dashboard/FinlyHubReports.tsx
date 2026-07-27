// @ts-nocheck
import { useState } from 'react'

/**
 * Finly Hub — Reports page
 * Renders inside <DashboardLayout page="reports">...</DashboardLayout>.
 */

const CSS = `
.fhr-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhr-root *{ box-sizing:border-box; }

.fhr-header{ margin-bottom:24px; }
.fhr-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; }

.fhr-layout{ display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }

.fhr-panel{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  padding:22px 22px 20px;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 16px 34px -24px rgba(15,23,42,0.14);
}
.fhr-panel h3{ font-family:'Poppins', sans-serif; font-weight:600; font-size:15px; color:#0F172A; margin-bottom:18px; }
.fhr-panel + .fhr-panel{ margin-top:20px; }

.fhr-field{ margin-bottom:16px; }
.fhr-field label{ display:block; font-size:12.5px; font-weight:600; color:#1E293B; margin-bottom:7px; }
.fhr-field select, .fhr-field input{
  width:100%; padding:10px 12px; border-radius:10px; border:1px solid #E2E8F0;
  font-family:'Inter', sans-serif; font-size:13.5px; color:#0F172A; background:#fff;
  outline:none; transition:border-color 0.2s ease, box-shadow 0.2s ease;
}
.fhr-field select:focus, .fhr-field input:focus{ border-color:rgba(37,99,235,0.5); box-shadow:0 0 0 4px rgba(37,99,235,0.1); }

.fhr-generate-btn{
  width:100%; padding:12px; border-radius:11px; border:none; margin-top:4px;
  background:linear-gradient(120deg, #2563EB, #3B82F6 45%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(37,99,235,0.5); transition:transform 0.2s ease, opacity 0.2s ease;
}
.fhr-generate-btn:disabled{ opacity:0.5; cursor:default; }
.fhr-generate-btn:not(:disabled):hover{ transform:translateY(-1px); }

.fhr-saved-empty{ font-size:13px; color:#94A3B8; }
.fhr-saved-item{
  display:flex; align-items:center; justify-content:between; gap:10px; padding:10px 12px;
  border-radius:10px; border:1px solid #F1F5F9; font-size:13px; color:#1E293B; margin-bottom:8px;
}

.fhr-preview{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  min-height:520px; display:flex; align-items:center; justify-content:center; padding:40px;
}
.fhr-empty{ text-align:center; color:#94A3B8; }
.fhr-empty svg{ width:44px; height:44px; stroke:#CBD5E1; fill:none; stroke-width:1.4; margin-bottom:14px; }
.fhr-empty-title{ font-size:14.5px; font-weight:600; color:#475569; margin-bottom:4px; }
.fhr-empty-sub{ font-size:12.5px; }

.fhr-report{ width:100%; }
.fhr-report-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.fhr-report-title{ font-family:'Poppins', sans-serif; font-weight:700; font-size:19px; color:#0F172A; }
.fhr-report-range{ font-size:12.5px; color:#64748B; margin-top:4px; }
.fhr-report-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; }
.fhr-report-stat{ padding:16px 18px; border-radius:14px; background:#F8FAFC; border:1px solid #F1F5F9; }
.fhr-report-stat .fhr-rs-label{ font-size:11.5px; color:#64748B; margin-bottom:6px; }
.fhr-report-stat .fhr-rs-value{ font-family:'JetBrains Mono', monospace; font-weight:700; font-size:18px; color:#0F172A; }

@media (max-width:900px){ .fhr-layout{ grid-template-columns:1fr; } }
`;

const TYPES = ["Revenue", "Expense", "Profit", "Cash Flow"];
const SUBTYPES = {
  Revenue: ["By client", "By month", "By project"],
  Expense: ["By category", "By vendor", "By month"],
  Profit: ["Gross margin", "Net profit"],
  "Cash Flow": ["Operating", "Investing", "Financing"],
};

const STAT_LABELS = {
  Revenue: ["Total Revenue", "New Clients", "Avg. Invoice"],
  Expense: ["Total Spent", "Top Category", "Transactions"],
  Profit: ["Net Profit", "Margin", "YoY Change"],
  "Cash Flow": ["Cash In", "Cash Out", "Net Flow"],
};

export function FinlyHubReports() {
  const [type, setType] = useState("");
  const [subtype, setSubtype] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState([]);

  const canGenerate = type && start && end;

  const generate = () => {
    if (!canGenerate) return;
    const r = { type, subtype, start, end };
    setReport(r);
    setSaved((s) => [r, ...s]);
  };

  return (
    <div className="fhr-root">
      <style>{CSS}</style>
      <div className="fhr-header"><h2>Reports</h2></div>

      <div className="fhr-layout">
        <div>
          <div className="fhr-panel">
            <h3>Generate Report</h3>
            <div className="fhr-field">
              <label>Report Type</label>
              <select value={type} onChange={(e) => { setType(e.target.value); setSubtype(""); }}>
                <option value="">Select type</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fhr-field">
              <label>Subtype</label>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)} disabled={!type}>
                <option value="">Select subtype</option>
                {(SUBTYPES[type] || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fhr-field">
              <label>Start Date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="fhr-field">
              <label>End Date</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <button type="button" className="fhr-generate-btn" disabled={!canGenerate} onClick={generate}>
              Generate Report
            </button>
          </div>

          <div className="fhr-panel">
            <h3>Saved Reports</h3>
            {saved.length === 0 ? (
              <div className="fhr-saved-empty">No reports yet</div>
            ) : (
              saved.map((r, i) => (
                <div className="fhr-saved-item" key={i}>{r.type} — {r.start} to {r.end}</div>
              ))
            )}
          </div>
        </div>

        <div className="fhr-preview">
          {!report ? (
            <div className="fhr-empty">
              <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4M9 12.5h6M9 15.8h6" /></svg>
              <div className="fhr-empty-title">No report selected</div>
              <div className="fhr-empty-sub">Generate a report to get started</div>
            </div>
          ) : (
            <div className="fhr-report">
              <div className="fhr-report-head">
                <div>
                  <div className="fhr-report-title">{report.type} Report{report.subtype ? " — " + report.subtype : ""}</div>
                  <div className="fhr-report-range">{report.start} → {report.end}</div>
                </div>
              </div>
              <div className="fhr-report-grid">
                {STAT_LABELS[report.type].map((label, i) => (
                  <div className="fhr-report-stat" key={label}>
                    <div className="fhr-rs-label">{label}</div>
                    <div className="fhr-rs-value">{i === 0 ? "$0.00" : i === 1 ? "—" : "0%"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}