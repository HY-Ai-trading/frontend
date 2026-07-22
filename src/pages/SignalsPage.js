import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Pagination, { PAGE_SIZE } from '../components/Pagination';
import { getSignals, getMonthlySignals } from '../api/client';

const ACTION_COLOR = { BUY: 'var(--green)', SELL: 'var(--red)', HOLD: 'var(--yellow)' };

const Badge = ({ text, color }) => (
  <span style={{
    padding: '2px 8px', borderRadius: 4, fontSize: 11,
    fontFamily: 'var(--mono)', fontWeight: 700,
    background: color + '22', color, border: `1px solid ${color}44`,
  }}>
    {text}
  </span>
);

const Bar = ({ value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        width: `${value * 100}%`, height: '100%', borderRadius: 2,
        background: value >= 0.8 ? 'var(--green)' : value >= 0.6 ? 'var(--yellow)' : 'var(--red)',
      }} />
    </div>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
      {(value * 100).toFixed(0)}%
    </span>
  </div>
);

/* ── 모달 ── */
function SignalModal({ signal: s, onClose }) {
  const acColor = ACTION_COLOR[s.action] || 'var(--text2)';
  const status  = s.rejected ? '거절' : s.executed ? '실행' : '대기';
  const statusColor = s.rejected ? 'var(--red)' : s.executed ? 'var(--green)' : 'var(--yellow)';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = (label, value) => (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 90, flexShrink: 0, fontSize: 11, color: 'var(--text2)' }}>{label}</div>
      <div style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}>{value ?? '-'}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.stock_name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{s.stock_code}</div>
            </div>
            <Badge text={s.action} color={acColor} />
            <Badge text={status} color={statusColor} />
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text2)',
              fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
            }}
          >✕</button>
        </div>

        {/* 내용 */}
        <div style={{ padding: '4px 20px 20px' }}>
          {row('시간', new Date(s.created_at).toLocaleString('ko-KR'))}
          {row('신뢰도', <Bar value={s.confidence} />)}
          {row('목표가', s.target_price ? Number(s.target_price).toLocaleString() + '원' : null)}
          {row('체결가', s.executed_price ? Number(s.executed_price).toLocaleString() + '원' : null)}
          {s.target_price && s.executed_price && row('괴리', (() => {
            const d = (s.executed_price - s.target_price) / s.target_price * 100;
            const c = Math.abs(d) < 0.5 ? 'var(--text2)' : d > 0 ? 'var(--red)' : 'var(--green)';
            return <span style={{ color: c }}>{d >= 0 ? '+' : ''}{d.toFixed(2)}%</span>;
          })())}
          {s.reject_reason && row('거절 사유', <span style={{ color: 'var(--red)', whiteSpace: 'pre-wrap' }}>{s.reject_reason}</span>)}

          {/* 분석 근거 - 전체 표시 */}
          {s.reason && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>분석 근거</div>
              <div style={{
                background: 'var(--bg3)', borderRadius: 8, padding: '14px 16px',
                fontSize: 12, lineHeight: 1.7, color: 'var(--text)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {s.reason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);
  const [mode, setMode]       = useState('all'); // 'all' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const fetchSignals = useCallback(() => {
    return mode === 'month' ? getMonthlySignals(selectedMonth, 1000) : getSignals(200);
  }, [mode, selectedMonth]);

  useEffect(() => {
    setLoading(true);
    fetchSignals().then(r => { setSignals(r.data); setLoading(false); }).catch(() => setLoading(false));
    const t = setInterval(() => fetchSignals().then(r => setSignals(r.data)).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [fetchSignals]);

  useEffect(() => { setPage(1); }, [mode, selectedMonth]);

  const [selYear, selMon] = selectedMonth.split('-').map(Number);
  const selectedMonthLabel = `${selYear}년 ${selMon}월`;
  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);
  const shiftMonth = (delta) => {
    const d = new Date(selYear, selMon - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const paged = signals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout title="AI 신호">
      {selected && <SignalModal signal={selected} onClose={() => setSelected(null)} />}

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>오픈클로 신호 목록</span>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{signals.length}건</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => shiftMonth(-1)} style={{
                  width: 22, height: 22, borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', lineHeight: 1,
                }}>‹</button>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 76, textAlign: 'center' }}>
                  {selectedMonthLabel}
                </span>
                <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} style={{
                  width: 22, height: 22, borderRadius: 4, fontSize: 12,
                  cursor: isCurrentMonth ? 'default' : 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: isCurrentMonth ? 'var(--border)' : 'var(--text2)', lineHeight: 1,
                }}>›</button>
              </div>
            )}
            <button onClick={() => setMode(mode === 'month' ? 'all' : 'month')} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--mono)', fontWeight: mode === 'month' ? 700 : 400,
              border: mode === 'month' ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
              background: mode === 'month' ? 'rgba(57,211,83,0.12)' : 'transparent',
              color: mode === 'month' ? 'var(--green)' : 'var(--text2)', transition: 'all .12s',
            }}>월별</button>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
              행 클릭 → 상세 · 10초마다 자동 갱신
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>로딩 중...</div>
        ) : signals.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>신호 없음</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  {['시간', '종목', '신호', '신뢰도', '목표가', '체결가', '괴리', '상태', '분석 내용'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      textAlign: i >= 4 && i <= 6 ? 'right' : 'left',
                      color: 'var(--text2)', fontWeight: 400, fontSize: 11,
                      letterSpacing: 0.5, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((s, i) => (
                  <tr
                    key={s.signal_id}
                    onClick={() => setSelected(s)}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500 }}>{s.stock_name}</div>
                      <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{s.stock_code}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge text={s.action} color={ACTION_COLOR[s.action] || 'var(--text2)'} />
                    </td>
                    <td style={{ padding: '12px 16px' }}><Bar value={s.confidence} /></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {s.target_price ? Number(s.target_price).toLocaleString() + '원' : <span style={{ color: 'var(--text2)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {s.executed_price ? Number(s.executed_price).toLocaleString() + '원' : <span style={{ color: 'var(--text2)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {s.target_price && s.executed_price ? (() => {
                        const diff = ((s.executed_price - s.target_price) / s.target_price * 100);
                        const color = Math.abs(diff) < 0.5 ? 'var(--text2)' : diff > 0 ? 'var(--red)' : 'var(--green)';
                        return <span style={{ color }}>{diff >= 0 ? '+' : ''}{diff.toFixed(2)}%</span>;
                      })() : <span style={{ color: 'var(--text2)' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.rejected
                        ? <Badge text="거절" color="var(--red)" />
                        : s.executed
                          ? <Badge text="실행" color="var(--green)" />
                          : <Badge text="대기" color="var(--yellow)" />}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.reject_reason || s.reason}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={signals.length} page={page} onChange={setPage} />
      </div>
    </Layout>
  );
}
