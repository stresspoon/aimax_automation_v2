export type EmailTemplateId = 'generic' | 'welcome' | 'reset-password'

export interface RenderedEmail {
  subject: string
  html: string
  text?: string
}

export function renderTemplate(id: EmailTemplateId, data: Record<string, unknown> = {}): RenderedEmail {
  switch (id) {
    case 'welcome':
      return {
        subject: `AIMAX에 오신 것을 환영합니다` ,
        html: `
          <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; line-height:1.6; color:#111">
            <h2 style="margin:0 0 8px 0">환영합니다!</h2>
            <p style="margin:0 0 12px 0">AIMAX 가입이 완료되었습니다. 이제 자동화 도구들을 바로 사용해보세요.</p>
            <a href="${(data['ctaUrl'] as string) || '#'}" style="display:inline-block; padding:10px 16px; background:#ff3d00; color:#fff; border-radius:8px; text-decoration:none">대시보드 바로가기</a>
          </div>
        `,
        text: 'AIMAX 가입이 완료되었습니다. 대시보드에서 시작해보세요.'
      }
    case 'reset-password':
      return {
        subject: `비밀번호 재설정 안내`,
        html: `
          <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; line-height:1.6; color:#111">
            <h2 style="margin:0 0 8px 0">비밀번호 재설정</h2>
            <p style="margin:0 0 12px 0">아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>
            <a href="${(data['resetUrl'] as string) || '#'}" style="display:inline-block; padding:10px 16px; background:#ff3d00; color:#fff; border-radius:8px; text-decoration:none">비밀번호 재설정</a>
          </div>
        `,
        text: '링크를 눌러 비밀번호를 재설정하세요.'
      }
    case 'generic':
    default:
      return {
        subject: (data['subject'] as string) || 'AIMAX 알림',
        html: `<div style="font-family:Pretendard,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111">${(data['html'] as string) || '안내 메일입니다.'}</div>`,
        text: (data['text'] as string) || '안내 메일입니다.'
      }
  }
}



