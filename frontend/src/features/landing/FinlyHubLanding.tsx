import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FinlyHubLogin } from "./FinlyHubLogin";
import { FinlyHubSignup } from "./FinlyHubSignup";

/**
 * Finly Hub — landing page
 * Converted 1:1 from the original static HTML/CSS/JS into a single-file
 * React component. All animations (letter shatter, scroll reveals, card
 * tilt, count-up numbers, traveling grid packets, video pause-on-scroll)
 * are re-implemented with React refs + useEffect instead of
 * document.getElementById / querySelectorAll on the whole page, so this
 * component is safe to mount alongside other React content.
 */

const CSS = `
.fh-root{
  --bg:#ffffff;
  --bg-tint:#F8FAFC;
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
  background:transparent;
  position:relative;
  overflow-x:hidden;
}
.fh-root *{ box-sizing:border-box; }
.fh-root html, .fh-root body{ min-height:100%; }

/* ================= BACKGROUND ================= */
.fh-bg-canvas{ position:fixed; inset:0; z-index:-3; background:var(--bg); }

.fh-grid-texture{
  position:fixed; inset:0; z-index:-3; pointer-events:none;
  background-image:
    linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px);
  background-size:52px 52px;
  mask-image:radial-gradient(ellipse 100% 90% at 50% 20%, #000 20%, transparent 82%);
  -webkit-mask-image:radial-gradient(ellipse 100% 90% at 50% 20%, #000 20%, transparent 82%);
}

.fh-orb{ position:fixed; border-radius:50%; z-index:-2; pointer-events:none; opacity:0.5; }
.fh-orb-blue{
  width:560px;height:560px; top:-160px; left:-120px;
  background:radial-gradient(circle at 40% 40%, rgba(37,99,235,0.32), rgba(37,99,235,0) 70%);
  animation:fh-driftA 20s ease-in-out infinite, fh-morph 14s ease-in-out infinite;
}
.fh-orb-purple{
  width:520px;height:520px; bottom:-200px; right:-140px;
  background:radial-gradient(circle at 60% 60%, rgba(124,58,237,0.24), rgba(124,58,237,0) 70%);
  animation:fh-driftB 24s ease-in-out infinite, fh-morph 18s ease-in-out infinite reverse;
}
.fh-orb-soft{
  width:420px;height:420px; top:60%; right:8%;
  background:radial-gradient(circle at 50% 50%, rgba(37,99,235,0.14), rgba(37,99,235,0) 70%);
  animation:fh-driftC 28s ease-in-out infinite, fh-morph 16s ease-in-out infinite;
}

@keyframes fh-driftA{ 0%,100%{transform:translate(0,0) rotate(0deg);} 50%{transform:translate(40px,50px) rotate(20deg);} }
@keyframes fh-driftB{ 0%,100%{transform:translate(0,0) rotate(0deg);} 50%{transform:translate(-50px,-30px) rotate(-16deg);} }
@keyframes fh-driftC{ 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-30px,40px) scale(1.15);} }
@keyframes fh-morph{
  0%,100%{ border-radius:50% 50% 50% 50%; }
  33%{ border-radius:58% 42% 45% 55%; }
  66%{ border-radius:44% 56% 60% 40%; }
}

.fh-packet-layer{ position:fixed; inset:0; z-index:-1; pointer-events:none; overflow:hidden; }
.fh-packet{
  position:absolute; width:6px; height:6px; border-radius:50%;
  background:var(--blue);
  box-shadow:0 0 8px 2px rgba(37,99,235,0.9), 0 0 16px 4px rgba(37,99,235,0.4);
  opacity:0;
}
.fh-packet.h{ animation:fh-travelH linear infinite; }
.fh-packet.v{ animation:fh-travelV linear infinite; }
@keyframes fh-travelH{
  0%{ transform:translateX(-10px); opacity:0; }
  8%{ opacity:0.9; } 92%{ opacity:0.9; }
  100%{ transform:translateX(calc(100vw + 10px)); opacity:0; }
}
@keyframes fh-travelV{
  0%{ transform:translateY(-10px); opacity:0; }
  8%{ opacity:0.9; } 92%{ opacity:0.9; }
  100%{ transform:translateY(calc(100vh + 10px)); opacity:0; }
}

/* ================= TOP-RIGHT LOGIN BLOCK ================= */
.fh-top-nav{
  position:fixed; top:22px; right:28px; z-index:50;
  opacity:0; animation:fh-fadeIn 0.8s ease 0.35s forwards;
}
.fh-top-nav .fh-login-btn{
  position:relative;
  display:inline-flex; align-items:center; gap:9px;
  padding:13px 26px 13px 22px; border-radius:999px;
  background:linear-gradient(120deg, var(--blue) 0%, #3B82F6 45%, var(--purple) 100%);
  background-size:180% 100%;
  border:none;
  font-family:'Inter', sans-serif; font-size:14.5px; font-weight:700; color:#fff;
  letter-spacing:0.01em;
  text-decoration:none;
  box-shadow:0 10px 26px -8px rgba(37,99,235,0.55), 0 2px 8px rgba(37,99,235,0.3);
  animation:fh-navGlowShift 5s ease-in-out infinite, fh-navPulse 2.6s ease-in-out infinite;
  transition:transform 0.3s ease, box-shadow 0.3s ease;
  cursor:pointer;
}
.fh-top-nav .fh-login-btn svg{ width:17px; height:17px; stroke:#fff; fill:none; stroke-width:2.1; stroke-linecap:round; stroke-linejoin:round; }
.fh-top-nav .fh-login-btn:hover{
  transform:translateY(-2px) scale(1.04);
  box-shadow:0 16px 34px -10px rgba(37,99,235,0.6), 0 4px 12px rgba(124,58,237,0.35);
}
@keyframes fh-navGlowShift{ 0%,100%{ background-position:0% 0; } 50%{ background-position:100% 0; } }
@keyframes fh-navPulse{
  0%,100%{ box-shadow:0 10px 26px -8px rgba(37,99,235,0.55), 0 2px 8px rgba(37,99,235,0.3); }
  50%{ box-shadow:0 12px 32px -6px rgba(37,99,235,0.75), 0 4px 14px rgba(124,58,237,0.45); }
}
@media (max-width:760px){
  .fh-top-nav{ top:14px; right:16px; }
  .fh-top-nav .fh-login-btn{ padding:10px 20px 10px 16px; font-size:13px; }
}

/* ================= LOGIN OVERLAY ================= */
.fh-login-overlay{
  position:fixed; inset:0; z-index:200;
  display:flex; align-items:center; justify-content:center;
  background:rgba(15,23,42,0.38);
  backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
  opacity:0; animation:fh-fadeIn 0.25s ease forwards;
  padding:20px;
}
.fh-login-overlay .fh-login-close{
  position:absolute; top:22px; right:28px;
  width:38px; height:38px; border-radius:50%; border:none; cursor:pointer;
  background:rgba(255,255,255,0.9); border:1px solid rgba(226,232,240,0.9);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 18px -8px rgba(15,23,42,0.35);
  transition:transform 0.25s ease, background 0.25s ease;
}
.fh-login-overlay .fh-login-close:hover{ transform:scale(1.06); background:#fff; }
.fh-login-overlay .fh-login-close svg{ width:16px; height:16px; stroke:var(--slate); fill:none; stroke-width:2.2; stroke-linecap:round; }
@media (max-width:760px){
  .fh-login-overlay .fh-login-close{ top:14px; right:14px; }
}

/* ================= SHARED SECTION LAYOUT ================= */
.fh-root section{ position:relative; z-index:1; }
.fh-container{ width:100%; max-width:1080px; margin:0 auto; padding:0 32px; }

.fh-eyebrow{
  display:inline-flex; align-items:center; gap:9px; margin:0 auto 22px;
  padding:7px 16px 7px 12px; border-radius:999px;
  background:rgba(239,246,255,0.9); border:1px solid rgba(37,99,235,0.14);
  backdrop-filter:blur(6px); width:fit-content;
}
.fh-eyebrow .fh-dot{ width:7px;height:7px;border-radius:50%; background:var(--blue); box-shadow:0 0 0 4px rgba(37,99,235,0.12); }
.fh-eyebrow span{ font-size:12px; letter-spacing:0.05em; text-transform:uppercase; color:var(--blue); font-weight:600; }

/* ================= SECTION 1 — HERO ================= */
.fh-hero{
  padding:110px 0 100px;
  display:flex; flex-direction:column; align-items:center; text-align:center;
  max-width:1280px; margin:0 auto;
}
.fh-brand-mark{ opacity:0; animation:fh-fadeIn 0.7s ease 0.1s forwards; }

.fh-logotype{
  font-family:'Poppins', sans-serif; font-weight:700;
  font-size:clamp(44px, 7.5vw, 84px); letter-spacing:-0.015em; line-height:1.12;
  color:var(--navy); margin-bottom:18px;
  display:flex; flex-wrap:wrap; justify-content:center; gap:0 0.32em;
  position:relative;
}
.fh-dust-layer{ position:absolute; inset:-50px; z-index:0; pointer-events:none; }
.fh-dust{
  position:absolute; width:5px; height:5px; border-radius:50%;
  background:radial-gradient(circle, rgba(37,99,235,0.95), rgba(124,58,237,0.45));
  opacity:0;
  animation:fh-dustConverge 0.85s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes fh-dustConverge{
  0%{ opacity:0.95; transform:translate(var(--ddx), var(--ddy)) scale(1); }
  75%{ opacity:0.55; }
  100%{ opacity:0; transform:translate(0,0) scale(0.15); }
}

.fh-logotype .fh-word{ display:inline-block; position:relative; }
.fh-letter{
  display:inline-block; position:relative; z-index:1;
  opacity:0; filter:blur(9px);
  transform:translate(var(--dx,0px), var(--dy,0px)) rotate(var(--rot,0deg)) scale(0.4);
  animation:fh-shatterIn 0.9s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:var(--delay,0s);
}
@keyframes fh-shatterIn{
  0%{ opacity:0; filter:blur(9px); transform:translate(var(--dx,0px), var(--dy,0px)) rotate(var(--rot,0deg)) scale(0.4); }
  55%{ opacity:1; }
  100%{ opacity:1; filter:blur(0); transform:translate(0,0) rotate(0deg) scale(1); }
}

.fh-logotype .fh-word.fh-accent-word .fh-letter{
  background:linear-gradient(100deg,
    var(--blue) 0%, var(--purple) 30%, #9F7CF5 45%,
    var(--purple) 60%, var(--blue) 100%);
  background-size:250% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent;
  background-position:220% 0;
}
.fh-logotype .fh-word.fh-accent-word.fh-landed .fh-letter{
  opacity:1; filter:blur(0); transform:none;
  animation:fh-shimmer 3s linear infinite;
}
@keyframes fh-shimmer{ 0%{ background-position:220% 0; } 100%{ background-position:-120% 0; } }

.fh-logotype .fh-word.fh-accent-word::after{
  content:"";
  position:absolute; inset:-30px -18px;
  border-radius:24px;
  background:radial-gradient(circle, rgba(37,99,235,0.4), rgba(124,58,237,0.18) 55%, transparent 75%);
  opacity:0; z-index:-1; pointer-events:none;
}
.fh-logotype .fh-word.fh-accent-word.fh-landed::after{
  animation:fh-impactFlash 0.65s ease-out forwards;
}
@keyframes fh-impactFlash{
  0%{ opacity:0; transform:scale(0.55); }
  35%{ opacity:1; transform:scale(1.2); }
  100%{ opacity:0; transform:scale(1.5); }
}

.fh-subtitle{
  font-size:clamp(14px, 1.6vw, 17px); letter-spacing:0.01em; color:var(--grey);
  margin-bottom:76px; max-width:520px;
  opacity:0; filter:blur(4px); transform:translateY(10px);
  animation:fh-blurIn 0.9s ease 2.15s forwards;
}
@keyframes fh-blurIn{
  from{ opacity:0; filter:blur(4px); transform:translateY(10px); }
  to{ opacity:1; filter:blur(0); transform:translateY(0); }
}

.fh-video-showcase{
  width:100%; max-width:1180px;
  opacity:0; transform:translateY(24px) scale(0.98);
  animation:fh-videoIn 0.9s cubic-bezier(.16,1,.3,1) 2.35s forwards;
}
@keyframes fh-videoIn{ to{ opacity:1; transform:translateY(0) scale(1); } }

.fh-video-row{ display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; }

.fh-video-card{
  position:relative; width:100%; aspect-ratio:16/9; border-radius:18px;
  overflow:hidden; border:1px solid rgba(226,232,240,0.9);
  box-shadow:0 1px 2px rgba(15,23,42,0.04), 0 24px 54px -22px rgba(15,23,42,0.28);
  transition:transform 0.5s cubic-bezier(.22,1,.36,1), box-shadow 0.45s ease, border-color 0.4s ease;
  background:#0b1220;
}
.fh-video-card:hover{
  transform:translateY(-6px) scale(1.015);
  border-color:rgba(37,99,235,0.4);
  box-shadow:0 4px 10px rgba(37,99,235,0.08), 0 32px 64px -20px rgba(37,99,235,0.32);
}
.fh-video-card video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.fh-video-card .fh-video-overlay{
  position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(15,23,42,0) 55%, rgba(15,23,42,0.55) 100%);
  pointer-events:none;
}
.fh-video-card .fh-clip-tag{
  position:absolute; left:12px; bottom:12px;
  display:flex; align-items:center; gap:6px;
  font-size:11px; font-weight:600; color:#fff; letter-spacing:0.01em;
}
.fh-video-card .fh-clip-tag .fh-live-dot{
  width:6px; height:6px; border-radius:50%; background:#4ADE80;
  box-shadow:0 0 0 3px rgba(74,222,128,0.25);
  animation:fh-livePulse 1.8s ease-in-out infinite;
}
@keyframes fh-livePulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }

.fh-video-caption{
  display:flex; align-items:center; justify-content:center; gap:8px;
  margin-top:18px; font-size:13px; color:var(--grey);
}
.fh-video-caption b{ color:var(--slate); font-weight:600; }
.fh-video-caption .fh-sep{ width:3px; height:3px; border-radius:50%; background:var(--grey); }

.fh-scroll-hint{
  margin-top:64px;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  color:var(--grey); font-size:12px; font-weight:700;
  letter-spacing:0.1em; text-transform:uppercase;
  opacity:0; cursor:pointer; border:none; background:none;
  animation:fh-fadeIn 1s ease 3.1s forwards, fh-hintFloat 2.6s ease-in-out 3.1s infinite;
}
.fh-scroll-hint:hover .fh-label{ letter-spacing:0.14em; }
.fh-scroll-hint .fh-label{
  background:linear-gradient(90deg, var(--blue), var(--purple), var(--blue));
  background-size:220% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:fh-labelGlow 2.6s ease-in-out infinite;
  animation-delay:3.1s;
  transition:letter-spacing 0.3s ease;
}
@keyframes fh-labelGlow{ 0%,100%{ background-position:0% 0; } 50%{ background-position:120% 0; } }
@keyframes fh-hintFloat{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(6px); } }

.fh-scroll-hint .fh-mouse-wrap{ position:relative; width:44px; height:58px; display:flex; align-items:center; justify-content:center; }
.fh-scroll-hint .fh-mouse-wrap::before{
  content:"";
  position:absolute; inset:-4px; border-radius:50%;
  background:radial-gradient(circle, rgba(37,99,235,0.26), rgba(124,58,237,0.14) 55%, transparent 78%);
  filter:blur(3px); z-index:-1;
}
.fh-scroll-hint .fh-ring{
  position:absolute; inset:2px; border-radius:16px;
  border:1.5px solid rgba(37,99,235,0.55);
  opacity:0; animation:fh-ringPulse 2.1s ease-out infinite; animation-delay:3.3s;
}
.fh-scroll-hint .fh-ring.fh-d2{ animation-delay:4s; border-color:rgba(124,58,237,0.45); }
.fh-scroll-hint .fh-ring.fh-d3{ animation-delay:4.7s; border-color:rgba(37,99,235,0.45); }
@keyframes fh-ringPulse{
  0%{ transform:scale(0.82); opacity:0.75; }
  80%{ opacity:0; }
  100%{ transform:scale(1.75); opacity:0; }
}
.fh-scroll-hint .fh-mouse{
  width:24px; height:38px; border-radius:14px;
  border:1.5px solid rgba(37,99,235,0.45);
  position:relative;
  background:linear-gradient(180deg, rgba(239,246,255,0.9), rgba(239,246,255,0.55));
  box-shadow:0 8px 18px -8px rgba(37,99,235,0.55), inset 0 0 10px rgba(37,99,235,0.08);
}
.fh-scroll-hint .fh-mouse::before{
  content:"";
  position:absolute; top:7px; left:50%; width:4px; height:8px;
  border-radius:2px; background:linear-gradient(180deg, var(--blue), var(--purple));
  transform:translateX(-50%);
  animation:fh-scrollDot 1.8s ease-in-out infinite;
  animation-delay:3.3s;
}
.fh-chevron-trail{ display:flex; flex-direction:column; align-items:center; gap:1px; margin-top:-2px; }
.fh-chevron-trail svg{
  width:15px; height:15px; stroke:var(--blue); fill:none; stroke-width:2.3;
  opacity:0;
  animation:fh-chevronFlow 1.8s ease-in-out infinite;
}
.fh-chevron-trail svg:nth-child(1){ animation-delay:3.3s; }
.fh-chevron-trail svg:nth-child(2){ animation-delay:3.5s; stroke:var(--purple); }
.fh-chevron-trail svg:nth-child(3){ animation-delay:3.7s; opacity:0.5; }
@keyframes fh-scrollDot{
  0%{ opacity:1; transform:translate(-50%,0); }
  60%{ opacity:0; transform:translate(-50%,12px); }
  61%{ opacity:0; transform:translate(-50%,0); }
  100%{ opacity:1; transform:translate(-50%,0); }
}
@keyframes fh-chevronFlow{
  0%{ transform:translateY(-4px); opacity:0; }
  35%{ opacity:1; }
  75%{ opacity:0.4; }
  100%{ transform:translateY(10px); opacity:0; }
}

@media (max-width:760px){
  .fh-video-row{ grid-template-columns:1fr; }
  .fh-video-card{ aspect-ratio:16/9; }
}

/* ================= SECTION 2 — VALUE PROPS ================= */
.fh-value-props{ padding:90px 0; position:relative; overflow:hidden; }
.fh-value-props .fh-section-glow{ position:absolute; border-radius:50%; filter:blur(75px); pointer-events:none; opacity:0.6; }
.fh-value-props .fh-glow-a{ width:380px; height:380px; top:-90px; left:-70px; background:radial-gradient(circle, rgba(37,99,235,0.24), transparent 70%); }
.fh-value-props .fh-glow-b{ width:340px; height:340px; bottom:-110px; right:-50px; background:radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%); }

.fh-value-header{ text-align:center; margin-bottom:56px; position:relative; }
.fh-value-header h2{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:clamp(24px,3vw,32px);
  color:var(--navy); margin-bottom:12px; letter-spacing:-0.01em;
}
.fh-value-header h2 .fh-accent-text{
  background:linear-gradient(100deg, var(--blue) 0%, var(--purple) 50%, var(--blue) 100%);
  background-size:220% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:fh-shimmer 4s linear infinite;
}
.fh-value-header p{ color:var(--grey); font-size:15px; max-width:480px; margin:0 auto; }

.fh-value-grid{ display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; position:relative; z-index:1; }

.fh-value-card{
  padding:32px 26px; border-radius:18px; text-align:left; position:relative; overflow:hidden;
  background:rgba(255,255,255,0.7); border:1px solid rgba(226,232,240,0.9);
  backdrop-filter:blur(10px);
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 14px 32px -20px rgba(15,23,42,0.12);
  transition:transform 0.45s cubic-bezier(.22,1,.36,1), box-shadow 0.45s ease, border-color 0.4s ease;
}
.fh-value-card:hover{
  transform:translateY(-6px);
  border-color:rgba(var(--ax),var(--ay),var(--az),0.4);
  box-shadow:0 4px 10px rgba(var(--ax),var(--ay),var(--az),0.08), 0 26px 50px -20px rgba(var(--ax),var(--ay),var(--az),0.26);
}
.fh-value-card::before{
  content:""; position:absolute; inset:0; border-radius:18px;
  background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(var(--ax),var(--ay),var(--az),0.16), transparent 65%);
  opacity:0; transition:opacity 0.4s ease; pointer-events:none;
}
.fh-value-card:hover::before{ opacity:1; }
.fh-value-card::after{
  content:""; position:absolute; top:0; left:16%; right:16%; height:2.5px; border-radius:2px;
  background:linear-gradient(90deg, transparent, rgb(var(--ax),var(--ay),var(--az)), transparent);
  opacity:0; transform:scaleX(0.35); transition:opacity 0.4s ease, transform 0.4s ease;
}
.fh-value-card:hover::after{ opacity:1; transform:scaleX(1); }

.fh-card-index{
  position:absolute; top:24px; right:24px;
  font-family:'JetBrains Mono', monospace; font-size:11px; font-weight:600;
  color:rgba(15,23,42,0.16); letter-spacing:0.02em;
}

.fh-value-icon{
  width:52px; height:52px; border-radius:13px; margin-bottom:20px; position:relative;
  display:flex; align-items:center; justify-content:center;
  background:rgba(var(--ax),var(--ay),var(--az),0.1);
  transition:transform 0.4s cubic-bezier(.22,1,.36,1);
}
.fh-value-icon::after{
  content:""; position:absolute; inset:-6px; border-radius:16px;
  border:1.5px solid rgba(var(--ax),var(--ay),var(--az),0.4);
  opacity:0; transform:scale(0.85); transition:opacity 0.4s ease, transform 0.4s ease;
}
.fh-value-card:hover .fh-value-icon{ transform:translateY(-3px) scale(1.07); }
.fh-value-card:hover .fh-value-icon::after{ opacity:1; transform:scale(1); }
.fh-value-icon svg{ width:24px; height:24px; stroke:rgb(var(--ax),var(--ay),var(--az)); fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }

.fh-value-card h3{ font-family:'Poppins', sans-serif; font-weight:600; font-size:16.5px; color:var(--slate); margin-bottom:9px; }
.fh-value-card p{ font-size:13.8px; line-height:1.7; color:var(--grey); }

/* ================= SECTION 3 — CTA / GET STARTED ================= */
.fh-cta-section{ padding:60px 0 120px; position:relative; }
.fh-cta-section .fh-section-glow{ position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; opacity:0.55; z-index:0; }
.fh-cta-section .fh-glow-c{ width:420px; height:420px; top:10%; left:-100px; background:radial-gradient(circle, rgba(37,99,235,0.22), transparent 70%); }
.fh-cta-section .fh-glow-d{ width:420px; height:420px; bottom:0; right:-110px; background:radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%); }

.fh-cta-header{ text-align:center; margin-bottom:56px; position:relative; z-index:1; }
.fh-cta-header h2{
  font-family:'Poppins', sans-serif; font-weight:700; font-size:clamp(24px,3vw,32px);
  color:var(--navy); margin-bottom:12px; letter-spacing:-0.01em;
}
.fh-cta-header h2 .fh-accent-text{
  background:linear-gradient(100deg, var(--blue) 0%, var(--purple) 50%, var(--blue) 100%);
  background-size:220% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:fh-shimmer 4s linear infinite;
}
.fh-cta-header p{ color:var(--grey); font-size:15px; }

.fh-cards-wrap{ position:relative; width:100%; display:flex; justify-content:center; z-index:1; }
.fh-cards-wrap::before{
  content:""; position:absolute; inset:-70px -30px; z-index:-1; pointer-events:none;
  background:radial-gradient(55% 65% at 50% 42%, rgba(37,99,235,0.12), transparent 72%);
  filter:blur(6px);
}
.fh-cards{ display:flex; gap:26px; justify-content:center; flex-wrap:wrap; perspective:1400px; }

.fh-card{
  --mx:50%; --my:50%; --rx:0deg; --ry:0deg; --lift:0px;
  position:relative;
  width:340px; padding:40px 32px 36px; border-radius:20px;
  background:rgba(255,255,255,0.74);
  border:1px solid rgba(226,232,240,0.9);
  backdrop-filter:blur(14px) saturate(160%);
  -webkit-backdrop-filter:blur(14px) saturate(160%);
  box-shadow:0 1px 2px rgba(15,23,42,0.04), 0 14px 34px -16px rgba(15,23,42,0.10);
  cursor:pointer; overflow:hidden; text-align:left;
  transform-style:preserve-3d;
  transition:box-shadow 0.4s ease, border-color 0.35s ease, background 0.35s ease,
             opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
}
.fh-card:hover, .fh-card:focus-visible{
  border-color:rgba(var(--ax,37),var(--ay,99),var(--az,235),0.45);
  background:rgba(255,255,255,0.92);
  box-shadow:0 4px 10px rgba(var(--ax,37),var(--ay,99),var(--az,235),0.08), 0 30px 60px -18px rgba(var(--ax,37),var(--ay,99),var(--az,235),0.32);
}
.fh-card.fh-tilting{ transition:box-shadow 0.4s ease, border-color 0.35s ease, background 0.35s ease, transform 0.12s ease-out; }
.fh-card.fh-tilting{ transform:translateY(var(--lift)) rotateX(var(--rx)) rotateY(var(--ry)); }
.fh-card .fh-chart-vector{ position:absolute; inset:0; z-index:0; opacity:0.06; pointer-events:none; }
.fh-card::before{
  content:""; position:absolute; inset:0; border-radius:20px;
  background:radial-gradient(280px circle at var(--mx) var(--my), rgba(var(--ax,37),var(--ay,99),var(--az,235),0.16), transparent 65%);
  opacity:0; transition:opacity 0.4s ease; pointer-events:none; z-index:0;
}
.fh-card:hover::before{ opacity:1; }

.fh-icon-wrap{
  width:56px; height:56px; border-radius:14px; display:flex; align-items:center; justify-content:center;
  background:rgba(var(--ax,37),var(--ay,99),var(--az,235),0.1); margin-bottom:22px; position:relative; z-index:1;
  transform:translateZ(30px);
}
.fh-card:hover .fh-icon-wrap{ animation:fh-pulseIcon 1.6s ease-in-out infinite; }
.fh-icon-wrap svg{ width:26px; height:26px; stroke:rgb(var(--ax,37),var(--ay,99),var(--az,235)); fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
@keyframes fh-pulseIcon{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.09); } }

.fh-card h2{
  font-family:'Poppins', sans-serif; font-weight:600; font-size:19px; letter-spacing:-0.005em;
  color:var(--slate); margin-bottom:10px; position:relative; z-index:1; transform:translateZ(20px);
}
.fh-card p.fh-desc{
  font-size:14.5px; line-height:1.7; color:var(--grey); margin-bottom:16px;
  position:relative; z-index:1; transform:translateZ(14px);
}
.fh-card .fh-tags{
  display:flex; flex-wrap:wrap; font-size:12.5px; line-height:1.9; letter-spacing:0.01em;
  color:rgb(var(--ax,37),var(--ay,99),var(--az,235)); font-weight:500; position:relative; z-index:1; transform:translateZ(14px);
}

.fh-mini-chart{ position:relative; z-index:1; margin-top:18px; transform:translateZ(16px); }
.fh-mini-chart svg{ width:100%; height:64px; overflow:visible; }
.fh-mini-chart .fh-line{
  fill:none; stroke:var(--blue); stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round;
  stroke-dasharray:400; stroke-dashoffset:400;
}
.fh-mini-chart .fh-area{ fill:url(#fh-areaFill); opacity:0; }
.fh-mini-chart .fh-dot-end{ opacity:0; transform-origin:center; }

.fh-card.fh-in-view .fh-mini-chart .fh-line{ animation:fh-drawLine 1.8s cubic-bezier(.5,0,.2,1) 0.5s forwards; }
.fh-card.fh-in-view .fh-mini-chart .fh-area{ animation:fh-fadeIn 1s ease 1.7s forwards; }
.fh-card.fh-in-view .fh-mini-chart .fh-dot-end{ animation:fh-popDot 0.5s ease 2.1s forwards; }

@keyframes fh-drawLine{ to{ stroke-dashoffset:0; } }
@keyframes fh-popDot{ from{ opacity:0; transform:scale(0);} to{ opacity:1; transform:scale(1);} }

.fh-mini-ledger{ position:relative; z-index:1; margin-top:18px; transform:translateZ(16px); }
.fh-ledger-row{
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 0; font-family:'JetBrains Mono', monospace; font-size:12.5px;
  border-bottom:1px dashed var(--border); color:var(--grey);
}
.fh-ledger-row:last-child{ border-bottom:none; }
.fh-ledger-row .fh-label{ color:var(--grey); font-family:'Inter', sans-serif; font-size:12.5px; }
.fh-ledger-row .fh-value{ font-weight:600; color:var(--slate); }
.fh-ledger-row .fh-value.fh-positive{ color:var(--green); }
.fh-ledger-row .fh-value.fh-total{ color:rgb(var(--ax,37),var(--ay,99),var(--az,235)); font-size:14px; }

.fh-cta-row{
  margin-top:22px; display:flex; align-items:center; gap:7px;
  font-size:13px; font-weight:600; color:rgb(var(--ax,37),var(--ay,99),var(--az,235));
  opacity:0; transform:translateX(-6px) translateZ(14px);
  transition:opacity 0.4s ease, transform 0.4s ease; position:relative; z-index:1;
}
.fh-card:hover .fh-cta-row{ opacity:1; transform:translateX(0) translateZ(14px); }
.fh-cta-row svg{ width:14px;height:14px; stroke:rgb(var(--ax,37),var(--ay,99),var(--az,235)); fill:none; stroke-width:2.2; transition:transform 0.35s ease; }
.fh-card:hover .fh-cta-row svg{ transform:translateX(3px); }

.fh-single-cta{
  display:flex; flex-direction:column; align-items:center; gap:12px;
  padding:48px 64px; border-radius:24px; border:none;
  background:linear-gradient(135deg, #2563EB 0%, #3B82F6 45%, #7C3AED 100%);
  color:#fff; cursor:pointer; position:relative; z-index:2;
  box-shadow:0 12px 40px -12px rgba(37,99,235,0.5);
  transition:transform 0.25s ease, box-shadow 0.25s ease;
  font-family:'Inter', sans-serif;
}
.fh-single-cta:hover{ transform:translateY(-3px); box-shadow:0 20px 50px -12px rgba(37,99,235,0.6); }
.fh-single-cta-icon{ width:32px; height:32px; stroke:#fff; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fh-single-cta-label{ font-family:'Poppins', sans-serif; font-weight:700; font-size:20px; letter-spacing:-0.01em; }
.fh-single-cta-sub{ font-size:13px; opacity:0.85; }

.fh-float-widget{
  position:absolute;
  width:200px;
  padding:16px 16px 14px;
  border-radius:16px;
  background:rgba(255,255,255,0.85);
  border:1px solid rgba(226,232,240,0.9);
  backdrop-filter:blur(12px) saturate(160%);
  -webkit-backdrop-filter:blur(12px) saturate(160%);
  box-shadow:0 20px 45px -20px rgba(15,23,42,0.22), 0 2px 6px rgba(15,23,42,0.05);
  opacity:0;
  transform:translateY(24px) scale(0.94);
  transition:opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1);
  z-index:2;
}
.fh-widget-invoice{ top:6%; left:calc(50% - 620px); }
.fh-widget-chart{ bottom:4%; left:calc(50% + 420px); }

.fh-float-widget.fh-in-view{ opacity:1; transform:translateY(0) scale(1); }
.fh-widget-invoice.fh-in-view{ box-shadow:0 24px 50px -18px rgba(37,99,235,0.28), 0 2px 6px rgba(15,23,42,0.05); }
.fh-widget-chart.fh-in-view{ box-shadow:0 24px 50px -18px rgba(124,58,237,0.28), 0 2px 6px rgba(15,23,42,0.05); }
.fh-float-widget.fh-floaty{ animation:fh-floatY 6.5s ease-in-out infinite; }
.fh-widget-chart.fh-floaty{ animation:fh-floatY 7.5s ease-in-out infinite reverse; }

@keyframes fh-floatY{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-14px);} }

.fh-widget-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.fh-widget-title{ font-size:11px; font-weight:600; color:var(--navy); letter-spacing:0.01em; }
.fh-widget-badge{
  font-size:9px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
  padding:3px 7px; border-radius:999px; background:#ECFDF5; color:var(--green);
}
.fh-invoice-row{
  display:flex; justify-content:space-between; font-size:10.5px; color:var(--grey);
  padding:5px 0; border-bottom:1px solid #F1F5F9;
}
.fh-invoice-row span:last-child{ color:var(--slate); font-weight:600; font-family:'JetBrains Mono', monospace; }
.fh-invoice-total{
  display:flex; justify-content:space-between; margin-top:8px; padding-top:8px;
  border-top:1px solid var(--border); font-size:12px; font-weight:700; color:var(--blue);
  font-family:'JetBrains Mono', monospace;
}
.fh-bars{ display:flex; align-items:flex-end; gap:7px; height:64px; margin-top:2px; }
.fh-bars .fh-bar{ flex:1; border-radius:4px 4px 0 0; background:linear-gradient(180deg, var(--blue), #60A5FA); height:0%; }
.fh-float-widget.fh-in-view .fh-bars .fh-bar{ animation:fh-growBar 1.1s cubic-bezier(.22,1,.36,1) forwards; }
@keyframes fh-growBar{ to{ height:var(--h); } }
.fh-chart-caption{ display:flex; justify-content:space-between; margin-top:8px; font-size:9.5px; color:var(--grey); }
.fh-chart-caption .fh-up{ color:var(--green); font-weight:700; }

@media (max-width:1400px){
  .fh-widget-invoice{ left:2%; }
  .fh-widget-chart{ right:2%; left:auto; }
}
@media (max-width:1180px){ .fh-float-widget{ display:none; } }

.fh-reveal-on-scroll{
  opacity:0; transform:translateY(28px);
  transition:opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
}
.fh-reveal-on-scroll.fh-in-view{ opacity:1; transform:translateY(0); }

/* ================= SIGN IN ================= */
.fh-signin{
  margin-top:52px; font-size:14px; color:var(--grey); text-align:center; position:relative; z-index:1;
  display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
}
.fh-signin-btn{
  display:inline-flex; align-items:center; gap:7px;
  padding:9px 20px; border-radius:999px;
  background:linear-gradient(135deg, rgba(37,99,235,0.09), rgba(124,58,237,0.09));
  border:1px solid rgba(37,99,235,0.28);
  color:var(--blue); text-decoration:none; font-weight:700; font-size:13.5px; font-family:'Inter', sans-serif;
  transition:transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease;
  cursor:pointer;
}
.fh-signin-btn svg{ width:13px; height:13px; stroke:var(--blue); fill:none; stroke-width:2.4; transition:transform 0.3s ease; }
.fh-signin-btn:hover{
  background:linear-gradient(135deg, rgba(37,99,235,0.16), rgba(124,58,237,0.16));
  border-color:rgba(37,99,235,0.5);
  transform:translateY(-2px);
  box-shadow:0 12px 26px -14px rgba(37,99,235,0.45);
}
.fh-signin-btn:hover svg{ transform:translateX(3px); }

@keyframes fh-fadeIn{ from{opacity:0;} to{opacity:1;} }

@media (prefers-reduced-motion: reduce){
  .fh-root *{ animation-duration:0.01ms !important; animation-iteration-count:1 !important; transition-duration:0.01ms !important; }
}
@media (max-width:900px){ .fh-value-grid{ grid-template-columns:1fr; } }
@media (max-width:760px){
  .fh-hero{ padding:80px 0 64px; }
  .fh-cards{ gap:18px; }
  .fh-card{ width:100%; max-width:400px; }
  .fh-orb{ opacity:0.32; animation:none; }
  .fh-value-props{ padding:64px 0; }
  .fh-cta-section{ padding:40px 0 80px; }
  .fh-card, .fh-value-card, .fh-float-widget{
    -webkit-backdrop-filter:none; backdrop-filter:none;
    background:rgba(255,255,255,0.92);
  }
  .fh-logotype .fh-word.fh-accent-word.fh-landed .fh-letter{ animation:none; }
  .fh-scroll-hint .fh-label{ animation:none; }
}
.fh-root a:focus-visible, .fh-root button:focus-visible, .fh-root .fh-card:focus-visible{ outline:2px solid var(--blue); outline-offset:4px; }

.dark .fh-root{ --bg:#0F172A; --navy:#F1F5F9; --slate:#E2E8F0; --grey:#94A3B8; --border:#334155; --blue-soft:rgba(37,99,235,0.12); --bg-tint:#0F172A; }
.dark .fh-card{ background:rgba(15,23,42,0.8); border-color:rgba(51,65,85,0.6); }
.dark .fh-hero-sub{ color:#94A3B8; }
.dark .fh-demo-tag{ background:rgba(37,99,235,0.12); color:#60A5FA; }
.dark .fh-section-title{ color:#F1F5F9; }
.dark .fh-intro{ color:#94A3B8; }
.dark .fh-value-card{ background:rgba(15,23,42,0.8); border-color:#334155; }
.dark .fh-value-title{ color:#F1F5F9; }
.dark .fh-value-desc{ color:#94A3B8; }
.dark .fh-signin-btn{ background:rgba(30,41,59,0.8); border-color:#334155; color:#F1F5F9; }
.dark .fh-signin-btn:hover{ background:rgba(51,65,85,0.6); }
.dark .fh-nav{ background:rgba(15,23,42,0.75); border-color:rgba(51,65,85,0.4); }
.dark .fh-nav-title{ color:#F1F5F9; }
.dark .fh-plan-name{ color:#F1F5F9; }
.dark .fh-plan-desc{ color:#94A3B8; }
.dark .fh-plan-features{ color:#E2E8F0; }
.dark .fh-eyebrow{ background:rgba(30,41,59,0.8); border-color:rgba(59,130,246,0.2); }
.dark .fh-video-card{ border-color:#334155; }
.dark .fh-video-caption{ color:#94A3B8; }
.dark .fh-video-caption b{ color:#E2E8F0; }
.dark .fh-scroll-hint .fh-mouse{ background:rgba(30,41,59,0.8); border-color:rgba(59,130,246,0.3); }
.dark .fh-value-card h3{ color:#F1F5F9; }
.dark .fh-value-card p{ color:#94A3B8; }
.dark .fh-card-index{ color:rgba(148,163,184,0.25); }
.dark .fh-float-widget{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fh-widget-title{ color:#F1F5F9; }
.dark .fh-widget-badge{ background:rgba(22,163,74,0.15); color:#4ADE80; }
.dark .fh-invoice-row{ color:#94A3B8; border-color:#1E293B; }
.dark .fh-invoice-row span:last-child{ color:#E2E8F0; }
.dark .fh-invoice-total{ border-color:#334155; }
.dark .fh-signin{ color:#94A3B8; }
.dark .fh-login-overlay{ background:rgba(0,0,0,0.6); }
.dark .fh-login-overlay .fh-login-close{ background:rgba(30,41,59,0.9); border-color:#334155; }
.dark .fh-login-overlay .fh-login-close:hover{ background:rgba(51,65,85,0.9); }
`;

