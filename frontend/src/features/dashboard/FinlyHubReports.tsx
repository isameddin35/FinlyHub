import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reportApi } from '@/api/reports'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import type { ReportResponse, ReportSummaryResponse, ReportChartConfig } from '@/types/report'

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
  width:100%; text-align:left; font-family:inherit; background:none;
}
.fhr-saved-item:hover{ background:#F8FAFC; }
.fhr-saved-title{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.fhr-badge{
  flex:none; font-size:10.5px; font-weight:700; padding:3px 8px; border-radius:999px;
  letter-spacing:0.02em; text-transform:uppercase;
}
.fhr-badge-generating{ background:#FEF3C7; color:#B45309; }
.fhr-badge-completed{ background:#DCFCE7; color:#15803D; }
.fhr-badge-failed{ background:#FEE2E2; color:#B91C1C; }
.fhr-badge-pending{ background:#F1F5F9; color:#64748B; }

.fhr-preview{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  min-height:520px; display:flex; align-items:center; justify-content:center; padding:40px;
}
.fhr-empty{ text-align:center; color:#94A3B8; }
.fhr-empty svg{ width:44px; height:44px; stroke:#CBD5E1; fill:none; stroke-width:1.4; margin-bottom:14px; }
.fhr-empty-title{ font-size:14.5px; font-weight:600; color:#475569; margin-bottom:4px; }
.fhr-empty-sub{ font-size:12.5px; }

.fhr-report{ width:100%; align-self:flex-start; }
.fhr-report-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
.fhr-report-title{ font-family:'Poppins', sans-serif; font-weight:700; font-size:19px; color:#0F172A; }
.fhr-report-range{ font-size:12.5px; color:#64748B; margin-top:4px; }
.fhr-report-actions{ display:flex; gap:8px; }
.fhr-export-btn{
  padding:8px 14px; border-radius:10px; border:1px solid #E2E8F0; background:#fff;
  font-size:12.5px; font-weight:600; color:#1E293B; cursor:pointer; transition:background 0.15s ease, border-color 0.15s ease;
}
.fhr-export-btn:hover{ background:#F8FAFC; border-color:#CBD5E1; }
.fhr-report-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; }
.fhr-report-stat{ padding:16px 18px; border-radius:14px; background:#F8FAFC; border:1px solid #F1F5F9; }
.fhr-report-stat .fhr-rs-label{ font-size:11.5px; color:#64748B; margin-bottom:6px; }
.fhr-report-stat .fhr-rs-value{ font-family:'JetBrains Mono', monospace; font-weight:700; font-size:18px; color:#0F172A; }
.fhr-report-section{ margin-top:20px; }
.fhr-report-section h4{ font-family:'Poppins', sans-serif; font-weight:600; font-size:13.5px; color:#0F172A; margin-bottom:10px; }
.fhr-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhr-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhr-spin 0.6s linear infinite; }
@keyframes fhr-spin{ to{ transform:rotate(360deg); } }
.fhr-failed{ text-align:center; color:#B91C1C; font-size:13.5px; font-weight:600; }

.fhr-ai{
  margin-top:20px; padding:16px; border-radius:14px; background:#EFF6FF;
  border:1px solid rgba(37,99,235,0.2); font-size:13px; color:#1E40AF; line-height:1.6; white-space:pre-line;
}

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
.dark .fhr-report-section h4{ color:#F1F5F9; }
.dark .fhr-header h2{ color:#F1F5F9; }
.dark .fhr-empty-title{ color:#94A3B8; }
.dark .fhr-saved-item{ background:rgba(30,41,59,0.6); border-color:#334155; color:#E2E8F0; }
.dark .fhr-saved-item:hover{ background:#1E293B; }
.dark .fhr-export-btn{ background:#1E293B; border-color:#334155; color:#E2E8F0; }
.dark .fhr-export-btn:hover{ background:#0F172A; }
`;

const REPORT_TYPES = [
  { value: "PROFIT", label: "Profit & Loss" },
  { value: "BALANCE_SHEET", label: "Balance Sheet" },
  { value: "CASHFLOW", label: "Cash Flow" },
  { value: "EXPENSE", label: "Expense Report" },
  { value: "REVENUE", label: "Revenue Report" },
];

const TYPE_SUBTYPES: Record<string, string[]> = {
  PROFIT: ["MONTHLY", "QUARTERLY", "ANNUAL"],
  BALANCE_SHEET: ["MONTHLY", "QUARTERLY", "ANNUAL"],
  CASHFLOW: ["MONTHLY", "QUARTERLY", "ANNUAL"],
  EXPENSE: ["MONTHLY", "QUARTERLY", "ANNUAL", "CATEGORY", "VENDOR", "DEPARTMENT"],
  REVENUE: ["MONTHLY", "QUARTERLY", "ANNUAL", "CATEGORY", "VENDOR", "DEPARTMENT"],
};

const SUBTYPE_LABEL: Record<string, string> = {
  MONTHLY: "Monthly", QUARTERLY: "Quarterly", ANNUAL: "Annual",
  CATEGORY: "By Category", VENDOR: "By Vendor", DEPARTMENT: "By Department",
};

const CHART_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"];

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "fhr-badge-pending",
  GENERATING: "fhr-badge-generating",
  COMPLETED: "fhr-badge-completed",
  FAILED: "fhr-badge-failed",
};

const formatMoney = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const prettyKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

type ChartDatum = { name: string; value: number };
type StatCard = { key: string; value: number };

function buildChartData(report: ReportResponse): ChartDatum[] {
  const chartConfig = report.chartConfig;
  const labels = chartConfig?.labels;
  if (!labels) return [];
  const values = chartConfig.datasets[0]?.data;
  return labels.map((label, i) => ({ name: label, value: values?.[i] ?? 0 }));
}

function buildStatCards(data: Record<string, unknown>): StatCard[] {
  const cards: StatCard[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'labels' || key === 'values' || key === 'totals') continue;
    if (typeof value === 'number') cards.push({ key, value });
  }
  const totals = data.totals as Record<string, unknown> | undefined;
  if (totals && typeof totals.total === 'number') cards.push({ key: 'Total', value: totals.total });
  if (totals && typeof totals.average === 'number') cards.push({ key: 'Average', value: totals.average });
  if (totals && typeof totals.count === 'number') cards.push({ key: 'Transactions', value: totals.count });
  return cards;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <span className={`fhr-badge ${STATUS_BADGE_CLASS[status] || 'fhr-badge-pending'}`}>{status}</span>;
}

function ReportHead({ report, actions }: Readonly<{ report: ReportResponse | ReportSummaryResponse; actions?: React.ReactNode }>) {
  return (
    <div className="fhr-report-head">
      <div>
        <div className="fhr-report-title">{report.title}</div>
        <div className="fhr-report-range">{report.periodStart} → {report.periodEnd}</div>
      </div>
      {actions}
    </div>
  );
}

function SavedReportsList({ reports, onSelect }: Readonly<{ reports: ReportSummaryResponse[]; onSelect: (id: number) => void }>) {
  if (!reports || reports.length === 0) {
    return <div className="fhr-saved-empty">No reports yet</div>;
  }
  return (
    <>
      {reports.map((r) => (
        <button type="button" className="fhr-saved-item" key={r.id} onClick={() => onSelect(r.id)}>
          <span className="fhr-saved-title">{r.title || `${r.type} — ${r.periodStart} to ${r.periodEnd}`}</span>
          <StatusBadge status={r.status} />
        </button>
      ))}
    </>
  );
}

function ReportStatCards({ data }: Readonly<{ data: Record<string, unknown> }>) {
  const cards = buildStatCards(data);
  if (cards.length === 0) return null;
  return (
    <div className="fhr-report-grid">
      {cards.map((s) => (
        <div className="fhr-report-stat" key={s.key}>
          <div className="fhr-rs-label">{prettyKey(s.key)}</div>
          <div className="fhr-rs-value">{s.key === 'Transactions' || s.key === 'Count' ? s.value.toLocaleString() : formatMoney(s.value)}</div>
        </div>
      ))}
    </div>
  );
}

function ReportChart({ chartConfig, chartData }: Readonly<{ chartConfig: ReportChartConfig; chartData: ChartDatum[] }>) {
  if (chartData.length === 0) return null;
  return (
    <div className="fhr-report-section">
      <h4>{chartConfig.type === 'pie' ? 'Breakdown' : 'Trend'}</h4>
      {chartConfig.type === 'pie' ? (
        <PieChart width={560} height={260}>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => e.name}>
            {chartData.map((item, i) => <Cell key={item.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formatMoney(Number(v))} />
        </PieChart>
      ) : (
        <BarChart width={560} height={260} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
          <Tooltip formatter={(v) => formatMoney(Number(v))} />
          <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
        </BarChart>
      )}
    </div>
  );
}

function ReportPreview({ loading, report, onExport }: Readonly<{ loading: boolean; report: ReportResponse | undefined; onExport: (format: string) => void }>) {
  if (loading) {
    return <div className="fhr-spinner" />;
  }
  if (!report) {
    return (
      <div className="fhr-empty">
        <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4M9 12.5h6M9 15.8h6" /></svg>
        <div className="fhr-empty-title">No report selected</div>
        <div className="fhr-empty-sub">Generate a report to get started</div>
      </div>
    );
  }
  if (report.status === 'GENERATING' || report.status === 'PENDING') {
    return (
      <div className="fhr-report">
        <ReportHead report={report} actions={<StatusBadge status={report.status} />} />
        <div className="fhr-spinner" />
      </div>
    );
  }
  if (report.status === 'FAILED') {
    return (
      <div className="fhr-report">
        <ReportHead report={report} actions={<span className="fhr-badge fhr-badge-failed">FAILED</span>} />
        <div className="fhr-failed">Report generation failed. Try generating it again.</div>
      </div>
    );
  }
  return (
    <div className="fhr-report">
      <ReportHead
        report={report}
        actions={
          <div className="fhr-report-actions">
            <button type="button" className="fhr-export-btn" onClick={() => onExport('PDF')}>Export PDF</button>
            <button type="button" className="fhr-export-btn" onClick={() => onExport('EXCEL')}>Export Excel</button>
          </div>
        }
      />
      <ReportStatCards data={report.data} />
      {report.chartConfig && <ReportChart chartConfig={report.chartConfig} chartData={buildChartData(report)} />}
      {report.aiInsights && (
        <div className="fhr-ai">{report.aiInsights}</div>
      )}
    </div>
  );
}

export function FinlyHubReports() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [subtype, setSubtype] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const canGenerate = type && subtype && periodStart && periodEnd;

  const { data: savedReports } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await reportApi.list();
      return res.data.data;
    },
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === 'GENERATING') ? 3000 : false),
  });

  const { data: selectedReport, isFetching } = useQuery({
    queryKey: ['report', selectedId],
    queryFn: async () => {
      const res = await reportApi.getById(selectedId!);
      return res.data.data;
    },
    enabled: selectedId != null,
    refetchInterval: (query) => (query.state.data?.status === 'GENERATING' ? 2500 : false),
  });

  const generateMutation = useMutation({
    mutationFn: () => reportApi.generate({
      type, subtype, periodStart, periodEnd,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedId(res.data.data.id);
      toast.success('Report generation started');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const handleExport = async (format: string) => {
    if (selectedId == null) return;
    try {
      const res = await reportApi.export(selectedId, format);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${selectedId}.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const previewLoading = generateMutation.isPending || (selectedId != null && isFetching && !selectedReport);

  return (
    <div className="fhr-root">
      <style>{CSS}</style>
      <div className="fhr-header"><h2>Reports</h2></div>

      <div className="fhr-layout">
        <div>
          <div className="fhr-panel">
            <h3>Generate Report</h3>
            <div className="fhr-field">
              <label htmlFor="fhr-type">Report Type</label>
              <select id="fhr-type" value={type} onChange={(e) => { setType(e.target.value); setSubtype(""); }}>
                <option value="">Select type</option>
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="fhr-field">
              <label htmlFor="fhr-subtype">Subtype</label>
              <select id="fhr-subtype" value={subtype} onChange={(e) => setSubtype(e.target.value)} disabled={!type}>
                <option value="">Select subtype</option>
                {(TYPE_SUBTYPES[type as keyof typeof TYPE_SUBTYPES] || []).map((s) => (
                  <option key={s} value={s}>{SUBTYPE_LABEL[s] || s}</option>
                ))}
              </select>
            </div>
            <div className="fhr-field">
              <label htmlFor="fhr-start-date">Start Date</label>
              <input id="fhr-start-date" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="fhr-field">
              <label htmlFor="fhr-end-date">End Date</label>
              <input id="fhr-end-date" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <button type="button" className="fhr-generate-btn" disabled={!canGenerate || generateMutation.isPending} onClick={() => generateMutation.mutate()}>
              {generateMutation.isPending ? "Generating..." : "Generate Report"}
            </button>
          </div>

          <div className="fhr-panel">
            <h3>Saved Reports</h3>
            <SavedReportsList reports={savedReports ?? []} onSelect={setSelectedId} />
          </div>
        </div>

        <div className="fhr-preview">
          <ReportPreview loading={previewLoading} report={selectedReport} onExport={handleExport} />
        </div>
      </div>
    </div>
  );
}