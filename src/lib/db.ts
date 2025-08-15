// 임시 인메모리 데이터베이스 (나중에 실제 DB로 교체)
import { hashPassword } from './auth';

export interface UserDB {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  companyName?: string;
  agreeMarketing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 임시 사용자 저장소
const users: Map<string, UserDB> = new Map();

// 사용자 생성
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  phone: string;
  companyName?: string;
  agreeMarketing: boolean;
}): Promise<UserDB> {
  // 이메일 중복 체크
  const existingUser = Array.from(users.values()).find(u => u.email === userData.email);
  if (existingUser) {
    throw new Error('이미 존재하는 이메일입니다');
  }

  const hashedPassword = await hashPassword(userData.password);
  const userId = Date.now().toString();
  
  const newUser: UserDB = {
    id: userId,
    email: userData.email,
    password: hashedPassword,
    name: userData.name,
    phone: userData.phone,
    companyName: userData.companyName,
    agreeMarketing: userData.agreeMarketing,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(userId, newUser);
  return newUser;
}

// 이메일로 사용자 찾기
export async function findUserByEmail(email: string): Promise<UserDB | null> {
  const user = Array.from(users.values()).find(u => u.email === email);
  return user || null;
}

// ID로 사용자 찾기
export async function findUserById(id: string): Promise<UserDB | null> {
  return users.get(id) || null;
}

// 사용자 업데이트
export async function updateUser(id: string, updates: Partial<UserDB>): Promise<UserDB | null> {
  const user = users.get(id);
  if (!user) return null;

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };

  users.set(id, updatedUser);
  return updatedUser;
}

// 비밀번호 재설정 토큰 저장소
const resetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

// 비밀번호 재설정 토큰 생성
export function createResetToken(userId: string): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 3600000); // 1시간 후 만료
  
  resetTokens.set(token, { userId, expiresAt });
  return token;
}

// 비밀번호 재설정 토큰 검증
export function verifyResetToken(token: string): string | null {
  const tokenData = resetTokens.get(token);
  if (!tokenData) return null;
  
  if (tokenData.expiresAt < new Date()) {
    resetTokens.delete(token);
    return null;
  }
  
  return tokenData.userId;
}

// 비밀번호 재설정
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const userId = verifyResetToken(token);
  if (!userId) return false;
  
  const hashedPassword = await hashPassword(newPassword);
  const user = users.get(userId);
  if (!user) return false;
  
  user.password = hashedPassword;
  user.updatedAt = new Date();
  
  resetTokens.delete(token);
  return true;
}