import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, Play, Users, Share2, Monitor, Smartphone, Tablet, ArrowRight, ChevronDown, Volume2, SkipForward, Pause } from 'lucide-react';

/* ─── How It Works Step ───────────────────── */
function HowItWorksStep({ icon: Icon, title, desc, step, color, isLast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {/* Icon circle */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}22, ${color}11)`,
            border: `1px solid ${color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 30px ${color}22`,
            position: 'relative',
          }}
        >
          <Icon size={28} color={color} />
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: color,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {step}
          </span>
        </div>

        <div style={{ textAlign: 'center', maxWidth: '160px' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {title}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
        </div>
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <div
          style={{
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, var(--border-medium), transparent)',
            margin: '8px 0',
            position: 'relative',
          }}
          aria-hidden="true"
        >
          <ChevronDown
            size={14}
            color="var(--text-faint)"
            style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Connected Devices Section ───────────── */
function NetworkSVG() {
  return (
    <svg
      viewBox="0 0 800 400"
      style={{ width: '100%', height: 'auto', maxHeight: '400px' }}
      aria-label="Devices connected through local network"
      role="img"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient center glow */}
      <ellipse cx="400" cy="200" rx="180" ry="120" fill="url(#centerGlow)" />

      {/* Connection lines — host to left phone */}
      <path d="M220 200 Q310 160 390 200" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" filter="url(#glow)"
        style={{ animation: 'none' }} strokeDasharray="300" strokeDashoffset="300" />
      {/* host to right tablet */}
      <path d="M410 200 Q500 160 590 200" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" filter="url(#glow)"
        style={{ animation: 'none' }} strokeDasharray="300" strokeDashoffset="0" />
      {/* host to bottom-left phone */}
      <path d="M200 240 Q310 280 390 210" stroke="url(#lineGrad)" strokeWidth="1" fill="none" filter="url(#glow)"
        style={{ animation: 'none' }} strokeDasharray="300" strokeDashoffset="0" />

      {/* ── Host Laptop (center) ── */}
      <g transform="translate(340, 140)">
        {/* Screen */}
        <rect x="0" y="0" width="120" height="76" rx="4" fill="#1a2234" stroke="#3b82f6" strokeWidth="1.5" />
        {/* Screen content */}
        <rect x="6" y="6" width="108" height="58" rx="2" fill="#0d1220" />
        {/* Play indicator */}
        <circle cx="60" cy="35" r="14" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="1" />
        <polygon points="56,29 56,41 70,35" fill="#60a5fa" />
        {/* Base */}
        <path d="M-15 76 L135 76 L125 88 L-5 88 Z" fill="#111827" stroke="#374151" strokeWidth="1" />
        {/* Label */}
        <text x="60" y="108" textAnchor="middle" fill="#60a5fa" fontSize="10" fontFamily="var(--font-heading)" fontWeight="600">HOST</text>
        {/* WiFi glow dot */}
        <circle cx="60" cy="-12" r="4" fill="#06b6d4" filter="url(#glow)" />
        <circle cx="60" cy="-12" r="8" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4"
          />
      </g>

      {/* ── Left Phone ── */}
      <g transform="translate(100, 130)">
        <rect x="0" y="0" width="60" height="100" rx="6" fill="#1a2234" stroke="#8b5cf6" strokeWidth="1.5" />
        <rect x="4" y="12" width="52" height="72" rx="2" fill="#0d1220" />
        {/* Screen content */}
        <rect x="8" y="18" width="44" height="28" rx="1" fill="#111827" />
        <polygon points="24,29 24,35 32,32" fill="#a78bfa" opacity="0.8" />
        {/* Seek bar */}
        <rect x="8" y="50" width="44" height="2" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="8" y="50" width="20" height="2" rx="1" fill="#8b5cf6" />
        <text x="30" y="94" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="var(--font-heading)">PHONE</text>
      </g>

      {/* ── Right Tablet ── */}
      <g transform="translate(570, 115)">
        <rect x="0" y="0" width="110" height="140" rx="8" fill="#1a2234" stroke="#06b6d4" strokeWidth="1.5" />
        <rect x="6" y="18" width="98" height="100" rx="2" fill="#0d1220" />
        {/* Screen content */}
        <rect x="12" y="24" width="86" height="54" rx="1" fill="#111827" />
        <polygon points="45,44 45,56 58,50" fill="#06b6d4" opacity="0.8" />
        {/* Seek bar */}
        <rect x="12" y="84" width="86" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="12" y="84" width="38" height="3" rx="1" fill="#06b6d4" />
        <text x="55" y="132" textAnchor="middle" fill="#06b6d4" fontSize="9" fontFamily="var(--font-heading)">TABLET</text>
      </g>

      {/* ── Bottom left small phone ── */}
      <g transform="translate(155, 285)">
        <rect x="0" y="0" width="52" height="88" rx="5" fill="#1a2234" stroke="#a78bfa" strokeWidth="1" opacity="0.7" />
        <rect x="4" y="10" width="44" height="62" rx="2" fill="#0d1220" />
        <polygon points="20,34 20,40 28,37" fill="#a78bfa" opacity="0.6" />
        <text x="26" y="80" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="var(--font-heading)" opacity="0.7">PHONE 2</text>
      </g>

      {/* Sync label */}
      <text x="400" y="380" textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="11" fontFamily="var(--font-heading)" letterSpacing="3">
        LOCAL NETWORK SYNC
      </text>
    </svg>
  );
}

/* ─── Section Observer ────────────────────── */
function FadeSection({ children, delay = 0, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/* ─── Main Home Page ──────────────────────── */
export default function Home() {
  const [networkStatus] = useState('ready'); // mock

  const howItWorksSteps = [
    { icon: Monitor, title: 'Open App', desc: 'Launch Play Together on your device', color: '#3b82f6' },
    { icon: Share2, title: 'Create Room', desc: 'Host generates a unique Room ID', color: '#8b5cf6' },
    { icon: Play, title: 'Select Media', desc: 'Choose a video or audio file', color: '#06b6d4' },
    { icon: Users, title: 'Others Join', desc: 'Share the Room ID with friends', color: '#a78bfa' },
    { icon: Wifi, title: 'Watch Together', desc: 'Synchronized playback, one experience', color: '#60a5fa' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════
          HERO SECTION
          ══════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '80px',
          overflow: 'hidden',
        }}
        aria-labelledby="hero-heading"
      >
        {/* Background gradient */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 50%),
              radial-gradient(ellipse 50% 40% at 80% 70%, rgba(6,182,212,0.07) 0%, transparent 50%)
            `,
          }}
        />


        {/* Content */}
        <div className="pt-container" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>

          {/* Network status badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 16px 6px 10px',
              marginBottom: '32px',
              backdropFilter: 'blur(8px)',
              animation: 'none',
            }}
            role="status"
            aria-label="Local network ready"
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-cyan)',
                boxShadow: '0 0 8px var(--accent-cyan)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '1px' }}>
              LOCAL NETWORK READY
            </span>
          </div>

          {/* Main heading */}
          <h1
            id="hero-heading"
            className="heading-xl"
            style={{
              marginBottom: '16px',
            }}
          >
            PLAY{' '}
            <span className="gradient-text">TOGETHER</span>
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(20px, 3vw, 28px)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              letterSpacing: '-0.3px',
            }}
          >
            Watch &amp; Listen Together.
          </p>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'var(--text-muted)',
              maxWidth: '480px',
              margin: '0 auto 48px',
              lineHeight: 1.7,
            }}
          >
            One room. Multiple devices. One synchronized experience.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'center',
              marginBottom: '80px',
            }}
          >
            <Link
              to="/create"
              className="btn btn-primary btn-lg"
              id="hero-create-room"
              aria-label="Create a new room as host"
            >
              Create Room
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/join"
              className="btn btn-secondary btn-lg"
              id="hero-join-room"
              aria-label="Join an existing room"
            >
              <Users size={18} />
              Join Room
            </Link>
          </div>

          {/* ── Hero App Mockup ── */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '860px',
              margin: '0 auto',
              background: 'linear-gradient(135deg, rgba(13,18,32,0.95), rgba(17,24,39,0.98))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
            role="img"
            aria-label="Play Together app preview showing synchronized playback across devices"
          >
            {/* Window chrome */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(8,12,20,0.6)',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'block' }} />
              <span style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>play-together · Room XKCD42</span>
            </div>

            {/* App body */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '340px' }}>

              {/* Sidebar */}
              <div style={{
                borderRight: '1px solid rgba(255,255,255,0.06)',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(8,12,20,0.4)',
              }}>
                <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Room Info</p>

                {/* Room ID */}
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROOM ID</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue-bright)', letterSpacing: '3px' }}>XKCD42</p>
                </div>

                {/* Devices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Connected</p>
                  {[
                    { label: 'Laptop (Host)', icon: '💻', color: '#60a5fa' },
                    { label: 'Phone', icon: '📱', color: '#a78bfa' },
                    { label: 'Tablet', icon: '📟', color: '#06b6d4' },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '14px' }}>{d.icon}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{d.label}</span>
                      <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                    </div>
                  ))}
                </div>

                {/* Sync status */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <Wifi size={12} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.5px' }}>IN SYNC</span>
                </div>
              </div>

              {/* Player area */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Video thumbnail */}
                <div style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #0d1220, #111827)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '180px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Gradient cinematic bg */}
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(59,130,246,0.09) 0%, transparent 70%)' }} />
                  {/* Faux film grain lines */}
                  {[20, 50, 80].map(y => (
                    <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: `${y}%`, height: '1px', background: 'rgba(255,255,255,0.02)' }} />
                  ))}
                  {/* Play button */}
                  <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.25)',
                    border: '2px solid rgba(59,130,246,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(59,130,246,0.3)',
                    position: 'relative', zIndex: 1,
                  }}>
                    <Pause size={20} color="#60a5fa" fill="#60a5fa" />
                  </div>
                  {/* File name */}
                  <span style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>movie_night.mp4</span>
                  {/* Time */}
                  <span style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>18:34 / 1:52:10</span>
                </div>

                {/* Seek bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '16%', height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: '2px' }} />
                  </div>
                  {/* Controls row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Pause size={16} color="white" fill="white" />
                      <SkipForward size={14} color="rgba(255,255,255,0.5)" />
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>18:34 / 1:52:10</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Volume2 size={13} color="rgba(255,255,255,0.4)" />
                      <div style={{ width: '50px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ width: '70%', height: '100%', background: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom sync bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(6,182,212,0.04)',
            }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                {['💻 Host', '📱 +0ms', '📟 +2ms'].map(d => (
                  <span key={d} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>{d}</span>
                ))}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>● LIVE SYNC</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            animation: 'none',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', letterSpacing: '2px' }}>SCROLL</span>
          <ChevronDown size={16} color="var(--text-faint)" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="pt-section"
        aria-labelledby="how-it-works-heading"
        style={{ background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="pt-container">
          <FadeSection style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
            <p className="label" style={{ marginBottom: '12px' }}>Simple Process</p>
            <h2 id="how-it-works-heading" className="heading-lg">How It Works</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '16px auto 0', fontSize: '16px', lineHeight: 1.7 }}>
              Get synchronized in seconds. No accounts, no downloads, just your local network.
            </p>
          </FadeSection>

          {/* Steps — vertical flow on mobile, horizontal on desktop */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0',
              maxWidth: '900px',
              margin: '0 auto',
              position: 'relative',
            }}
          >
            {/* Horizontal connector line (desktop) */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '36px',
                left: '10%',
                right: '10%',
                height: '1px',
                background: 'linear-gradient(to right, transparent, var(--border-medium), transparent)',
              }}
            />

            {howItWorksSteps.map((step, i) => (
              <div
                key={step.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 8px',
                }}
              >
                <FadeSection delay={i * 120}>
                  {/* Icon */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                        border: `1px solid ${step.color}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 30px ${step.color}22`,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <step.icon size={26} color={step.color} />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: step.color,
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        fontSize: '15px',
                        color: 'var(--text-primary)',
                        marginBottom: '6px',
                      }}>
                        {step.title}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </FadeSection>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONNECTED DEVICES
          ══════════════════════════════════════ */}
      <section
        id="connected-devices"
        className="pt-section"
        aria-labelledby="sync-heading"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.07) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div className="pt-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            {/* Text side */}
            <FadeSection>
              <p className="label" style={{ marginBottom: '12px' }}>Synchronized Experience</p>
              <h2 id="sync-heading" className="heading-lg">
                One Signal.<br />
                <span className="gradient-text">Every Device.</span>
              </h2>
              <p style={{
                color: 'var(--text-muted)',
                fontSize: '16px',
                lineHeight: 1.8,
                marginTop: '20px',
                marginBottom: '32px',
                maxWidth: '400px',
              }}>
                Play Together connects all devices on the same Wi-Fi or mobile hotspot.
                The host controls playback — everyone stays perfectly in sync.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'No internet required', desc: 'Works on local Wi-Fi or mobile hotspot' },
                  { label: 'Instant sync', desc: 'Millisecond-level playback synchronization' },
                  { label: 'Any media type', desc: 'Video, audio — whatever you choose' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--accent-cyan)',
                      boxShadow: '0 0 8px var(--accent-cyan)',
                      flexShrink: 0,
                      marginTop: '6px',
                    }} />
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeSection>

            {/* Network visualization */}
            <FadeSection delay={200}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                aria-label="Network diagram showing connected devices"
              >
                <NetworkSVG />
              </div>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CREATE / JOIN CTA SPLIT
          ══════════════════════════════════════ */}
      <section
        id="get-started"
        className="pt-section"
        aria-labelledby="get-started-heading"
        style={{ background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}
      >
        <div className="pt-container">
          <FadeSection style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p className="label" style={{ marginBottom: '12px' }}>Ready?</p>
            <h2 id="get-started-heading" className="heading-lg">Start Your Session</h2>
          </FadeSection>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            {/* Create Room Card */}
            <FadeSection delay={0}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(59,130,246,0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(59,130,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <Monitor size={28} color="var(--accent-blue)" />
                  </div>
                  <h3 className="heading-sm" style={{ marginBottom: '10px' }}>Create a Room</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                    Host the session. Select your media, generate a Room ID, and invite others to join.
                  </p>
                </div>
                <Link to="/create" className="btn btn-primary" id="cta-create-room">
                  Create Room
                  <ArrowRight size={16} />
                </Link>
              </div>
            </FadeSection>

            {/* Join Room Card */}
            <FadeSection delay={150}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.08))',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(139,92,246,0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(139,92,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <Smartphone size={28} color="var(--accent-purple)" />
                  </div>
                  <h3 className="heading-sm" style={{ marginBottom: '10px' }}>Join a Room</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                    Enter the Room ID shared by your host and join the synchronized playback experience.
                  </p>
                </div>
                <Link to="/join" className="btn btn-secondary" id="cta-join-room">
                  <Users size={16} />
                  Join Room
                </Link>
              </div>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA / FOOTER
          ══════════════════════════════════════ */}
      <section
        id="final-cta"
        style={{
          padding: 'var(--space-24) 0 var(--space-16)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
        aria-labelledby="final-heading"
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '400px',
            background: 'radial-gradient(ellipse at bottom, rgba(59,130,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="pt-container" style={{ position: 'relative', zIndex: 2 }}>
          <FadeSection>
            <p className="label" style={{ marginBottom: '16px' }}>Play Together</p>
            <h2 id="final-heading" className="heading-lg" style={{ marginBottom: '20px' }}>
              One Room.<br />
              <span className="gradient-text">Infinite Moments.</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 40px', fontSize: '16px', lineHeight: 1.7 }}>
              Watch &amp; listen together on your local network — no internet required.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/create" className="btn btn-primary btn-lg" id="footer-create-room">
                Get Started
                <ArrowRight size={18} />
              </Link>
            </div>
          </FadeSection>

          {/* Divider */}
          <div className="divider divider-glow" style={{ margin: '64px 0 32px' }} />

          {/* Footer bottom */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                PLAY<span style={{ color: 'var(--accent-blue)' }}>TOGETHER</span>
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
              Local media synchronization platform
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}


