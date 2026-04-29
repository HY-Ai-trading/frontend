#!/bin/bash
# ================================================
# 라즈베리파이 React 프론트엔드 설치 스크립트
# 실행: chmod +x setup_frontend.sh && ./setup_frontend.sh
# ================================================

echo "📦 Node.js 설치 확인..."
if ! command -v node &> /dev/null; then
  echo "Node.js 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js $(node -v) 확인 완료"

echo "📚 패키지 설치 중... (3~5분 소요)"
npm install

echo "🔨 빌드 중..."
npm run build

echo ""
echo "====================================="
echo "✅ 빌드 완료!"
echo ""
echo "📌 빌드 파일 위치: ./build/"
echo ""
echo "📌 라즈베리파이 FastAPI 서버에서 정적 파일 서빙:"
echo "   main.py에 아래 코드 추가하세요:"
echo ""
echo '   from fastapi.staticfiles import StaticFiles'
echo '   from fastapi.responses import FileResponse'
echo '   app.mount("/", StaticFiles(directory="frontend/build", html=True), name="frontend")'
echo ""
echo "📌 또는 nginx로 서빙 (권장):"
echo "   sudo cp -r build/* /var/www/html/"
echo "====================================="
