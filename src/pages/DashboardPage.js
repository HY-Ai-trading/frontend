import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Layout from '../components/Layout';
import { getAccount, getFilledOrders, getPnlChart, getSignals } from '../api/client';

/* ── 공통 유틸 ── */
const won   = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
const diff  = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toLocaleString('ko-KR') + '원';
const pct   = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%';
const clr   = (n) => n > 0 ? 'var(--green)' : n < 0 ? 'var(--red)' : 'var(--text)';
const fmtT  = (s) => s ? `${s.slice(0,2)}:${s.slice(2,4)}:${s.slice(4,6)}` : '-';
const fmtD  = (d) => d?.slice(5);
const parsePrice = (v) => Math.abs(parseInt(String(v || '0').replace(/[^0-9\-]/g, ''), 10)) || 0;

/* WebSocket URL 결정 */
const getWsUrl = (codes) => {
  const api = process.env.REACT_APP_API_URL || '';
  const base = api
    ? api.replace(/^http/, 'ws').replace(/\/$/, '')
    : `ws://${window.location.hostname}:8000`;
  return `${base}/kiwoom/realtime?stocks=${codes}`;
};

/* ── 카드 ── */
const Card = ({ label, value, sub, color = 'var(--text)' }) => (
  <div style={{
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 150,
  }}>
    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 20, fontFamily: 'var(--mono)', color, fontWeight: 700 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>{sub}</div>}
  </div>
);

/* ── 차트 툴팁 ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--green)', fontFamily: 'var(--mono)' }}>누적 {Number(d?.cumulative).toLocaleString()}원</div>
      <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)' }}>일별 {diff(d?.daily_pnl)}</div>
      <div style={{ color: 'var(--text2)' }}>체결 {d?.trade_count}건</div>
    </div>
  );
};

/* ── 섹션 박스 ── */
const Section = ({ title, badge, right, children }) => (
  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
        {badge != null && (
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{badge}건</span>
        )}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Empty = ({ msg = '데이터 없음' }) => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>{msg}</div>
);

