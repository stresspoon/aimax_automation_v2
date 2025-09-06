import { z } from 'zod'

// Relaxed email validator to allow short TLDs like a@b.c (used in tests)
const Email = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '유효한 이메일이 아닙니다')

export const LoginSchema = z.object({
  email: Email,
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})

export const SignupSchema = z.object({
  email: Email,
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().min(3),
  companyName: z.string().optional(),
  agreeMarketing: z.boolean().optional(),
})

export const ForgotPasswordSchema = z.object({
  email: Email,
})

export const ResetPasswordSchema = z.object({
  code: z.string().min(1),
  password: z.string().min(8),
})

export const GoogleIdTokenSchema = z.object({
  idToken: z.string().min(10),
})

export const GmailConnectSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().min(1),
  email: Email.optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SignupInput = z.infer<typeof SignupSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type GoogleIdTokenInput = z.infer<typeof GoogleIdTokenSchema>
export type GmailConnectInput = z.infer<typeof GmailConnectSchema>