/* ---------- small presentational helpers ---------- */

function Shattered({ text, id, accent, wordRef }: Readonly<{
  text: string; id: string; accent?: boolean; wordRef: React.RefObject<HTMLSpanElement | null>;
}>) {
  // Builds the letter spans with randomized shatter start positions,
  // same approach as the original shatterify() function.
  const seen = new Map<string, number>();
  const chars = [...text].map((ch) => {
    const n = (seen.get(ch) ?? 0) + 1;
    seen.set(ch, n);
    return { ch, key: `${ch}-${n}` };
  });
  const spreadX = accent ? 270 : 190;
  const spreadY = accent ? 170 : 130;
  const rotSpread = accent ? 55 : 40;
  const baseDelay = accent ? 0.85 : 0.15;
  const stagger = 0.028;

  return (
    <span
      className={"fh-word" + (accent ? " fh-accent-word" : "")}
      id={id}
      ref={wordRef}
    >
      {chars.map(({ ch, key }, i) => {
        const angle = Math.random() * Math.PI * 2; // NOSONAR
        const dist = 50 + Math.random() * Math.max(spreadX, spreadY); // NOSONAR
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 18;
        const rot = (Math.random() - 0.5) * rotSpread * 2; // NOSONAR
        const delay = baseDelay + Math.random() * 0.3 + i * stagger; // NOSONAR
        return (
          <span
            key={key}
            className="fh-letter"
            style={{
              "--dx": dx.toFixed(1) + "px",
              "--dy": dy.toFixed(1) + "px",
              "--rot": rot.toFixed(1) + "deg",
              "--delay": delay.toFixed(2) + "s",
            } as React.CSSProperties}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </span>
  );
}



function LazyVideo({ src, poster, mobileSrc }: Readonly<{ src: string; poster: string; mobileSrc?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <video autoPlay muted loop playsInline poster={poster}>
          {mobileSrc && <source src={mobileSrc} type="video/mp4" media="(max-width: 760px)" />}
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
    </div>
  );
}

function ValueCard({ index, ax, ay, az, icon, title, text, delay, registerReveal }: Readonly<{
  index: number; ax: string; ay: string; az: string; icon: React.ReactNode;
  title: string; text: string; delay: string; registerReveal: (el: Element) => void;
}>) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerReveal(el);
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [registerReveal]);

  return (
    <div
      className="fh-value-card fh-reveal-on-scroll"
      ref={ref}
      style={{ transitionDelay: delay, "--ax": ax, "--ay": ay, "--az": az } as React.CSSProperties}
    >
      <span className="fh-card-index">{index}</span>
      <div className="fh-value-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function FinlyHubLanding() {
  const { isAuthenticated } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const wordWelcomeRef = useRef<HTMLSpanElement>(null);
  const wordFinlyRef = useRef<HTMLSpanElement>(null);
  const dustLayerRef = useRef<HTMLSpanElement>(null);
  const packetLayerRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLButtonElement>(null);
  const valuePropsRef = useRef<HTMLElement>(null);
  const revealTargets = useRef(new Set<Element>());

  const [authView, setAuthView] = useState<'login' | 'signup' | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const registerReveal = (el: Element | null) => {
    if (el) revealTargets.current.add(el);
  };

  const openSignupFor = () => {
    setAuthView("signup");
  };

  /* ---------- Hero shatter dust particles ---------- */
  useEffect(() => {
    const dustLayer = dustLayerRef.current;
    if (!dustLayer) return;
    const count = 26;
    const nodes: HTMLElement[] = [];
    for (let i = 0; i < count; i++) {
      const d = document.createElement("span");
      d.className = "fh-dust";
      const angle = Math.random() * Math.PI * 2; // NOSONAR
      const dist = 110 + Math.random() * 170; // NOSONAR
      d.style.setProperty("--ddx", (Math.cos(angle) * dist).toFixed(1) + "px");
      d.style.setProperty("--ddy", (Math.sin(angle) * dist).toFixed(1) + "px");
      d.style.left = 42 + Math.random() * 16 + "%"; // NOSONAR
      d.style.top = 36 + Math.random() * 28 + "%"; // NOSONAR
      d.style.animationDelay = (0.45 + Math.random() * 0.85) + "s"; // NOSONAR
      dustLayer.appendChild(d);
      nodes.push(d);
    }
    return () => nodes.forEach((n) => n.remove());
  }, []);

  /* ---------- Accent word "landed" state (shimmer + impact flash) ---------- */
  useEffect(() => {
    const w2 = wordFinlyRef.current;
    if (!w2) return;
    // matches original: baseDelay 0.85 + up to 0.3 jitter + stagger*len + duration 0.9
    const text = "Finly Hub";
    const maxEnd = 0.85 + 0.3 + text.length * 0.028 + 0.9;
    const t = setTimeout(() => w2.classList.add("fh-landed"), maxEnd * 1000);
    return () => clearTimeout(t);
  }, []);

  /* ---------- Scroll hint click ---------- */
  useEffect(() => {
    const hint = scrollHintRef.current;
    if (!hint) return;
    const onClick = () => {
      valuePropsRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    hint.addEventListener("click", onClick);
    return () => hint.removeEventListener("click", onClick);
  }, []);

  /* ---------- Count-up + IntersectionObserver reveal ---------- */
  useEffect(() => {
    function runCountUp(el: HTMLElement) {
      const target = Number.parseFloat(el.dataset.countTo ?? "");
      const prefix = el.dataset.prefix || "";
      const duration = 1600;
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = Math.floor(eased * target);
        el.textContent = prefix + value.toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + target.toLocaleString();
      }
      requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.classList.add("fh-in-view");

            if (el.classList.contains("fh-card")) {
              const counters = el.querySelectorAll<HTMLElement>("[data-count-to]");
              if (counters.length) {
                setTimeout(() => counters.forEach(runCountUp), 550);
              }
            }
            if (el.dataset.float !== undefined) {
              setTimeout(() => el.classList.add("fh-floaty"), 900);
            }
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );

    revealTargets.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---------- Traveling data packets ---------- */
  const packetIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const layer = packetLayerRef.current;
    if (!layer) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const initialCount = isMobile ? 2 : 5;
    const cadenceMs = isMobile ? 2200 : 900;
    const GRID = 52;
    let cols = Math.ceil(window.innerWidth / GRID);
    let rows = Math.ceil(window.innerHeight / GRID);

    function spawnPacket() {
      if (document.hidden || !layer) return;
      const horizontal = Math.random() > 0.5; // NOSONAR
      const p = document.createElement("div");
      p.className = "fh-packet " + (horizontal ? "h" : "v");
      const duration = 5 + Math.random() * 4; // NOSONAR
      p.style.animationDuration = duration + "s";
      if (horizontal) {
        const row = Math.floor(Math.random() * rows); // NOSONAR
        p.style.top = row * GRID + "px";
        p.style.left = "0px";
      } else {
        const col = Math.floor(Math.random() * cols); // NOSONAR
        p.style.left = col * GRID + "px";
        p.style.top = "0px";
      }
      layer.appendChild(p);
      setTimeout(() => p.remove(), duration * 1000 + 200);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < initialCount; i++) timers.push(setTimeout(spawnPacket, i * 500));
    packetIntervalRef.current = setInterval(spawnPacket, cadenceMs);
    return () => {
      timers.forEach(clearTimeout);
      if (packetIntervalRef.current) clearInterval(packetIntervalRef.current);
      packetIntervalRef.current = null;
    };
  }, []);

  /* ---------- Pause off-screen videos; only one plays at a time ---------- */
  const videosRef = useRef<HTMLVideoElement[]>([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const vids = Array.from(root.querySelectorAll(".fh-video-card video")) as HTMLVideoElement[];
    videosRef.current = vids;
    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            vids.forEach((v) => { if (v !== video) v.pause(); });
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    vids.forEach((v) => vio.observe(v));
    return () => vio.disconnect();
  }, []);

  /* ---------- Pause everything when tab hidden ---------- */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        videosRef.current.forEach((v) => v.pause());
      } else {
        const visible = Array.from(document.querySelectorAll(".fh-video-card video")) as HTMLVideoElement[];
        visible.forEach((v) => {
          const r = v.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) v.play().catch(() => {});
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ---------- Close login overlay on Escape ---------- */
  useEffect(() => {
    if (!authView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAuthView(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authView]);

  return (
    <div className="fh-root" ref={rootRef}>
      <style>{CSS}</style>

      <div className="fh-bg-canvas" />
      <div className="fh-grid-texture" />
      <div className="fh-orb fh-orb-blue" />
      <div className="fh-orb fh-orb-purple" />
      <div className="fh-orb fh-orb-soft" />
      <div className="fh-packet-layer" ref={packetLayerRef} />

      <div className="fh-top-nav">
        <button
          type="button"
          className="fh-login-btn"
          onClick={() => setAuthView("login")}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5 20c1.2-3.6 4.2-5.5 7-5.5s5.8 1.9 7 5.5" />
          </svg>
          Log in
        </button>
      </div>

      {/* ============ SECTION 1 — HERO & VIDEO SHOWCASE ============ */}
      <section className="fh-hero fh-container">
        <div className="fh-brand-mark fh-eyebrow">
          <span className="fh-dot" />
          <span>Finance, Simplified</span>
        </div>

        <h1 className="fh-logotype">
          <span className="fh-dust-layer" ref={dustLayerRef} />
          <Shattered text="Welcome to" id="wordWelcome" wordRef={wordWelcomeRef} />
          <Shattered text="Finly Hub" id="wordFinly" accent wordRef={wordFinlyRef} />
        </h1>
        <p className="fh-subtitle">Choose how you'd like to get started</p>

        <div className="fh-video-showcase">
          <div className="fh-video-row">
            <div className="fh-video-card">
              <video autoPlay muted loop playsInline poster="assets/clip-1-poster.jpg">
                <source src="assets/clip-1-mobile.mp4" type="video/mp4" media="(max-width: 760px)" />
                <source src="assets/clip-1-scan.mp4" type="video/mp4" />
              </video>
              <div className="fh-video-overlay" />
              <span className="fh-clip-tag">
                <span className="fh-live-dot" />{' '}
                Scan
              </span>
            </div>

            <div className="fh-video-card">
              <LazyVideo src="assets/clip-2-dashboard.mp4" mobileSrc="assets/clip-2-mobile.mp4" poster="assets/clip-2-poster.jpg" />
              <div className="fh-video-overlay" />
              <span className="fh-clip-tag">
                <span className="fh-live-dot" />{' '}
                Dashboard
              </span>
            </div>

            <div className="fh-video-card">
              <LazyVideo src="assets/clip-3-approved.mp4" mobileSrc="assets/clip-3-mobile.mp4" poster="assets/clip-3-poster.jpg" />
              <div className="fh-video-overlay" />
              <span className="fh-clip-tag">
                <span className="fh-live-dot" />{' '}
                Approved
              </span>
            </div>
          </div>
          <p className="fh-video-caption">
            <b>See it in action</b>
            <span className="fh-sep" />{' '}
            Scan → Sync → Approved, in seconds
          </p>
        </div>

        <button type="button" className="fh-scroll-hint" ref={scrollHintRef} aria-label="Scroll to explore">
          <div className="fh-mouse-wrap">
            <span className="fh-ring" />
            <span className="fh-ring fh-d2" />
            <span className="fh-ring fh-d3" />
            <div className="fh-mouse" />
          </div>
          <span className="fh-label">Scroll to explore</span>
          <div className="fh-chevron-trail">
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </button>
      </section>

      {/* ============ SECTION 2 — VALUE PROPS ============ */}
      <section className="fh-value-props fh-container" ref={valuePropsRef}>
        <span className="fh-section-glow fh-glow-a" />
        <span className="fh-section-glow fh-glow-b" />

        <div className="fh-value-header fh-reveal-on-scroll" ref={registerReveal}>
          <div className="fh-eyebrow" style={{ margin: "0 auto 18px" }}>
            <span className="fh-dot" />
            <span>Why Finly Hub</span>
          </div>
          <h2>
            Why teams trust <span className="fh-accent-text">Finly Hub</span>
          </h2>
          <p>Built on the same standards banks and accounting firms rely on every day.</p>
        </div>

        <div className="fh-value-grid">
          <ValueCard
            index={1}
            ax="37" ay="99" az="235"
            delay="0s"
            registerReveal={registerReveal}
            title="Bank-level Security"
            text="256-bit encryption and continuous monitoring keep every transaction and document protected."
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M12 3.5 4.5 6.2v5.4c0 4.7 3.2 8.9 7.5 10.4 4.3-1.5 7.5-5.7 7.5-10.4V6.2L12 3.5z" />
                <path d="m9 12 2.2 2.2L15.5 10" />
              </svg>
            }
          />
          <ValueCard
            index={2}
            ax="124" ay="58" az="237"
            delay="0.12s"
            registerReveal={registerReveal}
            title="Real-time Analytics"
            text="Live dashboards surface cash flow, expenses, and trends the moment they happen."
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M3 12h4l2.5-7L14 19l2.5-7H21" />
              </svg>
            }
          />
          <ValueCard
            index={3}
            ax="22" ay="163" az="74"
            delay="0.24s"
            registerReveal={registerReveal}
            title="Automated Tax Reports"
            text="Filing-ready reports generate themselves, so nothing gets missed at year end."
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5H8Z" />
                <path d="M14 3.5V8h4" />
                <path d="m9.5 15 1.8 1.8L15 13" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ============ SECTION 3 — CTA / GET STARTED ============ */}
      <section className="fh-cta-section fh-container">
        <span className="fh-section-glow fh-glow-c" />
        <span className="fh-section-glow fh-glow-d" />

        <div className="fh-cta-header fh-reveal-on-scroll" ref={registerReveal}>
          <div className="fh-eyebrow" style={{ margin: "0 auto 18px" }}>
            <span className="fh-dot" />
            <span>Get Started</span>
          </div>
          <h2>
            Ready to <span className="fh-accent-text">get started?</span>
          </h2>
          <p>Create your account in seconds.</p>
        </div>

        <div className="fh-cards-wrap">
          <div
            className="fh-float-widget fh-widget-invoice fh-reveal-on-scroll"
            data-float=""
            ref={registerReveal}
          >
            <div className="fh-widget-head">
              <span className="fh-widget-title">Invoice #1042</span>
              <span className="fh-widget-badge">Paid</span>
            </div>
            <div className="fh-invoice-row"><span>Web design services</span><span>$1,240</span></div>
            <div className="fh-invoice-row"><span>Monthly retainer</span><span>$650</span></div>
            <div className="fh-invoice-row"><span>Software licenses</span><span>$89</span></div>
            <div className="fh-invoice-total"><span>Total due</span><span>$1,979</span></div>
          </div>

          <div
            className="fh-float-widget fh-widget-chart fh-reveal-on-scroll"
            data-float=""
            ref={registerReveal}
          >
            <div className="fh-widget-head">
              <span className="fh-widget-title">Monthly Revenue</span>
              <span className="fh-widget-badge">Live</span>
            </div>
            <div className="fh-bars">
              <div className="fh-bar" style={{ "--h": "35%" } as React.CSSProperties} />
              <div className="fh-bar" style={{ "--h": "52%" } as React.CSSProperties} />
              <div className="fh-bar" style={{ "--h": "44%" } as React.CSSProperties} />
              <div className="fh-bar" style={{ "--h": "70%" } as React.CSSProperties} />
              <div className="fh-bar" style={{ "--h": "60%" } as React.CSSProperties} />
              <div className="fh-bar" style={{ "--h": "88%" } as React.CSSProperties} />
            </div>
            <div className="fh-chart-caption"><span>Last 6 months</span><span className="fh-up">+24.6%</span></div>
          </div>

          <div className="fh-cards" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="fh-single-cta fh-reveal-on-scroll"
              ref={registerReveal}
              onClick={() => openSignupFor()}
            >
              <svg viewBox="0 0 24 24" className="fh-single-cta-icon"><path d="M12 5v14M5 12h14" /></svg>
              <span className="fh-single-cta-label">Create your free account</span>
              <span className="fh-single-cta-sub">No credit card required • Takes less than a minute</span>
            </button>
          </div>
        </div>

        <p className="fh-signin fh-reveal-on-scroll" ref={registerReveal}>
          <span>Already have an account?</span>
          <button
            type="button"
            className="fh-signin-btn"
            onClick={() => setAuthView("login")}
          >
            Sign in
            <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </p>
      </section>

      {/* ============ LOGIN / SIGNUP OVERLAY ============ */}
      {authView && (
        <div
          className="fh-login-overlay"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuthView(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAuthView(null);
            }
          }}
        >
          <button
            type="button"
            className="fh-login-close"
            aria-label="Close"
            onClick={() => setAuthView(null)}
          >
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          {authView === "login" ? (
            <FinlyHubLogin
              onCreateAccount={() => setAuthView("signup")}
              onDismiss={() => setAuthView(null)}
            />
          ) : (
            <FinlyHubSignup
              onSignInClick={() => setAuthView("login")}
              onDismiss={() => setAuthView(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}