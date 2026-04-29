import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Pagination, { PAGE_SIZE } from '../components/Pagination';
import { getTrades, syncOrders } from '../api/client';

export default function TradesPage() {
  const [trades, setTrades]   = useState([]);
  const [filter, setFilter]   = useState('ALL');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastAt, setLastAt]   = useState('');

  const load = useCallback(() => {
    getTrades()
      .then(r => {
        setTrades(r.data || []);
        setLastAt(new Date().toLocaleTimeString('ko-KR'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSync = () => {
    setSyncing(true);
    syncOrders()
      .then(() => load())
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const buyCnt    = trades.filter(t => t.action === 'BUY').length;
  const sellCnt   = trades.filter(t => t.action === 'SELL').length;
  const totalPnl  = trades.reduce((s, t) => s + (t.profit || 0), 0);

  const filtered = filter === 'ALL' ? trades : trades.filter(t => t.action === filter);
  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilterAndReset = (f) => { setFilter(f); setPage(1); };

  const tabs = [
    { key: 'ALL',  label: '전체',  count: trades.length },
    { key: 'BUY',  label: '매수',  count: buyCnt },
    { key: 'SELL', label: '매도',  count: sellCnt },
  ];

  return (
    <Layout title="체결내역">
      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '총 체결', value: `${trades.length}건`, color: 'var(--text)' },
          { label: '매수',    value: `${buyCnt}건`,        color: 'var(--green)' },
          { label: '매도',    value: `${sellCnt}건`,       color: 'var(--red)' },
          {
            label: '실현손익',
            value: (totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString() + '원',
            color: totalPnl > 0 ? 'var(--green)' : totalPnl < 0 ? 'var(--red)' : 'var(--text2)',
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, minWidth: 120,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '14px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* 헤더: 탭 + 갱신 */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {/* 필터 탭 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(({ key, label, count }) => {
              const active = filter === key;
              const accentColor = key === 'BUY' ? 'var(--green)' : key === 'SELL' ? 'var(--red)' : 'var(--text)';
              return (
                <button
                  key={key}
                  onClick={() => setFilterAndReset(key)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontWeight: active ? 700 : 400,
                    border: active ? `1.5px solid ${accentColor}` : '1.5px solid var(--border)',
                    background: active ? `${accentColor}18` : 'transparent',
                    color: active ? accentColor : 'var(--text2)',
                    transition: 'all .12s',
                  }}
                >
                  {label}
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* 갱신 / 키움 동기화 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastAt && (
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                {lastAt}
              </span>
            )}
            <button onClick={handleSync} disabled={syncing} style={{
              padding: '3px 12px', fontSize: 11, borderRadius: 5, cursor: syncing ? 'default' : 'pointer',
              border: '1px solid var(--border)',
              background: syncing ? 'rgba(57,211,83,0.08)' : 'transparent',
              color: syncing ? 'var(--green)' : 'var(--text2)',
              opacity: syncing ? 0.7 : 1,
            }}>
              {syncing ? '동기화 중...' : '키움 동기화'}
            </button>
            <button onClick={load} style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)',
            }}>↺</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
            {trades.length === 0 ? '체결 내역 없음' : `${filter === 'BUY' ? '매수' : '매도'} 내역 없음`}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  {[
                    { label: '시간',   align: 'left' },
                    { label: '종목',   align: 'left' },
                    { label: '구분',   align: 'left' },
                    { label: '수량',   align: 'right' },
                    { label: '단가',   align: 'right' },
                    { label: '금액',   align: 'right' },
                    { label: '손익',   align: 'right' },
                    { label: '상태',   align: 'left' },
                  ].map(({ label, align }) => (
                    <th key={label} style={{
                      padding: '10px 16px', textAlign: align,
                      color: 'var(--text2)', fontWeight: 400, fontSize: 11, whiteSpace: 'nowrap',
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((t, i) => {
                  const isBuy  = t.action === 'BUY';
                  const pnlClr = (t.profit || 0) > 0 ? 'var(--green)' : (t.profit || 0) < 0 ? 'var(--red)' : 'var(--text2)';
                  const stsClr = t.status === 'DONE' ? 'var(--green)' : t.status === 'FAIL' ? 'var(--red)' : 'var(--yellow)';
                  return (
                    <tr key={t.id} style={{
                      borderTop: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    }}>
                      <td style={{ padding: '11px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleString('ko-KR', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500 }}>{t.stock_name}</div>
                        <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{t.stock_code}</div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          fontFamily: 'var(--mono)', fontWeight: 700,
                          background: isBuy ? 'rgba(57,211,83,0.12)' : 'rgba(248,81,73,0.12)',
                          color: isBuy ? 'var(--green)' : 'var(--red)',
                        }}>
                          {isBuy ? '매수' : '매도'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                        {(t.quantity || 0).toLocaleString()}주
                      </td>
                      <td style={{ padding: '11px 16px', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                        {(t.price || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 16px', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                        {(t.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 16px', fontFamily: 'var(--mono)', textAlign: 'right', color: pnlClr, fontWeight: 700 }}>
                        {t.profit != null ? (t.profit >= 0 ? '+' : '') + t.profit.toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: stsClr }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={filtered.length} page={page} onChange={setPage} />
      </div>
    </Layout>
  );
}
