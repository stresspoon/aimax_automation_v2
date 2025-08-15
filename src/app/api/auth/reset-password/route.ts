import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, password } = body;

    if (!code || !password) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 토큰입니다' },
        { status: 400 }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      return NextResponse.json(
        { error: '비밀번호 변경 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: '비밀번호가 성공적으로 변경되었습니다' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}