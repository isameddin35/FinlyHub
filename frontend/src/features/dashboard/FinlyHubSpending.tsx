// @ts-nocheck
import { useState } from 'react'

/**
 * Finly Hub — Spending (Transactions) page
 * Renders inside <DashboardLayout page="spending">...</DashboardLayout>.
 */

const CSS = `
.fhsp-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhsp-root *{ box-sizing:border-box; }

.fhsp-header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
.fhsp-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px; }
.fhsp-header p{ font-size:13.5px; color:#64748B; }

.fhsp-import-btn{
  display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:11px; border:none;
  background:linear-gradient(120deg, #2563EB, #3B82F6 45%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(37,99,235,0.5); transition:transform 0.2s ease;
}
.fhsp-import-btn:hover{ transform:translateY(-1px); }
.fhsp-import-btn svg{ width:15px; height:15px; stroke:#fff; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

.fhsp-stats{ display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:22px; }
.fhsp-stat-card{
  display:flex; align-items:center; gap:14px; padding:18px 20px; border-radius:16px;
  background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 14px 30px -24px rgba(15,23,42,0.14);
}
.fhsp-stat-icon{ width:40px; height:40px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.fhsp-stat-icon svg{ width:19px; height:19px; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhsp-icon-blue{ background:rgba(37,99,235,0.09); } .fhsp-icon-blue svg{ stroke:#2563EB; }
.fhsp-icon-amber{ background:#FFF7ED; } .fhsp-icon-amber svg{ stroke:#C2610A; }
.fhsp-icon-green{ background:#ECFDF5; } .fhsp-icon-green svg{ stroke:#16A34A; }
.fhsp-stat-value{ font-family:'JetBrains Mono', monospace; font-weight:700; font-size:22px; color:#0F172A; }
.fhsp-stat-label{ font-size:12px; color:#64748B; margin-top:2px; }

.fhsp-tabs{ display:inline-flex; gap:4px; padding:4px; border-radius:12px; background:#F1F5F9; margin-bottom:18px; }
.fhsp-tab{
  padding:8px 18px; border-radius:9px; border:none; background:none; cursor:pointer;
  font-size:13px; font-weight:600; color:#64748B; transition:background 0.2s ease, color 0.2s ease;
}
.fhsp-tab.fhsp-tab-active{ background:#fff; color:#0F172A; box-shadow:0 1px 3px rgba(15,23,42,0.08); }

.fhsp-table-wrap{
  border-radius:16px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0; overflow:hidden;
}
.fhsp-table{ width:100%; border-collapse:collapse; }
.fhsp-table thead th{
  text-align:left; font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
  color:#94A3B8; padding:13px 20px; border-bottom:1px solid #E2E8F0;
}
.fhsp-table tbody td{ padding:14px 20px; font-size:13px; color:#1E293B; border-bottom:1px solid #F1F5F9; }
.fhsp-table tbody tr:last-child td{ border-bottom:none; }
.fhsp-table tbody tr:hover{ background:rgba(37,99,235,0.03); }
.fhsp-amount-neg{ color:#DC2626; font-family:'JetBrains Mono', monospace; font-weight:600; }
.fhsp-amount-pos{ color:#16A34A; font-family:'JetBrains Mono', monospace; font-weight:600; }
.fhsp-category-badge{
  display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600;
  padding:4px 10px; border-radius:999px; background:#ECFDF5; color:#16A34A;
}
.fhsp-category-badge svg{ width:11px; height:11px; stroke:#16A34A; fill:none; stroke-width:2.5; }
.fhsp-approved-pill{
  display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700;
  padding:5px 12px; border-radius:8px; border:1px solid rgba(22,163,74,0.3); color:#16A34A; background:#ECFDF5;
}
.fhsp-approved-pill svg{ width:11px; height:11px; stroke:#16A34A; fill:none; stroke-width:2.6; }

@media (max-width:900px){
  .fhsp-stats{ grid-template-columns:1fr; }
  .fhsp-table-wrap{ overflow-x:auto; }
  .fhsp-table{ min-width:680px; }
}
`;

const TRANSACTIONS = [
  { date: "Jan 25, 2026", desc: "AWS Cloud Services", amount: -450, category: "Software & Subscriptions", status: "Approved" },
  { date: "Jan 22, 2026", desc: "Office Rent - January", amount: -3200, category: "Software & Subscriptions", status: "Approved" },
  { date: "Jan 18, 2026", desc: "Slack Subscription", amount: -85, category: "Software & Subscriptions", status: "Approved" },
  { date: "Jan 15, 2026", desc: "Client Payment - Q1 Consulting", amount: 15000, category: "Revenue", status: "Approved" },
  { date: "Jan 12, 2026", desc: "Uber Business Trip - Client Meeting", amount: -30, category: "Transportation", status: "Approved" },
  { date: "Jan 11, 2026", desc: "Microsoft 365 Business Subscription", amount: -120, category: "Software & Subscriptions", status: "Approved" },
  { date: "Jan 10, 2026", desc: "Starbucks - Office Coffee Run", amount: -15, category: "Meals & Entertainment", status: "Approved" },
];

const TABS = ["All", "Pending", "Approved"];

export function FinlyHubSpending() {
  const [tab, setTab] = useState("All");

  const filtered = TRANSACTIONS.filter((t) => tab === "All" || t.status === tab);
  const pending = TRANSACTIONS.filter((t) => t.status === "Pending").length;
  const approved = TRANSACTIONS.filter((t) => t.status === "Approved").length;

  return (
    <div className="fhsp-root">
      <style>{CSS}</style>

      <div className="fhsp-header">
        <div>
          <h2>Transactions</h2>
          <p>Upload and manage your financial transactions</p>
        </div>
        <button type="button" className="fhsp-import-btn">
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          Import CSV/XLSX
        </button>
      </div>

      <div className="fhsp-stats">
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-blue"><svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg></div>
          <div><div className="fhsp-stat-value">{TRANSACTIONS.length}</div><div className="fhsp-stat-label">Total Transactions</div></div>
        </div>
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-amber"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg></div>
          <div><div className="fhsp-stat-value">{pending}</div><div className="fhsp-stat-label">Pending Review</div></div>
        </div>
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-green"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m8 12.3 2.6 2.6L16.5 9" /></svg></div>
          <div><div className="fhsp-stat-value">{approved}</div><div className="fhsp-stat-label">Approved</div></div>
        </div>
      </div>

      <div className="fhsp-tabs">
        {TABS.map((t) => (
          <button key={t} className={"fhsp-tab" + (tab === t ? " fhsp-tab-active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="fhsp-table-wrap">
        <table className="fhsp-table">
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Confidence</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>{t.desc}</td>
                <td className={t.amount < 0 ? "fhsp-amount-neg" : "fhsp-amount-pos"}>
                  {t.amount < 0 ? "↘ " : "↗ "}${Math.abs(t.amount).toLocaleString()}.00
                </td>
                <td>
                  <span className="fhsp-category-badge">
                    <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                    {t.category}
                  </span>
                </td>
                <td>—</td>
                <td>
                  <span className="fhsp-approved-pill">
                    <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#94A3B8", padding: "30px 20px" }}>No transactions in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}