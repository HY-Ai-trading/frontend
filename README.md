# Trading Frontend

키움증권 자동매매 모니터링 대시보드 (React)

## 기술 스택

- **React 18** — UI
- **Recharts** — 손익 차트
- **Axios** — API 통신 (JWT 자동 첨부)
- **WebSocket** — 실시간 시세

## 구조

```
trading-frontend/
├── public/
└── src/
    ├── App.js              # 라우팅, 로그인 상태 관리
    ├── api/
    │   └── client.js       # Axios 인스턴스, JWT 인터셉터
    ├── components/
    │   ├── Layout.js       # 공통 레이아웃·네비·로그아웃
    │   └── Pagination.js   # 페이지네이션 (10개/페이지)
    └── pages/
        ├── LoginPage.js    # 로그인
        ├── DashboardPage.js # 대시보드 (잔고·신호·차트)
        ├── TradesPage.js   # 체결내역
        └── SignalsPage.js  # AI 신호 목록
```

## 주요 기능

- **대시보드** — 예수금·보유평가금액·총 자산·평가손익·월 실현손익 카드
- **실시간 시세** — WebSocket으로 보유종목 현재가 실시간 업데이트
- **AI 신호** — 행 클릭 시 모달로 분석 근거 전체 표시
- **체결내역** — 매수/매도 필터, 키움 동기화 버튼
- **누적 손익 차트** — 7일·30일·90일 전환

## 설정

```bash
cp .env.example .env
# REACT_APP_API_URL=https://your-api-domain.com
```

## 실행

```bash
# 최초 설치 + 빌드
chmod +x setup_frontend.sh && ./setup_frontend.sh

# 빌드 후 프로덕션 서빙 (port 3000, Cloudflare 캐시 우회)
chmod +x serve-prod.sh && ./serve-prod.sh

# 코드 수정 후 재빌드·서빙
./serve-prod.sh
```

## 인증

로그인 시 JWT 토큰을 `localStorage`에 저장, 모든 API 요청에 자동 첨부.  
401 응답 시 자동 로그아웃.
