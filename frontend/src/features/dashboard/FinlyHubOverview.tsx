import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

const CSS = `
.fho-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fho-root *{ box-sizing:border-box; }
.fho-header{ margin-bottom:26px; }
.fho-header h2{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:24px;
  color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px;
}
.fho-header p{ font-size:13.5px; color:#64748B; }
.fho-stats{
  display:grid; grid-template-columns:repeat(5, 1fr); gap:18px; margin-bottom:26px;
}
.fho-stat-card{
  padding:20px 20px 18px; border-radius:16px;
  background:rgba(255,255,255,0.8);
  border:1px solid #E2E8F0;
  backdrop-filter:blur(10px);
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 14px 30px -22px rgba(15,23,42,0.14);
  transition:transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.fho-stat-card:hover{
  transform:translateY(-3px);
  border-color:rgba(37,99,235,0.3);
  box-shadow:0 4px 10px rgba(37,99,235,0.06), 0 20px 40px -22px rgba(37,99,235,0.22);
}
.fho-stat-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.fho-stat-label{ font-size:12.5px; font-weight:600; color:#64748B; }
.fho-stat-icon{
  width:32px; height:32px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  background:rgba(37,99,235,0.09);
}
.fho-stat-icon svg{ width:16px; height:16px; stroke:#2563EB; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fho-stat-value{
  font-family:'JetBrains Mono', monospace; font-weight:600; font-size:25px; color:#0F172A;
  margin-bottom:8px; letter-spacing:-0.01em;
}
.fho-stat-delta{ display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; }
.fho-stat-delta svg{ width:12px; height:12px; stroke-width:2.4; fill:none; stroke-linecap:round; stroke-linejoin:round; }
.fho-stat-delta.fho-up{ color:#16A34A; }
.fho-stat-delta.fho-up svg{ stroke:#16A34A; }
.fho-stat-delta.fho-down{ color:#DC2626; }
.fho-stat-delta.fho-down svg{ stroke:#DC2626; }
.fho-stat-delta span.fho-vs{ color:#94A3B8; font-weight:500; }
.fho-grid{ display:grid; grid-template-columns:2.1fr 1fr; gap:20px; align-items:start; }
.fho-panel{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  backdrop-filter:blur(10px);
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 16px 34px -24px rgba(15,23,42,0.14);
  padding:24px 26px 22px;
}
.fho-panel h3{
  font-family:'Poppins', sans-serif; font-weight:600; font-size:15.5px; color:#0F172A;
  margin-bottom:18px; letter-spacing:-0.005em;
}
.fho-chart-legend{ display:flex; gap:18px; margin-bottom:6px; }
.fho-legend-item{ display:flex; align-items:center; gap:7px; font-size:12px; color:#64748B; font-weight:500; }
.fho-legend-dot{ width:8px; height:8px; border-radius:50%; }
.fho-chart-tooltip{
  position:absolute; padding:12px 14px; border-radius:12px;
  background:rgba(255,255,255,0.97); border:1px solid #E2E8F0;
  box-shadow:0 14px 30px -12px rgba(15,23,42,0.25);
  pointer-events:none; min-width:150px; z-index:3;
  transform:translate(-50%, -112%);
}
.fho-tooltip-month{ font-family:'Poppins', sans-serif; font-weight:600; font-size:13px; color:#0F172A; margin-bottom:8px; }
.fho-tooltip-row{ display:flex; align-items:center; justify-content:space-between; gap:14px; font-size:12px; padding:2px 0; }
.fho-tooltip-row .fho-tlabel{ display:flex; align-items:center; gap:6px; color:#64748B; }
.fho-tooltip-row .fho-tdot{ width:7px; height:7px; border-radius:50%; }
.fho-tooltip-row .fho-tval{ font-family:'JetBrains Mono', monospace; font-weight:600; color:#0F172A; }
.fho-activity-row{
  display:flex; align-items:flex-start; gap:12px; padding:12px 0;
  border-bottom:1px solid #F1F5F9;
}
.fho-activity-row:last-child{ border-bottom:none; padding-bottom:2px; }
.fho-activity-icon{
  width:34px; height:34px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  background:rgba(37,99,235,0.09);
}
.fho-activity-icon svg{ width:16px; height:16px; stroke:#2563EB; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fho-activity-icon.fho-icon-green{ background:#ECFDF5; }
.fho-activity-icon.fho-icon-green svg{ stroke:#16A34A; }
.fho-activity-body{ flex:1; min-width:0; }
.fho-activity-title{ font-size:13px; font-weight:600; color:#1E293B; margin-bottom:2px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.fho-activity-status{
  font-size:9.5px; font-weight:700; letter-spacing:0.03em; text-transform:uppercase;
  padding:2px 7px; border-radius:999px;
}
.fho-status-progress{ background:#EFF6FF; color:#2563EB; }
.fho-status-approved{ background:#ECFDF5; color:#16A34A; }
.fho-status-processing{ background:#FFF7ED; color:#C2610A; }
.fho-activity-sub{ font-size:12px; color:#64748B; }
.fho-activity-time{ font-size:11.5px; color:#94A3B8; white-space:nowrap; flex-shrink:0; }
.dark .fho-stat-card{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fho-stat-card:hover{ border-color:rgba(59,130,246,0.3); }
.dark .fho-stat-label{ color:#94A3B8; }
.dark .fho-stat-value{ color:#F1F5F9; }
.dark .fho-header h2{ color:#F1F5F9; }
.dark .fho-header p{ color:#94A3B8; }
.dark .fho-panel{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fho-panel h3{ color:#F1F5F9; }
.dark .fho-legend-item{ color:#94A3B8; }
.dark .fho-chart-tooltip{ background:rgba(15,23,42,0.97); border-color:#334155; }
.dark .fho-tooltip-month{ color:#F1F5F9; }
.dark .fho-tooltip-row .fho-tval{ color:#F1F5F9; }
.dark .fho-activity-row{ border-color:#1E293B; }
.dark .fho-activity-title{ color:#E2E8F0; }
.dark .fho-activity-sub{ color:#94A3B8; }
.dark .fho-activity-icon.fho-icon-green{ background:rgba(22,163,74,0.15); }
.dark .fho-status-progress{ background:rgba(37,99,235,0.15); color:#60A5FA; }
.dark .fho-status-approved{ background:rgba(22,163,74,0.15); color:#4ADE80; }
.dark .fho-status-processing{ background:rgba(194,97,10,0.15); color:#FB923C; }
@media (max-width:1180px){
  .fho-stats{ grid-template-columns:repeat(3, 1fr); }
  .fho-grid{ grid-template-columns:1fr; }
}
@media (max-width:640px){
  .fho-stats{ grid-template-columns:repeat(2, 1fr); }
}
`

function timeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function activityIcon(type: string, green: boolean) {
  const cls = 'fho-activity-icon' + (green ? ' fho-icon-green' : '')
  if (type === 'TRANSACTION') {
    return (
      <div className={cls}>
        <svg viewBox="0 0 24 24"><path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5" /><path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5" /></svg>
      </div>
    )
  }
  if (type === 'RECONCILIATION') {
    return (
      <div className={cls}>
        <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.5" /><path d="M4 20v-4.5h4.5" /></svg>
      </div>
    )
  }
  return (
    <div className={cls}>
      <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg>
    </div>
  )
}

function activityStatus(type: string): { label: string; cls: string } {
  if (type === 'INVOICE') return { label: 'Processing', cls: 'fho-status-processing' }
  if (type === 'TRANSACTION') return { label: 'Approved', cls: 'fho-status-approved' }
  if (type === 'RECONCILIATION') return { label: 'In Progress', cls: 'fho-status-progress' }
  return { label: 'Pending', cls: 'fho-status-progress' }
}

/* ---------- chart geometry helpers ---------- */
const CW = 640, CH = 230, PAD_L = 54, PAD_R = 12, PAD_T = 10, PAD_B = 26

function xFor(i: number, len: number) {
  const usable = CW - PAD_L - PAD_R
  return PAD_L + (usable * i) / (Math.max(len - 1, 1))
}
function yFor(v: number, maxY: number) {
  const usable = CH - PAD_T - PAD_B
  return PAD_T + usable * (1 - (maxY > 0 ? v / maxY : 0))
}
function pathFor(values: number[], maxY: number) {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i, values.length).toFixed(1)},${yFor(v, maxY).toFixed(1)}`).join(' ')
}
function areaFor(values: number[], maxY: number) {
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i, values.length).toFixed(1)},${yFor(v, maxY).toFixed(1)}`).join(' ')
  return `${line} L${xFor(values.length - 1, values.length).toFixed(1)},${yFor(0, maxY).toFixed(1)} L${xFor(0, values.length).toFixed(1)},${yFor(0, maxY).toFixed(1)} Z`
}

