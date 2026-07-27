import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { authApi } from '@/api/auth'

const CSS = `
.fhst-root{ font-family:'Inter', sans-serif; color:#1E293B; max-width:760px; }
.fhst-root *{ box-sizing:border-box; }

.fhst-header{ margin-bottom:24px; }
.fhst-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px; }
.fhst-header p{ font-size:13.5px; color:#64748B; }

.fhst-panel{
  border-radius:18px; background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  padding:24px 26px 22px; margin-bottom:20px;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 16px 34px -24px rgba(15,23,42,0.14);
}
.fhst-panel h3{
  display:flex; align-items:center; gap:9px;
  font-family:'Poppins', sans-serif; font-weight:600; font-size:15.5px; color:#0F172A; margin-bottom:18px;
}
.fhst-panel h3 svg{ width:16px; height:16px; stroke:#2563EB; fill:none; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }

.fhst-row2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
.fhst-field label{ display:block; font-size:12.5px; font-weight:600; color:#1E293B; margin-bottom:7px; }
.fhst-field input{
  width:100%; padding:10px 12px; border-radius:10px; border:1px solid #E2E8F0;
  font-family:'Inter', sans-serif; font-size:13.5px; color:#0F172A; outline:none;
  transition:border-color 0.2s ease, box-shadow 0.2s ease;
}
.fhst-field input:focus{ border-color:rgba(37,99,235,0.5); box-shadow:0 0 0 4px rgba(37,99,235,0.1); }

.fhst-save-btn{
  display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:11px; border:none;
  background:linear-gradient(120deg, #2563EB, #3B82F6 45%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(37,99,235,0.5); transition:transform 0.2s ease;
}
.fhst-save-btn:hover{ transform:translateY(-1px); }
.fhst-save-btn:disabled{ opacity:0.6; cursor:not-allowed; transform:none; }
.fhst-save-btn svg{ width:14px; height:14px; stroke:#fff; fill:none; stroke-width:2.1; stroke-linecap:round; stroke-linejoin:round; }
.fhst-saved-note{ font-size:12px; color:#16A34A; margin-left:10px; font-weight:600; }

.fhst-theme-row{ display:flex; align-items:center; justify-content:space-between; }
.fhst-theme-label{ font-size:13.5px; font-weight:600; color:#1E293B; }
.fhst-theme-sub{ font-size:12px; color:#94A3B8; margin-top:2px; }
.fhst-toggle-btn{
  width:38px; height:38px; border-radius:11px; border:1px solid #E2E8F0; background:#fff;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.fhst-toggle-btn svg{ width:16px; height:16px; stroke:#475569; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

.fhst-info-row{
  display:flex; align-items:center; justify-content:space-between; padding:13px 16px;
  border-radius:11px; background:#F8FAFC; margin-bottom:10px;
}
.fhst-info-row:last-child{ margin-bottom:0; }
.fhst-info-label{ font-size:12.5px; color:#94A3B8; }
.fhst-info-value{ font-size:13.5px; font-weight:600; color:#0F172A; }
.fhst-pill{ font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; background:#EFF6FF; color:#2563EB; }
.fhst-pill-green{ background:#ECFDF5; color:#16A34A; }

.fhst-connected-row{ display:flex; align-items:center; gap:10px; }
.fhst-note{ font-size:12px; color:#94A3B8; margin-top:12px; }
`;

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export function FinlyHubSettings() {
  const { user, updateUser } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [company, setCompany] = useState(user?.company ?? '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const response = await authApi.updateProfile({ firstName, lastName, company })
      updateUser(response.data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }, [firstName, lastName, company, updateUser])

  return (
    <div className="fhst-root">
      <style>{CSS}</style>

      <div className="fhst-header">
        <h2>Settings</h2>
        <p>Manage your account and application preferences</p>
      </div>

      <div className="fhst-panel">
        <h3><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.4" /><path d="M5 20c1.2-3.6 4.2-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>Profile</h3>
        <div className="fhst-row2">
          <div className="fhst-field">
            <label>First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="fhst-field">
            <label>Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="fhst-field" style={{ marginBottom: 18 }}>
          <label>Company</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <button type="button" className="fhst-save-btn" onClick={handleSave} disabled={saving}>
          <svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7" /></svg>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="fhst-saved-note">Saved</span>}
      </div>

      <div className="fhst-panel">
        <h3><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 3.5v1.8M12 18.7v1.8M20.5 12h-1.8M5.3 12H3.5M17.7 6.3l-1.3 1.3M7.6 16.1l-1.3 1.3M17.7 17.7l-1.3-1.3M7.6 7.9 6.3 6.6" /></svg>Appearance</h3>
        <div className="fhst-theme-row">
          <div>
            <div className="fhst-theme-label">Theme</div>
            <div className="fhst-theme-sub">Switch between dark and light mode</div>
          </div>
          <button type="button" className="fhst-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 3.5v1.8M12 18.7v1.8M20.5 12h-1.8M5.3 12H3.5M17.7 6.3l-1.3 1.3M7.6 16.1l-1.3 1.3M17.7 17.7l-1.3-1.3M7.6 7.9 6.3 6.6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><path d="M21 12.8a9 9 0 1 1-10.3-10.3A7.5 7.5 0 0 0 21 12.8z" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className="fhst-panel">
        <h3><svg viewBox="0 0 24 24"><path d="M12 3.5 4.5 6.2v5.4c0 4.7 3.2 8.9 7.5 10.4 4.3-1.5 7.5-5.7 7.5-10.4V6.2L12 3.5z" /></svg>User Info</h3>
        <div className="fhst-info-row"><span className="fhst-info-label">Email</span><span className="fhst-info-value">{user?.email ?? '—'}</span></div>
        <div className="fhst-info-row"><span className="fhst-info-label">Roles</span><span className="fhst-pill">{user?.roles?.[0] ?? '—'}</span></div>
        <div className="fhst-info-row"><span className="fhst-info-label">Member since</span><span className="fhst-info-value">{formatDate(user?.createdAt)}</span></div>
      </div>

      <div className="fhst-panel">
        <h3><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.2" /><path d="M10.3 10.3 20 20M15.5 14.5 20 10" /></svg>API & Integrations</h3>
        <div className="fhst-info-row">
          <span className="fhst-info-label">AI Provider</span>
          <div className="fhst-connected-row">
            <span className="fhst-info-value">Groq (powered by Meta Llama)</span>
            <span className="fhst-pill fhst-pill-green">Connected</span>
          </div>
        </div>
        <p className="fhst-note">AI provider configuration is managed by your administrator. Contact support to update your API keys.</p>
      </div>

      <div className="fhst-panel">
        <h3><svg viewBox="0 0 24 24"><path d="M12 3.5 4.5 6.2v5.4c0 4.7 3.2 8.9 7.5 10.4 4.3-1.5 7.5-5.7 7.5-10.4V6.2L12 3.5z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>Account</h3>
        <div className="fhst-info-row"><span className="fhst-info-label">Account ID</span><span className="fhst-info-value">#{user?.id ?? '—'}</span></div>
        <div className="fhst-info-row"><span className="fhst-info-label">Email verified</span><span className="fhst-pill fhst-pill-green">{user?.emailVerified ? 'Yes' : 'No'}</span></div>
      </div>
    </div>
  );
}
