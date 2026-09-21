import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const PlayTogetherIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" stroke="url(#navGrad)" strokeWidth="1.5" fill="rgba(59,130,246,0.08)" />
    <path d="M10 9.5l9 4.5-9 4.5V9.5z" fill="url(#navGrad)" />
    <defs>
      <linearGradient id="navGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" />
        <stop offset="1" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 400ms cubic-bezier(0.4,0,0.2,1)',
        background: scrolled
          ? 'rgba(8, 12, 20, 0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(148,163,184,0.08)'
          : '1px solid transparent',
        boxShadow: scrolled
          ? '0 8px 32px rgba(0,0,0,0.4)'
          : 'none',
      }}
    >
      <div
        className="pt-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
          aria-label="Play Together home"
        >
          <PlayTogetherIcon />
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            PLAY<span style={{ color: 'var(--accent-blue)' }}>TOGETHER</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          className="navbar-desktop"
        >
          <NavLink to="/" active={isActive('/')}>Home</NavLink>
          <Link to="/create" className="btn btn-primary btn-sm" id="nav-create-room">
            Create Room
          </Link>
          <Link to="/join" className="btn btn-secondary btn-sm" id="nav-join-room">
            Join Room
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          aria-label="Toggle mobile menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '8px',
          }}
          className="navbar-hamburger"
          id="mobile-menu-toggle"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileOpen ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          style={{
            background: 'rgba(8,12,20,0.97)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          role="menu"
        >
          <Link to="/" className="btn btn-ghost" role="menuitem">Home</Link>
          <Link to="/create" className="btn btn-primary" role="menuitem" id="mobile-create-room">
            Create Room
          </Link>
          <Link to="/join" className="btn btn-secondary" role="menuitem" id="mobile-join-room">
            Join Room
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .navbar-desktop { display: none !important; }
          .navbar-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{
        padding: '8px 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '14px',
        fontWeight: 500,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 200ms ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) e.target.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.target.style.color = 'var(--text-muted)';
      }}
    >
      {children}
    </Link>
  );
}
