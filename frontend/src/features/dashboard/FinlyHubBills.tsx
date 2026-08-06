import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { invoiceApi } from '@/api/invoices'
import type { InvoiceResponse, InvoiceApprovalRequest } from '@/types/invoice'

const CSS = `
.fhb-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhb-root *{ box-sizing:border-box; }

.fhb-header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
.fhb-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px; }
.fhb-header p{ font-size:13.5px; color:#64748B; }

.fhb-export-btn{
  display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:11px;
  border:1px solid #E2E8F0; background:#fff; color:#1E293B; font-size:13.5px; font-weight:600;
  cursor:pointer; transition:border-color 0.2s ease, transform 0.2s ease;
}
.fhb-export-btn:hover{ border-color:rgba(37,99,235,0.4); transform:translateY(-1px); }
.fhb-export-btn:disabled{ opacity:0.6; cursor:not-allowed; transform:none; }
.fhb-export-btn svg{ width:15px; height:15px; stroke:#2563EB; fill:none; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }

.fhb-dropzone{
  display:block; width:100%; font-family:'Inter', sans-serif; font-size:inherit;
  border:1.5px dashed #CBD5E1; border-radius:18px; padding:44px 20px;
  text-align:center; background:rgba(255,255,255,0.6); margin-bottom:30px;
  cursor:pointer; transition:border-color 0.2s ease, background 0.2s ease;
}
.fhb-dropzone:hover{ border-color:#2563EB; background:#EFF6FF; }
.fhb-dropzone.fhb-disabled{ opacity:0.5; cursor:not-allowed; }
.fhb-dropzone .fhb-drop-icon{
  width:46px; height:46px; border-radius:13px; margin:0 auto 14px;
  display:flex; align-items:center; justify-content:center; background:rgba(37,99,235,0.09);
}
.fhb-dropzone .fhb-drop-icon svg{ width:22px; height:22px; stroke:#2563EB; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhb-dropzone .fhb-drop-title{ font-size:14.5px; font-weight:600; color:#1E293B; margin-bottom:4px; }
.fhb-dropzone .fhb-drop-sub{ font-size:12.5px; color:#94A3B8; }

.fhb-section-title{ font-family:'Poppins', sans-serif; font-weight:600; font-size:16px; color:#0F172A; margin-bottom:16px; }

.fhb-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; }

.fhb-card{
  display:block; width:100%; text-align:left; font-family:'Inter', sans-serif; font-size:inherit;
  padding:18px 20px; border-radius:16px; background:rgba(255,255,255,0.8);
  border:1px solid #E2E8F0; backdrop-filter:blur(10px); cursor:pointer;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 14px 30px -24px rgba(15,23,42,0.14);
  transition:transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.fhb-card:hover{ transform:translateY(-3px); border-color:rgba(37,99,235,0.28); }
.fhb-card-top{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; gap:10px; }
.fhb-vendor{ font-size:14.5px; font-weight:700; color:#0F172A; }
.fhb-invoice-no{ font-size:12px; color:#94A3B8; margin-top:2px; }
.fhb-badge{ font-size:10px; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.fhb-badge-approved{ background:#ECFDF5; color:#16A34A; }
.fhb-badge-processing{ background:#EFF6FF; color:#2563EB; }
.fhb-badge-rejected{ background:#FEF2F2; color:#DC2626; }

.fhb-card-mid{ display:flex; align-items:center; justify-content:space-between; margin:12px 0 12px; }
.fhb-date{ font-size:12px; color:#64748B; }
.fhb-amount{ font-family:'JetBrains Mono', monospace; font-weight:700; font-size:16px; color:#0F172A; }

.fhb-conf-label{ display:flex; justify-content:space-between; font-size:11px; color:#94A3B8; margin-bottom:6px; }
.fhb-conf-track{ height:5px; border-radius:99px; background:#F1F5F9; overflow:hidden; }
.fhb-conf-fill{ height:100%; border-radius:99px; background:linear-gradient(90deg, #2563EB, #7C3AED); }

.fhb-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhb-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhb-spin 0.6s linear infinite; }
@keyframes fhb-spin{ to{ transform:rotate(360deg); } }

.fhb-error{ text-align:center; padding:30px 0; font-size:13.5px; color:#DC2626; }

.fhb-overlay{
  position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,0.45);
  display:flex; align-items:center; justify-content:center;
  backdrop-filter:blur(4px);
}
.fhb-modal{
  background:#fff; border-radius:20px; width:95%; max-width:620px; max-height:85vh;
  overflow-y:auto; padding:32px 34px 28px;
  box-shadow:0 20px 60px -12px rgba(15,23,42,0.28);
}
.fhb-modal h3{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:18px; color:#0F172A; margin-bottom:6px;
}
.fhb-modal-sub{ font-size:13px; color:#64748B; margin-bottom:20px; }

.fhb-modal-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fhb-modal-full{ grid-column:1/-1; }
.fhb-field label{ display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:5px; }
.fhb-field input{
  width:100%; padding:9px 12px; border-radius:10px; border:1px solid #E2E8F0;
  font-size:13.5px; color:#0F172A; background:#fff; outline:none;
  transition:border-color 0.2s ease, box-shadow 0.2s ease;
}
.fhb-field input:focus{ border-color:rgba(37,99,235,0.5); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
.fhb-field input:read-only{ background:#F8FAFC; color:#475569; }

.fhb-modal-footer{ display:flex; justify-content:flex-end; gap:10px; margin-top:24px; padding-top:18px; border-top:1px solid #F1F5F9; }
.fhb-cancel-btn{
  padding:9px 18px; border-radius:10px; border:1px solid #E2E8F0; background:#fff;
  font-size:13.5px; font-weight:600; color:#475569; cursor:pointer;
  transition:border-color 0.2s ease;
}
.fhb-cancel-btn:hover{ border-color:#CBD5E1; }
.fhb-approve-btn{
  padding:9px 20px; border-radius:10px; border:none;
  background:linear-gradient(120deg, #2563EB, #3B82F6 50%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 6px 16px -4px rgba(37,99,235,0.45);
  transition:transform 0.2s ease, opacity 0.2s ease;
}
.fhb-approve-btn:hover{ transform:translateY(-1px); }
.fhb-approve-btn:disabled{ opacity:0.5; cursor:not-allowed; transform:none; }

.dark .fhb-header h2{ color:#F1F5F9; }
.dark .fhb-header p{ color:#94A3B8; }
.dark .fhb-export-btn{ background:#1E293B; border-color:#334155; color:#E2E8F0; }
.dark .fhb-dropzone{ border-color:#334155; background:rgba(15,23,42,0.6); }
.dark .fhb-dropzone:hover{ border-color:#3B82F6; background:rgba(37,99,235,0.08); }
.dark .fhb-dropzone .fhb-drop-title{ color:#E2E8F0; }
.dark .fhb-section-title{ color:#F1F5F9; }
.dark .fhb-card{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhb-vendor{ color:#F1F5F9; }
.dark .fhb-amount{ color:#F1F5F9; }
.dark .fhb-modal{ background:#0F172A; }
.dark .fhb-modal h3{ color:#F1F5F9; }
.dark .fhb-modal-sub{ color:#94A3B8; }
.dark .fhb-field label{ color:#94A3B8; }
.dark .fhb-field input{ background:#1E293B; border-color:#334155; color:#F1F5F9; }
.dark .fhb-field input:read-only{ background:#0F172A; color:#94A3B8; }
.dark .fhb-modal-footer{ border-color:#1E293B; }
.dark .fhb-cancel-btn{ background:#1E293B; border-color:#334155; color:#94A3B8; }
.dark .fhb-badge-approved{ background:rgba(22,163,74,0.15); }
.dark .fhb-badge-processing{ background:rgba(37,99,235,0.15); }
.dark .fhb-badge-rejected{ background:rgba(220,38,38,0.15); }
.dark .fhb-conf-track{ background:#1E293B; }
@media (max-width:1100px){ .fhb-grid{ grid-template-columns:repeat(2, 1fr); } }
@media (max-width:680px){
  .fhb-grid{ grid-template-columns:1fr; }
  .fhb-modal{ padding:24px 20px 22px; }
  .fhb-modal-grid{ grid-template-columns:1fr; }
}
`;

