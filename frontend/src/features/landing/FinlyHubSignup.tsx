import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface FinlyHubSignupProps {
  onSignInClick: () => void
  onDismiss: () => void
}

const CSS = `
.fhs-root{
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
.fhs-root *{ box-sizing:border-box; }
.fhs-card{
  position:relative; z-index:1; width:100%; max-width:560px;
  padding:44px 52px 40px; border-radius:20px;
  background:rgba(255,255,255,0.78);
  border:1px solid rgba(226,232,240,0.9);
  backdrop-filter:blur(16px) saturate(160%);
  -webkit-backdrop-filter:blur(16px) saturate(160%);
  box-shadow:0 1px 2px rgba(15,23,42,0.04), 0 30px 60px -20px rgba(15,23,42,0.18);
  opacity:0; transform:translateY(16px) scale(0.98);
  animation:fhs-cardIn 0.7s cubic-bezier(.16,1,.3,1) 0.05s forwards;
}
@keyframes fhs-cardIn{ to{ opacity:1; transform:translateY(0) scale(1); } }
.fhs-mark{
  width:52px; height:52px; border-radius:14px; margin:0 auto 20px;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(135deg, var(--blue) 0%, #3B82F6 45%, var(--purple) 100%);
  background-size:180% 100%;
  box-shadow:0 10px 26px -8px rgba(37,99,235,0.5), 0 2px 8px rgba(37,99,235,0.28);
  animation:fhs-markGlow 5s ease-in-out infinite;
}
@keyframes fhs-markGlow{ 0%,100%{ background-position:0% 0; } 50%{ background-position:100% 0; } }
.fhs-mark span{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:18px; color:#fff; letter-spacing:0.01em;
}
.fhs-title{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:24px;
  color:var(--navy); text-align:center; letter-spacing:-0.01em; margin-bottom:6px;
}
.fhs-subtitle{
  font-size:13.5px; color:var(--grey); text-align:center; margin-bottom:28px;
}
.fhs-subtitle b{ color:var(--slate); font-weight:600; }
.fhs-row{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fhs-field{ margin-bottom:16px; }
.fhs-field label{
  display:block; font-size:12.5px; font-weight:600; color:var(--slate);
  margin-bottom:7px; letter-spacing:0.01em;
}
.fhs-field .fhs-optional{ color:var(--grey); font-weight:500; }
.fhs-input-wrap{ position:relative; }
.fhs-input-wrap input{
  width:100%; padding:11px 14px; border-radius:11px;
  border:1px solid var(--border); background:rgba(248,250,252,0.7);
  font-family:'Inter', sans-serif; font-size:14px; color:var(--navy);
  outline:none; transition:border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.fhs-input-wrap input::placeholder{ color:#94A3B8; }
.fhs-input-wrap input:focus{
  border-color:rgba(37,99,235,0.55); background:#fff;
  box-shadow:0 0 0 4px rgba(37,99,235,0.12);
}
.fhs-input-wrap input.fhs-pw{ padding-right:40px; }
.fhs-eye{
  position:absolute; right:11px; top:50%; transform:translateY(-50%);
  background:none; border:none; padding:4px; cursor:pointer; line-height:0;
  color:#94A3B8; transition:color 0.2s ease;
}
.fhs-eye:hover{ color:var(--blue); }
.fhs-eye svg{ width:17px; height:17px; stroke:currentColor; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhs-submit{
  width:100%; margin-top:6px; padding:12px 18px; border-radius:11px; border:none;
  font-family:'Inter', sans-serif; font-size:14.5px; font-weight:700; color:#fff;
  background:linear-gradient(120deg, var(--blue) 0%, #3B82F6 45%, var(--purple) 100%);
  background-size:180% 100%;
  box-shadow:0 10px 26px -10px rgba(37,99,235,0.55), 0 2px 8px rgba(37,99,235,0.28);
  cursor:pointer; transition:transform 0.25s ease, box-shadow 0.25s ease, background-position 0.4s ease;
}
.fhs-submit:hover{
  transform:translateY(-1px);
  box-shadow:0 14px 30px -10px rgba(37,99,235,0.6), 0 4px 10px rgba(124,58,237,0.32);
  background-position:100% 0;
}
.fhs-submit:active{ transform:translateY(0); }
.fhs-submit:disabled{ opacity:0.7; cursor:default; transform:none; }
.fhs-alt{
  text-align:center; font-size:13px; color:var(--grey); margin-top:18px;
}
.fhs-alt button{
  background:none; border:none; padding:0; font:inherit;
  color:var(--blue); font-weight:600; text-decoration:none; cursor:pointer;
}
.fhs-alt button:hover{ text-decoration:underline; }
@media (max-width:480px){
  .fhs-card{ padding:32px 24px 28px; }
  .fhs-row{ grid-template-columns:1fr; gap:0; }
}
.fhs-root a:focus-visible, .fhs-root button:focus-visible, .fhs-root input:focus-visible{
  outline:2px solid var(--blue); outline-offset:2px;
}
@media (prefers-reduced-motion: reduce){
  .fhs-root *{ animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
}

.dark .fhs-root{ --navy:#F1F5F9; --slate:#E2E8F0; --grey:#94A3B8; --border:#334155; --blue-soft:rgba(37,99,235,0.12); }
.dark .fhs-card{ background:rgba(15,23,42,0.8); border-color:rgba(51,65,85,0.6); }
.dark .fhs-input-wrap input{ background:rgba(30,41,59,0.8); border-color:#334155; color:#F1F5F9; }
.dark .fhs-input-wrap input:focus{ background:rgba(30,41,59,0.95); border-color:rgba(59,130,246,0.55); }
`

export function FinlyHubSignup({ onSignInClick, onDismiss }: Readonly<FinlyHubSignupProps>) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await register({ firstName, lastName, email, password, company })
      onDismiss?.()
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message?: string } } }).response?.data?.message
          : 'Registration failed'
      toast.error(message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      className="fhs-root"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss?.()
      }}
    >
      <style>{CSS}</style>

      <div className="fhs-card">
        <div className="fhs-mark"><span>FH</span></div>
        <h1 className="fhs-title">Create account</h1>
        <p className="fhs-subtitle">Get started with <b>Finly Hub</b></p>

        <form onSubmit={handleSubmit}>
          <div className="fhs-row">
            <div className="fhs-field">
              <label htmlFor="fhs-first">First name</label>
              <div className="fhs-input-wrap">
                <input
                  id="fhs-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  autoComplete="given-name"
                  required
                />
              </div>
            </div>
            <div className="fhs-field">
              <label htmlFor="fhs-last">Last name</label>
              <div className="fhs-input-wrap">
                <input
                  id="fhs-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          </div>

          <div className="fhs-field">
            <label htmlFor="fhs-email">Email</label>
            <div className="fhs-input-wrap">
              <input
                id="fhs-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="fhs-field">
            <label htmlFor="fhs-password">Password</label>
            <div className="fhs-input-wrap">
              <input
                id="fhs-password"
                className="fhs-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="fhs-eye"
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

          <div className="fhs-field">
            <label htmlFor="fhs-company">Company <span className="fhs-optional">(optional)</span></label>
            <div className="fhs-input-wrap">
              <input
                id="fhs-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                autoComplete="organization"
              />
            </div>
          </div>

          <button type="submit" className="fhs-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="fhs-alt">
          Already have an account?{' '}
          <button type="button" onClick={onSignInClick}>Sign in</button>
        </p>
      </div>
    </button>
  )
}