/* ── 신호 모달 ── */
function SignalModal({ signal: s, onClose }) {
  const acColor = s.action === 'BUY' ? 'var(--green)' : s.action === 'SELL' ? 'var(--red)' : 'var(--yellow)';
  const status  = s.rejected ? '거절' : s.executed ? '체결' : '대기';
  const statusClr = s.rejected ? 'var(--red)' : s.executed ? 'var(--green)' : 'var(--text2)';

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const InfoRow = ({ label, children }) => (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: 'var(--text2)' }}>{label}</div>
      <div style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}>{children ?? '-'}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.stock_name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{s.stock_code}</div>
            </div>
            {[
              { text: s.action, color: acColor },
              { text: status, color: statusClr },
            ].map(({ text, color }) => (
              <span key={text} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                fontFamily: 'var(--mono)', fontWeight: 700,
                background: color + '22', color, border: `1px solid ${color}44`,
              }}>{text}</span>
            ))}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text2)',
            fontSize: 18, cursor: 'pointer', padding: '0 4px',
          }}>✕</button>
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          <InfoRow label="시간">{new Date(s.created_at).toLocaleString('ko-KR')}</InfoRow>
          <InfoRow label="신뢰도">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${s.confidence * 100}%`, height: '100%', borderRadius: 2,
                  background: s.confidence >= 0.8 ? 'var(--green)' : s.confidence >= 0.6 ? 'var(--yellow)' : 'var(--red)',
                }} />
              </div>
              <span>{Math.round(s.confidence * 100)}%</span>
            </div>
          </InfoRow>
          <InfoRow label="목표가">{s.target_price ? Number(s.target_price).toLocaleString() + '원' : null}</InfoRow>
          <InfoRow label="체결가">{s.executed_price ? Number(s.executed_price).toLocaleString() + '원' : null}</InfoRow>
          {s.reject_reason && (
            <InfoRow label="거절 사유"><span style={{ color: 'var(--red)' }}>{s.reject_reason}</span></InfoRow>
          )}
          {s.reason && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>분석 근거</div>
              <div style={{
                background: 'var(--bg3)', borderRadius: 8, padding: '14px 16px',
                fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{s.reason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function DashboardPage() {
  const [account, setAccount]       = useState(null);
  const [filled, setFilled]         = useState([]);
  const [signals, setSignals]       = useState([]);
  const [chart, setChart]           = useState([]);
  const [days, setDays]             = useState(30);
  const [loading, setLoading]       = useState(true);
  const [lastAt, setLastAt]         = useState('');
  const [err, setErr]               = useState('');
  const [rtPrices, setRtPrices]     = useState({});
  const [wsStatus, setWsStatus]     = useState('');
  const [selSignal, setSelSignal]   = useState(null);
  const [sigPage, setSigPage]       = useState(0);
  const wsRef                       = useRef(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      // DB 조회와 계좌 조회 병렬
      const [acct, pnl, sigs] = await Promise.allSettled([
        getAccount(),
        getPnlChart(days),
        getSignals(),
      ]);
      if (acct.status === 'fulfilled') setAccount(acct.value.data);
      else setErr('계좌 조회 실패');
      if (pnl.status === 'fulfilled') setChart(pnl.value.data || []);
      if (sigs.status === 'fulfilled') { setSignals(sigs.value.data || []); setSigPage(0); }

      // 체결내역은 rate limit 방지를 위해 150ms 후 별도 호출
      await new Promise(r => setTimeout(r, 150));
      const fil = await getFilledOrders().catch(() => null);
      setFilled(fil?.data?.cntr || []);
    } finally {
      setLoading(false);
      setLastAt(new Date().toLocaleTimeString('ko-KR'));
    }
  }, [days]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  /* ── 실시간 WebSocket ── */
  useEffect(() => {
    const holdings = account?.holdings;
    if (!holdings?.length) return;

    const codes = holdings.map(h => h.stock_code).join(',');
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(getWsUrl(codes));
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('live');
    ws.onclose = () => setWsStatus('off');
    ws.onerror = () => setWsStatus('off');

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // 실제 API: {trnm:'REAL', data:[{item, type, values:{...}}]}
        if (msg.trnm === 'REAL' && Array.isArray(msg.data)) {
          for (const d of msg.data) {
            const code = (d.item || '').replace(/^A/, '');
            if (!code) continue;
            const v = d.values || {};
            // 0A/0B: field '10' = 현재가, 0g: field '305' = ±현재가
            const priceStr = v['10'] ?? v['305'] ?? '';
            const price = parsePrice(priceStr);
            if (price > 0) setRtPrices(prev => ({ ...prev, [code]: price }));
          }
          return;
        }

        // 모의 API: {trnm:'0A'|'0B', stk_cd, cur_prc, ...}
        if (msg.trnm !== '0A' && msg.trnm !== '0B' && msg.trnm !== '0g') return;
        const d = msg.data || msg;
        const raw = d.stk_cd || d.stock_code || '';
        const code = raw.replace(/^A/, '');
        const price = parsePrice(d.cur_prc ?? d.cntr_pric ?? d.close ?? d['305'] ?? d['10']);
        if (code && price > 0) setRtPrices(prev => ({ ...prev, [code]: price }));
      } catch {}
    };

    return () => ws.close();
  }, [account?.holdings]);

  const monthlyPnl = chart.reduce((s, d) => s + (d.daily_pnl || 0), 0);
  const ac = account || {};

  // 실시간 가격으로 카드 수치 보정 (API 스냅샷과 통일)
  // h.profit = Kiwoom이 계산한 순이익 (수수료·세금 차감 후)
  // RT 가격 변동분은 gross로 더함 (수수료는 이미 반영됨)
  const rtHoldings = (ac.holdings || []).map(h => {
    const rtPrice  = rtPrices[h.stock_code];
    const curPrice = rtPrice || h.current_price;
    const priceDelta = rtPrice ? (rtPrice - h.current_price) * h.quantity : 0;
    const profit   = h.profit + priceDelta;
    const evalAmt  = curPrice * h.quantity;
    const cost     = h.avg_price * h.quantity;
    const profitRt = cost > 0 ? profit / cost * 100 : 0;
    return { ...h, curPrice, profit, evalAmt, profitRt, isRt: !!rtPrice };
  });

  const rtTotalEval   = rtHoldings.reduce((s, h) => s + h.evalAmt, 0) || ac.total_eval;
  const rtTotalProfit = rtHoldings.reduce((s, h) => s + h.profit,  0) || ac.total_profit;
  const rtProfitRate  = ac.total_cost > 0 ? rtTotalProfit / ac.total_cost * 100 : ac.profit_rate;

  const thStyle = (align = 'right') => ({
    padding: '10px 16px', textAlign: align,
    color: 'var(--text2)', fontWeight: 400, fontSize: 11, whiteSpace: 'nowrap',
  });
  const tdStyle = (align = 'right', extra = {}) => ({
    padding: '12px 16px', textAlign: align, fontFamily: 'var(--mono)', ...extra,
  });

  return (
    <Layout title="대시보드">
      {selSignal && <SignalModal signal={selSignal} onClose={() => setSelSignal(null)} />}
      {/* 갱신 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        {err && <span style={{ fontSize: 11, color: 'var(--red)' }}>⚠ {err}</span>}
        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
          {lastAt ? `업데이트: ${lastAt}` : ''}
        </span>
        <button onClick={load} style={{
          padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)',
        }}>↺</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 13 }}>로딩 중...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── 요약 카드 ── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Card label="예수금"          value={won(ac.cash)}        sub="주문 가능 현금" />
            <Card label="보유평가금액"    value={won(rtTotalEval)}    sub={`매입 ${won(ac.total_cost)}`} />
            <Card label="총 자산"         value={won(ac.total_asset)} sub={`예수금 + 보유종목`} />
            <Card
              label="평가손익"
              value={diff(rtTotalProfit)}
              sub={pct(rtProfitRate)}
              color={clr(rtTotalProfit)}
            />
            <Card
              label="월 실현손익 (30일)"
              value={diff(monthlyPnl)}
              sub="DB 체결 기준"
              color={clr(monthlyPnl)}
            />
          </div>

          {/* ── 보유종목 ── */}
          <Section
            title="보유종목"
            right={
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                padding: '2px 8px', borderRadius: 4,
                background: wsStatus === 'live' ? 'rgba(57,211,83,0.15)' : 'rgba(255,255,255,0.05)',
                color: wsStatus === 'live' ? 'var(--green)' : 'var(--text2)',
              }}>
                {wsStatus === 'live' ? '● LIVE' : '○ OFFLINE'}
              </span>
            }
          >
            {!rtHoldings?.length ? (
              <Empty msg="보유 종목 없음" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      <th style={thStyle('left')}>종목</th>
                      <th style={thStyle()}>수량</th>
                      <th style={thStyle()}>평균단가</th>
                      <th style={thStyle()}>현재가 (실시간)</th>
                      <th style={thStyle()}>평가금액</th>
                      <th style={thStyle()}>손익</th>
                      <th style={thStyle()}>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rtHoldings.map((h) => {
                      const { curPrice, profit, profitRt, evalAmt, isRt } = h;
                      return (
                        <tr key={h.stock_code} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500 }}>{h.stock_name}</div>
                            <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{h.stock_code}</div>
                          </td>
                          <td style={tdStyle()}>{Number(h.quantity).toLocaleString()}주</td>
                          <td style={tdStyle()}>{Number(h.avg_price).toLocaleString()}</td>
                          <td style={tdStyle('right', { color: isRt ? 'var(--blue)' : 'var(--text)', fontWeight: isRt ? 700 : 400 })}>
                            {curPrice.toLocaleString()}
                            {isRt && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--green)' }}>●</span>}
                          </td>
                          <td style={tdStyle()}>{evalAmt.toLocaleString()}</td>
                          <td style={tdStyle('right', { color: clr(profit), fontWeight: 700 })}>{diff(profit)}</td>
                          <td style={tdStyle('right', { color: clr(profitRt) })}>{pct(profitRt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── 오늘 체결 내역 ── */}
          <Section title="오늘 체결 내역" badge={filled.length}>
            {filled.length === 0 ? (
              <Empty msg="오늘 체결 내역 없음" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      <th style={thStyle('left')}>시간</th>
                      <th style={thStyle('left')}>종목</th>
                      <th style={thStyle()}>구분</th>
                      <th style={thStyle()}>체결가</th>
                      <th style={thStyle()}>수량</th>
                      <th style={thStyle()}>수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filled.map((t) => {
                      const isBuy = (t.io_tp_nm || '').includes('매수');
                      return (
                        <tr key={t.ord_no} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '11px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                            {fmtT(t.ord_tm)}
                          </td>
                          <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 500 }}>{t.stk_nm}</div>
                            <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{(t.stk_cd || '').replace(/^A/, '')}</div>
                          </td>
                          <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 11,
                              fontFamily: 'var(--mono)', fontWeight: 700,
                              background: isBuy ? 'rgba(57,211,83,0.12)' : 'rgba(248,81,73,0.12)',
                              color: isBuy ? 'var(--green)' : 'var(--red)',
                            }}>
                              {isBuy ? '매수' : '매도'}
                            </span>
                          </td>
                          <td style={tdStyle()}>{Number(t.cntr_pric).toLocaleString()}</td>
                          <td style={tdStyle()}>{Number(t.cntr_qty).toLocaleString()}주</td>
                          <td style={tdStyle('right', { color: 'var(--text2)' })}>{Number(t.tdy_trde_cmsn).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── AI 매매 신호 ── */}
          {(() => {
            const PAGE_SIZE = 10;
            const totalPages = Math.ceil(signals.length / PAGE_SIZE);
            const pageSignals = signals.slice(sigPage * PAGE_SIZE, (sigPage + 1) * PAGE_SIZE);
            return (
              <Section
                title="AI 매매 신호"
                badge={signals.length}
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>행 클릭 → 상세</span>
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => setSigPage(p => Math.max(0, p - 1))}
                          disabled={sigPage === 0}
                          style={{
                            padding: '2px 8px', fontSize: 11, borderRadius: 4, cursor: sigPage === 0 ? 'default' : 'pointer',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: sigPage === 0 ? 'var(--border)' : 'var(--text2)',
                          }}>‹</button>
                        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', minWidth: 50, textAlign: 'center' }}>
                          {sigPage + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => setSigPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={sigPage === totalPages - 1}
                          style={{
                            padding: '2px 8px', fontSize: 11, borderRadius: 4, cursor: sigPage === totalPages - 1 ? 'default' : 'pointer',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: sigPage === totalPages - 1 ? 'var(--border)' : 'var(--text2)',
                          }}>›</button>
                      </div>
                    )}
                  </div>
                }
              >
                {signals.length === 0 ? (
                  <Empty msg="신호 없음 — 오픈클로가 신호를 전송하면 여기에 표시됩니다" />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg3)' }}>
                          <th style={thStyle('left')}>시간</th>
                          <th style={thStyle('left')}>종목</th>
                          <th style={thStyle()}>신호</th>
                          <th style={thStyle()}>신뢰도</th>
                          <th style={thStyle()}>목표가</th>
                          <th style={thStyle('left')}>분석 근거</th>
                          <th style={thStyle()}>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageSignals.map((s) => {
                          const isBuy  = s.action === 'BUY';
                          const isSell = s.action === 'SELL';
                          const status = s.rejected ? '거부' : s.executed ? '체결' : '대기';
                          const statusClr = s.rejected ? 'var(--red)' : s.executed ? 'var(--green)' : 'var(--text2)';
                          return (
                            <tr
                              key={s.signal_id}
                              onClick={() => setSelSignal(s)}
                              style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '11px 16px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                {s.created_at ? s.created_at.slice(0, 16).replace('T', ' ') : '-'}
                              </td>
                              <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 500 }}>{s.stock_name}</div>
                                <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{s.stock_code}</div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 4, fontSize: 11,
                                  fontFamily: 'var(--mono)', fontWeight: 700,
                                  background: isBuy ? 'rgba(57,211,83,0.12)' : isSell ? 'rgba(248,81,73,0.12)' : 'rgba(255,255,255,0.06)',
                                  color: isBuy ? 'var(--green)' : isSell ? 'var(--red)' : 'var(--text2)',
                                }}>
                                  {s.action}
                                </span>
                              </td>
                              <td style={{ ...tdStyle(), color: s.confidence >= 0.8 ? 'var(--green)' : s.confidence >= 0.6 ? 'var(--text)' : 'var(--red)' }}>
                                {Math.round(s.confidence * 100)}%
                              </td>
                              <td style={{ ...tdStyle(), color: 'var(--text2)' }}>
                                {s.target_price ? Number(s.target_price).toLocaleString() + '원' : '-'}
                              </td>
                              <td style={{ padding: '11px 16px', color: 'var(--text2)', fontSize: 11, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.reject_reason || s.reason || '-'}
                              </td>
                              <td style={{ ...tdStyle(), color: statusClr, fontWeight: 700 }}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div style={{
                        padding: '10px 16px', borderTop: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'center', gap: 4,
                      }}>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setSigPage(i)}
                            style={{
                              width: 28, height: 28, borderRadius: 4, fontSize: 11, cursor: 'pointer',
                              border: '1px solid var(--border)', fontFamily: 'var(--mono)',
                              background: i === sigPage ? 'var(--green)' : 'transparent',
                              color: i === sigPage ? '#000' : 'var(--text2)',
                              fontWeight: i === sigPage ? 700 : 400,
                            }}
                          >{i + 1}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>
            );
          })()}

          {/* ── 누적 손익 차트 ── */}
          <Section
            title="누적 손익 추이"
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => setDays(d)} style={{
                    padding: '4px 12px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: days === d ? 'var(--green)' : 'transparent',
                    color: days === d ? '#000' : 'var(--text2)',
                    fontFamily: 'var(--mono)', fontWeight: 700, transition: 'all .15s',
                  }}>{d}일</button>
                ))}
              </div>
            }
          >
            <div style={{ padding: '20px 24px' }}>
              {chart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '60px 0', fontSize: 13 }}>
                  거래 이력이 없습니다
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chart} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#39d353" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#39d353" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date" tickFormatter={fmtD}
                      tick={{ fill: 'var(--text2)', fontSize: 11, fontFamily: 'var(--mono)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text2)', fontSize: 11, fontFamily: 'var(--mono)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + '만' : v.toLocaleString() + '원'}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Area
                      type="monotone" dataKey="cumulative"
                      stroke="var(--green)" strokeWidth={2}
                      fill="url(#pnlGrad)"
                      dot={chart.length === 1 ? { r: 5, fill: 'var(--green)', strokeWidth: 0 } : false}
                      activeDot={{ r: 4, fill: 'var(--green)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>

        </div>
      )}
    </Layout>
  );
}
