import { describe, it, expect } from 'vitest'
import { LoginSchema, SignupSchema, ForgotPasswordSchema, ResetPasswordSchema, GoogleIdTokenSchema, GmailConnectSchema } from '../src/app/api/auth/schema'

describe('auth schemas', () => {
  it('login schema ok', () => {
    const v = LoginSchema.parse({ email: 'a@b.c', password: '12345678' })
    expect(v.email).toBe('a@b.c')
  })
  it('signup requires name/phone', () => {
    const r = SignupSchema.safeParse({ email: 'a@b.c', password: '12345678', name: 'n', phone: '010' })
    expect(r.success).toBe(true)
  })
  it('forgot requires email', () => {
    expect(() => ForgotPasswordSchema.parse({ email: 'x@y.z' })).not.toThrow()
  })
  it('reset requires code+password', () => {
    const r = ResetPasswordSchema.safeParse({ code: 'c', password: '12345678' })
    expect(r.success).toBe(true)
  })
  it('google id token required', () => {
    expect(GoogleIdTokenSchema.safeParse({ idToken: 'token-token-token' }).success).toBe(true)
  })
  it('gmail connect requires refreshToken', () => {
    expect(GmailConnectSchema.safeParse({ refreshToken: 'r' }).success).toBe(true)
  })
})

