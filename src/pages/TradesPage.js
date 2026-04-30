import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Pagination, { PAGE_SIZE } from '../components/Pagination';
import { getTrades, syncOrders, recalcProfit } from '../api/client';

const won  = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
const diff = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toLocaleString('ko-KR') + '원';
const clr  = (n) => n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--text2)';

/* 해당 SELL 시점의 이동평균 매수단가 계산 */
function computeAvgBuy(trade, allTrades) {
  const relevant = allTrades
    .filter(t => t.stock_code === trade.stock_code && t.status === 'DONE')
    .sort((a, b) => {
      const dt = new Date(a.created_at) - new Date(b.created_at);
      if (dt !== 0) return dt;
      return a.action === 'SELL' ? -1 : 1; // 같은 시각이면 SELL 먼저
    });

  let qty = 0, cost = 0, cmsn = 0;
  const buyLog = []; // SELL 시점에 재고로 남아있는 매수 기록

  for (const t of relevant) {
    if (t.id === trade.id) break;
    if (t.action === 'BUY') {
      const prev_total = cost * qty;
      qty  += t.quantity;
      cost  = qty > 0 ? (prev_total + t.price * t.quantity) / qty : t.price;
      cmsn += (t.commission || 0);
      buyLog.push({ ...t });
    } else if (t.action === 'SELL') {
      const r = qty > 0 ? Math.min(t.quantity / qty, 1.0) : 0;
      qty  = Math.max(0, qty - t.quantity);
      cmsn = Math.max(0, cmsn * (1 - r));
      if (qty === 0) { cost = 0; cmsn = 0; buyLog.length = 0; }
    }
  }

  const ratio      = qty > 0 ? Math.min(trade.quantity / qty, 1.0) : 1.0;
  const buyCmsnCut = Math.round(cmsn * ratio);
  const gross      = Math.round((trade.price - cost) * trade.quantity);
  const sellCmsn   = trade.commission || 0;

  return { avgBuy: cost, gross, buyCmsnCut, sellCmsn, netProfit: trade.profit, buyLog };
}

