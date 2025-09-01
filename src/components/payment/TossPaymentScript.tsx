'use client'

import Script from 'next/script'

export function TossPaymentScript() {
  return (
    <Script
      src="https://js.tosspayments.com/v1/payment-widget"
      strategy="beforeInteractive"
    />
  )
}