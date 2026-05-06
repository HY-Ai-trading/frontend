#!/bin/bash
# 빌드 후 production 서빙 (Cloudflare 캐시 우회)
set -e
cd "$(dirname "$0")"
echo "빌드 중..."
npm run build
echo "서빙 시작 (port 3000)..."
npx serve -s build -l 3000 --no-clipboard
