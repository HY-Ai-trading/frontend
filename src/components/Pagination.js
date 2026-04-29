import React from 'react';

const PAGE_SIZE = 10;
const WINDOW    = 5; // 한 번에 보여줄 페이지 번호 수

export { PAGE_SIZE };

export default function Pagination({ total, page, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  // 페이지 번호 범위 계산 (네이버 카페식)
  const groupStart = Math.floor((page - 1) / WINDOW) * WINDOW + 1;
  const groupEnd   = Math.min(groupStart + WINDOW - 1, totalPages);
  const pages      = Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);

  const btn = (label, target, disabled = false, active = false) => (
    <button
      key={label}
      onClick={() => !disabled && onChange(target)}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 8px',
        borderRadius: 5, fontSize: 12, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--mono)', fontWeight: active ? 700 : 400,
        border: active ? '1.5px solid var(--green)' : '1px solid var(--border)',
        background: active ? 'rgba(57,211,83,0.12)' : 'transparent',
        color: active ? 'var(--green)' : disabled ? 'var(--border)' : 'var(--text2)',
        transition: 'all .1s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 4, padding: '16px 0 8px',
    }}>
      {btn('«', 1,            page === 1)}
      {btn('‹', page - 1,    page === 1)}
      {pages.map(p => btn(p, p, false, p === page))}
      {btn('›', page + 1,    page === totalPages)}
      {btn('»', totalPages,  page === totalPages)}
    </div>
  );
}
