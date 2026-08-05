import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reconciliationApi } from '@/api/reconciliation'
import type { ReconciliationEntryResponse } from '@/types/reconciliation'

const CSS = `
.fhm-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhm-root *{ box-sizing:border-box; }

.fhm-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
.fhm-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; }
.fhm-header-actions{ display:flex; align-items:center; gap:10px; }

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

.fhm-hint{ font-size:12px; color:#64748B; margin:-8px 0 14px; line-height:1.55; }
.fhm-link{
  display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#2563EB;
  background:none; border:none; padding:0; cursor:pointer; text-decoration:underline; text-underline-offset:2px;
}
.fhm-link svg{ width:13px; height:13px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

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

.fhm-cards{ display:flex; flex-wrap:wrap; gap:16px; }
.fhm-recon-card{
  padding:18px 20px; border-radius:16px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  max-width:420px; cursor:pointer; transition:border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.fhm-recon-card:hover{ border-color:#93C5FD; box-shadow:0 10px 26px -18px rgba(37,99,235,0.35); transform:translateY(-1px); }
.fhm-recon-card.fhm-selected{ border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,0.12); }
.fhm-recon-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
.fhm-recon-title{ font-size:14.5px; font-weight:700; color:#0F172A; }
.fhm-status-pill{ font-size:10px; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:3px 9px; border-radius:999px; background:#EFF6FF; color:#2563EB; }
.fhm-recon-range{ font-size:12.5px; color:#64748B; margin-bottom:3px; }
.fhm-recon-created{ font-size:11.5px; color:#94A3B8; }
.fhm-recon-counts{ display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
.fhm-count-chip{ font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; background:#F1F5F9; color:#475569; }
.fhm-count-chip.fhm-chip-match{ background:#ECFDF5; color:#16A34A; }
.fhm-count-chip.fhm-chip-review{ background:#FFF7ED; color:#C2610A; }
.fhm-count-chip.fhm-chip-unmatch{ background:#FEF2F2; color:#DC2626; }

.fhm-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhm-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhm-spin 0.6s linear infinite; }
@keyframes fhm-spin{ to{ transform:rotate(360deg); } }

.fhm-detail{ margin-top:22px; padding:24px 26px; border-radius:18px; background:rgba(255,255,255,0.85); border:1px solid #2563EB; box-shadow:0 16px 34px -24px rgba(15,23,42,0.18); }
.fhm-detail-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
.fhm-detail-title{ font-family:'Poppins', sans-serif; font-weight:700; font-size:17px; color:#0F172A; }
.fhm-detail-sub{ font-size:12.5px; color:#64748B; margin-top:4px; }
.fhm-detail-actions{ display:flex; align-items:center; gap:10px; }
.fhm-approve-btn{
  display:inline-flex; align-items:center; gap:7px; padding:10px 18px; border-radius:11px; border:none;
  background:linear-gradient(120deg, #16A34A, #22C55E); color:#fff; font-size:13px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(22,163,74,0.5); transition:transform 0.2s ease, opacity 0.2s ease;
}
.fhm-approve-btn:disabled{ opacity:0.5; cursor:default; }
.fhm-approve-btn:not(:disabled):hover{ transform:translateY(-1px); }
.fhm-approve-btn svg{ width:14px; height:14px; stroke:#fff; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
.fhm-close-btn{
  display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9px;
  border:1px solid #E2E8F0; background:rgba(255,255,255,0.8); color:#64748B; cursor:pointer; font-size:15px; line-height:1;
}
.fhm-close-btn:hover{ background:#F1F5F9; color:#0F172A; }

.fhm-detail-stats{ display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }

.fhm-bucket{ margin-bottom:20px; }
.fhm-bucket:last-child{ margin-bottom:0; }
.fhm-bucket-head{ display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.fhm-bucket-dot{ width:9px; height:9px; border-radius:999px; }
.fhm-bucket-title{ font-size:13px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.03em; }
.fhm-bucket-count{ font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px; background:#F1F5F9; color:#64748B; }

.fhm-entry{ display:grid; grid-template-columns:minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.9fr); gap:12px; align-items:center; padding:11px 14px; border-radius:12px; background:rgba(255,255,255,0.7); border:1px solid #EEF2F7; margin-bottom:8px; }
.fhm-entry-main{ min-width:0; }
.fhm-entry-desc{ font-size:13px; font-weight:600; color:#0F172A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fhm-entry-meta{ font-size:11.5px; color:#94A3B8; margin-top:3px; }
.fhm-badge{ display:inline-block; font-size:9.5px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:2px 7px; border-radius:999px; background:#F1F5F9; color:#475569; margin-right:6px; }
.fhm-badge.fhm-badge-bank{ background:#EFF6FF; color:#2563EB; }
.fhm-badge.fhm-badge-accounting{ background:#F5F3FF; color:#7C3AED; }
.fhm-entry-val{ text-align:right; font-size:13px; font-weight:600; color:#0F172A; }
.fhm-entry-sub{ text-align:right; font-size:11px; color:#94A3B8; margin-top:3px; }
.fhm-diff-pos{ color:#16A34A; }
.fhm-diff-neg{ color:#DC2626; }

.fhm-pair{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px; }
.fhm-pair-side{ padding:11px 14px; border-radius:12px; background:rgba(255,255,255,0.7); border:1px solid #EEF2F7; min-width:0; }
.fhm-pair-side.fhm-pair-bank{ border-left:3px solid #2563EB; }
.fhm-pair-side.fhm-pair-accounting{ border-left:3px solid #7C3AED; }
.fhm-pair-meta{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
.fhm-pair-amount{ font-size:13px; font-weight:700; color:#0F172A; }
.fhm-pair-desc{ font-size:12.5px; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fhm-pair-date{ font-size:11.5px; color:#94A3B8; margin-top:3px; }
.fhm-pair-diff{ font-size:11.5px; font-weight:600; margin-top:6px; }

.dark .fhm-panel{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhm-panel h3{ color:#F1F5F9; }
.dark .fhm-recon-card{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhm-recon-card:hover{ border-color:#2563EB; }
.dark .fhm-recon-title{ color:#F1F5F9; }
.dark .fhm-recon-range{ color:#94A3B8; }
.dark .fhm-recon-created{ color:#64748B; }
.dark .fhm-dropzone{ border-color:#334155; background:rgba(15,23,42,0.6); }
.dark .fhm-dropzone:hover{ border-color:#3B82F6; background:rgba(37,99,235,0.08); }
.dark .fhm-dropzone .fhm-drop-title{ color:#E2E8F0; }
.dark .fhm-dropzone .fhm-drop-sub{ color:#94A3B8; }
.dark .fhm-field label{ color:#E2E8F0; }
.dark .fhm-field input{ background:#1E293B; border-color:#334155; color:#F1F5F9; }
.dark .fhm-hint{ color:#94A3B8; }
.dark .fhm-section-title{ color:#F1F5F9; }
.dark .fhm-header h2{ color:#F1F5F9; }
.dark .fhm-detail{ background:rgba(15,23,42,0.9); border-color:#3B82F6; }
.dark .fhm-detail-title{ color:#F1F5F9; }
.dark .fhm-detail-sub{ color:#94A3B8; }
.dark .fhm-close-btn{ background:#1E293B; border-color:#334155; color:#94A3B8; }
.dark .fhm-bucket-title{ color:#E2E8F0; }
.dark .fhm-count-chip{ background:#1E293B; color:#CBD5E1; }
.dark .fhm-entry{ background:rgba(30,41,59,0.7); border-color:#1E293B; }
.dark .fhm-entry-desc{ color:#E2E8F0; }
.dark .fhm-entry-val{ color:#F1F5F9; }
.dark .fhm-pair-side{ background:rgba(30,41,59,0.7); border-color:#1E293B; }
.dark .fhm-pair-amount{ color:#F1F5F9; }
.dark .fhm-pair-desc{ color:#CBD5E1; }
`;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  IN_PROGRESS: { bg: '#EFF6FF', color: '#2563EB' },
  COMPLETED: { bg: '#ECFDF5', color: '#16A34A' },
  APPROVED: { bg: '#ECFDF5', color: '#16A34A' },
  FAILED: { bg: '#FEF2F2', color: '#DC2626' },
};

