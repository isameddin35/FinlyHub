import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface FinlyHubLoginProps {
  onCreateAccount: () => void
  onDismiss: () => void
}

const CSS = `
.fhl-root{
  --bg:#ffffff;
  --navy:#0F172A;
  --slate:#1E293B;
  --grey:#64748B;
  --blue:#2563EB;
  --blue-soft:#EFF6FF;
  --purple:#7C3AED;
  --green:#16A34A;
  --border:#E2E8F0;
  font-family:'Inter', sans-serif;
  color:var(--slate);
  position:relative;
  width:100%;
  min-height:100vh;
  min-height:100dvh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:32px 20px;
  overflow:hidden;
  background:transparent;
  border:none; margin:0; font:inherit; text-align:left;
}
.fhl-root *{ box-sizing:border-box; }
.fhl-grid-texture{
  position:absolute; inset:0; z-index:0; pointer-events:none;
  background-image:
    linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px);
  background-size:52px 52px;
  mask-image:radial-gradient(ellipse 80% 70% at 50% 30%, #000 20%, transparent 82%);
  -webkit-mask-image:radial-gradient(ellipse 80% 70% at 50% 30%, #000 20%, transparent 82%);
}
.fhl-orb{ position:absolute; border-radius:50%; filter:blur(80px); z-index:0; pointer-events:none; opacity:0.5; }
.fhl-orb-blue{
  width:480px;height:480px; top:-140px; left:-120px;
  background:radial-gradient(circle at 40% 40%, rgba(37,99,235,0.30), rgba(37,99,235,0) 70%);
  animation:fhl-driftA 20s ease-in-out infinite;
}
.fhl-orb-purple{
  width:440px;height:440px; bottom:-160px; right:-120px;
  background:radial-gradient(circle at 60% 60%, rgba(124,58,237,0.22), rgba(124,58,237,0) 70%);
  animation:fhl-driftB 24s ease-in-out infinite;
}
@keyframes fhl-driftA{ 0%,100%{transform:translate(0,0);} 50%{transform:translate(30px,40px);} }
@keyframes fhl-driftB{ 0%,100%{transform:translate(0,0);} 50%{transform:translate(-40px,-24px);} }
.fhl-card{
  position:relative; z-index:1; width:100%; max-width:560px;
  padding:44px 52px 40px; border-radius:20px;
  background:rgba(255,255,255,0.78);
  border:1px solid rgba(226,232,240,0.9);
  backdrop-filter:blur(16px) saturate(160%);
  -webkit-backdrop-filter:blur(16px) saturate(160%);
  box-shadow:0 1px 2px rgba(15,23,42,0.04), 0 30px 60px -20px rgba(15,23,42,0.18);
  opacity:0; transform:translateY(16px) scale(0.98);
  animation:fhl-cardIn 0.7s cubic-bezier(.16,1,.3,1) 0.05s forwards;
}
@keyframes fhl-cardIn{ to{ opacity:1; transform:translateY(0) scale(1); } }
.fhl-mark{
  width:52px; height:52px; border-radius:14px; margin:0 auto 20px;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(135deg, var(--blue) 0%, #3B82F6 45%, var(--purple) 100%);
  background-size:180% 100%;
  box-shadow:0 10px 26px -8px rgba(37,99,235,0.5), 0 2px 8px rgba(37,99,235,0.28);
  animation:fhl-markGlow 5s ease-in-out infinite;
}
@keyframes fhl-markGlow{ 0%,100%{ background-position:0% 0; } 50%{ background-position:100% 0; } }
.fhl-mark span{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:18px; color:#fff; letter-spacing:0.01em;
}
.fhl-title{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:24px;
  color:var(--navy); text-align:center; letter-spacing:-0.01em; margin-bottom:6px;
}
.fhl-subtitle{
  font-size:13.5px; color:var(--grey); text-align:center; margin-bottom:28px;
}
.fhl-subtitle b{ color:var(--slate); font-weight:600; }
.fhl-field{ margin-bottom:16px; }
.fhl-field label{
  display:block; font-size:12.5px; font-weight:600; color:var(--slate);
  margin-bottom:7px; letter-spacing:0.01em;
}
.fhl-input-wrap{ position:relative; }
.fhl-input-wrap input{
  width:100%; padding:11px 14px; border-radius:11px;
  border:1px solid var(--border); background:rgba(248,250,252,0.7);
  font-family:'Inter', sans-serif; font-size:14px; color:var(--navy);
  outline:none; transition:border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.fhl-input-wrap input::placeholder{ color:#94A3B8; }
.fhl-input-wrap input:focus{
  border-color:rgba(37,99,235,0.55); background:#fff;
  box-shadow:0 0 0 4px rgba(37,99,235,0.12);
}
.fhl-input-wrap input[type="password"], .fhl-input-wrap input.fhl-pw{ padding-right:40px; }
.fhl-eye{
  position:absolute; right:11px; top:50%; transform:translateY(-50%);
  background:none; border:none; padding:4px; cursor:pointer; line-height:0;
  color:#94A3B8; transition:color 0.2s ease;
}
.fhl-eye:hover{ color:var(--blue); }
.fhl-eye svg{ width:17px; height:17px; stroke:currentColor; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhl-submit{
  width:100%; margin-top:6px; padding:12px 18px; border-radius:11px; border:none;
  font-family:'Inter', sans-serif; font-size:14.5px; font-weight:700; color:#fff;
  background:linear-gradient(120deg, var(--blue) 0%, #3B82F6 45%, var(--purple) 100%);
  background-size:180% 100%;
  box-shadow:0 10px 26px -10px rgba(37,99,235,0.55), 0 2px 8px rgba(37,99,235,0.28);
  cursor:pointer; transition:transform 0.25s ease, box-shadow 0.25s ease, background-position 0.4s ease;
}
.fhl-submit:hover{
  transform:translateY(-1px);
  box-shadow:0 14px 30px -10px rgba(37,99,235,0.6), 0 4px 10px rgba(124,58,237,0.32);
  background-position:100% 0;
}
.fhl-submit:active{ transform:translateY(0); }
.fhl-submit:disabled{ opacity:0.7; cursor:default; transform:none; }
.fhl-alt{
  text-align:center; font-size:13px; color:var(--grey); margin-top:18px;
}
.fhl-alt button{
  background:none; border:none; padding:0; font:inherit;
  color:var(--blue); font-weight:600; text-decoration:none; cursor:pointer;
}
.fhl-alt button:hover{ text-decoration:underline; }
.fhl-demo{
  margin-top:22px; padding:13px 15px; border-radius:12px;
  background:var(--blue-soft); border:1px solid rgba(37,99,235,0.14);
}
.fhl-demo-title{
  font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
  color:var(--blue); margin-bottom:7px;
}
.fhl-demo-row{
  display:flex; justify-content:space-between; gap:10px;
  font-size:12px; color:var(--grey); padding:3px 0;
}
.fhl-demo-row b{ color:var(--slate); font-weight:600; }
.fhl-demo-row span.fhl-mono{
  font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--grey);
}
@media (max-width:420px){
  .fhl-card{ padding:32px 24px 28px; }
}
.fhl-root a:focus-visible, .fhl-root button:focus-visible, .fhl-root input:focus-visible{
  outline:2px solid var(--blue); outline-offset:2px;
}
@media (prefers-reduced-motion: reduce){
  .fhl-root *{ animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
}

.dark .fhl-root{ --navy:#F1F5F9; --slate:#E2E8F0; --grey:#94A3B8; --border:#334155; --blue-soft:rgba(37,99,235,0.12); }
.dark .fhl-card{ background:rgba(15,23,42,0.8); border-color:rgba(51,65,85,0.6); }
.dark .fhl-input-wrap input{ background:rgba(30,41,59,0.8); border-color:#334155; color:#F1F5F9; }
.dark .fhl-input-wrap input:focus{ background:rgba(30,41,59,0.95); border-color:rgba(59,130,246,0.55); }
.dark .fhl-root .fhl-grid-texture{ background-image:linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px); }
.dark .fhl-demo{ border-color:rgba(37,99,235,0.2); }
`

