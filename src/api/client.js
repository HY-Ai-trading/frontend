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
export const getTrades     = (limit = 100) => api.get(`/dashboard/trades?limit=${limit}`);
export const getPnlChart   = (days = 30) => api.get(`/dashboard/pnl-chart?days=${days}`);
export const getSignals    = (limit = 50) => api.get(`/signal/list?limit=${limit}`);

// 키움 실계좌 (백엔드가 Kiwoom API 호출 → 키 절대 노출 없음)
export const getAccount      = () => api.get('/kiwoom/account');
export const getFilledOrders = () => api.get('/kiwoom/orders/filled');
export const syncOrders      = () => api.post('/kiwoom/sync-orders');
