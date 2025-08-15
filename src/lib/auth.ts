import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  companyName?: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// 비밀번호 검증
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT 토큰 생성
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// JWT 토큰 검증
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// 쿠키에서 토큰 추출
export function getTokenFromCookie(cookieString: string | undefined): string | null {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies['auth-token'] || null;
}