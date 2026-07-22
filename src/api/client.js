import axios from 'axios';

const TOKEN_KEY = 'trading_token';

export const saveToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = ()  => localStorage.removeItem(TOKEN_KEY);
export const getToken   = ()  => localStorage.getItem(TOKEN_KEY);

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
});

api.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      clearToken();
      window._setAuth?.(false);
    }
    return Promise.reject(err);
  }
);

export default api;

// 대시보드 DB 기반
export const getSummary    = () => api.get('/dashboard/summary');
export const getTrades        = (limit = 100) => api.get(`/dashboard/trades?limit=${limit}`);
export const getStockTrades   = (stock_code)  => api.get(`/dashboard/trades?stock_code=${stock_code}&limit=200`);
export const getMonthlyTrades = (month, limit = 1000) => api.get(`/dashboard/trades?month=${month}&limit=${limit}`);
export const getPnlChart      = (days = 30) => api.get(`/dashboard/pnl-chart?days=${days}`);
export const getMonthlyPnl    = (month)    => api.get(`/dashboard/pnl-chart?month=${month}`);
export const getPnlByMonth    = (months = 12) => api.get(`/dashboard/pnl-by-month?months=${months}`);
export const getSignals    = (limit = 50) => api.get(`/signal/list?limit=${limit}`);
export const getMonthlySignals = (month, limit = 1000) => api.get(`/signal/list?month=${month}&limit=${limit}`);

export const getPortfolio  = (days = 30) => api.get(`/dashboard/portfolio?days=${days}`);
export const getMonthlyPortfolio = (month) => api.get(`/dashboard/portfolio?month=${month}`);
export const getPrincipal  = () => api.get('/dashboard/principal');
export const setPrincipal  = (v) => api.post('/dashboard/principal', { principal: v });
export const getFees       = (month) => api.get(`/dashboard/fees${month ? `?month=${month}` : ''}`);

// 키움 실계좌 (백엔드가 Kiwoom API 호출 → 키 절대 노출 없음)
export const getAccount      = () => api.get('/kiwoom/account');
export const getFilledOrders = () => api.get('/kiwoom/orders/filled');
export const syncOrders      = () => api.post('/kiwoom/sync-orders');
export const recalcProfit    = () => api.post('/kiwoom/recalc-profit');
export const sellHolding     = (stock_code, stock_name, quantity, order_type = 'MARKET') =>
  api.post('/kiwoom/order/sell', { stock_code, stock_name, quantity, order_type });
export const getLockedStocks = () => api.get('/kiwoom/locked');
export const lockStock       = (stock_code) => api.post(`/kiwoom/lock/${stock_code}`);
export const unlockStock     = (stock_code) => api.post(`/kiwoom/unlock/${stock_code}`);
