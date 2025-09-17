export interface SmsSendResult {
  successCount: number
  failed: Array<{ to: string; error: string }>
}

export interface SmsProvider {
  send(to: string[], message: string): Promise<SmsSendResult>
  providerName: string
}


