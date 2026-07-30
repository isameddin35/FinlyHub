import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportApi } from '@/api/reports'
import type { ReportResponse } from '@/types/report'

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
  display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px;
  border-radius:10px; border:1px solid #F1F5F9; font-size:13px; color:#1E293B; margin-bottom:8px;
  cursor:pointer; transition:background 0.15s ease;
}
.fhr-saved-item:hover{ background:#F8FAFC; }

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
.fhr-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhr-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhr-spin 0.6s linear infinite; }
@keyframes fhr-spin{ to{ transform:rotate(360deg); } }

@media (max-width:900px){ .fhr-layout{ grid-template-columns:1fr; } }

.dark .fhr-panel{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhr-panel h3{ color:#F1F5F9; }
.dark .fhr-preview{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhr-field label{ color:#E2E8F0; }
.dark .fhr-field select, .dark .fhr-field input{ background:#1E293B; border-color:#334155; color:#F1F5F9; }
.dark .fhr-report-stat{ background:#1E293B; border-color:#334155; }
.dark .fhr-report-stat .fhr-rs-label{ color:#94A3B8; }
.dark .fhr-report-stat .fhr-rs-value{ color:#F1F5F9; }
.dark .fhr-report-title{ color:#F1F5F9; }
.dark .fhr-report-range{ color:#94A3B8; }
.dark .fhr-header h2{ color:#F1F5F9; }
.dark .fhr-empty-title{ color:#94A3B8; }
`;

const REPORT_TYPES = [
  { value: "PROFIT_LOSS", label: "Profit & Loss" },
  { value: "BALANCE_SHEET", label: "Balance Sheet" },
  { value: "CASH_FLOW", label: "Cash Flow" },
  { value: "EXPENSE", label: "Expense Report" },
];

const TYPE_SUBTYPES: Record<string, string[]> = {
  PROFIT_LOSS: ["monthly", "quarterly", "annual"],
  BALANCE_SHEET: ["monthly", "quarterly", "annual"],
  CASH_FLOW: ["operating", "investing", "financing"],
  EXPENSE: ["by_category", "by_vendor", "by_month"],
};

const SUBTYPE_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
  operating: "Operating", investing: "Investing", financing: "Financing",
  by_category: "By Category", by_vendor: "By Vendor", by_month: "By Month",
};

export function FinlyHubReports() {
  const queryClient = useQueryClient()
  const [type, setType] = useState("");
  const [subtype, setSubtype] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportResponse | null>(null);

  const canGenerate = type && periodStart && periodEnd;

  const { data: savedReports } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await reportApi.list()
      return res.data.data
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => reportApi.generate({
      type,
      subtype,
      periodStart,
      periodEnd,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report generated')
      setSelectedReport(res.data.data)
    },
    onError: () => toast.error('Failed to generate report'),
  })

  const fetchReportMutation = useMutation({
    mutationFn: (id: number) => reportApi.getById(id),
    onSuccess: (res) => setSelectedReport(res.data.data),
    onError: () => toast.error('Failed to load report'),
  })

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
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="fhr-field">
              <label>Subtype</label>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)} disabled={!type}>
                <option value="">Select subtype</option>
                {(TYPE_SUBTYPES[type as keyof typeof TYPE_SUBTYPES] || []).map((s) => (
                  <option key={s} value={s}>{SUBTYPE_LABEL[s] || s}</option>
                ))}
              </select>
            </div>
            <div className="fhr-field">
              <label>Start Date</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="fhr-field">
              <label>End Date</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <button type="button" className="fhr-generate-btn" disabled={!canGenerate || generateMutation.isPending} onClick={() => generateMutation.mutate()}>
              {generateMutation.isPending ? "Generating..." : "Generate Report"}
            </button>
          </div>

          <div className="fhr-panel">
            <h3>Saved Reports</h3>
            {!savedReports || savedReports.length === 0 ? (
              <div className="fhr-saved-empty">No reports yet</div>
            ) : (
              savedReports.map((r) => (
                <div className="fhr-saved-item" key={r.id} onClick={() => fetchReportMutation.mutate(r.id)}>
                  {r.title || `${r.type} — ${r.periodStart} to ${r.periodEnd}`}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="fhr-preview">
          {fetchReportMutation.isPending || generateMutation.isPending ? (
            <div className="fhr-spinner" />
          ) : !selectedReport ? (
            <div className="fhr-empty">
              <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4M9 12.5h6M9 15.8h6" /></svg>
              <div className="fhr-empty-title">No report selected</div>
              <div className="fhr-empty-sub">Generate a report to get started</div>
            </div>
          ) : (
            <div className="fhr-report">
              <div className="fhr-report-head">
                <div>
                  <div className="fhr-report-title">{selectedReport.title}</div>
                  <div className="fhr-report-range">{selectedReport.periodStart} → {selectedReport.periodEnd}</div>
                </div>
              </div>
              <div className="fhr-report-grid">
                {Object.entries(selectedReport.data || {}).slice(0, 3).map(([key, value]) => (
                  <div className="fhr-report-stat" key={key}>
                    <div className="fhr-rs-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</div>
                    <div className="fhr-rs-value">{typeof value === 'number' ? `$${value.toLocaleString()}` : String(value)}</div>
                  </div>
                ))}
              </div>
              {selectedReport.aiInsights && (
                <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.2)', fontSize: 13, color: '#1E40AF' }}>
                  {selectedReport.aiInsights}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
