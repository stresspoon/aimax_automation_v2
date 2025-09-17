import { SmsProvider, SmsSendResult } from './types'

export class MockSmsProvider implements SmsProvider {
  providerName = 'mock'

  async send(to: string[], message: string): Promise<SmsSendResult> {
    // 개발환경에서 실제 전송 없이 로그만 남김
    console.log('[MockSMS] to=', to, 'message=', message)
    return { successCount: to.length, failed: [] }
  }
}


