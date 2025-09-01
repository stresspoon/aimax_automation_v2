#!/bin/bash

# 포트 체크 및 재시작 스크립트
PORT=${PORT:-3001}

echo "🔍 포트 $PORT 상태 확인 중..."

# 포트 사용 중인지 확인
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 포트 $PORT가 정상 작동 중입니다"
    echo "   URL: http://localhost:$PORT"
else
    echo "⚠️  포트 $PORT가 응답하지 않습니다"
    echo "🔄 서버를 재시작합니다..."
    
    # 기존 프로세스 종료
    pkill -f "next dev" 2>/dev/null
    
    # 1초 대기
    sleep 1
    
    # 서버 재시작
    npm run dev:restart
fi