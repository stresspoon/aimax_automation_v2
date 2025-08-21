"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client'
import { saveProjectData, loadProjectData, getCampaignIdByName, loadProjectById } from '@/lib/projects'
import { downloadText, downloadCompleteProject, downloadContentAsMarkdown, downloadImagesAsZip } from '@/lib/download'

type Step = 1 | 2 | 3;

interface Candidate {
  name: string;
  email: string;
  phone: string;
  threads: number;
  blog: number;
  instagram: number;
  status: "selected" | "notSelected";
  checkStatus?: {
    threads?: 'checking' | 'completed' | 'error' | 'no_url';
    threadsError?: string;
    blog?: 'checking' | 'completed' | 'error' | 'no_url';
    blogError?: string;
    instagram?: 'checking' | 'completed' | 'error' | 'no_url';
    instagramError?: string;
  };
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
  const [_saving, setSaving] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string>('');
  const [gmailChecking, setGmailChecking] = useState<boolean>(false);
  // Typing effect for Step 1 content
  const [typingEnabled, setTypingEnabled] = useState<boolean>(true);
  const [_typingIndex, setTypingIndex] = useState<number>(0);
  const [typingContent, setTypingContent] = useState<string>('');
  const [_typingActive, setTypingActive] = useState<boolean>(false);
  const [hasTypingStarted, setHasTypingStarted] = useState<boolean>(false);
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
      emailsSent: 0,
    },
  });

  const [loading, setLoading] = useState(false);
  const [freeTrialsRemaining, setFreeTrialsRemaining] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Gmail 연결 상태 확인 및 콜백 처리
  useEffect(() => {
    const checkGmailConnection = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Gmail 연결 콜백 처리
      const gmailStatus = urlParams.get('gmail');
      const error = urlParams.get('error');
      
      if (gmailStatus === 'connected') {
        showNotification('Gmail이 성공적으로 연결되었습니다!', 'success');
        // URL에서 파라미터 제거
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('gmail');
        window.history.replaceState({}, '', newUrl);
        
        // Gmail 연결 상태 확인
        checkGmailStatus();
      } else if (error) {
        const errorMessages: Record<string, string> = {
          'gmail_auth_failed': 'Gmail 인증에 실패했습니다',
          'gmail_save_failed': 'Gmail 연결 정보 저장에 실패했습니다',
          'no_provider_token': 'Gmail 액세스 토큰을 받지 못했습니다',
          'gmail_oauth_failed': 'Gmail OAuth 인증에 실패했습니다',
          'gmail_callback_failed': 'Gmail 콜백 처리 중 오류가 발생했습니다',
        };
        
        showNotification(errorMessages[error] || 'Gmail 연결 중 오류가 발생했습니다', 'error');
        
        // URL에서 에러 파라미터 제거
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        window.history.replaceState({}, '', newUrl);
      }
    };
    
    const checkGmailStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Gmail 연결 상태 확인
          const { data: gmailConnection } = await supabase
            .from('gmail_connections')
            .select('email')
            .eq('user_id', user.id)
            .single();
          
          if (gmailConnection?.email) {
            setGmailEmail(gmailConnection.email);
          }
        }
      } catch (error) {
        console.error('Gmail status check error:', error);
      }
    };
    
    checkGmailConnection();
  }, []);
  
  // URL에서 캠페인 이름 또는 프로젝트 ID 가져오고 DB에서 데이터 로드
  useEffect(() => {
    const loadCampaignData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaign = urlParams.get('campaign');
      const projectIdParam = urlParams.get('projectId');
      
      if (projectIdParam) {
        // projectId로 직접 로드
        try {
          // ID로 프로젝트 데이터 로드
          const projectFromDb = await loadProjectById(projectIdParam);
          
          if (projectFromDb) {
            setProjectId(projectFromDb.id);
            setCampaignId(projectFromDb.campaign_id);
            setCampaignName(projectFromDb.campaign_name);
            if (projectFromDb.data) {
              setProjectData(projectFromDb.data);
            }
          }
        } catch (error) {
          console.error('프로젝트 로딩 오류:', error);
        }
      } else if (campaign) {
        // 기존 캠페인 이름으로 로드
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
    // 이미지 생성은 이제 API 키 없이도 가능합니다
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
      
      // 새로운 콘텐츠 생성 시 타이핑 효과를 위한 플래그 설정
      setHasTypingStarted(true);
      
      setProjectData({
        ...projectData,
        step1: {
          ...projectData.step1,
          generatedContent: json.content,
          generatedImages: json.images || [],
        },
      })
      
      // Step 1 완료 상태 업데이트
      if (projectId) {
        const supabase = createClient();
        await supabase
          .from('projects')
          .update({ 
            step1_completed: true,
            generated_content: json.content,
            content_count: json.images ? json.images.length + 1 : 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      }
      
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

  // Typewriter effect for Step 1 generated content
  useEffect(() => {
    const full = projectData.step1.generatedContent || ''
    if (!full) {
      setTypingContent('')
      setTypingActive(false)
      setTypingIndex(0)
      setHasTypingStarted(false)
      return
    }
    
    // 이미 타이핑이 시작되었고 같은 콘텐츠면 스킵
    if (hasTypingStarted && typingContent === full) {
      return
    }
    
    // 페이지 로드 시 이미 콘텐츠가 있으면 타이핑 효과 없이 바로 표시
    if (full && !hasTypingStarted) {
      setTypingContent(full)
      setTypingActive(false)
      setTypingIndex(full.length)
      return
    }
    
    if (!typingEnabled) {
      setTypingContent(full)
      setTypingActive(false)
      setTypingIndex(full.length)
      return
    }
    
    // 새로운 콘텐츠 생성 시에만 타이핑 효과
    setTypingContent('')
    setTypingIndex(0)
    setTypingActive(true)
    setHasTypingStarted(true)
    const charsPerTick = 2
    const interval = setInterval(() => {
      setTypingIndex(prev => {
        const next = Math.min(prev + charsPerTick, full.length)
        setTypingContent(full.slice(0, next))
        if (next >= full.length) {
          clearInterval(interval)
          setTypingActive(false)
        }
        return next
      })
    }, 33)
    return () => clearInterval(interval)
  }, [projectData.step1.generatedContent, typingEnabled])

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

  // saveSnapshot 함수는 현재 사용되지 않음 - 필요시 주석 해제
  // const saveSnapshot = async () => {
  //   try {
  //     setSaving(true)
  //     const campaignId = await ensureCampaignId()
  //     if (!campaignId) {
  //       showNotification('캠페인 생성 실패', 'error')
  //       return
  //     }
  //     const payload = {
  //       type: 'customer_acquisition',
  //       step: 1 as const,
  //       data: {
  //         step1: {
  //           ...projectData.step1,
  //           // 생성된 콘텐츠와 이미지 포함
  //           generatedContent: projectData.step1.generatedContent,
  //           generatedImages: projectData.step1.generatedImages,
  //         },
  //         savedAt: new Date().toISOString(),
  //       },
  //     }
  //     if (projectId) {
  //       const res = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 1, data: payload.data }) })
  //       if (!res.ok) throw new Error('업데이트 실패')
  //       showNotification('스냅샷이 저장되었습니다 (텍스트 및 이미지 포함)', 'success')
  //       return
  //     }
  //     const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: campaignId, ...payload }) })
  //     if (!res.ok) throw new Error('프로젝트 생성 실패')
  //     const created = await res.json()
  //     setProjectId(created.id)
  //     if (campaignName) localStorage.setItem(`campaign_${campaignName}_project_id`, created.id)
  //     showNotification('프로젝트가 생성되고 스냅샷이 저장되었습니다 (텍스트 및 이미지 포함)', 'success')
  //   } catch (e: any) {
  //     showNotification(e?.message || '저장 중 오류가 발생했습니다', 'error')
  //   } finally {
  //     setSaving(false)
  //   }
  // }

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
    try {
      // 새로운 Gmail OAuth 엔드포인트 호출
      const res = await fetch('/api/auth/gmail', {
        method: 'GET',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showNotification(data.error || 'Gmail 연결 실패', 'error');
        return;
      }
      
      if (data.url) {
        // OAuth URL로 리다이렉트
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Gmail connection error:', error);
      showNotification('Gmail 연결 중 오류가 발생했습니다', 'error');
    }
  }

  const disconnectGmail = async () => {
    try {
      const res = await fetch('/api/auth/gmail', { method: 'DELETE' });
      
      if (res.ok) {
        setGmailEmail('');
        showNotification('Gmail 연결이 해제되었습니다', 'info');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Gmail 연결 해제 실패', 'error');
      }
    } catch (error) {
      console.error('Gmail disconnection error:', error);
      showNotification('Gmail 연결 해제 중 오류가 발생했습니다', 'error');
    }
  }

  const handleStep2Start = async () => {
    if (!projectData.step2.sheetUrl) {
      showNotification('구글시트 URL을 입력해주세요', 'error');
      return;
    }

    // 자동화 시작/일시정지 토글
    const newRunningState = !projectData.step2.isRunning;
    
    if (newRunningState) {
      // 시작: 준비 단계
      setLoading(true)
      setProgress({ total: 100, current: 0, currentName: '구글 시트 연결 준비 중...', status: 'loading', phase: 'sheet_loading' })

      try {
        // 1) 시트 준비: 후보 목록만 가져오기
        const prep = await fetch('/api/sheets/prepare', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetUrl: projectData.step2.sheetUrl })
        })
        const prepJson = await prep.json()
        if (!prep.ok || !Array.isArray(prepJson.candidates) || prepJson.candidates.length === 0) {
          showNotification(prepJson.error || '시트에서 후보를 찾을 수 없습니다', 'error')
          setLoading(false)
          return
        }

        setProjectData(prev => ({
          ...prev,
          step2: { ...prev.step2, isRunning: true, candidates: prepJson.candidates }
        }))
        setProgress(p => ({ ...p, total: prepJson.candidates.length * 3, current: 0, currentName: `후보 ${prepJson.candidates.length}명 로드됨`, status: 'processing', phase: 'sns_checking' }))

        // 2) 후보별 순차 측정
        const total = prepJson.candidates.length
        for (let i = 0; i < total; i++) {
          const c = prepJson.candidates[i]
          // threads → blog → instagram 순서
          setProjectData(prev => {
            const copy = { ...prev }
            const prevC = copy.step2.candidates[i]
            copy.step2.candidates[i] = {
              ...prevC,
              checkStatus: { ...(prevC as any).checkStatus, threads: (c as any).threadsUrl ? 'checking' : 'no_url' }
            }
            return copy
          })
          setProgress(p => ({ ...p, currentName: `(${i+1}/${total}) Threads 측정 중...`, currentSns: 'threads', current: i * 3 + 0 }))
          let tJson: any = { threads: 0 }
          if ((c as any).threadsUrl) {
            try {
              const tRes = await fetch('/api/sheets/measure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate: c, channel: 'threads' }) })
              tJson = await tRes.json()
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                copy.step2.candidates[i] = { ...prevC, threads: tJson.threads || 0, checkStatus: { ...(prevC as any).checkStatus, threads: 'completed' } }
                return copy
              })
            } catch (err: any) {
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                copy.step2.candidates[i] = { ...prevC, checkStatus: { ...(prevC as any).checkStatus, threads: 'error', threadsError: err?.message || 'threads 오류' } }
                return copy
              })
            }
          }
          setProgress(p => ({ ...p, current: i * 3 + 1 }))

          setProjectData(prev => {
            const copy = { ...prev }
            const prevC = copy.step2.candidates[i]
            copy.step2.candidates[i] = {
              ...prevC,
              checkStatus: { ...(prevC as any).checkStatus, blog: (c as any).blogUrl ? 'checking' : 'no_url' }
            }
            return copy
          })
          setProgress(p => ({ ...p, currentName: `(${i+1}/${total}) 블로그 측정 중...`, currentSns: 'blog', current: i * 3 + 1 }))
          let bJson: any = { blog: 0 }
          if ((c as any).blogUrl) {
            try {
              const bRes = await fetch('/api/sheets/measure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate: c, channel: 'blog' }) })
              bJson = await bRes.json()
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                copy.step2.candidates[i] = { ...prevC, blog: bJson.blog || 0, checkStatus: { ...(prevC as any).checkStatus, blog: 'completed' } }
                return copy
              })
            } catch (err: any) {
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                copy.step2.candidates[i] = { ...prevC, checkStatus: { ...(prevC as any).checkStatus, blog: 'error', blogError: err?.message || 'blog 오류' } }
                return copy
              })
            }
          }
          setProgress(p => ({ ...p, current: i * 3 + 2 }))

          setProjectData(prev => {
            const copy = { ...prev }
            const prevC = copy.step2.candidates[i]
            copy.step2.candidates[i] = {
              ...prevC,
              checkStatus: { ...(prevC as any).checkStatus, instagram: (c as any).instagramUrl ? 'checking' : 'no_url' }
            }
            return copy
          })
          setProgress(p => ({ ...p, currentName: `(${i+1}/${total}) 인스타그램 측정 중...`, currentSns: 'instagram', current: i * 3 + 2 }))
          let iJson: any = { instagram: 0 }
          if ((c as any).instagramUrl) {
            try {
              const iRes = await fetch('/api/sheets/measure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate: c, channel: 'instagram' }) })
              iJson = await iRes.json()
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                const selected = (tJson.threads||0) >= copy.step2.selectionCriteria.threads || (bJson.blog||0) >= copy.step2.selectionCriteria.blog || (iJson.instagram||0) >= copy.step2.selectionCriteria.instagram
                copy.step2.candidates[i] = { ...prevC, instagram: iJson.instagram || 0, status: selected ? 'selected' : 'notSelected', checkStatus: { ...(prevC as any).checkStatus, instagram: 'completed' } }
                return copy
              })
            } catch (err: any) {
              setProjectData(prev => {
                const copy = { ...prev }
                const prevC = copy.step2.candidates[i]
                copy.step2.candidates[i] = { ...prevC, checkStatus: { ...(prevC as any).checkStatus, instagram: 'error', instagramError: err?.message || 'instagram 오류' } }
                return copy
              })
            }
          } else {
            // URL이 없을 때도 선정 로직은 평가
            setProjectData(prev => {
              const copy = { ...prev }
              const prevC = copy.step2.candidates[i]
              const selected = (tJson.threads||0) >= copy.step2.selectionCriteria.threads || (bJson.blog||0) >= copy.step2.selectionCriteria.blog
              copy.step2.candidates[i] = { ...prevC, status: selected ? 'selected' : 'notSelected' }
              return copy
            })
          }
          setProgress(p => ({ ...p, current: i * 3 + 3 }))

          // 후보당 3단계 측정이 끝났을 때 current는 i*3+3
        }

        setProgress(p => ({ ...p, currentName: '완료', status: 'completed', phase: 'completed', current: (total * 3), currentSns: undefined }))
        showNotification('후보별 SNS 체크가 완료되었습니다', 'success')

      } catch (err) {
        console.error(err)
        showNotification('시트 준비 또는 측정 중 오류가 발생했습니다', 'error')
      } finally {
        setLoading(false)
        
        // Step 2 완료 상태 업데이트 (성공적으로 데이터를 가져온 경우)
        if (projectId && projectData.step2.candidates.length > 0) {
          const supabase = createClient();
          await supabase
            .from('projects')
            .update({ 
              step2_completed: true,
              db_collected: true,
              leads_count: projectData.step2.candidates.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        }
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
      
      // 주기적 체크 중지
      stopPeriodicCheck();
    }
  };

  // 주기적 체크를 위한 interval 관리
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 진행상황 추적 상태
  const [progress, setProgress] = useState<{
    total: number
    current: number
    currentName: string
    status: 'loading' | 'processing' | 'completed' | 'error'
    phase: 'sheet_loading' | 'sns_checking' | 'completed'
    currentSns?: 'threads' | 'blog' | 'instagram'
  }>({
    total: 0,
    current: 0,
    currentName: '',
    status: 'completed',
    phase: 'completed'
  });
  
  // 진행상황 체크 interval
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

  const startPeriodicCheck = () => {
    // 기존 interval이 있으면 정리
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    // 30초마다 새로운 응답 확인
    const interval = setInterval(async () => {
      if (projectData.step2.isRunning && projectData.step2.sheetUrl) {
        await checkForNewResponses();
      }
    }, 30000); // 30초마다 체크
    
    setCheckInterval(interval);
    
    // 진행상황 체크 시작
    startProgressCheck();
  };

  const stopPeriodicCheck = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    
    // 진행상황 체크 중지
    stopProgressCheck();
  };

  const startProgressCheck = () => {
    // 기존 interval이 있으면 정리
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    // 2초마다 진행상황 확인
    const interval = setInterval(async () => {
      if (projectData.step2.isRunning && projectId) {
        await checkProgress();
      }
    }, 2000); // 2초마다 체크
    
    setProgressInterval(interval);
  };

  const stopProgressCheck = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    
    // 진행상황 초기화
    setProgress({
      total: 0,
      current: 0,
      currentName: '',
      status: 'completed',
      phase: 'completed'
    });
  };

  const checkProgress = async () => {
    try {
      const res = await fetch(`/api/sheets/progress?projectId=${projectId}`);
      const data = await res.json();
      
      if (res.ok) {
        console.log('진행상황 업데이트:', data);
        setProgress(data);
        
        // 완료되면 주기적 체크 중지
        if (data.status === 'completed' && data.current === data.total && data.total > 0) {
          console.log('체크 완료, 진행상황 추적 중지');
          stopProgressCheck();
        }
      } else {
        console.error('Progress API 오류:', data);
      }
    } catch (err) {
      console.error('Progress check error:', err);
    }
  };

  const checkForNewResponses = async () => {
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: projectData.step2.sheetUrl,
          projectId: projectId,
          selectionCriteria: projectData.step2.selectionCriteria,
          checkNewOnly: true, // 새로운 응답만 체크하는 옵션
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.newCandidates && data.newCandidates.length > 0) {
        // 새로운 후보자가 있으면 기존 후보자 목록에 추가
        setProjectData(prev => ({
          ...prev,
          step2: {
            ...prev.step2,
            candidates: [...prev.step2.candidates, ...data.newCandidates],
          },
        }));
        
        showNotification(`${data.newCandidates.length}명의 새로운 후보자가 추가되었습니다`, 'success');
      }
    } catch (err) {
      console.error('New responses check error:', err);
    }
  };

  // 컴포넌트 언마운트 시 interval 정리
  useEffect(() => {
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [checkInterval, progressInterval]);


  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // 다운로드 핸들러 함수들
  const handleDownloadText = () => {
    if (!projectData.step1.generatedContent) {
      showNotification('다운로드할 콘텐츠가 없습니다', 'error');
      return;
    }
    
    const filename = `${campaignName || '콘텐츠'}_${projectData.step1.contentType}_${new Date().toISOString().split('T')[0]}.txt`;
    downloadText(projectData.step1.generatedContent, filename);
    showNotification('텍스트 파일이 다운로드되었습니다', 'success');
  };

  const handleDownloadMarkdown = () => {
    if (!projectData.step1.generatedContent) {
      showNotification('다운로드할 콘텐츠가 없습니다', 'error');
      return;
    }
    
    const title = `${campaignName || '콘텐츠'} - ${projectData.step1.contentType === 'blog' ? '블로그글' : '스레드'}`;
    downloadContentAsMarkdown(projectData.step1.generatedContent, title, campaignName || '콘텐츠');
    showNotification('마크다운 파일이 다운로드되었습니다', 'success');
  };

  const handleDownloadComplete = async () => {
    if (!projectData.step1.generatedContent) {
      showNotification('다운로드할 콘텐츠가 없습니다', 'error');
      return;
    }

    try {
    setLoading(true);
      await downloadCompleteProject(
        projectData.step1.generatedContent,
        projectData.step1.generatedImages,
        campaignName || '프로젝트',
        projectData.step1.contentType
      );
      showNotification('전체 프로젝트가 ZIP 파일로 다운로드되었습니다', 'success');
    } catch (error) {
      showNotification('다운로드 중 오류가 발생했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAllImages = async () => {
    if (projectData.step1.generatedImages.length === 0) {
      showNotification('다운로드할 이미지가 없습니다', 'error');
      return;
    }

    try {
      setLoading(true);
      const zipFilename = `${campaignName || '프로젝트'}_이미지_${new Date().toISOString().split('T')[0]}.zip`;
      await downloadImagesAsZip(projectData.step1.generatedImages, zipFilename, `${campaignName || '프로젝트'}_이미지`);
      showNotification('모든 이미지가 ZIP 파일로 다운로드되었습니다', 'success');
    } catch (error) {
      showNotification('이미지 다운로드 중 오류가 발생했습니다', 'error');
    } finally {
      setLoading(false);
    }
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
      // Gmail이 연결되어 있으면 Gmail API 사용, 아니면 기존 방식 사용
      const endpoint = gmailEmail ? '/api/emails/send-gmail' : '/api/emails/send-batch';
      
      // 대상 필터링
      const recipients = projectData.step2.candidates.filter(c => {
        if (projectData.step3.targetType === 'selected') return c.status === 'selected';
        if (projectData.step3.targetType === 'notSelected') return c.status === 'notSelected';
        return true; // 'all'인 경우
      });
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients,
          subject: projectData.step3.emailSubject,
          body: projectData.step3.emailBody,
          replyTo: projectData.step3.senderEmail,
          // 기존 API와의 호환성을 위해
          candidates: recipients,
          targetType: projectData.step3.targetType,
          projectId: projectId,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showNotification(data.error || '이메일 발송 실패', 'error');
        return;
      }
      
      // Gmail API 응답 처리
      let emailsSent = 0;
      if (data.sent !== undefined && data.failed !== undefined) {
        emailsSent = data.sent;
        if (data.sent > 0 && data.failed === 0) {
          showNotification(`${data.sent}명에게 이메일이 성공적으로 발송되었습니다!`, 'success');
        } else if (data.sent > 0 && data.failed > 0) {
          showNotification(`${data.sent}명 발송 성공, ${data.failed}명 발송 실패`, 'info');
        } else {
          showNotification('이메일 발송에 실패했습니다', 'error');
        }
      } else {
        // 기존 API 응답 처리 (recipients 수를 발송 수로 간주)
        emailsSent = recipients.length;
        showNotification(data.message || '이메일이 성공적으로 발송되었습니다!', 'success');
      }
      
      // 발송 수 저장
      if (emailsSent > 0) {
        setProjectData(prev => ({
          ...prev,
          step3: {
            ...prev.step3,
            emailsSent: (prev.step3.emailsSent || 0) + emailsSent,
          },
        }));
        
        // Step 3 완료 상태 업데이트
        if (projectId) {
          const supabase = createClient();
          await supabase
            .from('projects')
            .update({ 
              step3_completed: true,
              emails_sent: emailsSent,
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        }
      }
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
            이미지도 함께 생성하기
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
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input type="checkbox" checked={typingEnabled} onChange={(e)=>setTypingEnabled(e.target.checked)} />
                  타이핑 효과
                </label>
                <button onClick={handleCopyGenerated} className="text-primary hover:text-primary/80 font-semibold">
                복사
              </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-muted-foreground text-sm">
              {typingEnabled ? typingContent : projectData.step1.generatedContent}
            </pre>
            {projectData.step1.generatedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">생성된 이미지:</p>
                <div className="grid grid-cols-2 gap-4">
                  {projectData.step1.generatedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt={`생성된 이미지 ${idx + 1}`} className="w-full rounded-lg border border-border" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={async ()=>{const a=document.createElement('a');a.href=img;a.download=`image-${idx+1}.png`;a.click();}} className="bg-white/90 text-xs px-2 py-1 rounded shadow-sm">다운로드</button>
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

        {/* 자동화 상태 표시 */}
        {(projectData.step2.isRunning || loading || progress.status === 'loading' || progress.status === 'processing') && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">
                {progress.phase === 'sheet_loading' ? '구글 시트 데이터를 불러오는 중...' : 
                 progress.phase === 'sns_checking' ? 'SNS 팔로워/이웃수를 체크하는 중...' :
                 '자동화 실행 중 - 30초마다 새로운 응답을 확인합니다'}
              </span>
            </div>
            
            {/* 진행상황 표시 */}
            {(progress.status === 'loading' || progress.status === 'processing' || progress.currentName) && (
              <div className="mt-3 space-y-2">
                {/* 구글 시트 로딩 단계 */}
                {progress.phase === 'sheet_loading' && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {progress.currentName || '구글 시트 연결 준비 중...'}
                      </span>
                      <span className="text-gray-600">
                        {progress.current}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress.current}%` }}
                      ></div>
                    </div>
                  </>
                )}
                
                {/* SNS 체크 단계 */}
                {progress.phase === 'sns_checking' && (
                  <>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-600 font-medium">
                        {progress.currentName || '준비 중...'}
                      </span>
                      <span className="text-gray-600">
                        {Math.floor(progress.current / 3) + 1}/{Math.floor(progress.total / 3)}명
                      </span>
                    </div>
                    
                    {/* 개별 SNS 체크 진행률 */}
                    {progress.currentSns && (
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs w-16 ${progress.currentSns === 'threads' ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
                            Threads
                          </span>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div 
                              className={`h-1 rounded-full transition-all duration-300 ${
                                progress.currentSns === 'threads' ? 'bg-blue-500 animate-pulse' : 
                                progress.current % 3 >= 1 ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                              style={{ 
                                width: progress.currentSns === 'threads' ? '50%' : 
                                       progress.current % 3 >= 1 ? '100%' : '0%' 
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs w-16 ${progress.currentSns === 'blog' ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
                            블로그
                          </span>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div 
                              className={`h-1 rounded-full transition-all duration-300 ${
                                progress.currentSns === 'blog' ? 'bg-blue-500 animate-pulse' : 
                                progress.current % 3 >= 2 ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                              style={{ 
                                width: progress.currentSns === 'blog' ? '50%' : 
                                       progress.current % 3 >= 2 ? '100%' : '0%' 
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs w-16 ${progress.currentSns === 'instagram' ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
                            인스타
                          </span>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div 
                              className={`h-1 rounded-full transition-all duration-300 ${
                                progress.currentSns === 'instagram' ? 'bg-blue-500 animate-pulse' : 
                                progress.current % 3 === 0 && progress.current > 0 ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                              style={{ 
                                width: progress.currentSns === 'instagram' ? '50%' : 
                                       progress.current % 3 === 0 && progress.current > 0 ? '100%' : '0%' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 전체 진행률 */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(progress.current / progress.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      전체 진행률: {Math.round((progress.current / progress.total) * 100)}%
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 수집된 데이터 */}
        {projectData.step2.candidates.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text">수집된 후보</h4>
              {projectData.step2.isRunning && (
                <span className="text-xs text-gray-500">
                  실시간 업데이트 중...
                </span>
              )}
            </div>
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
                      <td className="text-center py-2">
                        {candidate.checkStatus?.threads === 'checking' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-blue-500">체크중...</span>
                            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                              <div className="h-1 bg-blue-500 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                            </div>
                          </div>
                        ) : candidate.checkStatus?.threads === 'error' ? (
                          <span className="text-xs text-red-500" title={candidate.checkStatus?.threadsError}>오류</span>
                        ) : candidate.checkStatus?.threads === 'no_url' ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : typeof candidate.threads === 'number' ? (
                          <span className={candidate.threads >= projectData.step2.selectionCriteria.threads ? "text-green-600 font-semibold" : ""}>
                            {candidate.threads}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-2">
                        {candidate.checkStatus?.blog === 'checking' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-blue-500">체크중...</span>
                            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                              <div className="h-1 bg-blue-500 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                            </div>
                          </div>
                        ) : candidate.checkStatus?.blog === 'error' ? (
                          <span className="text-xs text-red-500" title={candidate.checkStatus?.blogError}>오류</span>
                        ) : candidate.checkStatus?.blog === 'no_url' ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : typeof candidate.blog === 'number' ? (
                          <span className={candidate.blog >= projectData.step2.selectionCriteria.blog ? "text-green-600 font-semibold" : ""}>
                            {candidate.blog}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-2">
                        {candidate.checkStatus?.instagram === 'checking' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-blue-500">체크중...</span>
                            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                              <div className="h-1 bg-blue-500 rounded-full animate-pulse" style={{ width: '50%' }}></div>
                            </div>
                          </div>
                        ) : candidate.checkStatus?.instagram === 'error' ? (
                          <span className="text-xs text-red-500" title={candidate.checkStatus?.instagramError}>오류</span>
                        ) : candidate.checkStatus?.instagram === 'no_url' ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : typeof candidate.instagram === 'number' ? (
                          <span className={candidate.instagram >= projectData.step2.selectionCriteria.instagram ? "text-green-600 font-semibold" : ""}>
                            {candidate.instagram}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
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
              {projectId && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 border border-red-200 px-3 py-2 rounded"
                >
                  프로젝트 삭제
                </button>
              )}
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">메인으로</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로세스 선택 카드 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">고객모집 자동화</h1>
          {campaignName && (
            <h2 className="text-xl font-semibold text-primary mb-2">프로젝트: {campaignName}</h2>
          )}
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
      {showDeleteConfirm && projectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">프로젝트 삭제</h3>
            <p className="text-sm text-muted-foreground mb-4">정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowDeleteConfirm(false)} className="px-3 py-2 rounded border">취소</button>
              <button
                onClick={async ()=>{
                  try {
                    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
                    const data = await res.json().catch(()=>({}))
                    if (!res.ok) {
                      showNotification(data.error || '삭제 실패', 'error')
                      return
                    }
                    setShowDeleteConfirm(false)
                    showNotification('프로젝트가 삭제되었습니다', 'success')
                    // 완전 삭제: 상태 초기화 후 대시보드로 이동
                    setProjectId(null)
                    setProjectData({
                      step1: { keyword:'', contentType:'blog', apiKey:'', instructions:'', generateImages:false, generatedContent:'', generatedImages:[] },
                      step2: { sheetUrl:'', isRunning:false, candidates:[], selectionCriteria:{ threads:500, blog:300, instagram:1000 } },
                      step3: { targetType:'selected', emailSubject:'', emailBody:'', senderEmail:'', emailsSent:0 }
                    })
                    window.location.href = '/automation/customer-acquisition/dashboard'
                  } catch (e:any) {
                    showNotification(e?.message || '삭제 중 오류가 발생했습니다', 'error')
                  }
                }}
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}