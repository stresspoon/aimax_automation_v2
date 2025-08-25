// OpenAI API 응답 후 텍스트 파싱 부분
const text = response.output_text || ''
if (!text) {
  return NextResponse.json({ error: '응답이 비어 있습니다.' }, { status: 400 })
}

// 일반 텍스트 형식 파싱
let title = ''
let bodyContent = ''

// "제목:" 으로 시작하는 부분 찾기
const titleMatch = text.match(/제목:\s*(.+?)(?:\n|$)/i)
if (titleMatch) {
  title = titleMatch[1].trim()
}

// [본문 시작]과 [본문 끝] 사이의 내용 추출
const bodyStartMatch = text.match(/\[본문 시작\]([\s\S]*?)\[본문 끝\]/i)
if (bodyStartMatch) {
  bodyContent = bodyStartMatch[1].trim()
} else {
  // 본문 태그가 없는 경우, 제목 이후 전체를 본문으로 처리
  const titleEndIndex = text.indexOf('\n', text.indexOf('제목:'))
  bodyContent = text.substring(titleEndIndex).trim()
}

// 불필요한 마크다운 기호 제거 (혹시 남아있을 경우를 대비)
bodyContent = bodyContent
  .replace(/#{1,6}\s/g, '')  // 마크다운 헤더 제거
  .replace(/\*\*(.+?)\*\*/g, '$1')  // 굵은 글씨 마크다운 제거
  .replace(/\*(.+?)\*/g, '$1')  // 이탤릭 마크다운 제거
  .replace(/```[\s\S]*?```/g, '')  // 코드 블록 제거

// 최종 콘텐츠 조합
const combined = title ? `${title}\n\n${bodyContent}` : bodyContent