import React, { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import api from '../api/client';
import { getStockTrades, getMonthlyPortfolio } from '../api/client';


const COLORS = [
  '#39d353', '#58a6ff', '#f0883e', '#d2a8ff', '#ffa657',
  '#ff7b72', '#79c0ff', '#56d364', '#e3b341', '#bc8cff',
];

const won  = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
const diff = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toLocaleString('ko-KR') + '원';
const clr  = (n) => n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--text2)';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const hasSell = d.sell_count > 0;
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.stock_name}</div>
      <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: 6 }}>{d.stock_code}</div>
      <div style={{ color: payload[0].fill, fontFamily: 'var(--mono)' }}>비중 {d.percentage}%</div>
      <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, marginTop: 2 }}>매수 {won(d.total_amount)}</div>
      {hasSell && (
        <div style={{ color: clr(d.realized_pnl), fontFamily: 'var(--mono)', fontSize: 11, marginTop: 4, fontWeight: 700 }}>
          실현손익 {diff(d.realized_pnl)}
        </div>
      )}
      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 4 }}>
        매수 {d.trade_count}회{hasSell ? ` · 매도 ${d.sell_count}회` : ''}
      </div>
    </div>
  );
};

/* ── 종목 거래내역 모달 ── */
function StockTradeModal({ stock, onClose }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockTrades(stock.stock_code)
      .then(r => setTrades((r.data || []).filter(t => t.stock_code === stock.stock_code)))
      .finally(() => setLoading(false));
  }, [stock.stock_code]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const buys  = trades.filter(t => t.action === 'BUY');
  const sells = trades.filter(t => t.action === 'SELL');
  const totalBuyAmt  = buys.reduce((s, t) => s + (t.amount || 0), 0);
  const totalSellAmt = sells.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPnl     = sells.reduce((s, t) => s + (t.profit || 0), 0);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{stock.stock_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              {stock.stock_code}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text2)', fontSize: 18, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* 요약 카드 */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {[
            { label: '총 매수', value: won(totalBuyAmt), color: 'var(--text)' },
            { label: '총 매도', value: won(totalSellAmt), color: 'var(--text)' },
            { label: '실현손익', value: diff(totalPnl), color: clr(totalPnl) },
            { label: '매수', value: `${buys.length}회`, color: 'var(--green)' },
            { label: '매도', value: `${sells.length}회`, color: 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: '12px 16px', textAlign: 'center',
              borderRight: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 거래 목록 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>로딩 중...</div>
          ) : trades.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>거래 내역 없음</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                <tr>
                  {[['시간','left'],['구분','left'],['수량','right'],['단가','right'],['금액','right'],['손익','right']].map(([h, align]) => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: align,
                      color: 'var(--text2)', fontWeight: 400, fontSize: 11,
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...trades].reverse().map((t) => {
                  const isBuy = t.action === 'BUY';
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11,
                          fontFamily: 'var(--mono)', fontWeight: 700,
                          background: isBuy ? 'rgba(57,211,83,0.12)' : 'rgba(248,81,73,0.12)',
                          color: isBuy ? 'var(--green)' : 'var(--red)',
                        }}>{isBuy ? '매수' : '매도'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {(t.quantity || 0).toLocaleString()}주
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {(t.price || 0).toLocaleString()}원
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                        {(t.amount || 0).toLocaleString()}원
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: isBuy ? 'var(--text2)' : clr(t.profit || 0) }}>
                        {isBuy ? '—' : diff(t.profit || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [data, setData]       = useState([]);
  const [days, setDays]       = useState(30);
  const [mode, setMode]       = useState('days'); // 'days' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [lastAt, setLastAt]   = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = mode === 'month'
        ? await getMonthlyPortfolio(selectedMonth)
        : await api.get(`/dashboard/portfolio?days=${days}`);
      setData(res.data || []);
    } finally {
      setLoading(false);
      setLastAt(new Date().toLocaleTimeString('ko-KR'));
    }
  }, [days, mode, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const [selYear, selMon] = selectedMonth.split('-').map(Number);
  const selectedMonthLabel = `${selYear}년 ${selMon}월`;
  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);
  const shiftMonth = (delta) => {
    const d = new Date(selYear, selMon - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const totalAmount = data.reduce((s, d) => s + d.total_amount, 0);
  const totalPnl    = data.reduce((s, d) => s + d.realized_pnl, 0);
  const totalTrades = data.reduce((s, d) => s + d.trade_count, 0);

  return (
    <Layout title="포트폴리오 비중">
      {selected && <StockTradeModal stock={selected} onClose={() => setSelected(null)} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
          {lastAt ? `업데이트: ${lastAt}` : ''}
        </span>
        <button onClick={load} style={{
          padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)',
        }}>↺</button>
      </div>

      {/* 기간 선택 + 요약 카드 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {mode === 'month' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => shiftMonth(-1)} style={{
                width: 24, height: 24, borderRadius: 4, fontSize: 12, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', lineHeight: 1,
              }}>‹</button>
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 80, textAlign: 'center' }}>
                {selectedMonthLabel}
              </span>
              <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} style={{
                width: 24, height: 24, borderRadius: 4, fontSize: 12,
                cursor: isCurrentMonth ? 'default' : 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: isCurrentMonth ? 'var(--border)' : 'var(--text2)', lineHeight: 1,
              }}>›</button>
            </div>
          ) : (
            [7, 30, 90].map(d => (
              <button key={d} onClick={() => { setMode('days'); setDays(d); }} style={{
                padding: '6px 16px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: mode === 'days' && days === d ? 'var(--green)' : 'transparent',
                color: mode === 'days' && days === d ? '#000' : 'var(--text2)',
                fontFamily: 'var(--mono)', fontWeight: 700, transition: 'all .15s',
              }}>{d}일</button>
            ))
          )}
          <button onClick={() => setMode(mode === 'month' ? 'days' : 'month')} style={{
            padding: '6px 16px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
            border: '1px solid var(--border)',
            background: mode === 'month' ? 'var(--green)' : 'transparent',
            color: mode === 'month' ? '#000' : 'var(--text2)',
            fontFamily: 'var(--mono)', fontWeight: 700, transition: 'all .15s',
          }}>월별</button>
        </div>
        {!loading && data.length > 0 && (
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: '총 매수 금액', value: won(totalAmount), color: 'var(--text)' },
              { label: '실현 손익', value: diff(totalPnl), color: clr(totalPnl) },
              { label: '종목 수', value: `${data.length}개`, color: 'var(--text)' },
              { label: '총 거래', value: `${totalTrades}회`, color: 'var(--text)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</div>
                <div style={{ fontSize: 15, fontFamily: 'var(--mono)', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 13 }}>로딩 중...</div>
      ) : data.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '80px', textAlign: 'center', color: 'var(--text2)', fontSize: 13,
        }}>{mode === 'month' ? `${selectedMonthLabel}에 매수 내역이 없습니다` : `${days}일 이내 매수 내역이 없습니다`}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 파이차트 + 범례 */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 500 }}>
              매수 금액 비중
            </div>
            <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 260px', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data} dataKey="total_amount" nameKey="stock_name"
                      cx="50%" cy="50%" innerRadius={65} outerRadius={115}
                      paddingAngle={2} strokeWidth={0}
                    >
                      {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
                {data.map((d, i) => (
                  <div key={d.stock_code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{d.stock_name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', minWidth: 36, textAlign: 'right' }}>{d.percentage}%</span>
                    {d.sell_count > 0 && (
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                        color: clr(d.realized_pnl), minWidth: 72, textAlign: 'right',
                      }}>{diff(d.realized_pnl)}</span>
                    )}
                    {d.sell_count === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 72, textAlign: 'right' }}>미매도</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 종목별 비중 바 + 손익 */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 500 }}>
              종목별 상세
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.map((d, i) => (
                <div key={d.stock_code}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.stock_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{d.stock_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                        매수 {d.trade_count}회{d.sell_count > 0 ? ` · 매도 ${d.sell_count}회` : ''}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{won(d.total_amount)}</span>
                      {d.sell_count > 0 ? (
                        <span style={{
                          fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700,
                          color: clr(d.realized_pnl), minWidth: 80, textAlign: 'right',
                        }}>{diff(d.realized_pnl)}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 80, textAlign: 'right' }}>미매도</span>
                      )}
                      <span style={{
                        fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700,
                        color: COLORS[i % COLORS.length], minWidth: 40, textAlign: 'right',
                      }}>{d.percentage}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${d.percentage}%`,
                      background: COLORS[i % COLORS.length],
                      transition: 'width .4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 순위 테이블 */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 500 }}>
              순위표
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)' }}>
                    {[
                      ['순위', 'left'], ['종목', 'left'], ['매수 금액', 'right'],
                      ['비중', 'right'], ['실현 손익', 'right'], ['매수', 'right'], ['매도', 'right'],
                    ].map(([h, align]) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: align, color: 'var(--text2)', fontWeight: 400, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr
                      key={d.stock_code}
                      onClick={() => setSelected(d)}
                      style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 11 }}>#{i + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{d.stock_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{d.stock_code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                        {won(d.total_amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', color: COLORS[i % COLORS.length], fontWeight: 700 }}>
                        {d.percentage}%
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: d.sell_count > 0 ? clr(d.realized_pnl) : 'var(--text2)' }}>
                        {d.sell_count > 0 ? diff(d.realized_pnl) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                        {d.trade_count}회
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                        {d.sell_count > 0 ? `${d.sell_count}회` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </Layout>
  );
}
