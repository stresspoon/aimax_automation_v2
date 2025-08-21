"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company?: string;
  plan: string;
  created_at: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  // 폼 상태
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company: '',
    email: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          company: data.company || '',
          email: data.email || user.email || ''
        });
      } else {
        // 프로필이 없으면 생성
        const newProfile = {
          id: user.id,
          email: user.email,
          plan: 'basic',
          created_at: new Date().toISOString()
        };
        
        const { data: createdProfile } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createdProfile) {
          setProfile(createdProfile);
          setFormData({
            full_name: '',
            phone: '',
            company: '',
            email: user.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          company: formData.company,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "프로필 업데이트",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "오류",
        description: "프로필 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Basic';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'text-blue-600 bg-blue-100';
      case 'enterprise':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                AIMAX
              </Link>
              <nav className="ml-10 flex space-x-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  대시보드
                </Link>
                <Link href="/projects" className="text-muted-foreground hover:text-foreground">
                  프로젝트
                </Link>
                <Link href="/settings" className="text-primary font-semibold">
                  설정
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border p-4">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'profile' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  프로필
                </button>
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'plan' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  요금제
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'notifications' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  알림 설정
                </button>
              </nav>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-card rounded-lg border p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">설정을 불러오는 중...</p>
              </div>
            ) : (
              <>
                {/* 프로필 탭 */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border p-6"
                  >
                    <h2 className="text-xl font-bold mb-6">프로필 설정</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">이메일</label>
                        <input
                          type="email"
                          value={formData.email}
                          disabled
                          className="w-full px-4 py-2 rounded-lg border bg-muted text-muted-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">이름</label>
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="홍길동"
                          className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">전화번호</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="010-1234-5678"
                          className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">회사명</label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="주식회사 예시"
                          className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 요금제 탭 */}
                {activeTab === 'plan' && profile && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border p-6"
                  >
                    <h2 className="text-xl font-bold mb-6">요금제</h2>
                    
                    <div className="bg-muted/50 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">현재 요금제</p>
                          <p className="text-2xl font-bold">{getPlanLabel(profile.plan)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(profile.plan)}`}>
                          활성
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        가입일: {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Basic</h3>
                        <p className="text-2xl font-bold mb-2">무료</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• 기본 기능</li>
                          <li>• 월 3회 무료 체험</li>
                          <li>• 이메일 지원</li>
                        </ul>
                      </div>

                      <div className="border-2 border-primary rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Pro</h3>
                        <p className="text-2xl font-bold mb-2">₩49,900/월</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• 모든 기본 기능</li>
                          <li>• 무제한 프로젝트</li>
                          <li>• 우선 지원</li>
                        </ul>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Enterprise</h3>
                        <p className="text-2xl font-bold mb-2">맞춤 견적</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• 모든 Pro 기능</li>
                          <li>• 전담 매니저</li>
                          <li>• API 액세스</li>
                        </ul>
                      </div>
                    </div>

                    {profile.plan === 'basic' && (
                      <div className="mt-6">
                        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition">
                          Pro로 업그레이드
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 알림 설정 탭 */}
                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border p-6"
                  >
                    <h2 className="text-xl font-bold mb-6">알림 설정</h2>
                    
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div>
                          <p className="font-medium">이메일 알림</p>
                          <p className="text-sm text-muted-foreground">프로젝트 완료 및 중요 업데이트</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                      </label>

                      <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div>
                          <p className="font-medium">마케팅 알림</p>
                          <p className="text-sm text-muted-foreground">새로운 기능 및 프로모션</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5" />
                      </label>

                      <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div>
                          <p className="font-medium">주간 리포트</p>
                          <p className="text-sm text-muted-foreground">프로젝트 성과 요약</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                      </label>
                    </div>

                    <div className="mt-6">
                      <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition">
                        알림 설정 저장
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}