import { SmsProvider, SmsSendResult } from './types'

// Naver Cloud SENS (문자) - 실제 사용 시 환경변수 필요
// NAVER_SENS_ACCESS_KEY, NAVER_SENS_SECRET_KEY, NAVER_SENS_SERVICE_ID, NAVER_SENS_SENDER

export class NaverSensProvider implements SmsProvider {
  providerName = 'naver_sens'

  async send(to: string[], message: string): Promise<SmsSendResult> {
    // 간단한 어댑터 스켈레톤: 실제 요청은 보안상 여기서 구현 생략
    // 운영 연결 시 전용 서버-사이드 route에서 HMAC 서명 생성 후 호출 권장
    if (!process.env.NAVER_SENS_ACCESS_KEY || !process.env.NAVER_SENS_SECRET_KEY || !process.env.NAVER_SENS_SERVICE_ID || !process.env.NAVER_SENS_SENDER) {
      throw new Error('Naver SENS env not configured')
    }
    // TODO: 실제 SENS API 호출 구현 (요청 바디 구성, 서명 생성)
    // 현재는 안전하게 no-op 처리
    return { successCount: 0, failed: to.map(t => ({ to: t, error: 'Not implemented' })) }
  }
}


