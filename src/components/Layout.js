import React from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';

const NAV = [
  { to: '/',        label: '대시보드', icon: '▣' },
  { to: '/signals', label: 'AI 신호',  icon: '◈' },
  { to: '/trades',  label: '체결내역', icon: '◉' },
];

const s = {
  wrap:    { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 200, background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    padding: '24px 0', position: 'sticky', top: 0, height: '100vh',
  },
  logo:    { fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16, letterSpacing: 2 },
  logoSub: { color: 'var(--text2)', fontSize: 10, marginTop: 4, letterSpacing: 1 },
  link:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: 'var(--text2)', textDecoration: 'none', fontSize: 13, transition: 'all .15s', borderLeft: '2px solid transparent' },
  active:  { color: 'var(--green)', borderLeftColor: 'var(--green)', background: 'rgba(57,211,83,0.06)' },
  main:    { flex: 1, display: 'flex', flexDirection: 'column' },
  topbar:  { padding: '12px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)' },
  status:  { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' },
  dot:     { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' },
  content: { flex: 1, padding: '28px', overflowY: 'auto' },
};

const logout = () =>
  api.post('/auth/logout', {}, { withCredentials: true })
    .finally(() => { window.location.href = '/'; });

export default function Layout({ children, title }) {
  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .nav-link:hover { color: var(--text) !important; background: rgba(255,255,255,0.03) !important; }
      `}</style>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          AI TRADER
          <div style={s.logoSub}>POWERED BY OPENCLAW</div>
        </div>
        <nav>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link"
              style={({ isActive }) => ({ ...s.link, ...(isActive ? s.active : {}) })}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={s.main}>
        <div style={s.topbar}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={s.status}>
              <div style={s.dot} />
              LIVE · 키움 REST API
            </div>
            <button onClick={logout} style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)',
            }}>로그아웃</button>
          </div>
        </div>
        <div style={s.content}>{children}</div>
      </main>
    </div>
  );
}