function LoadingSkeleton() {
  return (
    <div className="fho-root">
      <div className="fho-header">
        <h2>Dashboard</h2>
        <p>Loading your data...</p>
      </div>
      <div className="fho-stats">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="fho-stat-card" key={i}>
            <div className="fho-stat-head">
              <span className="fho-stat-label" style={{ background: '#E2E8F0', width: 80, height: 14, borderRadius: 4, display: 'inline-block' }} />
              <div className="fho-stat-icon" style={{ background: '#E2E8F0' }} />
            </div>
            <div className="fho-stat-value" style={{ background: '#E2E8F0', width: 60, height: 28, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="fho-root">
      <div className="fho-header">
        <h2>Dashboard</h2>
        <p>Could not load dashboard data</p>
      </div>
    </div>
  )
}

export function FinlyHubOverview() {
  const [hover, setHover] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const response = await dashboardApi.getMetrics()
      return response.data.data
    },
  })

  if (isLoading || !data) return <LoadingSkeleton />
  if (isError) return <ErrorState />

  const revLabels = data.revenueTrend.map((p) => p.label)
  const revValues = data.revenueTrend.map((p) => p.value)
  const expValues = data.expenseTrend.map((p) => p.value)
  const allValues = [...revValues, ...expValues]
  const maxY = Math.max(...allValues, 1)
  const chartLen = revValues.length
  const yTicks = maxY <= 4 ? [0, 1, 2, 3, 4] : [0, Math.round(maxY / 4), Math.round(maxY / 2), Math.round(3 * maxY / 4), maxY]

  return (
    <div className="fho-root">
      <style>{CSS}</style>

      <div className="fho-header">
        <h2>Dashboard</h2>
        <p>Your money at a glance</p>
      </div>

      <div className="fho-stats">
        <div className="fho-stat-card">
          <div className="fho-stat-head">
            <span className="fho-stat-label">Invoices Ready</span>
            <div className="fho-stat-icon"><svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg></div>
          </div>
          <div className="fho-stat-value">{data.invoicesProcessed.toLocaleString()}</div>
          <div className="fho-stat-delta fho-up">
            <svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            12.5%<span className="fho-vs">&nbsp;vs last month</span>
          </div>
        </div>
        <div className="fho-stat-card">
          <div className="fho-stat-head">
            <span className="fho-stat-label">Files Organized</span>
            <div className="fho-stat-icon"><svg viewBox="0 0 24 24"><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" /></svg></div>
          </div>
          <div className="fho-stat-value">{data.documentsIndexed.toLocaleString()}</div>
          <div className="fho-stat-delta fho-up">
            <svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            8.3%<span className="fho-vs">&nbsp;vs last month</span>
          </div>
        </div>
        <div className="fho-stat-card">
          <div className="fho-stat-head">
            <span className="fho-stat-label">Transactions Categorized</span>
            <div className="fho-stat-icon"><svg viewBox="0 0 24 24"><path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5" /><path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5" /></svg></div>
          </div>
          <div className="fho-stat-value">{data.transactionsCategorized.toLocaleString()}</div>
          <div className="fho-stat-delta fho-down">
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            2.1%<span className="fho-vs">&nbsp;vs last month</span>
          </div>
        </div>
        <div className="fho-stat-card">
          <div className="fho-stat-head">
            <span className="fho-stat-label">Records Matched</span>
            <div className="fho-stat-icon"><svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="6" rx="1.6" /><rect x="3.5" y="13.5" width="17" height="6" rx="1.6" /></svg></div>
          </div>
          <div className="fho-stat-value">{data.reconciliationsCompleted.toLocaleString()}</div>
          <div className="fho-stat-delta fho-up">
            <svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            15.0%<span className="fho-vs">&nbsp;vs last month</span>
          </div>
        </div>
        <div className="fho-stat-card">
          <div className="fho-stat-head">
            <span className="fho-stat-label">Time Saved</span>
            <div className="fho-stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 2" /></svg></div>
          </div>
          <div className="fho-stat-value">{data.hoursSaved.toLocaleString()}</div>
          <div className="fho-stat-delta fho-up">
            <svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            22.4%<span className="fho-vs">&nbsp;vs last month</span>
          </div>
        </div>
      </div>

      <div className="fho-grid">
        <div className="fho-panel">
          <h3>Income vs Expenses</h3>
          <div className="fho-chart-legend">
            <span className="fho-legend-item"><span className="fho-legend-dot" style={{ background: '#2563EB' }} />Money Coming In</span>
            <span className="fho-legend-item"><span className="fho-legend-dot" style={{ background: '#DC2626' }} />Money Going Out</span>
          </div>

          <div className="fho-chart-wrap">
            <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
              <defs>
                <linearGradient id="fho-incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={PAD_L} x2={CW - PAD_R} y1={yFor(t, maxY)} y2={yFor(t, maxY)} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 4" />
                  <text x={PAD_L - 10} y={yFor(t, maxY) + 4} textAnchor="end" fontSize="10.5" fill="#94A3B8" fontFamily="JetBrains Mono, monospace">
                    ${t.toLocaleString()}
                  </text>
                </g>
              ))}

              {revLabels.map((m, i) => (
                <text key={m} x={xFor(i, chartLen)} y={CH - 4} textAnchor="middle" fontSize="11" fill="#94A3B8">{m}</text>
              ))}

              <path d={areaFor(revValues, maxY)} fill="url(#fho-incomeFill)" />
              <path d={pathFor(expValues, maxY)} fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={pathFor(revValues, maxY)} fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

              {revLabels.map((m, i) => (
                <g key={m}>
                  <circle
                    cx={xFor(i, chartLen)} cy={yFor(revValues[i] ?? 0, maxY)} r={hover === i ? 5.5 : 3.5}
                    fill="#2563EB" stroke="#fff" strokeWidth="1.5"
                    style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <circle
                    cx={xFor(i, chartLen)} cy={yFor(expValues[i] ?? 0, maxY)} r={hover === i ? 5 : 3}
                    fill="#DC2626" stroke="#fff" strokeWidth="1.5"
                    style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  {hover === i && (
                    <line x1={xFor(i, chartLen)} x2={xFor(i, chartLen)} y1={PAD_T} y2={CH - PAD_B} stroke="#0F172A" strokeOpacity="0.12" strokeWidth="1.2" />
                  )}
                </g>
              ))}
            </svg>

            {hover !== null && (
              <div
                className="fho-chart-tooltip"
                style={{
                  left: `${(xFor(hover, chartLen) / CW) * 100}%`,
                  top: `${(Math.min(yFor(revValues[hover] ?? 0, maxY), yFor(expValues[hover] ?? 0, maxY)) / CH) * 100}%`,
                }}
              >
                <div className="fho-tooltip-month">{revLabels[hover]}</div>
                <div className="fho-tooltip-row">
                  <span className="fho-tlabel"><span className="fho-tdot" style={{ background: '#2563EB' }} />Money Coming In</span>
                  <span className="fho-tval">${(revValues[hover] ?? 0).toLocaleString()}.00</span>
                </div>
                <div className="fho-tooltip-row">
                  <span className="fho-tlabel"><span className="fho-tdot" style={{ background: '#DC2626' }} />Money Going Out</span>
                  <span className="fho-tval">${(expValues[hover] ?? 0).toLocaleString()}.00</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fho-panel">
          <h3>Recent Activity</h3>
          {data.recentActivity.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748B', fontSize: 13, padding: '20px 0' }}>No recent activity</p>
          ) : (
            data.recentActivity.map((a) => (
              <div className="fho-activity-row" key={a.id}>
                {activityIcon(a.type, a.type === 'TRANSACTION')}
                <div className="fho-activity-body">
                  <div className="fho-activity-title">
                    {a.title}
                    <span className={'fho-activity-status ' + activityStatus(a.type).cls}>{activityStatus(a.type).label}</span>
                  </div>
                  <div className="fho-activity-sub">{a.description}</div>
                </div>
                <div className="fho-activity-time">{timeAgo(a.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
