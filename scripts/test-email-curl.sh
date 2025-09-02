#!/bin/bash

# Gmail 이메일 발송 테스트 스크립트 (curl 버전)
# 
# 사용법:
# 1. 브라우저에서 로그인하고 개발자 도구에서 쿠키 값을 복사
# 2. COOKIE 변수에 붙여넣기
# 3. ./scripts/test-email-curl.sh 실행

# ========================================
# 설정 - 여기를 수정하세요
# ========================================

# 브라우저에서 복사한 쿠키 값을 여기에 붙여넣으세요
# 예: "sb-xxxxxx=...; sb-xxxxxx-auth-token=..."
COOKIE=""

# 테스트 수신자 이메일
RECIPIENT="stresspoon@gmail.com"

# ========================================
# 테스트 실행
# ========================================

echo "🚀 Gmail 이메일 발송 테스트"
echo "================================"
echo "📧 수신자: $RECIPIENT"
echo ""

# 현재 시간
CURRENT_TIME=$(date "+%Y-%m-%d %H:%M:%S")

# 이메일 데이터
EMAIL_DATA=$(cat <<EOF
{
  "recipients": ["$RECIPIENT"],
  "subject": "AIMAX 이메일 본문 테스트 - $CURRENT_TIME",
  "body": "안녕하세요!<br/><br/>이것은 <strong>AIMAX</strong>에서 발송하는 테스트 이메일입니다.<br/><br/>다음 내용을 확인합니다:<br/>• 한글 텍스트가 제대로 표시되는지<br/>• <em>HTML 태그</em>가 적용되는지<br/>• 줄바꿈이 정상적으로 처리되는지<br/><br/>발송 시간: $CURRENT_TIME<br/><br/>감사합니다.<br/>AIMAX Team",
  "replyTo": "noreply@aimax.kr"
}
EOF
)

# 쿠키가 설정되지 않은 경우 안내
if [ -z "$COOKIE" ]; then
  echo "⚠️  쿠키가 설정되지 않았습니다!"
  echo ""
  echo "브라우저에서 쿠키를 가져오는 방법:"
  echo "1. Chrome/Edge 개발자 도구 열기 (F12)"
  echo "2. Application 탭 > Cookies > http://localhost:3001"
  echo "3. 모든 쿠키 값을 복사 (특히 sb-로 시작하는 것들)"
  echo "4. 이 스크립트의 COOKIE 변수에 붙여넣기"
  echo ""
  echo "예시:"
  echo 'COOKIE="sb-xxxxx=eyJhbGci...; sb-xxxxx-auth-token=..."'
  exit 1
fi

echo "📤 이메일 발송 중..."
echo ""

# API 호출
RESPONSE=$(curl -s -X POST http://localhost:3001/api/emails/send-gmail \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d "$EMAIL_DATA" \
  -w "\nHTTP_STATUS:%{http_code}")

# HTTP 상태 코드 추출
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS:.*//')

# 결과 확인
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ 이메일 발송 성공!"
  echo ""
  echo "응답:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  echo "📬 $RECIPIENT 이메일을 확인해주세요!"
else
  echo "❌ 이메일 발송 실패 (HTTP $HTTP_STATUS)"
  echo ""
  echo "응답:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  
  if [ "$HTTP_STATUS" = "401" ]; then
    echo "💡 인증 오류입니다. 브라우저에서 다시 로그인한 후 쿠키를 업데이트하세요."
  elif [ "$HTTP_STATUS" = "400" ]; then
    echo "💡 Gmail이 연동되지 않았을 수 있습니다. 브라우저에서 Gmail 연동을 확인하세요."
  fi
fi