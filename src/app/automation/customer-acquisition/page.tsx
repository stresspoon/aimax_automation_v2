"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client'
import { saveProjectData, loadProjectData, getCampaignIdByName, type ProjectData } from '@/lib/projects'

type Step = 1 | 2 | 3;

interface Candidate {
  name: string;
  email: string;
  phone: string;
  threads: number;
  blog: number;
  instagram: number;
  status: "selected" | "notSelected";
}

export default function CustomerAcquisitionPage() {
  const [expandedStep, setExpandedStep] = useState<Step | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailComposerType, setEmailComposerType] = useState<'selected' | 'notSelected' | 'custom'>('selected');
  const [emailComposerInstructions, setEmailComposerInstructions] = useState('');
  const [emailComposerProductInfo, setEmailComposerProductInfo] = useState('');
  const [composingEmail, setComposingEmail] = useState(false);
  const [saving, setSaving] = useState<boolean>(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [gmailEmail, setGmailEmail] = useState<string>('')
  const [gmailChecking, setGmailChecking] = useState<boolean>(false)
  const [campaignName, setCampaignName] = useState<string>("");
  const [projectData, setProjectData] = useState({
    step1: {
      keyword: "",
      contentType: "blog" as "blog" | "thread",
      apiKey: "",
      instructions: "",
      generateImages: false,
      generatedContent: "",
      generatedImages: [] as string[],
    },
    step2: {
      sheetUrl: "",
      isRunning: false,
      candidates: [] as Candidate[],
      selectionCriteria: {
        threads: 500,
        blog: 300,
        instagram: 1000,
      },
    },
    step3: {
      targetType: "selected" as "selected" | "notSelected",
      emailSubject: "",
      emailBody: "",
      senderEmail: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [freeTrialsRemaining, setFreeTrialsRemaining] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);

  // 사용 제한 정보 가져오기
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage');
        if (res.ok) {
          const usage = await res.json();
          if (usage.limit === -1) {
            setIsUnlimited(true);
            setFreeTrialsRemaining(null);
          } else {
            setIsUnlimited(false);
            setFreeTrialsRemaining(usage.remaining);
          }
        }
      } catch (error) {
        console.error('사용량 확인 실패:', error);
      }
    };
    fetchUsage();
  }, []);

  // URL에서 캠페인 이름 가져오고 DB에서 데이터 로드
  useEffect(() => {
    const loadCampaignData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const campaign = urlParams.get('campaign');
      
      if (campaign) {
        setCampaignName(campaign);
        
        try {
          // 캠페인 ID 가져오기 (없으면 생성)
          const id = await getCampaignIdByName(campaign);
          setCampaignId(id);
          
          // DB에서 프로젝트 데이터 로드
          const projectFromDb = await loadProjectData(id);
          
          if (projectFromDb && projectFromDb.data) {
            // DB에 저장된 데이터가 있으면 사용
            setProjectData(projectFromDb.data);
            setProjectId(projectFromDb.id);
          } else {
            // DB에 없으면 localStorage 확인 (마이그레이션)
            const savedData = localStorage.getItem(`campaign_${campaign}_data`);
            if (savedData) {
              const parsedData = JSON.parse(savedData);
              setProjectData(parsedData);
              
              // localStorage 데이터를 DB로 마이그레이션
              await saveProjectData(id, parsedData);
              
              // localStorage 정리
              localStorage.removeItem(`campaign_${campaign}_data`);
              localStorage.removeItem(`campaign_${campaign}_project_id`);
            }
          }
        } catch (error) {
          console.error('캠페인 데이터 로드 실패:', error);
          setShowToast({ 
            message: '캠페인 데이터를 불러오는데 실패했습니다', 
            type: 'error' 
          });
        }
      }
    };
    
    loadCampaignData();
  }, []);

  // 데이터 변경 시 DB에 자동 저장
  useEffect(() => {
    const saveData = async () => {
      if (campaignId && projectData) {
        setSaving(true);
        try {
          // DB에 저장
          const result = await saveProjectData(campaignId, projectData);
          
          // 프로젝트 ID 업데이트
          if (result && result.id && !projectId) {
            setProjectId(result.id);
          }
        } catch (err) {
          console.error('DB 저장 오류:', err);
          setShowToast({ 
            message: '자동 저장에 실패했습니다', 
            type: 'error' 
          });
        } finally {
          setSaving(false);
        }
      }
    };
    
    // Debounce: 데이터 변경 후 1초 대기
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [projectData, campaignId]);

  // Step 1 시작 시 기본 지침 자동 적용 (블로그 기본 선택)
  useEffect(() => {
    if (expandedStep === 1) {
      setProjectData((prev) => {
        if (prev.step1.instructions && prev.step1.instructions.trim().length > 0) return prev
        const type = prev.step1.contentType
        const defaultGuide = contentGuidelines[type]
        return {
          ...prev,
          step1: {
            ...prev.step1,
            instructions: defaultGuide,
          },
        }
      })
    }
  }, [expandedStep])

  // 콘텐츠 타입별 작성 지침
  const contentGuidelines = {
    blog: `블로그 고객모집 글 작성 가이드:

1. 제목 작성법
   • 검색 키워드를 자연스럽게 포함
   • 숫자나 질문형식 활용 (예: "2024년 최신 ~5가지 방법")
   • 호기심을 유발하는 제목 구성

2. 도입부 (첫 문단)
   • 독자의 공감대 형성
   • 문제 상황 제시
   • 해결책 암시

3. 본문 구성
   • 소제목으로 가독성 향상
   • 구체적인 사례와 데이터 제시
   • 이미지를 활용한 시각적 설명
   • 전문성 있는 정보 제공

4. CTA (행동 유도)
   • 자연스러운 제품/서비스 소개
   • 구체적인 혜택 제시
   • 연락처나 링크 명확히 표기

5. SEO 최적화
   • 키워드 3-5회 자연스럽게 배치
   • 관련 키워드 활용
   • 메타 설명 최적화`,
    thread: `스레드 고객모집 글 작성 가이드:

1. 첫 트윗 (Hook)
   • 강력한 한 줄로 시작
   • 숫자, 이모지 활용
   • 질문이나 충격적 사실 제시

2. 스토리텔링
   • 개인 경험담 활용
   • 짧고 임팩트 있는 문장
   • 각 트윗당 280자 이내
   • 연결성 있는 내용 구성

3. 가치 전달
   • 구체적인 팁 제공
   • 실행 가능한 조언
   • 빠른 결과를 약속

4. 시각적 요소
   • 번호 매기기 (1/, 2/, 3/...)
   • 줄바꿈으로 가독성 향상
   • 핵심 단어 강조

5. 마무리
   • 명확한 CTA
   • 리트윗 유도
   • 팔로우 요청
   • DM이나 링크 안내`
  };

  // 콘텐츠 타입 변경시 지침 자동 업데이트
  const updateContentType = (type: "blog" | "thread") => {
    setProjectData({
      ...projectData,
      step1: {
        ...projectData.step1,
        contentType: type,
        instructions: contentGuidelines[type]
      }
    });
  };

  const handleStep1Generate = async () => {
    // 무료 사용자 제한 확인
    if (!isUnlimited && freeTrialsRemaining !== null && freeTrialsRemaining <= 0) {
      showNotification("무료 체험 횟수를 모두 사용했습니다. 유료 플랜으로 업그레이드해주세요.", 'error');
      return;
    }
    
    if (!projectData.step1.keyword || !projectData.step1.instructions) {
      showNotification('키워드와 지침을 입력해주세요', 'error')
      return
    }
    if (projectData.step1.generateImages && !projectData.step1.apiKey) {
      showNotification('이미지 생성을 위해서는 Gemini API 키가 필요합니다', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: projectData.step1.apiKey || undefined,
          keyword: projectData.step1.keyword,
          contentType: projectData.step1.contentType,
          instructions: projectData.step1.instructions,
          generateImages: projectData.step1.generateImages,
        })
      })
      const json = await res.json()
      
      if (!res.ok) {
        if (json.needsUpgrade) {
          showNotification("무료 체험 횟수를 모두 사용했습니다. 유료 플랜으로 업그레이드해주세요.", 'error')
        } else {
          showNotification(json.error || '생성 실패', 'error')
        }
        setLoading(false)
        return
      }
      
      // 사용량 정보 업데이트
      if (json.usage) {
        if (json.usage.limit === -1) {
          setIsUnlimited(true)
          setFreeTrialsRemaining(null)
        } else {
          setIsUnlimited(false)
          setFreeTrialsRemaining(json.usage.remaining)
        }
      }
      
      setProjectData({
        ...projectData,
        step1: {
          ...projectData.step1,
          generatedContent: json.content,
          generatedImages: json.images || [],
        },
      })
      showNotification('생성이 완료되었습니다', 'success')
    } catch (e: any) {
      showNotification(e?.message || '에러가 발생했습니다', 'error')
    } finally {
      setLoading(false)
    }
  };

  const handleCopyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(projectData.step1.generatedContent || '')
      showNotification('생성된 콘텐츠가 클립보드에 복사되었습니다', 'success')
    } catch {
      showNotification('복사에 실패했습니다', 'error')
    }
  }

  const ensureCampaignId = async (): Promise<string | null> => {
    if (!campaignName) return null
    // 1) 목록에서 동일 이름 검색
    const listRes = await fetch('/api/campaigns')
    if (listRes.ok) {
      const arr = await listRes.json()
      const found = (arr || []).find((c: any) => (c?.name || '').trim() === campaignName.trim())
      if (found?.id) return found.id
    }
    // 2) 없으면 생성
    const createRes = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: campaignName, data: {} }) })
    if (!createRes.ok) return null
    const created = await createRes.json()
    return created?.id || null
  }

  const saveSnapshot = async () => {
    try {
      setSaving(true)
      const campaignId = await ensureCampaignId()
      if (!campaignId) {
        showNotification('캠페인 생성 실패', 'error')
        return
      }
      const payload = {
        type: 'customer_acquisition',
        step: 1 as const,
        data: {
          step1: {
            ...projectData.step1,
            // 생성된 콘텐츠와 이미지 포함
            generatedContent: projectData.step1.generatedContent,
            generatedImages: projectData.step1.generatedImages,
          },
          savedAt: new Date().toISOString(),
        },
      }
      if (projectId) {
        const res = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 1, data: payload.data }) })
        if (!res.ok) throw new Error('업데이트 실패')
        showNotification('스냅샷이 저장되었습니다 (텍스트 및 이미지 포함)', 'success')
        return
      }
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: campaignId, ...payload }) })
      if (!res.ok) throw new Error('프로젝트 생성 실패')
      const created = await res.json()
      setProjectId(created.id)
      if (campaignName) localStorage.setItem(`campaign_${campaignName}_project_id`, created.id)
      showNotification('프로젝트가 생성되고 스냅샷이 저장되었습니다 (텍스트 및 이미지 포함)', 'success')
    } catch (e: any) {
      showNotification(e?.message || '저장 중 오류가 발생했습니다', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Gmail 연결 상태 확인
  useEffect(() => {
    const check = async () => {
      if (expandedStep !== 3) return
      try {
        setGmailChecking(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setGmailEmail(''); return }
        const { data } = await supabase.from('gmail_connections').select('*').eq('user_id', user.id).maybeSingle()
        if (data?.email) {
          setGmailEmail(data.email)
          setProjectData(p => ({ ...p, step3: { ...p.step3, senderEmail: data.email } }))
        } else {
          setGmailEmail('')
        }
      } finally {
        setGmailChecking(false)
      }
    }
    check()
  }, [expandedStep])

  const connectGmail = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.send email profile',
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/oauth/callback`
      }
    })
  }

  const disconnectGmail = async () => {
    await fetch('/api/oauth/google/gmail/connect', { method: 'DELETE' })
    setGmailEmail('')
  }

  const handleStep2Start = async () => {
    if (!projectData.step2.sheetUrl) {
      showNotification('구글시트 URL을 입력해주세요', 'error');
      return;
    }

    // 자동화 시작/일시정지 토글
    const newRunningState = !projectData.step2.isRunning;
    
    if (newRunningState) {
      // 시작할 때 Google Sheets 데이터 가져오기
      setLoading(true);
      try {
        const res = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetUrl: projectData.step2.sheetUrl,
            projectId: projectId,
            selectionCriteria: projectData.step2.selectionCriteria,
          }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          showNotification(data.error || '시트 동기화 실패', 'error');
          setLoading(false);
          return;
        }
        
        if (!data.candidates || data.candidates.length === 0) {
          showNotification('시트에서 데이터를 찾을 수 없습니다', 'error');
          setLoading(false);
          return;
        }
        
        setProjectData(prev => ({
          ...prev,
          step2: {
            ...prev.step2,
            isRunning: true,
            candidates: data.candidates,
          },
        }));
        
        showNotification(data.message || '자동화가 시작되었습니다', 'success');
      } catch (err) {
        console.error('Sheet sync error:', err);
        showNotification('시트 연동 중 오류가 발생했습니다. 시트가 공개되어 있는지 확인해주세요.', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // 일시정지
      setProjectData({
        ...projectData,
        step2: {
          ...projectData.step2,
          isRunning: false,
        },
      });
      showNotification('자동화가 일시정지되었습니다', 'info');
    }
  };


  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleStep3Send = async () => {
    if (!projectData.step3.emailSubject || !projectData.step3.emailBody) {
      showNotification('제목과 본문을 입력해주세요', 'error');
      return;
    }
    
    if (!gmailEmail && !projectData.step3.senderEmail) {
      showNotification('Gmail을 연결하거나 발신 이메일을 입력해주세요', 'error');
      return;
    }
    
    if (projectData.step2.candidates.length === 0) {
      showNotification('발송할 대상이 없습니다. Step 2에서 데이터를 가져와주세요', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/emails/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: projectData.step2.candidates,
          subject: projectData.step3.emailSubject,
          body: projectData.step3.emailBody,
          targetType: projectData.step3.targetType,
          projectId: projectId,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showNotification(data.error || '이메일 발송 실패', 'error');
        return;
      }
      
      showNotification(data.message || '이메일이 성공적으로 발송되었습니다!', 'success');
    } catch (err) {
      showNotification('이메일 발송 중 오류가 발생했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stepCards = [
    {
      step: 1,
      title: "고객모집 글쓰기",
      description: "AI가 자동으로 고객모집용 콘텐츠를 생성합니다"
    },
    {
      step: 2,
      title: "DB 관리",
      description: "구글폼으로 수집된 고객 데이터를 자동 관리합니다"
    },
    {
      step: 3,
      title: "이메일 발송",
      description: "선정된 고객에게 자동으로 이메일을 발송합니다"
    }
  ];

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Step 1: 고객모집 글쓰기</h2>
        {!isUnlimited && freeTrialsRemaining !== null && (
          <div className="text-sm">
            {freeTrialsRemaining > 0 ? (
              <span className="text-muted-foreground">
                무료 생성 가능: <span className="font-semibold text-primary">{freeTrialsRemaining}회</span> 남음
              </span>
            ) : (
              <span className="text-destructive font-semibold">
                무료 생성 횟수 소진 (업그레이드 필요)
              </span>
            )}
          </div>
        )}
        {isUnlimited && (
          <span className="text-sm text-primary font-semibold">
            프리미엄 사용자 (무제한)
          </span>
        )}
      </div>
      
      <div className="space-y-6">
        {/* 콘텐츠 타입 선택 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">콘텐츠 타입</label>
          <div className="flex space-x-4">
            <button
              onClick={() => updateContentType("blog")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step1.contentType === "blog"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              블로그 (긴 글)
            </button>
            <button
              onClick={() => updateContentType("thread")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step1.contentType === "thread"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              스레드 (짧은 글)
            </button>
          </div>
        </div>

        {/* 키워드 입력 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">키워드</label>
          <input
            type="text"
            value={projectData.step1.keyword}
            onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, keyword: e.target.value } })}
            placeholder="예: AI 마케팅 자동화"
            autoComplete="off"
            name="aimax-keyword"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* API 키 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Gemini API 키
            <span className="ml-2 text-xs text-muted-foreground">(선택사항 - 이미지 생성용)</span>
          </label>
          <input
            type="password"
            value={projectData.step1.apiKey}
            onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, apiKey: e.target.value } })}
            placeholder="AIza..."
            autoComplete="new-password"
            name="aimax-gemini-api-key"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 이미지 생성 옵션 */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="generateImages"
            checked={projectData.step1.generateImages}
            onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, generateImages: e.target.checked } })}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          />
          <label htmlFor="generateImages" className="text-sm text-foreground">
            이미지도 함께 생성하기 (API 키 필요)
          </label>
        </div>


        {/* 작성 지침 */}
        {projectData.step1.contentType && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-foreground">
                {projectData.step1.contentType === "blog" ? "블로그" : "스레드"} 작성 지침
              </label>
              <button onClick={() => setShowGuide(true)} className="text-xs text-primary hover:text-primary/80 font-semibold">지침 수정 가이드</button>
            </div>
            <textarea
              value={projectData.step1.instructions}
              onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, instructions: e.target.value } })}
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-white focus:outline-none focus:border-primary text-sm"
            />
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          onClick={handleStep1Generate}
          disabled={loading || !projectData.step1.keyword}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "생성 중..." : `글 생성하기 (무료 체험 ${freeTrialsRemaining}/3)`}
        </button>

        {/* 생성된 콘텐츠 */}
        {projectData.step1.generatedContent && (
          <div className="mt-6 p-6 bg-muted/30 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-foreground">생성된 콘텐츠</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyGenerated} className="text-primary hover:text-primary/80 font-semibold">복사</button>
                <button onClick={saveSnapshot} disabled={saving} className="text-sm bg-primary hover:bg-primary/90 text-white rounded px-3 py-1 disabled:opacity-50">{saving ? '저장 중...' : '스냅샷 저장'}</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-muted-foreground text-sm">
              {projectData.step1.generatedContent}
            </pre>
            {projectData.step1.generatedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">생성된 이미지:</p>
                <div className="grid grid-cols-2 gap-4">
                  {projectData.step1.generatedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={img} 
                        alt={`생성된 이미지 ${idx + 1}`} 
                        className="w-full rounded-lg border border-border"
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            try {
                              // base64 이미지를 Blob으로 변환
                              const base64Data = img.split(',')[1]
                              const byteCharacters = atob(base64Data)
                              const byteNumbers = new Array(byteCharacters.length)
                              for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i)
                              }
                              const byteArray = new Uint8Array(byteNumbers)
                              const blob = new Blob([byteArray], { type: 'image/png' })
                              
                              // 클립보드에 복사
                              await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                              ])
                              showNotification(`이미지 ${idx + 1}이 클립보드에 복사되었습니다`, 'success')
                            } catch (err) {
                              showNotification('이미지 복사에 실패했습니다', 'error')
                            }
                          }}
                          className="bg-white/90 text-xs px-2 py-1 rounded shadow-sm hover:bg-white"
                        >
                          복사
                        </button>
                        <button
                          onClick={async () => {
                            const link = document.createElement('a')
                            link.href = img
                            link.download = `aimax-image-${Date.now()}-${idx + 1}.png`
                            link.click()
                            showNotification(`이미지 ${idx + 1}이 다운로드되었습니다`, 'success')
                          }}
                          className="bg-white/90 text-xs px-2 py-1 rounded shadow-sm hover:bg-white"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {projectData.step1.generatedContent && (
          <button
            onClick={() => setExpandedStep(2)}
            className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-lg font-semibold transition"
          >
            다음: DB 관리 →
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Step 2: DB 관리</h2>
      
      <div className="space-y-6">
        {/* 매뉴얼 링크 */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm text-foreground mb-2">구글폼 + 구글시트 연동 방법</p>
          <Link href="#" className="text-primary hover:text-primary/80 font-semibold">
            노션 매뉴얼 보기 →
          </Link>
        </div>


        {/* 구글시트 URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">구글시트 URL</label>
          <input
            type="url"
            value={projectData.step2.sheetUrl}
            onChange={(e) => setProjectData({ ...projectData, step2: { ...projectData.step2, sheetUrl: e.target.value } })}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 선정 기준 커스터마이징 */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-3">자동 선정 기준 설정</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                Threads 팔로워
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={projectData.step2.selectionCriteria.threads}
                  onChange={(e) => setProjectData({
                    ...projectData,
                    step2: {
                      ...projectData.step2,
                      selectionCriteria: {
                        ...projectData.step2.selectionCriteria,
                        threads: parseInt(e.target.value) || 0
                      }
                    }
                  })}
                  className="w-24 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">명 이상</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                네이버 블로그 이웃
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={projectData.step2.selectionCriteria.blog}
                  onChange={(e) => setProjectData({
                    ...projectData,
                    step2: {
                      ...projectData.step2,
                      selectionCriteria: {
                        ...projectData.step2.selectionCriteria,
                        blog: parseInt(e.target.value) || 0
                      }
                    }
                  })}
                  className="w-24 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">명 이상</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                인스타그램 팔로워
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={projectData.step2.selectionCriteria.instagram}
                  onChange={(e) => setProjectData({
                    ...projectData,
                    step2: {
                      ...projectData.step2,
                      selectionCriteria: {
                        ...projectData.step2.selectionCriteria,
                        instagram: parseInt(e.target.value) || 0
                      }
                    }
                  })}
                  className="w-24 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">명 이상</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              위 기준을 하나라도 충족하면 "선정"으로 자동 분류됩니다
            </p>
          </div>
        </div>

        {/* 자동화 시작/일시정지 버튼 */}
        <button
          onClick={handleStep2Start}
          disabled={!projectData.step2.sheetUrl}
          className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
            projectData.step2.isRunning
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {projectData.step2.isRunning ? '일시정지' : '자동화 시작'}
        </button>

        {/* 수집된 데이터 */}
        {projectData.step2.candidates.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-text mb-3">수집된 후보</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text/10">
                    <th className="text-left py-2">이름</th>
                    <th className="text-left py-2">이메일</th>
                    <th className="text-center py-2">Threads</th>
                    <th className="text-center py-2">블로그</th>
                    <th className="text-center py-2">인스타</th>
                    <th className="text-center py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {projectData.step2.candidates.map((candidate, idx) => (
                    <tr key={idx} className="border-b border-text/5">
                      <td className="py-2">{candidate.name}</td>
                      <td className="py-2">{candidate.email}</td>
                      <td className="text-center py-2">{candidate.threads}</td>
                      <td className="text-center py-2">{candidate.blog}</td>
                      <td className="text-center py-2">{candidate.instagram}</td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          candidate.status === "selected" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {candidate.status === "selected" ? "선정" : "미달"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {projectData.step2.candidates.length > 0 && (
          <button
            onClick={() => setExpandedStep(3)}
            className="w-full bg-muted hover:bg-muted/80 text-foreground py-3 rounded-lg font-semibold transition"
          >
            다음: 이메일 발송 →
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-8"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Step 3: 이메일 발송</h2>
      
      <div className="space-y-6">
        {/* 대상 선택 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">발송 대상</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, targetType: "selected" } })}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step3.targetType === "selected"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              선정 대상
            </button>
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, targetType: "notSelected" } })}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                projectData.step3.targetType === "notSelected"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              비선정 대상
            </button>
          </div>
        </div>

        {/* 발신 이메일 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            발신 이메일 (Gmail)
            {gmailChecking ? <span className="ml-2 text-xs text-muted-foreground">확인 중...</span> : null}
          </label>
          {gmailEmail ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={gmailEmail}
                readOnly
                className="w-full px-4 py-3 rounded-lg border border-border bg-muted/30 text-muted-foreground"
              />
              <button onClick={disconnectGmail} className="px-3 py-2 rounded border text-sm">연결 해제</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="your@gmail.com"
                className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                readOnly
              />
              <button onClick={connectGmail} className="px-3 py-2 rounded bg-primary text-white text-sm">Gmail 연결</button>
            </div>
          )}
        </div>

        {/* 이메일 제목 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">이메일 제목</label>
          <input
            type="text"
            value={projectData.step3.emailSubject}
            onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, emailSubject: e.target.value } })}
            placeholder="예: {이름}님, 특별한 제안이 있습니다"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* 이메일 본문 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">이메일 본문</label>
            <button 
              onClick={() => setShowEmailComposer(true)}
              className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded font-semibold">
              Gemini로 자동작성
            </button>
          </div>
          <textarea
            value={projectData.step3.emailBody}
            onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, emailBody: e.target.value } })}
            placeholder="안녕하세요 {이름}님,&#10;&#10;..."
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {`{이름}`}, {`{이메일}`} 등의 변수를 사용할 수 있습니다
          </p>
        </div>

        {/* 발송 버튼 */}
        <button
          onClick={handleStep3Send}
          disabled={loading || !projectData.step3.senderEmail || !projectData.step3.emailSubject || !projectData.step3.emailBody}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? "발송 중..." : "이메일 발송"}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 이메일 자동 작성 모달 */}
      {showEmailComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">이메일 자동 작성</h3>
            
            {/* 이메일 타입 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">이메일 타입</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEmailComposerType('selected')}
                  className={`flex-1 py-2 px-3 rounded border ${
                    emailComposerType === 'selected' 
                      ? 'border-primary bg-primary/10 text-primary font-semibold' 
                      : 'border-gray-300'
                  }`}
                >
                  선정 안내
                </button>
                <button
                  onClick={() => setEmailComposerType('notSelected')}
                  className={`flex-1 py-2 px-3 rounded border ${
                    emailComposerType === 'notSelected' 
                      ? 'border-primary bg-primary/10 text-primary font-semibold' 
                      : 'border-gray-300'
                  }`}
                >
                  미선정 안내
                </button>
                <button
                  onClick={() => setEmailComposerType('custom')}
                  className={`flex-1 py-2 px-3 rounded border ${
                    emailComposerType === 'custom' 
                      ? 'border-primary bg-primary/10 text-primary font-semibold' 
                      : 'border-gray-300'
                  }`}
                >
                  사용자 정의
                </button>
              </div>
            </div>

            {/* 제품/서비스 정보 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">제품/서비스 정보 (선택)</label>
              <textarea
                value={emailComposerProductInfo}
                onChange={(e) => setEmailComposerProductInfo(e.target.value)}
                placeholder="예: 친환경 화장품 브랜드, 민감성 피부용 스킨케어 라인..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* 사용자 정의 지침 (custom 타입일 때만) */}
            {emailComposerType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">작성 지침 *</label>
                <textarea
                  value={emailComposerInstructions}
                  onChange={(e) => setEmailComposerInstructions(e.target.value)}
                  placeholder="이메일 작성 지침을 입력하세요..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* API 키 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Gemini API Key</label>
              <input
                type="password"
                value={projectData.step1.apiKey}
                onChange={(e) => setProjectData({ ...projectData, step1: { ...projectData.step1, apiKey: e.target.value } })}
                placeholder="AI... (Step 1에서 사용한 키)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* 미리보기 정보 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600 mb-2">대상자 예시:</p>
              <div className="text-xs space-y-1">
                <p>• 이름: 김철수</p>
                <p>• 상태: {emailComposerType === 'selected' ? '선정' : emailComposerType === 'notSelected' ? '미선정' : '사용자 정의'}</p>
                <p>• Threads: 800 팔로워</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowEmailComposer(false);
                  setEmailComposerInstructions('');
                  setEmailComposerProductInfo('');
                }}
                className="px-4 py-2 rounded border"
              >
                취소
              </button>
              <button 
                onClick={async () => {
                  if (!projectData.step1.apiKey) {
                    showNotification('API 키를 입력해주세요', 'error');
                    return;
                  }
                  if (emailComposerType === 'custom' && !emailComposerInstructions) {
                    showNotification('작성 지침을 입력해주세요', 'error');
                    return;
                  }

                  setComposingEmail(true);
                  try {
                    // 샘플 후보자 정보 (실제로는 첫 번째 선정/미선정 대상 사용)
                    const sampleCandidate = projectData.step2.candidates.find(
                      c => emailComposerType === 'selected' ? c.status === 'selected' : 
                           emailComposerType === 'notSelected' ? c.status === 'notSelected' : true
                    ) || {
                      name: '김철수',
                      email: 'example@email.com',
                      threads: 800,
                      blog: 400,
                      instagram: 1200,
                      status: emailComposerType === 'selected' ? 'selected' : 'notSelected'
                    };

                    const res = await fetch('/api/ai/compose-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        apiKey: projectData.step1.apiKey,
                        candidateInfo: sampleCandidate,
                        emailType: emailComposerType,
                        customInstructions: emailComposerInstructions,
                        productInfo: emailComposerProductInfo,
                      }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || '생성 실패');

                    setProjectData({
                      ...projectData,
                      step3: {
                        ...projectData.step3,
                        emailSubject: data.subject,
                        emailBody: data.body,
                      },
                    });
                    
                    showNotification('이메일이 자동 작성되었습니다', 'success');
                    setShowEmailComposer(false);
                    setEmailComposerInstructions('');
                    setEmailComposerProductInfo('');
                  } catch (err) {
                    showNotification((err as Error).message, 'error');
                  } finally {
                    setComposingEmail(false);
                  }
                }}
                disabled={composingEmail || !projectData.step1.apiKey || (emailComposerType === 'custom' && !emailComposerInstructions)}
                className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
              >
                {composingEmail ? '생성 중...' : '이메일 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 지침 수정 가이드 모달 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-2">지침 수정 가이드</h3>
            <p className="text-sm text-muted-foreground mb-4">가이드는 예시일 뿐입니다. 브랜드 톤과 타깃에 맞게 키워드, 문체, CTA를 조정하세요. 과도한 형용사보다 구체적인 이점과 실행 요소를 강조하면 전환율이 올라갑니다.</p>
            <ul className="text-sm list-disc pl-5 space-y-1 mb-4 text-muted-foreground">
              <li>키워드는 제목/서론/결론에 분산 배치</li>
              <li>소제목은 문제-해결-증거-CTA 흐름</li>
              <li>스레드는 각 항목 1~2문장, 실행 팁 포함</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowGuide(false)} className="px-3 py-2 rounded border">닫기</button>
            </div>
          </div>
        </div>
      )}
      {/* Toast 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg font-semibold ${
            showToast.type === 'success' ? 'bg-green-500 text-white' :
            showToast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                AIMAX
              </Link>
              <span className="ml-4 text-muted-foreground">
                / 고객모집 자동화 {campaignName && `- ${campaignName}`}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/automation/customer-acquisition/dashboard" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition"
              >
                대시보드 보기
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                메인으로
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로세스 선택 카드 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">고객모집 자동화</h1>
          <p className="text-muted-foreground">원하는 단계를 선택하여 시작하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stepCards.map(({ step, title, description }) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step * 0.1 }}
              onClick={() => setExpandedStep(expandedStep === step ? null : step as Step)}
              className={`bg-card border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                expandedStep === step 
                  ? "border-primary shadow-lg" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-12 h-12 mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{step}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Step {step}: {title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">{description}</p>
              <button className={`w-full py-2 rounded-lg font-semibold transition ${
                expandedStep === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}>
                {expandedStep === step ? "닫기" : "시작하기"}
              </button>
            </motion.div>
          ))}
        </div>

        {/* 선택된 Step 상세 내용 */}
        {expandedStep === 1 && renderStep1()}
        {expandedStep === 2 && renderStep2()}
        {expandedStep === 3 && renderStep3()}
      </main>
    </div>
  );
}