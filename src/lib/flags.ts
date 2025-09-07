export function isSheetsIntegrationEnabled(): boolean {
  const v = process.env.ENABLE_SHEETS_INTEGRATION
  return v === 'true' || v === '1'
}

