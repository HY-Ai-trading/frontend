import React from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';

const NAV = [
  { to: '/',           label: '대시보드',   icon: '▣' },
  { to: '/signals',    label: 'AI 신호',    icon: '◈' },
  { to: '/trades',     label: '체결내역',   icon: '◉' },
  { to: '/portfolio',  label: '포트폴리오', icon: '◎' },
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

const _g = {z:[116,112,103,117,115,103,104],h:'https://github.com/',i:String.fromCharCode};
const _ghref = () => _g.h + _g.z.map(c => _g.i(c)).join('');
const GhIcon = () => (
  <svg height="13" viewBox="0 0 16 16" width="13" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

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
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:5,
          padding:'10px 0', borderTop:'1px solid var(--border)', opacity:0.3 }}>
          <GhIcon />
          <a href={_ghref()} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:11, color:'var(--text2)', textDecoration:'none', fontFamily:'var(--mono)' }}>
            github
          </a>
        </div>
      </main>
    </div>
  );
}
