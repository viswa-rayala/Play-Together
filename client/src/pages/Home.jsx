import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, Play, Users, Share2, Monitor, Smartphone, Tablet, ArrowRight, ChevronDown } from 'lucide-react';
import FrameSequence from '../components/FrameSequence';

/* ─── Particle Background ─────────────────── */
function ParticleField({ count = 40 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 6,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.id % 3 === 0 ? 'var(--accent-blue)' : p.id % 3 === 1 ? 'var(--accent-purple)' : 'var(--accent-cyan)',
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── How It Works Step ───────────────────── */
function HowItWorksStep({ icon: Icon, title, desc, step, color, isLast }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: `opacity 600ms ease, transform 600ms ease`,
          transitionDelay: `${step * 100}ms`,
        }}
      >
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
        style={{ animation: 'network-pulse 3s ease-in-out 0s infinite' }} strokeDasharray="300" strokeDashoffset="300" />
      {/* host to right tablet */}
      <path d="M410 200 Q500 160 590 200" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" filter="url(#glow)"
        style={{ animation: 'network-pulse 3s ease-in-out 0.5s infinite' }} strokeDasharray="300" strokeDashoffset="300" />
      {/* host to bottom-left phone */}
      <path d="M200 240 Q310 280 390 210" stroke="url(#lineGrad)" strokeWidth="1" fill="none" filter="url(#glow)"
        style={{ animation: 'network-pulse 3s ease-in-out 1s infinite' }} strokeDasharray="300" strokeDashoffset="300" />

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
        <circle cx="60" cy="-12" r="4" fill="#06b6d4" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} filter="url(#glow)" />
        <circle cx="60" cy="-12" r="8" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4"
          style={{ animation: 'ping 2s ease-out infinite' }} />
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
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
      }}
    >
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

        {/* Particles */}
        <ParticleField count={35} />

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
              animation: 'fade-in 800ms ease 200ms both',
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
                animation: 'pulse-dot 2s ease-in-out infinite',
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
              animation: 'slide-up 800ms ease 300ms both',
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
              animation: 'slide-up 800ms ease 400ms both',
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
              animation: 'slide-up 800ms ease 500ms both',
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
              animation: 'slide-up 800ms ease 600ms both',
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

          {/* Frame Sequence — Hero Visual */}
          <div
            style={{
              animation: 'slide-up 1000ms ease 700ms both',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-30px',
                background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: -1,
              }}
              aria-hidden="true"
            />
            <FrameSequence
              triggerOnScroll={false}
              loop={true}
              autoPlay={true}
              style={{
                width: '100%',
                maxWidth: '900px',
                margin: '0 auto',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            />
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
            animation: 'fade-in 1s ease 1.5s both',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', letterSpacing: '2px' }}>SCROLL</span>
          <ChevronDown size={16} color="var(--text-faint)" style={{ animation: 'float 2s ease-in-out infinite' }} />
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
                  transition: 'all 300ms ease',
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
                  transition: 'all 300ms ease',
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


