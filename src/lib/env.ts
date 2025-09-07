/**
 * 환경 변수 타입 안전성을 위한 유틸리티
 */

// 필수 환경 변수 정의
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

// 선택적 환경 변수 정의
const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'SENDGRID_API_KEY',
  'EMAIL_FROM',
  'NEXT_PUBLIC_BASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'OPENAI_API_KEY',
  'SERPAPI_API_KEY',
  'ENABLE_SHEETS_INTEGRATION',
  'TOSS_PAYMENTS_SECRET_KEY',
  'TOSS_PAYMENTS_CLIENT_KEY',
] as const;

type RequiredEnvVar = typeof requiredEnvVars[number];
type OptionalEnvVar = typeof optionalEnvVars[number];
type EnvVar = RequiredEnvVar | OptionalEnvVar;

/**
 * 환경 변수 타입 정의
 */
interface ProcessEnv {
  // 필수 환경 변수
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // 선택적 환경 변수
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  NEXT_PUBLIC_BASE_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  OPENAI_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  ENABLE_SHEETS_INTEGRATION?: string;
  TOSS_PAYMENTS_SECRET_KEY?: string;
  TOSS_PAYMENTS_CLIENT_KEY?: string;
}

/**
 * 환경 변수를 가져오는 타입 안전 함수
 */
export function getEnv<T extends EnvVar>(
  key: T
): T extends RequiredEnvVar ? string : string | undefined {
  const value = process.env[key];
  
  if (requiredEnvVars.includes(key as RequiredEnvVar) && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value as any;
}

/**
 * 환경 변수가 존재하는지 확인
 */
export function hasEnv(key: EnvVar): boolean {
  return !!process.env[key];
}

/**
 * 환경 변수를 boolean으로 파싱
 */
export function getEnvBoolean(key: EnvVar, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 환경 변수를 number로 파싱
 */
export function getEnvNumber(key: EnvVar, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const num = Number(value);
  if (isNaN(num)) {
    console.warn(`Environment variable ${key} is not a valid number: ${value}`);
    return defaultValue;
  }
  
  return num;
}

/**
 * 환경 변수 검증 (앱 시작 시 실행)
 */
export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    );
  }
}

/**
 * 개발 환경인지 확인
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 프로덕션 환경인지 확인
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * 테스트 환경인지 확인
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * 타입 안전한 환경 변수 객체
 */
export const env = new Proxy({} as ProcessEnv, {
  get(_, prop: string) {
    if (requiredEnvVars.includes(prop as RequiredEnvVar)) {
      const value = process.env[prop];
      if (!value) {
        throw new Error(`Required environment variable ${prop} is not set`);
      }
      return value;
    }
    return process.env[prop];
  }
});

// 타입 내보내기
export type { ProcessEnv };