/* ── 매도 상세 모달 ── */
function SellDetailModal({ trade, trades, onClose }) {
  const { avgBuy, gross, buyCmsnCut, sellCmsn, netProfit, buyLog } = computeAvgBuy(trade, trades);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const Row = ({ label, value, color = 'var(--text)', mono = true, sub }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '9px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: mono ? 'var(--mono)' : 'inherit', fontSize: 13, fontWeight: 600, color }}>
          {value}
        </span>
        {sub && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );

  const priceDiff = trade.price - Math.round(avgBuy);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{trade.stock_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              {trade.stock_code} · {new Date(trade.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 11,
              fontFamily: 'var(--mono)', fontWeight: 700,
              background: 'rgba(248,81,73,0.12)', color: 'var(--red)',
              border: '1px solid rgba(248,81,73,0.3)',
            }}>매도</span>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none',
              color: 'var(--text2)', fontSize: 18, cursor: 'pointer', padding: '0 4px',
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '4px 20px 6px' }}>
          {/* 매수 / 매도 가격 비교 */}
          <div style={{
            margin: '16px 0 4px',
            background: 'var(--bg3)', borderRadius: 10, padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>평균 매수단가</div>
                <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)' }}>
                  {Math.round(avgBuy).toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, color: clr(priceDiff) }}>→</div>
                <div style={{
                  fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                  color: clr(priceDiff), marginTop: 2,
                }}>
                  {priceDiff >= 0 ? '+' : ''}{priceDiff.toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>매도 단가</div>
                <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)' }}>
                  {(trade.price || 0).toLocaleString()}원
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
              textAlign: 'center', fontSize: 11, color: 'var(--text2)',
            }}>
              {trade.quantity}주 · 매수 {won(Math.round(avgBuy) * trade.quantity)} → 매도 {won(trade.amount)}
            </div>
          </div>

          {/* 손익 계산 상세 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>손익 계산</div>
            <Row label="매도 금액"     value={won(trade.amount)} />
            <Row label="매수 원가"     value={`− ${won(Math.round(avgBuy) * trade.quantity)}`} color="var(--text2)" />
            <Row label="총손익 (수수료 전)" value={diff(gross)} color={clr(gross)} />
            <Row
              label="매도 수수료·세금"
              value={sellCmsn > 0 ? `− ${won(sellCmsn)}` : '—'}
              color="var(--text2)"
            />
            <Row
              label="매수 수수료 배분"
              value={buyCmsnCut > 0 ? `− ${won(buyCmsnCut)}` : '—'}
              color="var(--text2)"
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>실현 손익</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700,
                color: clr(netProfit ?? gross),
              }}>
                {diff(netProfit ?? gross)}
              </span>
            </div>
          </div>

          {/* 매수 내역 */}
          {buyLog.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>매수 내역 (재고 기준)</div>
              <div style={{ background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['날짜', '단가', '수량', '금액'].map((h, i) => (
                        <th key={h} style={{
                          padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right',
                          color: 'var(--text2)', fontWeight: 400, borderBottom: '1px solid var(--border)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buyLog.map((b) => (
                      <tr key={b.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 12px', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                          {new Date(b.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                          {(b.price || 0).toLocaleString()}원
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                          {b.quantity}주
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                          {(b.amount || 0).toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function TradesPage() {
  const [trades, setTrades]   = useState([]);
  const [filter, setFilter]   = useState('ALL');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [lastAt, setLastAt]   = useState('');
  const [selected, setSelected] = useState(null);

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

  const handleRecalc = () => {
    setRecalcing(true);
    recalcProfit()
      .then(() => load())
      .catch(() => {})
      .finally(() => setRecalcing(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const buyCnt   = trades.filter(t => t.action === 'BUY').length;
  const sellCnt  = trades.filter(t => t.action === 'SELL').length;
  const totalPnl = trades.reduce((s, t) => s + (t.profit || 0), 0);

  const filtered = filter === 'ALL' ? trades : trades.filter(t => t.action === filter);
  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilterAndReset = (f) => { setFilter(f); setPage(1); };

  const tabs = [
    { key: 'ALL',  label: '전체', count: trades.length },
    { key: 'BUY',  label: '매수', count: buyCnt },
    { key: 'SELL', label: '매도', count: sellCnt },
  ];

  return (
    <Layout title="체결내역">
      {selected && (
        <SellDetailModal trade={selected} trades={trades} onClose={() => setSelected(null)} />
      )}

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '총 체결', value: `${trades.length}건`, color: 'var(--text)' },
          { label: '매수',    value: `${buyCnt}건`,        color: 'var(--green)' },
          { label: '매도',    value: `${sellCnt}건`,       color: 'var(--red)' },
          { label: '실현손익', value: diff(totalPnl),      color: clr(totalPnl) },
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
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(({ key, label, count }) => {
              const active = filter === key;
              const accentColor = key === 'BUY' ? 'var(--green)' : key === 'SELL' ? 'var(--red)' : 'var(--text)';
              return (
                <button key={key} onClick={() => setFilterAndReset(key)} style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontWeight: active ? 700 : 400,
                  border: active ? `1.5px solid ${accentColor}` : '1.5px solid var(--border)',
                  background: active ? `${accentColor}18` : 'transparent',
                  color: active ? accentColor : 'var(--text2)', transition: 'all .12s',
                }}>
                  {label}<span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastAt && (
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{lastAt}</span>
            )}
            <button onClick={handleSync} disabled={syncing} style={{
              padding: '3px 12px', fontSize: 11, borderRadius: 5, cursor: syncing ? 'default' : 'pointer',
              border: '1px solid var(--border)',
              background: syncing ? 'rgba(57,211,83,0.08)' : 'transparent',
              color: syncing ? 'var(--green)' : 'var(--text2)', opacity: syncing ? 0.7 : 1,
            }}>{syncing ? '동기화 중...' : '키움 동기화'}</button>
            <button onClick={handleRecalc} disabled={recalcing} style={{
              padding: '3px 12px', fontSize: 11, borderRadius: 5, cursor: recalcing ? 'default' : 'pointer',
              border: '1px solid var(--border)',
              background: recalcing ? 'rgba(88,166,255,0.08)' : 'transparent',
              color: recalcing ? 'var(--blue)' : 'var(--text2)', opacity: recalcing ? 0.7 : 1,
            }}>{recalcing ? '재계산 중...' : '재계산'}</button>
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
                    { label: '시간', align: 'left' }, { label: '종목', align: 'left' },
                    { label: '구분', align: 'left' }, { label: '수량', align: 'right' },
                    { label: '단가', align: 'right' }, { label: '금액', align: 'right' },
                    { label: '손익', align: 'right' }, { label: '상태', align: 'left' },
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
                  const isBuy    = t.action === 'BUY';
                  const isSell   = t.action === 'SELL';
                  const clickable = isSell && t.status === 'DONE';
                  const pnlClr   = clr(t.profit || 0);
                  const stsClr   = t.status === 'DONE' ? 'var(--green)' : t.status === 'FAIL' ? 'var(--red)' : 'var(--yellow)';
                  return (
                    <tr
                      key={t.id}
                      onClick={() => clickable && setSelected(t)}
                      style={{
                        borderTop: '1px solid var(--border)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        cursor: clickable ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'; }}
                    >
                      <td style={{ padding: '11px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
                        }}>{isBuy ? '매수' : '매도'}</span>
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
                        {t.profit != null ? (t.profit >= 0 ? '+' : '') + t.profit.toLocaleString() : isSell ? '—' : ''}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: stsClr }}>{t.status}</span>
                          {clickable && <span style={{ fontSize: 9, color: 'var(--text2)' }}>↗</span>}
                        </div>
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
