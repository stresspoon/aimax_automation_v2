import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 입력값 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Supabase 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '로그인 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    // 프로필 정보 가져오기 (user_profiles 우선, profiles fallback)
    let profile = null;
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (userProfile) {
      profile = userProfile;
    } else {
      // fallback to profiles table
      const { data: legacyProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      profile = legacyProfile;
      
      // user_profiles에 자동 생성
      if (legacyProfile) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: legacyProfile.full_name || legacyProfile.name,
          role: legacyProfile.role || 'user',
          plan: legacyProfile.plan || 'basic',
          status: legacyProfile.status || 'active',
          created_at: legacyProfile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile?.full_name || profile?.username || data.user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}