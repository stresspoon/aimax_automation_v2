import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, companyName, agreeMarketing } = body;

    // 입력값 검증
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase로 사용자 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
          company_name: companyName,
          agree_marketing: agreeMarketing || false,
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: '이미 사용 중인 이메일입니다' },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '회원가입 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // 프로필 생성
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: name,
        username: email.split('@')[0],
        phone,
        company_name: companyName,
        agree_marketing: agreeMarketing || false,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}