export function FinlyHubLogin({ onCreateAccount, onDismiss }: Readonly<FinlyHubLoginProps>) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login({ email, password })
      onDismiss?.()
      navigate('/dashboard')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      className="fhl-root"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss?.()
      }}
    >
      <style>{CSS}</style>

      <div className="fhl-card">
        <div className="fhl-mark"><span>FH</span></div>
        <h1 className="fhl-title">Welcome back</h1>
        <p className="fhl-subtitle">Sign in to your <b>Finly Hub</b> account</p>

        <form onSubmit={handleSubmit}>
          <div className="fhl-field">
            <label htmlFor="fhl-email">Email</label>
            <div className="fhl-input-wrap">
              <input
                id="fhl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="fhl-field">
            <label htmlFor="fhl-password">Password</label>
            <div className="fhl-input-wrap">
              <input
                id="fhl-password"
                className="fhl-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="fhl-eye"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? (
                  <svg viewBox="0 0 24 24"><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.5A10.4 10.4 0 0 1 12 5c5 0 8.5 3.5 10 7-.5 1.1-1.2 2.2-2.1 3.2M6.5 6.7C4.6 8 3.1 9.8 2 12c1.5 3.5 5 7 10 7 1.2 0 2.3-.2 3.4-.6" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3.2" /></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="fhl-submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="fhl-alt">
          Don't have an account?{' '}
          <button type="button" onClick={onCreateAccount}>Create one</button>
        </p>
      </div>
    </button>
  )
}
