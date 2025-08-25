function buildPrompt({ keyword, contentType, instructions }: { keyword: string; contentType: 'blog' | 'thread'; instructions: string }) {
  const base = `당신은 한국어 콘텐츠 전문가입니다. 사용자의 지침을 충실히 따라 고품질 콘텐츠를 작성하세요.`
  
  const task = contentType === 'blog'
    ? `작성 형식:
- 블로그 글 (도입부, 본문, 결론 구조)
- 분량: 1,500~2,000자
- 키워드 "${keyword}"를 1.5~2% 밀도로 자연스럽게 포함
- H2, H3 소제목을 명확히 구분
- 불릿포인트와 번호 목록 활용
- 마지막에 CTA(Call to Action) 포함`
    : `작성 형식:
- 스레드 형식 (5-6줄, 총 150자 이내)
- 키워드 "${keyword}"를 자연스럽게 1-2회 포함
- 한 줄씩 띄어쓰기로 구분
- 임팩트 있는 첫 줄로 시작
- 마지막은 참여 유도 질문으로 마무리`
  
  return `${base}

[작성 지침]
${instructions}

[작업 규격]
${task}

[출력 형식]
제목: [여기에 제목 작성]

[본문 시작]
여기에 일반 텍스트 형식으로 본문을 작성하세요.
소제목은 줄바꿈 후 명확히 구분해주세요.
마크다운 기호(#, *, -, ``` 등)는 사용하지 마세요.
불릿포인트는 • 또는 - 기호를 사용하세요.
[본문 끝]

중요: 마크다운 형식이 아닌 일반 텍스트로 작성하세요.`
}