const TEMPLATE_CSV = [
  'description,date,amount,reference',
  'Office Rent,2026-01-05,1500.00,RENT-001',
  'AWS Cloud Services,2026-01-12,245.50,AWS-1024',
  'Client Invoice Payment,2026-01-20,1200.00,INV-118',
  'Stripe Payout,2026-01-27,895.00,STR-2201',
  'Office Supplies,2026-01-30,63.20,SUP-005',
].join('\n');

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatSignedAmount(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatAmount(value)}`
}

function formatScore(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(0)}%`
}

function getErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: string } } })?.response
  return response?.data?.message || fallback
}

type Entry = ReconciliationEntryResponse

interface MatchedPair {
  bank: Entry
  accounting: Entry
}

function buildMatchedPairs(entries: Entry[]): MatchedPair[] {
  const byKey = new Map<number, Entry[]>()
  for (const e of entries) {
    if (e.matchedEntryId == null) continue
    const key = Math.min(e.id, e.matchedEntryId)
    const group = byKey.get(key) ?? []
    group.push(e)
    byKey.set(key, group)
  }
  return Array.from(byKey.values()).map((group) => {
    const bank = group.find((e) => e.source === 'BANK') ?? group[0]
    const accounting = group.find((e) => e.source === 'ACCOUNTING') ?? group[1] ?? group[0]
    return { bank, accounting }
  })
}