const BADGE_CLASS: Record<string, string> = {
  APPROVED: 'fhb-badge-approved',
  PROCESSING: 'fhb-badge-processing',
  REJECTED: 'fhb-badge-rejected',
  PENDING: 'fhb-badge-processing',
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function formatInvoiceDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function FinlyHubBills() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null)

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await invoiceApi.list()
      return res.data.data.content
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => invoiceApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice uploaded')
    },
    onError: () => toast.error('Failed to upload invoice'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvoiceApprovalRequest }) =>
      invoiceApi.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice approved')
      setSelectedInvoice(null)
    },
    onError: () => toast.error('Failed to approve invoice'),
  })

  const handleExport = async () => {
    try {
      const res = await invoiceApi.exportApproved()
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'approved-invoices.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export invoices')
    }
  }

  const onFileSelected = (file: File | undefined) => {
    if (!file) return
    uploadMutation.mutate(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    onFileSelected(e.dataTransfer.files?.[0])
  }

  const handleApprove = () => {
    if (!selectedInvoice) return
    approveMutation.mutate({
      id: selectedInvoice.id,
      data: {
        invoiceNumber: selectedInvoice.invoiceNumber ?? undefined,
        vendorName: selectedInvoice.vendorName ?? undefined,
        vendorEmail: selectedInvoice.vendorEmail ?? undefined,
        invoiceDate: selectedInvoice.invoiceDate ?? undefined,
        dueDate: selectedInvoice.dueDate ?? undefined,
        currency: selectedInvoice.currency,
        subtotal: selectedInvoice.subtotal ?? undefined,
        taxAmount: selectedInvoice.taxAmount ?? undefined,
        vatAmount: selectedInvoice.vatAmount ?? undefined,
        discountAmount: selectedInvoice.discountAmount ?? undefined,
        totalAmount: selectedInvoice.totalAmount,
      },
    })
  }

  const updateField = (field: keyof InvoiceResponse, value: string | number | null) => {
    if (!selectedInvoice) return
    setSelectedInvoice({ ...selectedInvoice, [field]: value })
  }

  return (
    <div className="fhb-root">
      <style>{CSS}</style>

      <div className="fhb-header">
        <div>
          <h2>Invoices</h2>
          <p>Upload and manage your invoices</p>
        </div>
        <button type="button" className="fhb-export-btn" onClick={handleExport}>
          <svg viewBox="0 0 24 24"><path d="M12 3.5v11M8 11l4 4 4-4" /><path d="M4.5 17v2.5A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V17" /></svg>
          Export to Excel
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(e) => {
          onFileSelected(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <button
        type="button"
        className={`fhb-dropzone${uploadMutation.isPending ? ' fhb-disabled' : ''}`}
        style={dragOver ? { borderColor: '#2563EB', background: '#EFF6FF' } : undefined}
        onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label="Upload invoice"
      >
        <div className="fhb-drop-icon">
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
        </div>
        <div className="fhb-drop-title">
          {uploadMutation.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
        </div>
        <div className="fhb-drop-sub">PDF, PNG, or JPG — up to 10MB</div>
      </button>

      <div className="fhb-section-title">Processed Invoices</div>
      {isLoading ? (
        <div className="fhb-spinner" />
      ) : isError ? (
        <div className="fhb-error">Failed to load invoices. Please try again.</div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="fhb-error" style={{ color: '#94A3B8' }}>No invoices processed yet.</div>
      ) : (
        <div className="fhb-grid">
          {invoices.map((inv) => (
            <button
              type="button"
              className="fhb-card"
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
            >
              <div className="fhb-card-top">
                <div>
                  <div className="fhb-vendor">{inv.vendorName || 'Unknown Vendor'}</div>
                  <div className="fhb-invoice-no">{inv.invoiceNumber || 'No invoice number'}</div>
                </div>
                <span className={`fhb-badge ${BADGE_CLASS[inv.status] || 'fhb-badge-processing'}`}>
                  {inv.status}
                </span>
              </div>
              <div className="fhb-card-mid">
                <span className="fhb-date">{formatInvoiceDate(inv.invoiceDate)}</span>
                <span className="fhb-amount">{formatAmount(inv.totalAmount, inv.currency)}</span>
              </div>
              <div className="fhb-conf-label">
                <span>Confidence</span>
                <span>{inv.confidenceScore != null ? `${inv.confidenceScore}%` : '—'}</span>
              </div>
              <div className="fhb-conf-track">
                <div className="fhb-conf-fill" style={{ width: `${inv.confidenceScore ?? 0}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedInvoice && (
        <div
          className="fhb-overlay"
          role="button"
          tabIndex={0}
          aria-label="Close invoice details"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedInvoice(null) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              setSelectedInvoice(null);
            }
          }}
        >
          <div className="fhb-modal">
            <h3>Invoice Details</h3>
            <p className="fhb-modal-sub">
              Review and edit fields, then approve the invoice.
            </p>

            <div className="fhb-modal-grid">
              <div className="fhb-field">
                <label htmlFor="fhb-vendor-name">Vendor Name</label>
                <input id="fhb-vendor-name" type="text" value={selectedInvoice.vendorName ?? ''} onChange={(e) => updateField('vendorName', e.target.value || null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-invoice-number">Invoice Number</label>
                <input id="fhb-invoice-number" type="text" value={selectedInvoice.invoiceNumber ?? ''} onChange={(e) => updateField('invoiceNumber', e.target.value || null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-vendor-email">Vendor Email</label>
                <input id="fhb-vendor-email" type="email" value={selectedInvoice.vendorEmail ?? ''} onChange={(e) => updateField('vendorEmail', e.target.value || null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-currency">Currency</label>
                <input id="fhb-currency" type="text" value={selectedInvoice.currency} onChange={(e) => updateField('currency', e.target.value)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-invoice-date">Invoice Date</label>
                <input id="fhb-invoice-date" type="date" value={toDateInputValue(selectedInvoice.invoiceDate)} onChange={(e) => updateField('invoiceDate', e.target.value || null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-due-date">Due Date</label>
                <input id="fhb-due-date" type="date" value={toDateInputValue(selectedInvoice.dueDate)} onChange={(e) => updateField('dueDate', e.target.value || null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-subtotal">Subtotal</label>
                <input id="fhb-subtotal" type="number" step="0.01" value={selectedInvoice.subtotal ?? ''} onChange={(e) => updateField('subtotal', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-tax">Tax</label>
                <input id="fhb-tax" type="number" step="0.01" value={selectedInvoice.taxAmount ?? ''} onChange={(e) => updateField('taxAmount', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-vat">VAT</label>
                <input id="fhb-vat" type="number" step="0.01" value={selectedInvoice.vatAmount ?? ''} onChange={(e) => updateField('vatAmount', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-discount">Discount</label>
                <input id="fhb-discount" type="number" step="0.01" value={selectedInvoice.discountAmount ?? ''} onChange={(e) => updateField('discountAmount', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-total">Total Amount</label>
                <input id="fhb-total" type="number" step="0.01" value={selectedInvoice.totalAmount} onChange={(e) => updateField('totalAmount', Number(e.target.value) || 0)} />
              </div>
              <div className="fhb-field">
                <label htmlFor="fhb-status">Status</label>
                <input id="fhb-status" type="text" value={selectedInvoice.status} readOnly />
              </div>
            </div>

            <div className="fhb-modal-footer">
              <button type="button" className="fhb-cancel-btn" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
              <button type="button" className="fhb-approve-btn" onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
