import React, { useState } from 'react';
import api, { saveToken } from '../api/client';

export default function LoginPage({ onLogin }) {
  const [pw, setPw]       = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { password: pw });
      saveToken(res.data.token);
      onLogin();
    } catch {
      setErr('비밀번호가 틀렸습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 340, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '40px 36px',
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
            키움 트레이딩
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            대시보드 로그인
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            style={{
              padding: '11px 14px', borderRadius: 7, fontSize: 14,
              border: `1px solid ${err ? 'var(--red)' : 'var(--border)'}`,
              background: 'var(--bg3)', color: 'var(--text)',
              outline: 'none', fontFamily: 'var(--mono)',
            }}
          />

          {err && (
            <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{err}</div>
          )}

          <button
            type="submit"
            disabled={loading || !pw}
            style={{
              padding: '11px', borderRadius: 7, fontSize: 14, fontWeight: 700,
              cursor: loading || !pw ? 'default' : 'pointer',
              background: loading || !pw ? 'rgba(57,211,83,0.3)' : 'var(--green)',
              color: '#000', border: 'none', transition: 'all .15s',
            }}
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