export function FinlyHubMatchRecords() {
  const queryClient = useQueryClient()
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [acctFile, setAcctFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const canStart = bankFile && acctFile && title && periodStart && periodEnd;

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => {
      const res = await reconciliationApi.list()
      return res.data.data
    },
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['reconciliation', selectedId],
    queryFn: async () => {
      const res = await reconciliationApi.getById(selectedId!)
      return res.data.data
    },
    enabled: selectedId != null,
  })

  const matchMutation = useMutation({
    mutationFn: () => reconciliationApi.match(bankFile!, acctFile!, title, periodStart, periodEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      toast.success('Reconciliation started')
      setTitle(""); setPeriodStart(""); setPeriodEnd(""); setBankFile(null); setAcctFile(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to start reconciliation')),
  })

  const approveMutation = useMutation({
    mutationFn: () => reconciliationApi.approve(selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      if (selectedId != null) queryClient.invalidateQueries({ queryKey: ['reconciliation', selectedId] })
      toast.success('Reconciliation approved')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to approve reconciliation')),
  })

  const startMatching = () => {
    if (!canStart) return
    matchMutation.mutate()
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finlyhub-reconciliation-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusStyle = (status: string) => STATUS_COLORS[status] || { bg: '#F1F5F9', color: '#64748B' };
  const selectedRecon = reconciliations?.find((r) => r.id === selectedId);

  return (
    <div className="fhm-root">
      <style>{CSS}</style>
      <div className="fhm-header">
        <h2>Reconciliation</h2>
        <div className="fhm-header-actions">
          <button type="button" className="fhm-link" onClick={downloadTemplate}>
            <svg viewBox="0 0 24 24"><path d="M12 3v11M8 10l4 4 4-4" /><path d="M4.5 17.5v2A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-2" /></svg>
            Download CSV template
          </button>
        </div>
      </div>

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

      <div className="fhm-hint">
        Expected columns: <strong>description, date (YYYY-MM-DD), amount, reference</strong>. First row is treated as a header.
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
        <div className="fhm-cards">
          {reconciliations.map((r) => {
            const ss = statusStyle(r.status)
            const isSelected = r.id === selectedId
            return (
              <div
                className={"fhm-recon-card" + (isSelected ? " fhm-selected" : "")}
                key={r.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : r.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(isSelected ? null : r.id) } }}
              >
                <div className="fhm-recon-top">
                  <span className="fhm-recon-title">{r.title}</span>
                  <span className="fhm-status-pill" style={{ background: ss.bg, color: ss.color }}>{r.status}</span>
                </div>
                <div className="fhm-recon-range">{r.periodStart} — {r.periodEnd}</div>
                <div className="fhm-recon-created">{formatDate(r.createdAt)}</div>
                <div className="fhm-recon-counts">
                  <span className="fhm-count-chip fhm-chip-match">{r.matchedCount} matched</span>
                  <span className="fhm-count-chip fhm-chip-review">{r.needsReviewCount} needs review</span>
                  <span className="fhm-count-chip fhm-chip-unmatch">{r.unmatchedCount} unmatched</span>
                  <span className="fhm-count-chip">{formatAmount(r.discrepancyAmount)} diff</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedRecon && (
        <div className="fhm-detail">
          <div className="fhm-detail-top">
            <div>
              <div className="fhm-detail-title">{detail?.reconciliation.title ?? selectedRecon.title}</div>
              <div className="fhm-detail-sub">
                {selectedRecon.periodStart} — {selectedRecon.periodEnd} · Created {formatDate(selectedRecon.createdAt)}
              </div>
            </div>
            <div className="fhm-detail-actions">
              {selectedRecon.status !== 'APPROVED' && (
                <button
                  type="button"
                  className="fhm-approve-btn"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>
              )}
              <button type="button" className="fhm-close-btn" aria-label="Close details" onClick={() => setSelectedId(null)}>×</button>
            </div>
          </div>

          <div className="fhm-detail-stats">
            <span className="fhm-count-chip fhm-chip-match">{selectedRecon.matchedCount} matched</span>
            <span className="fhm-count-chip fhm-chip-review">{selectedRecon.needsReviewCount} needs review</span>
            <span className="fhm-count-chip fhm-chip-unmatch">{selectedRecon.unmatchedCount} unmatched</span>
            <span className="fhm-count-chip">{formatAmount(selectedRecon.discrepancyAmount)} discrepancy</span>
          </div>

          {detailLoading ? (
            <div className="fhm-spinner" />
          ) : !detail ? (
            <div style={{ fontSize: 13, color: "#94A3B8", padding: "10px 0" }}>Unable to load reconciliation details.</div>
          ) : (
            <>
              <div className="fhm-bucket">
                <div className="fhm-bucket-head">
                  <span className="fhm-bucket-dot" style={{ background: '#16A34A' }} />
                  <span className="fhm-bucket-title">Matched</span>
                  <span className="fhm-bucket-count">{detail.matched.length}</span>
                </div>
                {detail.matched.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94A3B8", padding: "4px 2px" }}>No matched entries.</div>
                ) : (
                  buildMatchedPairs(detail.matched).map((pair) => (
                    <div className="fhm-pair" key={pair.bank.id}>
                      <div className="fhm-pair-side fhm-pair-bank">
                        <div className="fhm-pair-meta">
                          <span className="fhm-badge fhm-badge-bank">Bank</span>
                          <span className="fhm-pair-amount">{formatAmount(pair.bank.amount)}</span>
                        </div>
                        <div className="fhm-pair-desc">{pair.bank.description}</div>
                        <div className="fhm-pair-date">{formatDate(pair.bank.transactionDate)}</div>
                      </div>
                      <div className="fhm-pair-side fhm-pair-accounting">
                        <div className="fhm-pair-meta">
                          <span className="fhm-badge fhm-badge-accounting">Accounting</span>
                          <span className="fhm-pair-amount">{formatAmount(pair.accounting.amount)}</span>
                        </div>
                        <div className="fhm-pair-desc">{pair.accounting.description}</div>
                        <div className="fhm-pair-date">{formatDate(pair.accounting.transactionDate)}</div>
                        <div className={"fhm-pair-diff" + (Number(pair.bank.amountDifference) > 0 ? " fhm-diff-pos" : Number(pair.bank.amountDifference) < 0 ? " fhm-diff-neg" : "")}>
                          {pair.bank.matchScore != null && `Score ${formatScore(pair.bank.matchScore)} · `}
                          {formatSignedAmount(pair.bank.amountDifference)} diff
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="fhm-bucket">
                <div className="fhm-bucket-head">
                  <span className="fhm-bucket-dot" style={{ background: '#C2610A' }} />
                  <span className="fhm-bucket-title">Needs Review</span>
                  <span className="fhm-bucket-count">{detail.needsReview.length}</span>
                </div>
                {detail.needsReview.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94A3B8", padding: "4px 2px" }}>No entries need review.</div>
                ) : (
                  detail.needsReview.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))
                )}
              </div>

              <div className="fhm-bucket">
                <div className="fhm-bucket-head">
                  <span className="fhm-bucket-dot" style={{ background: '#DC2626' }} />
                  <span className="fhm-bucket-title">Unmatched</span>
                  <span className="fhm-bucket-count">{detail.unmatched.length}</span>
                </div>
                {detail.unmatched.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94A3B8", padding: "4px 2px" }}>No unmatched entries.</div>
                ) : (
                  detail.unmatched.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const isBank = entry.source === 'BANK'
  return (
    <div className="fhm-entry">
      <div className="fhm-entry-main">
        <div className="fhm-entry-desc">{entry.description}</div>
        <div className="fhm-entry-meta">
          <span className={"fhm-badge " + (isBank ? "fhm-badge-bank" : "fhm-badge-accounting")}>{entry.source}</span>
          {formatDate(entry.transactionDate)}
          {entry.reference ? ` · ${entry.reference}` : ''}
        </div>
      </div>
      <div className="fhm-entry-val">{formatAmount(entry.amount)}</div>
      <div className="fhm-entry-val">{entry.matchScore != null ? formatScore(entry.matchScore) : '—'}</div>
      <div className="fhm-entry-sub">{entry.amountDifference != null ? formatSignedAmount(entry.amountDifference) : '—'}</div>
    </div>
  )
}
