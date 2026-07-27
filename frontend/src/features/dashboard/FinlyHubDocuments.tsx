import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { documentApi } from '@/api/documents'
import type { Document } from '@/types/document'

const CSS = `
.fhdc-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhdc-root *{ box-sizing:border-box; }

.fhdc-header{ margin-bottom:24px; }
.fhdc-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px; }
.fhdc-header p{ font-size:13.5px; color:#64748B; }

.fhdc-panel{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  padding:22px 24px 20px; margin-bottom:22px;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 16px 34px -24px rgba(15,23,42,0.14);
}
.fhdc-panel h3{
  display:flex; align-items:center; gap:9px;
  font-family:'Poppins', sans-serif; font-weight:600; font-size:15px; color:#0F172A; margin-bottom:16px;
}
.fhdc-panel h3 svg{ width:16px; height:16px; stroke:#2563EB; fill:none; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }

.fhdc-dropzone{
  border:1.5px dashed #CBD5E1; border-radius:16px; padding:34px 20px; text-align:center;
  background:rgba(255,255,255,0.6); cursor:pointer; transition:border-color 0.2s ease, background 0.2s ease;
}
.fhdc-dropzone:hover{ border-color:#2563EB; background:#EFF6FF; }
.fhdc-dropzone.fhdc-disabled{ opacity:0.5; cursor:not-allowed; }
.fhdc-dropzone svg{ width:26px; height:26px; stroke:#94A3B8; fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; margin-bottom:10px; }
.fhdc-dropzone .fhdc-drop-title{ font-size:14px; font-weight:600; color:#1E293B; margin-bottom:3px; }
.fhdc-dropzone .fhdc-drop-sub{ font-size:12px; color:#94A3B8; }

.fhdc-doc-row{
  display:flex; align-items:center; gap:14px; padding:14px 4px;
  border-bottom:1px solid #F1F5F9;
}
.fhdc-doc-row:last-child{ border-bottom:none; }
.fhdc-doc-icon{
  width:38px; height:38px; border-radius:10px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; background:rgba(37,99,235,0.09);
}
.fhdc-doc-icon svg{ width:17px; height:17px; stroke:#2563EB; fill:none; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.fhdc-doc-body{ flex:1; min-width:0; }
.fhdc-doc-name{ font-size:13.5px; font-weight:600; color:#0F172A; }
.fhdc-doc-meta{ font-size:11.5px; color:#94A3B8; margin-top:2px; }
.fhdc-doc-actions{ display:flex; gap:6px; flex-shrink:0; }
.fhdc-icon-btn{
  width:32px; height:32px; border-radius:9px; border:1px solid #E2E8F0; background:#fff;
  display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.2s ease;
}
.fhdc-icon-btn:hover{ border-color:rgba(37,99,235,0.4); }
.fhdc-icon-btn svg{ width:14px; height:14px; stroke:#64748B; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhdc-icon-btn.fhdc-danger:hover svg{ stroke:#DC2626; }
.fhdc-icon-btn.fhdc-danger:hover{ border-color:rgba(220,38,38,0.4); }

.fhdc-spinner{ display:flex; justify-content:center; padding:30px 0; }
.fhdc-spinner:after{ content:''; width:24px; height:24px; border:3px solid #E2E8F0; border-top-color:#2563EB; border-radius:50%; animation:fhdc-spin 0.6s linear infinite; }
@keyframes fhdc-spin{ to{ transform:rotate(360deg); } }

.fhdc-error{ text-align:center; padding:30px 0; font-size:13.5px; color:#DC2626; }
`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDocDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function FinlyHubDocuments() {
  const queryClient = useQueryClient()

  const { data: docs, isLoading, isError } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await documentApi.list()
      return res.data.data
    },
    refetchInterval: (query) => {
      const docs = query.state.data
      if (docs?.some(d => d.status === 'UPLOADED' || d.status === 'PROCESSING')) {
        return 2000
      }
      return false
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded')
    },
    onError: () => toast.error('Failed to upload document'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const reprocessMutation = useMutation({
    mutationFn: (id: number) => documentApi.reprocess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document queued for reprocessing')
    },
    onError: () => toast.error('Failed to reprocess document'),
  })

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  const handleDownload = async (doc: Document) => {
    try {
      const res = await documentApi.download(doc.id)
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.originalFilename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download document')
    }
  }

  const statusStyle = (status: Document['status']) => {
    switch (status) {
      case 'INDEXED':
        return { bg: '#ECFDF5', color: '#16A34A', label: 'Indexed' }
      case 'PROCESSING':
        return { bg: '#EFF6FF', color: '#2563EB', label: 'Processing' }
      case 'UPLOADED':
        return { bg: '#FFFBEB', color: '#D97706', label: 'Uploaded' }
      case 'ERROR':
        return { bg: '#FEF2F2', color: '#DC2626', label: 'Error' }
    }
  }

  return (
    <div className="fhdc-root">
      <style>{CSS}</style>

      <div className="fhdc-header">
        <h2>Documents</h2>
        <p>Upload and manage your financial documents</p>
      </div>

      <div className="fhdc-panel">
        <h3>
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          Upload Document
        </h3>
        <label className={`fhdc-dropzone${uploadMutation.isPending ? ' fhdc-disabled' : ''}`} style={{ display: "block" }}>
          <input type="file" style={{ display: "none" }} onChange={onUpload} disabled={uploadMutation.isPending} />
          <svg viewBox="0 0 24 24" style={{ display: "block", margin: "0 auto 10px" }}><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          <div className="fhdc-drop-title">
            {uploadMutation.isPending ? 'Uploading...' : 'Drag & drop or click to browse'}
          </div>
          <div className="fhdc-drop-sub">PDF, DOCX, or TXT files</div>
        </label>
      </div>

      <div className="fhdc-panel">
        <h3>
          <svg viewBox="0 0 24 24"><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" /></svg>
          All Documents
        </h3>
        {isLoading ? (
          <div className="fhdc-spinner" />
        ) : isError ? (
          <div className="fhdc-error">Failed to load documents. Please try again.</div>
        ) : !docs || docs.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", padding: "10px 4px" }}>No documents uploaded yet.</div>
        ) : (
          docs.map((d) => {
            const ss = statusStyle(d.status)
            return (
              <div className="fhdc-doc-row" key={d.id}>
                <div className="fhdc-doc-icon">
                  <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg>
                </div>
                <div className="fhdc-doc-body">
                  <div className="fhdc-doc-name">{d.originalFilename}</div>
                  <div className="fhdc-doc-meta">{d.documentType} · {formatDocDate(d.createdAt)} · {formatFileSize(d.fileSize)}</div>
                  {d.status === 'ERROR' && d.errorMessage && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: 4 }}>{d.errorMessage}</div>
                  )}
                </div>
                <span style={{
                  fontSize: '10.5px', fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  background: ss.bg, color: ss.color, whiteSpace: 'nowrap',
                }}>{ss.label}</span>
                <div className="fhdc-doc-actions">
                  {(d.status === 'ERROR' || d.status === 'UPLOADED') && (
                    <button
                      type="button"
                      className="fhdc-icon-btn"
                      aria-label="Reprocess"
                      title="Reprocess document"
                      onClick={() => reprocessMutation.mutate(d.id)}
                      disabled={reprocessMutation.isPending}
                    >
                      <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 1 1.5 5" /><path d="M3 17V12h5" /></svg>
                    </button>
                  )}
                  <button type="button" className="fhdc-icon-btn" aria-label="View" onClick={() => handleDownload(d)}>
                    <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  </button>
                  <button type="button" className="fhdc-icon-btn" aria-label="Download" onClick={() => handleDownload(d)}>
                    <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 11l4 4 4-4" /><path d="M4.5 17v2.5A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V17" /></svg>
                  </button>
                  <button type="button" className="fhdc-icon-btn fhdc-danger" aria-label="Delete" onClick={() => deleteMutation.mutate(d.id)} disabled={deleteMutation.isPending}>
                    <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8.5 0 .7 12a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-12" /></svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}
