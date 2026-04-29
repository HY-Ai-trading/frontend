import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import SignalsPage   from './pages/SignalsPage';
import TradesPage    from './pages/TradesPage';
import LoginPage     from './pages/LoginPage';
import api, { getToken, clearToken } from './api/client';

export default function App() {
  const [auth, setAuth] = useState(null); // null=확인중, true=로그인, false=미로그인

  useEffect(() => {
    window._setAuth = setAuth;
    if (!getToken()) { setAuth(false); return; }
    api.get('/auth/check')
      .then(r => {
        if (!r.data.authenticated) clearToken();
        setAuth(r.data.authenticated);
      })
      .catch(() => { clearToken(); setAuth(false); });
    return () => { window._setAuth = null; };
  }, []);

  if (auth === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--text2)', fontSize: 13,
      }}>
        로딩 중...
      </div>
    );
  }

  if (!auth) {
    return <LoginPage onLogin={() => setAuth(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<DashboardPage />} />
        <Route path="/signals"  element={<SignalsPage />} />
        <Route path="/trades"   element={<TradesPage />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
