import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: '이메일을 입력해주세요' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase의 비밀번호 재설정 기능 사용
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: '비밀번호 재설정 요청 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // 보안을 위해 사용자 존재 여부와 관계없이 항상 성공 응답 반환
    return NextResponse.json(
      { success: true, message: '비밀번호 재설정 이메일을 전송했습니다' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 요청 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}