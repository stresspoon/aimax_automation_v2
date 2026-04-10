"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client'
import { fetchJSON } from '@/lib/httpClient'
import { campaignsAPI } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { saveProjectData, loadProjectData, getCampaignIdByName, loadProjectById } from '@/lib/projects'
import { downloadText, downloadCompleteProject, downloadContentAsMarkdown, downloadImagesAsZip } from '@/lib/download'
import { contentGuidelines } from '@/lib/contentGuidelines'
import * as XLSX from 'xlsx'
import { mergeCandidatesSafely } from '@/lib/candidates/merge'
import { normalizeProjectData } from '@/lib/projects/normalize'
import { trackActivity } from '@/lib/analytics'

type Step = 1 | 2 | 3 | 4;

interface Candidate {
  name: string;
  email: string;
  phone: string;
  threads: number;
  blog: number;
  instagram: number;
  status: "selected" | "notSelected";
  emailSent?: boolean;
  emailSentAt?: string;
  // optional URLs and metadata
  threadsUrl?: string;
  instagramUrl?: string;
  blogUrl?: string;
  source?: string;
  checkStatus?: {
    threads?: 'checking' | 'completed' | 'error' | 'no_url';
    threadsError?: string;
    blog?: 'checking' | 'completed' | 'error' | 'no_url';
    blogError?: string;
    instagram?: 'checking' | 'completed' | 'error' | 'no_url';
    instagramError?: string;
  };
  // 수동 상태 고정 여부(자동 재계산 무시)
  statusManual?: boolean;
  // 응답 생성 일시(기간 필터용)
  createdAt?: string | null;
  // 제품 발송 여부
  isProductSent?: boolean;
  // 후기 링크
  reviewUrl?: string;
}

export default function CustomerAcquisitionPage() {
  const router = useRouter();
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
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [projectData, setProjectData] = useState({
    step1: {
      keyword: "",
      productDescription: "",
      contentType: "blog" as "blog" | "thread",
      contentPurpose: "informative" as "informative" | "sales",
      instructions: "",
      generatedContent: "",
      generatedImages: [] as string[],
    },
    step2: {
      formId: null as string | null,
      formUrl: null as string | null,
      candidates: [] as Candidate[],
      sheetUrl: "",
      isRunning: false,
      selectionCriteria: {
        threads: 500,
        blog: 300,
        instagram: 1000,
      },
      usingFormData: false,
    },
    step3: {
      targetType: "selected" as "selected" | "notSelected",
      emailSubject: "",
      emailBody: "",
      // 분리된 템플릿
      subjectSelected: "",
      bodySelected: "",
      subjectNotSelected: "",
      bodyNotSelected: "",
      senderEmail: "",
      emailsSent: 0,
      // 이메일 발송 기간 필터
      dateFrom: null as string | null,
      dateTo: null as string | null,
    },
  });

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const SHEETS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SHEETS_INTEGRATION === 'true'

  // DB 데이터 방어적 정규화 (과거 step2만 저장된 레거시 케이스 포함)
  const normalizeProjectData = (dbData: any) => {
    const isLegacyStep2Only = dbData && !dbData.step2 && (
      Array.isArray(dbData?.candidates) ||
      typeof dbData?.sheetUrl !== 'undefined' ||
      typeof dbData?.isRunning !== 'undefined'
    )

    const step1 = {
      keyword: dbData?.step1?.keyword || '',
      productDescription: dbData?.step1?.productDescription || '',
      contentType: dbData?.step1?.contentType || 'blog',
      contentPurpose: dbData?.step1?.contentPurpose || 'informative',
      instructions: dbData?.step1?.instructions || '',
      generatedContent: dbData?.step1?.generatedContent || '',
      generatedImages: dbData?.step1?.generatedImages || []
    }

    const baseStep2 = isLegacyStep2Only ? dbData : (dbData?.step2 || {})
    const step2 = {
      formId: baseStep2?.formId || null,
      formUrl: baseStep2?.formUrl || null,
      sheetUrl: baseStep2?.sheetUrl || '',
      isRunning: baseStep2?.isRunning || false,
      candidates: baseStep2?.candidates || [],
      selectionCriteria: baseStep2?.selectionCriteria || {
        threads: 500,
        blog: 300,
        instagram: 1000
      },
      usingFormData: baseStep2?.usingFormData || false,
    }

    const step3Base = dbData?.step3 || {}
    const step3 = {
      targetType: step3Base?.targetType || 'selected',
      emailSubject: step3Base?.emailSubject || '',
      emailBody: step3Base?.emailBody || '',
      senderEmail: step3Base?.senderEmail || '',
      emailsSent: step3Base?.emailsSent || 0,
      dateFrom: step3Base?.dateFrom || null,
      dateTo: step3Base?.dateTo || null,
    }

    return {
      ...dbData,
      step1,
      step2,
      step3,
    }
  }

  // localStorage에서 step2, step3 데이터 복원
  useEffect(() => {
    // Step2 데이터 복원
    const savedStep2 = localStorage.getItem('step2_automation_data');
    if (savedStep2) {
      try {
        const parsedData = JSON.parse(savedStep2);
        setProjectData(prev => ({
          ...prev,
          step2: {
            ...prev.step2,
            isRunning: parsedData.isRunning || false,
            selectionCriteria: parsedData.selectionCriteria || prev.step2.selectionCriteria
          }
        }));
      } catch (error) {
        console.error('Failed to parse step2 data:', error);
      }
    }

    // Step3 데이터 복원
    const savedStep3 = localStorage.getItem('step3_email_data');
    if (savedStep3) {
      try {
        const parsedData = JSON.parse(savedStep3);
        setProjectData(prev => ({
          ...prev,
          step3: {
            ...prev.step3,
            ...parsedData
          }
        }));
      } catch (error) {
        console.error('Failed to parse step3 data:', error);
      }
    }
  }, []);

  // step2 자동화 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('step2_automation_data', JSON.stringify({
      isRunning: projectData.step2.isRunning,
      selectionCriteria: projectData.step2.selectionCriteria
    }));
  }, [projectData.step2.isRunning, projectData.step2.selectionCriteria]);

  // step3 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    const s3 = projectData.step3
    if (s3.emailSubject || s3.emailBody || s3.senderEmail || s3.subjectSelected || s3.bodySelected || s3.subjectNotSelected || s3.bodyNotSelected) {
      localStorage.setItem('step3_email_data', JSON.stringify(s3));
    }
  }, [projectData.step3]);

  // 제목/본문 입력 참조(템플릿 변수 삽입용)
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const insertAtCursor = (el: HTMLInputElement | HTMLTextAreaElement | null, value: string) => {
    if (!el) return;
    const start = (el as any).selectionStart ?? el.value.length;
    const end = (el as any).selectionEnd ?? el.value.length;
    const newVal = el.value.slice(0, start) + value + el.value.slice(end);
    el.value = newVal;
    // 포커스/커서 위치 복원
    el.focus();
    const cursorPos = start + value.length;
    (el as any).setSelectionRange?.(cursorPos, cursorPos);
  };

  const insertVarIntoSubject = (token: string) => {
    const v = `{${token}}`;
    insertAtCursor(subjectRef.current, v);
    // 상태 반영
    setProjectData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        emailSubject: subjectRef.current?.value || prev.step3.emailSubject,
        subjectSelected: prev.step3.targetType === 'selected' ? (subjectRef.current?.value || prev.step3.subjectSelected) : prev.step3.subjectSelected,
        subjectNotSelected: prev.step3.targetType === 'notSelected' ? (subjectRef.current?.value || prev.step3.subjectNotSelected) : prev.step3.subjectNotSelected,
      }
    }));
  };

  const updateCandidateField = async (email: string, name: string, field: keyof Candidate, value: any) => {
    // 1. Optimistic Update (useEffect triggers save)
    setProjectData(prev => {
      const next = { ...prev }
      const idx = next.step2.candidates.findIndex((c: any) => c.email === email && c.name === name)
      if (idx >= 0) {
        next.step2.candidates[idx] = { ...next.step2.candidates[idx], [field]: value }
      }
      return next
    })
  };


  const insertVarIntoBody = (token: string) => {
    const v = `{${token}}`;
    insertAtCursor(bodyRef.current, v);
    setProjectData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        emailBody: bodyRef.current?.value || prev.step3.emailBody,
        bodySelected: prev.step3.targetType === 'selected' ? (bodyRef.current?.value || prev.step3.bodySelected) : prev.step3.bodySelected,
        bodyNotSelected: prev.step3.targetType === 'notSelected' ? (bodyRef.current?.value || prev.step3.bodyNotSelected) : prev.step3.bodyNotSelected,
      }
    }));
  };



  // 공통 후보 로더
  const fetchCandidates = async (pid: string) => {
    return fetchJSON<{
      candidates: any[],
      totalResponses?: number,
      formIds?: string[],
      formId?: string,
      message?: string
    }>(`/api/forms/sync-candidates?projectId=${pid}`)
  }

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

  // 자동 새로고침 - 2초마다 후보 데이터 업데이트
  useEffect(() => {
    if (!projectId) return;

    // 자체 폼 사용 여부와 관계없이 항상 새로고침
    console.log('✅ 자동 새로고침 시작! projectId:', projectId);

    const interval = setInterval(async () => {
      try {
        const data = await fetchCandidates(projectId)

        // UI 업데이트 - 기존 재체크 값 보존하면서 병합
        setProjectData(prev => {
          const currentCount = prev.step2?.candidates?.length || 0;
          const newCount = data.candidates?.length || 0;

          // 새 후보자 추가 시 알림
          if (newCount > currentCount) {
            showNotification(`${newCount - currentCount}명의 새로운 신청자가 등록되었습니다!`, 'success');
          }

          // 기존 재체크 값을 보존하면서 새 데이터와 병합
          const mergedCandidates = mergeCandidatesSafely(prev.step2?.candidates, data.candidates)
          // 선정 상태 재계산 (자동 기준 반영)
          const criteria = prev.step2?.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
          const recomputed = (mergedCandidates || []).map((c: any) => {
            const auto = ((c.threads || 0) >= criteria.threads || (c.blog || 0) >= criteria.blog || (c.instagram || 0) >= criteria.instagram) ? 'selected' : 'notSelected'
            // 수동 고정이면 그대로 유지, 아니면 자동값 반영
            return {
              ...c,
              status: c.statusManual ? c.status : auto,
            }
          })

          // 변경 사항이 없으면 업데이트 방지 (무한 루프/저장 방지)
          if (JSON.stringify(prev.step2?.candidates) === JSON.stringify(recomputed)) {
            return prev;
          }

          return {
            ...prev,
            step2: {
              ...prev.step2,
              candidates: recomputed,
            },
          };
        });
      } catch (error) {
        console.error('자동 새로고침 오류:', error);
      }
    }, 2000); // 2초마다 체크

    return () => clearInterval(interval);
  }, [projectId]); // projectId만 dependency로 사용

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
              // 전체 데이터 구조 기본값 보장 + 레거시 형태 정규화
              const loadedData = normalizeProjectData(projectFromDb.data);
              setProjectData(loadedData);

              // 프로젝트가 이미 실행 중이면 periodic check 시작
              if (projectFromDb.data.step2?.isRunning) {
                console.log('🔄 === 기존 실행 중인 프로젝트 감지 ===');
                console.log('Project ID:', projectFromDb.id);
                console.log('Sheet URL:', projectFromDb.data.step2?.sheetUrl);
                console.log('Candidates:', projectFromDb.data.step2?.candidates?.length);
                console.log('lastRowCount:', projectFromDb.data.step2?.lastRowCount);
                console.log('Realtime 구독으로 자동 업데이트됩니다');
                // setTimeout(() => startPeriodicCheck(projectFromDb.id), 1000); // Realtime으로 대체
              } else {
                console.log('ℹ️ 프로젝트가 실행 중이 아님');
              }
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
            // DB에 저장된 데이터가 있으면 사용 (레거시 형태도 정규화)
            const loadedData = normalizeProjectData(projectFromDb.data);
            setProjectData(loadedData);
            setProjectId(projectFromDb.id);

            // 프로젝트가 이미 실행 중이면 periodic check 시작
            if (projectFromDb.data.step2?.isRunning) {
              console.log('🔄 === 기존 실행 중인 프로젝트 감지 ===');
              console.log('Project ID:', projectFromDb.id);
              console.log('Sheet URL:', projectFromDb.data.step2?.sheetUrl);
              console.log('Candidates:', projectFromDb.data.step2?.candidates?.length);
              console.log('lastRowCount:', projectFromDb.data.step2?.lastRowCount);
              setTimeout(() => startPeriodicCheck(projectFromDb.id), 1000); // 1초 후 시작, ID 전달
            }
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

  // Step 1 시작 시 기본 지침 자동 적용 (블로그 + 정보성 기본 선택)
  useEffect(() => {
    if (expandedStep === 1) {
      setProjectData((prev) => {
        if (prev.step1.instructions && prev.step1.instructions.trim().length > 0) return prev
        const type = prev.step1.contentType || 'blog';
        const purpose = prev.step1.contentPurpose || 'informative';
        const defaultGuide = contentGuidelines[type][purpose];
        return {
          ...prev,
          step1: {
            ...prev.step1,
            instructions: defaultGuide
          }
        }
      })
    }
  }, [expandedStep])

  // contentGuidelines는 이미 import됨 - @/lib/contentGuidelines에서 가져옴

  // 콘텐츠 지침 업데이트 함수
  const updateContentInstructions = (type: 'blog' | 'thread', purpose: 'informative' | 'sales') => {
    const instruction = contentGuidelines[type]?.[purpose] || '';
    setProjectData(prev => ({
      ...prev,
      step1: {
        ...prev.step1,
        instructions: instruction
      }
    }));
  };

  // 콘텐츠 타입 변경시 지침 자동 업데이트
  const updateContentType = (type: "blog" | "thread") => {
    const purpose = projectData.step1.contentPurpose || 'informative';
    const instruction = contentGuidelines[type]?.[purpose] || '';
    setProjectData((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        contentType: type,
        instructions: instruction
      }
    }));
  };

  const handleStep1Generate = async () => {
    // 무료 사용자 제한 확인 - 제거됨 (무료화)

    if (!projectData.step1.keyword) {
      showNotification('키워드를 입력해주세요', 'error')
      return
    }

    // 선택한 콘텐츠 타입과 목적에 맞는 지침 가져오기
    const instructions = contentGuidelines[projectData.step1.contentType][projectData.step1.contentPurpose] || ''

    setLoading(true)
    setLoadingProgress(0)
    setLoadingMessage('AI가 콘텐츠를 생성하고 있습니다...')

    const startTime = Date.now()
    console.log('[Step1] 콘텐츠 생성 시작:', new Date().toISOString())

    // 프로그레스 애니메이션 시작
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 1000)

    // 메시지 업데이트
    const messageTimeout1 = setTimeout(() => {
      setLoadingMessage('키워드를 분석하고 있습니다...')
    }, 3000)

    const messageTimeout2 = setTimeout(() => {
      setLoadingMessage('최적의 콘텐츠를 작성하고 있습니다...')
    }, 7000)

    const messageTimeout3 = setTimeout(() => {
      setLoadingMessage('거의 완료되었습니다...')
    }, 20000)

    const messageTimeout4 = setTimeout(() => {
      setLoadingMessage('마무리 작업 중입니다...')
    }, 35000)

    // AbortController for cancellation
    const abortController = new AbortController()
    setAbortController(abortController)

    try {
      console.log('[Step1] API 요청 전송:', {
        keyword: projectData.step1.keyword,
        contentType: projectData.step1.contentType,
        instructionsLength: instructions.length
      })

      const json = await fetchJSON<any>('/api/ai/generate', {
        method: 'POST',
        body: {
          keyword: projectData.step1.keyword,
          contentType: projectData.step1.contentType,
          instructions: instructions,
          generateImages: false,
        },
        signal: abortController.signal,
      })
      const responseTime = Date.now() - startTime
      console.log('[Step1] API 응답 수신 소요 시간:', responseTime, 'ms')



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

      // 프로그레스 완료
      setLoadingProgress(100)
      setLoadingMessage('완료!')

      const totalTime = Date.now() - startTime
      console.log('[Step1] 전체 처리 완료 시간:', totalTime, 'ms')

      showNotification('생성이 완료되었습니다', 'success')
    } catch (e: any) {
      if (e.name === 'AbortError') {
        showNotification('생성이 취소되었습니다', 'info')
      } else {
        showNotification(errorMessage(e, '에러가 발생했습니다'), 'error')
      }
    } finally {
      setLoading(false)
      setLoadingProgress(0)
      setLoadingMessage('')
      clearInterval(progressInterval)
      clearTimeout(messageTimeout1)
      clearTimeout(messageTimeout2)
      clearTimeout(messageTimeout3)
      clearTimeout(messageTimeout4)
      setAbortController(null)
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort()
      setLoading(false)
      setLoadingProgress(0)
      setLoadingMessage('')
      setAbortController(null)
    }
  }

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
    try {
      const arr = await campaignsAPI.list()
      const found = (arr || []).find((c: any) => (c?.name || '').trim() === campaignName.trim())
      if (found?.id) return found.id
    } catch { }
    try {
      const created = await campaignsAPI.create({ name: campaignName, data: {} })
      return created?.id || null
    } catch {
      return null
    }
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

  // Step 2: 폼 링크 최신화 (폼 빌더에서 돌아온 직후 반영)
  useEffect(() => {
    const refreshFormLink = async () => {
      if (expandedStep !== 2 || !projectId) return

      // 1) localStorage 백업 먼저 확인 (즉시 반영, DB보다 빠름)
      try {
        const cached = localStorage.getItem(`form_url_${projectId}`)
        if (cached) {
          const { formId: cachedFormId, formUrl: cachedFormUrl } = JSON.parse(cached)
          if (cachedFormUrl) {
            setProjectData(prev => {
              if (prev.step2.formUrl === cachedFormUrl) return prev // 이미 최신이면 스킵
              return {
                ...prev,
                step2: {
                  ...prev.step2,
                  formUrl: cachedFormUrl,
                  formId: cachedFormId || prev.step2.formId || null,
                }
              }
            })
          }
        }
      } catch { }

      try {
        const supabase = createClient()
        const { data: project } = await supabase
          .from('projects')
          .select('data')
          .eq('id', projectId)
          .single()
        const formUrl = project?.data?.step2?.formUrl
        const formId = project?.data?.step2?.formId
        if (formUrl || formId) {
          setProjectData(prev => ({
            ...prev,
            step2: {
              ...prev.step2,
              formUrl: formUrl || prev.step2.formUrl || null,
              formId: formId || prev.step2.formId || null,
            }
          }))
          return // formUrl이 확인됐으면 바로 반환
        }

        // Fallback: if no formUrl in project data, try to infer from forms API
        try {
          const forms = await fetchJSON<any[]>(`/api/forms?projectId=${projectId}`)
          const projectForms = (forms || []).filter((f: any) => f.project_id === projectId)
          if (projectForms.length > 0 && projectForms[0]?.slug) {
            const derivedUrl = `${window.location.origin}/form/${projectForms[0].slug}`
            setProjectData(prev => ({
              ...prev,
              step2: {
                ...prev.step2,
                formUrl: prev.step2.formUrl || derivedUrl, // 이미 있으면 유지
                formId: prev.step2.formId || projectForms[0].id || null,
              }
            }))
          }
        } catch { }
      } catch (e) {
        // no-op: 링크 최신화 실패는 무시 (표시만 영향)
      }
    }

    // 초기 실행
    refreshFormLink()

    // 폼 빌더에서 router.back()으로 돌아올 때:
    // expandedStep/projectId가 같은 값이면 useEffect가 안 재실행되므로
    // visibilitychange(탭 전환 복귀) 및 focus(창 복귀) 이벤트로 보완
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFormLink()
      }
    }
    const handleFocus = () => {
      refreshFormLink()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [expandedStep, projectId])

  const connectGmail = async () => {
    try {
      const data = await fetchJSON<{ url?: string; error?: string }>('/api/auth/gmail')
      if (data?.url) {
        window.location.href = data.url
      } else {
        showNotification('Gmail 연결 실패', 'error')
      }
    } catch (error: any) {
      console.error('Gmail connection error:', error)
      showNotification(errorMessage(error, 'Gmail 연결 중 오류가 발생했습니다'), 'error')
    }
  }

  const disconnectGmail = async () => {
    try {
      await fetchJSON('/api/auth/gmail', { method: 'DELETE' })
      setGmailEmail('')
      showNotification('Gmail 연결이 해제되었습니다', 'info')
    } catch (error: any) {
      console.error('Gmail disconnection error:', error)
      showNotification(errorMessage(error, 'Gmail 연결 해제 중 오류가 발생했습니다'), 'error')
    }
  }

  const handleStep2Start = async () => {
    // 자동화 시작/일시정지 토글
    const newRunningState = !projectData.step2.isRunning;

    if (newRunningState) {
      // 시작: 준비 단계
      setLoading(true)
      setProgress({ total: 100, current: 0, currentName: '데이터 확인 중...', status: 'loading', phase: 'sheet_loading' })

      try {
        // 먼저 자체 폼 데이터 확인
        console.log('Checking form data for projectId:', projectId)
        const formData = projectId ? await fetchCandidates(projectId) : null
        console.log('Form data loaded for projectId:', projectId)
        console.log('Form data:', formData)

        if (formData?.candidates && formData.candidates.length > 0) {
          // 자체 폼 데이터 사용
          setProjectData({
            ...projectData,
            step2: {
              ...projectData.step2,
              candidates: formData.candidates,
              isRunning: true,
              usingFormData: true
            }
          });

          showNotification(`자체 폼에서 ${formData.candidates.length}명의 후보를 가져왔습니다`, 'success');

          // pending 상태인 응답들에 대해 SNS 체크 실행
          const pendingResponses = formData.candidates.filter((c: any) =>
            c.checkStatus?.threads === 'pending' ||
            c.checkStatus?.blog === 'pending' ||
            c.checkStatus?.instagram === 'pending'
          )

          if (pendingResponses.length > 0) {
            showNotification(`${pendingResponses.length}명에 대해 SNS 체크를 시작합니다`, 'info')

            // formId를 사용해서 pending 응답들 가져오기
            if (formData.formId) {
              try {
                const responsesData = await fetchJSON<any[]>(`/api/forms/responses?formId=${formData.formId}&projectId=${projectId || ''}`)
                const pendingIds = responsesData
                  .filter((r: any) => r.status === 'pending')
                  .map((r: any) => r.id)

                // 각 응답에 대해 SNS 체크 실행
                for (const responseId of pendingIds) {
                  fetch('/api/forms/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ responseId })
                  }).catch(console.error)
                }
              } catch (e) { console.error(e) }
            }
          }

          setLoading(false);
          setProgress({ total: 100, current: 100, currentName: '완료', status: 'completed', phase: 'completed' });

          // 프로젝트 업데이트
          if (projectId) {
            const supabase = createClient();
            await supabase
              .from('projects')
              .update({
                step2_completed: true,
                db_collected: true,
                leads_count: formData.candidates.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', projectId);
          }

          try {
            await trackActivity(newRunningState ? 'automation.step2.start' : 'automation.step2.pause', {
              campaign_id: campaignId || undefined,
              project_id: projectId || undefined
            })
          } catch { }

          return;
        }

        // 자체 폼 데이터가 없고 Google Sheets URL도 없으면 안내
        if (!projectData.step2.sheetUrl) {
          showNotification('자체 폼에 응답이 없습니다. 폼 링크를 공유하여 응답을 받아보세요.', 'info');
          setLoading(false);
          setProgress({ total: 100, current: 0, currentName: '', status: 'idle', phase: 'idle' });

          // 빈 상태로 대기 모드 시작 (새 응답 기다림)
          setProjectData({
            ...projectData,
            step2: {
              ...projectData.step2,
              candidates: [],
              isRunning: true,
              usingFormData: true
            }
          });

          // 주기적으로 폼 데이터 체크
          const checkInterval = setInterval(async () => {
            try {
              const data = await fetchCandidates(projectId!)
              if (data.candidates && data.candidates.length > 0) {
                setProjectData(prev => ({
                  ...prev,
                  step2: {
                    ...prev.step2,
                    candidates: (function () {
                      const prevList = prev.step2?.candidates || []
                      const merged = mergeCandidatesSafely(prevList as any, data.candidates as any) as any[]
                      const criteria = prev.step2?.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
                      return merged.map((c: any) => ({
                        ...c,
                        status: ((c.threads || 0) >= criteria.threads || (c.blog || 0) >= criteria.blog || (c.instagram || 0) >= criteria.instagram) ? 'selected' : 'notSelected'
                      }))
                    })()
                  }
                }))
                showNotification(`${data.candidates.length}명의 새로운 응답이 있습니다!`, 'success')
                clearInterval(checkInterval)
              }
            } catch { }
          }, 5000)

          return;
        }

        // Google Sheets URL이 있으면 기존 로직 실행
        let prepJson: any
        try {
          prepJson = await fetchJSON('/api/sheets/prepare', { method: 'POST', body: { sheetUrl: projectData.step2.sheetUrl } })
        } catch (e: any) {
          showErrorFrom(e, '시트 연결에 실패했습니다')
          setLoading(false)
          return
        }
        if (!Array.isArray(prepJson.candidates)) {
          showNotification('시트 연결에 실패했습니다', 'error')
          setLoading(false)
          return
        }

        // 빈 시트도 허용
        if (prepJson.candidates.length === 0) {
          console.log('빈 시트 감지 - 새로운 응답 대기 모드로 시작')
          showNotification('시트가 연결되었습니다. 새로운 응답을 기다리는 중...', 'info')
        }

        // 로컬 상태 업데이트
        setProjectData(prev => ({
          ...prev,
          step2: { ...prev.step2, isRunning: true, candidates: prepJson.candidates }
        }))
        setProgress(p => ({ ...p, total: prepJson.candidates.length * 3, current: 0, currentName: `후보 ${prepJson.candidates.length}명 로드됨`, status: 'processing', phase: 'sns_checking' }))

        // DB에 isRunning true로 업데이트
        if (projectId) {
          const supabase = createClient();
          await supabase
            .from('projects')
            .update({
              data: {
                ...projectData,
                step2: {
                  ...projectData.step2,
                  isRunning: true,
                  candidates: prepJson.candidates,
                  lastRowCount: prepJson.candidates.length, // 초기 행 수 저장
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        }

        // Realtime 구독이 있으므로 스마트 폴링 불필요
        console.log('🚀 자동화 시작 - Realtime 구독 활성화');
        // startPeriodicCheck(projectId || undefined) // 비활성화

        // 2) 후보별 병렬 측정 (빈 시트인 경우 건너뜀)
        const total = prepJson.candidates.length
        if (total === 0) {
          // 빈 시트인 경우 바로 완료 처리
          setLoading(false)
          setProgress({ total: 100, current: 100, currentName: '새로운 응답 대기 중...', status: 'completed', phase: 'completed' })
          return
        }

        // 순차 처리로 변경하여 안정성 확보
        for (let i = 0; i < total; i++) {
          const c = prepJson.candidates[i]

          // 진행 상황 업데이트
          setProgress(p => ({
            ...p,
            currentName: `(${i + 1}/${total}) SNS 체크 중...`,
            current: i * 3
          }))

          // 각 후보에 대해 3개 SNS를 순차적으로 체크
          // SNS 체크 결과 저장
          let tJson: any = { threads: 0 }
          let bJson: any = { blog: 0 }
          let iJson: any = { instagram: 0 }

          // Threads 체크
          if ((c as any).threadsUrl) {
            try {
              setProgress(p => ({ ...p, currentName: `(${i + 1}/${total}) Threads 체크 중...`, currentSns: 'threads' }))
              const result = await fetchJSON('/api/sheets/measure', { method: 'POST', body: { candidate: c, channel: 'threads' } })
              tJson.threads = result.threads || 0
            } catch (err) {
              console.error('Threads check error:', err)
              tJson.threads = 0
            }
          }

          // 약간의 지연 추가 (브라우저 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 500))

          // Blog 체크
          if ((c as any).blogUrl) {
            try {
              setProgress(p => ({ ...p, currentName: `(${i + 1}/${total}) 블로그 체크 중...`, currentSns: 'blog' }))
              const result = await fetchJSON('/api/sheets/measure', { method: 'POST', body: { candidate: c, channel: 'blog' } })
              bJson.blog = result.blog || 0
            } catch (err) {
              console.error('Blog check error:', err)
              bJson.blog = 0
            }
          }

          // 약간의 지연 추가
          await new Promise(resolve => setTimeout(resolve, 500))

          // Instagram 체크
          if ((c as any).instagramUrl) {
            try {
              setProgress(p => ({ ...p, currentName: `(${i + 1}/${total}) 인스타그램 체크 중...`, currentSns: 'instagram' }))
              const result = await fetchJSON('/api/sheets/measure', { method: 'POST', body: { candidate: c, channel: 'instagram' } })
              iJson.instagram = result.instagram || 0
            } catch (err) {
              console.error('Instagram check error:', err)
              iJson.instagram = 0
            }
          }

          // 선정 여부 결정
          const criteria = projectData.step2.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
          const selected = (tJson.threads || 0) >= criteria.threads ||
            (bJson.blog || 0) >= criteria.blog ||
            (iJson.instagram || 0) >= criteria.instagram

          // 최종 상태 업데이트
          setProjectData(prev => {
            const copy = { ...prev }
            copy.step2.candidates[i] = {
              ...copy.step2.candidates[i],
              threads: tJson.threads || 0,
              blog: bJson.blog || 0,
              instagram: iJson.instagram || 0,
              status: selected ? 'selected' : 'notSelected',
              checkStatus: {
                threads: tJson.threads > 0 ? 'completed' : ((c as any).threadsUrl ? 'error' : 'no_url'),
                blog: bJson.blog > 0 ? 'completed' : ((c as any).blogUrl ? 'error' : 'no_url'),
                instagram: iJson.instagram > 0 ? 'completed' : ((c as any).instagramUrl ? 'error' : 'no_url')
              }
            }
            return copy
          })

          setProgress(p => ({ ...p, current: (i + 1) * 3 }))
        }

        setProgress(p => ({ ...p, currentName: '완료', status: 'completed', phase: 'completed', current: (total * 3), currentSns: undefined }))
        showNotification('후보별 SNS 체크가 완료되었습니다', 'success')

        // 측정이 완료되어도 isRunning은 true로 유지 (주기적 체크 계속)
        console.log('자동화 실행 중 - 5초마다 새로운 응답을 확인합니다')

      } catch (err) {
        console.error(err)
        showNotification('시트 준비 또는 측정 중 오류가 발생했습니다', 'error')
      } finally {
        setLoading(false)

        // Step 2 완료 상태 업데이트 (성공적으로 데이터를 가져온 경우)
        if (projectId && (projectData.step2.candidates?.length || 0) > 0) {
          const supabase = createClient();
          await supabase
            .from('projects')
            .update({
              step2_completed: true,
              db_collected: true,
              leads_count: projectData.step2.candidates?.length || 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        }
      }
    } else {
      // 일시정지
      console.log('⏸️ === 자동화 일시정지 ===');

      // 먼저 interval 중지
      stopPeriodicCheck();

      // DB에 isRunning false로 업데이트
      if (projectId) {
        const supabase = createClient();
        await supabase
          .from('projects')
          .update({
            data: {
              ...projectData,
              step2: {
                ...projectData.step2,
                isRunning: false,
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      }

      // 로컬 상태 업데이트
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

  // 스마트 폴링 관련
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingInterval, setPollingInterval] = useState(5000); // 초기 5초
  const [lastDataTime, setLastDataTime] = useState(Date.now());
  const [minutesSinceLastData, setMinutesSinceLastData] = useState(0);

  // 진행상황 추적 상태
  const [progress, setProgress] = useState<{
    total: number
    current: number
    currentName: string
    status: 'idle' | 'loading' | 'processing' | 'completed' | 'error'
    phase: 'idle' | 'sheet_loading' | 'sns_checking' | 'completed'
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

  const startPeriodicCheck = (pId?: string) => {
    const currentProjectId = pId || projectId;

    // 기존 interval이 있으면 정리
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    console.log('🚀 === 스마트 폴링 시작 ===');
    console.log('Project ID:', currentProjectId);
    console.log('초기 체크 간격: 5초');

    if (!currentProjectId) {
      console.log('❌ Project ID가 없어서 시작 불가');
      return;
    }

    // 초기 설정 - 더 빠른 체크를 위해 2초로 시작
    setPollingInterval(2000);
    setLastDataTime(Date.now());
    setMinutesSinceLastData(0);

    // 즉시 한 번 체크
    console.log('📍 초기 체크 실행...');
    checkForNewResponses(currentProjectId);

    // 스마트 폴링 함수
    const performSmartCheck = async () => {
      console.log(`⏰ === 스마트 폴링 체크 (${pollingInterval / 1000}초 간격) ===`);
      console.log('Current Project ID:', currentProjectId);
      console.log(`마지막 데이터: ${minutesSinceLastData}분 전`);

      const supabase = createClient();
      const { data: project } = await supabase
        .from('projects')
        .select('data')
        .eq('id', currentProjectId)
        .single();

      const isRunning = project?.data?.step2?.isRunning;
      const sheetUrl = project?.data?.step2?.sheetUrl;
      const usingFormData = project?.data?.step2?.usingFormData;

      console.log('📊 프로젝트 상태:');
      console.log(`  - isRunning: ${isRunning}`);
      console.log(`  - sheetUrl: ${sheetUrl}`);
      console.log(`  - usingFormData: ${usingFormData}`);

      if (isRunning && (sheetUrl || usingFormData)) {
        console.log('✅ 조건 충족 - 새로운 응답 체크 실행');
        const hasNewData = await checkForNewResponses(currentProjectId);

        if (hasNewData) {
          // 새 데이터 발견 - 간격을 2초로 리셋 (빠른 업데이트)
          setPollingInterval(2000);
          setLastDataTime(Date.now());
          setMinutesSinceLastData(0);
          console.log('📊 새 데이터 발견! 체크 간격을 2초로 리셋');
        } else {
          // 데이터 없음 - 간격 점진적 증가
          const timeSinceLastData = Date.now() - lastDataTime;
          const minutes = Math.floor(timeSinceLastData / 60000);
          setMinutesSinceLastData(minutes);

          if (minutes > 60 && pollingInterval !== 60000) {
            setPollingInterval(60000);
            console.log('⏱️ 1시간 이상 변화 없음 - 체크 간격을 1분으로 변경');
          } else if (minutes > 30 && pollingInterval !== 30000) {
            setPollingInterval(30000);
            console.log('⏱️ 30분 이상 변화 없음 - 체크 간격을 30초로 변경');
          } else if (minutes > 5 && pollingInterval !== 10000) {
            setPollingInterval(10000);
            console.log('⏱️ 5분 이상 변화 없음 - 체크 간격을 10초로 변경');
          } else if (minutes > 2 && pollingInterval !== 5000) {
            setPollingInterval(5000);
            console.log('⏱️ 2분 이상 변화 없음 - 체크 간격을 5초로 변경');
          }
        }
      } else {
        console.log('⏸️ 체크 건너뜀 (실행 중이 아니거나 시트 URL 없음)');
      }
    };

    // 스마트 폴링 시작
    const interval = setInterval(performSmartCheck, pollingInterval);
    setCheckInterval(interval);

    // 진행상황 체크 시작
    startProgressCheck();
  };

  const stopPeriodicCheck = () => {
    console.log('🛑 === 스마트 폴링 중지 ===');

    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
      setPollingInterval(5000); // 리셋
      setMinutesSinceLastData(0);
      console.log('✅ Interval 정리 완료');
    } else {
      console.log('ℹ️ 정리할 interval 없음');
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
      const data = await fetchJSON<any>(`/api/sheets/progress?projectId=${projectId}`)
      console.log('진행상황 업데이트:', data)
      setProgress(data)
      // 완료되면 주기적 체크 중지
      if (data.status === 'completed' && data.current === data.total && data.total > 0) {
        console.log('체크 완료, 진행상황 추적 중지')
        stopProgressCheck()
      }
    } catch (err) {
      console.error('Progress check error:', err);
    }
  };

  const checkForNewResponses = async (pId?: string): Promise<boolean> => {
    const currentProjectId = pId || projectId;

    console.log('🔍 === 새로운 응답 체크 시작 ===');
    console.log('Project ID:', currentProjectId);
    console.log('현재 시간:', new Date().toLocaleTimeString());

    try {
      if (!currentProjectId) {
        console.log('❌ No project ID, skipping check');
        return false;
      }

      // DB에서 최신 프로젝트 데이터 가져오기
      const supabase = createClient();
      const { data: project, error } = await supabase
        .from('projects')
        .select('data')
        .eq('id', currentProjectId)
        .single();

      if (error || !project) {
        console.error('❌ Failed to fetch project data:', error);
        return false;
      }

      const lastCandidatesCount = project.data?.step2?.candidates?.length || 0;

      console.log('📊 현재 상태:');
      console.log(`  - 현재 후보자 수: ${lastCandidatesCount}`);
      console.log(`  - Using Form Data: ${project.data?.step2?.usingFormData}`);

      // 자체 폼 사용 중인 경우
      if (project.data?.step2?.usingFormData) {
        const data = await fetchCandidates(currentProjectId)
        console.log('📨 Forms API 응답:', data);

        if (data.candidates) {
          const newCount = data.candidates.length;

          // 항상 최신 데이터로 UI 업데이트 (SNS 체크 결과 포함)
          setProjectData(prev => ({
            ...prev,
            step2: {
              ...prev.step2,
              candidates: (function () {
                const prevList = prev.step2?.candidates || []
                const merged = mergeCandidatesSafely(prevList as any, data.candidates as any) as any[]
                const criteria = prev.step2?.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
                return merged.map((c: any) => ({
                  ...c,
                  status: ((c.threads || 0) >= criteria.threads || (c.blog || 0) >= criteria.blog || (c.instagram || 0) >= criteria.instagram) ? 'selected' : 'notSelected'
                }))
              })()
            },
          }));

          // 새 후보자가 추가된 경우에만 알림
          if (newCount > lastCandidatesCount) {
            console.log(`✅ ${newCount - lastCandidatesCount}명의 새로운 후보자 발견!`);

            // DB에도 업데이트
            await supabase
              .from('projects')
              .update({
                data: {
                  ...project.data,
                  step2: {
                    ...project.data.step2,
                    candidates: data.candidates,
                  }
                }
              })
              .eq('id', currentProjectId);

            showNotification(`${newCount - lastCandidatesCount}명의 새로운 후보자가 추가되었습니다`, 'success');
            return true; // 새 데이터 발견
          }

          console.log('📊 후보자 데이터 업데이트 (SNS 체크 결과 반영)');
          return false;
        }
        return false;
      }

      // Google Sheets 사용 중인 경우 (기존 로직)
      const lastRowCount = project.data?.step2?.lastRowCount || 0;

      console.log(`  - DB에 저장된 마지막 체크 행 수: ${lastRowCount}`);
      console.log(`  - Sheet URL: ${project.data?.step2?.sheetUrl}`);

      const data = await fetchJSON('/api/sheets/sync', {
        method: 'POST',
        body: {
          sheetUrl: project.data?.step2?.sheetUrl || projectData.step2.sheetUrl,
          projectId: currentProjectId,
          selectionCriteria: project.data?.step2?.selectionCriteria || projectData.step2.selectionCriteria,
          checkNewOnly: true,
          lastRowCount: lastRowCount,
          skipSnsCheck: false,
        },
      })
      console.log('📨 Sheets API 응답:', data);

      if (data.newCandidates && data.newCandidates.length > 0) {
        console.log(`✅ ${data.newCandidates.length}명의 새로운 후보자 발견!`);

        const { data: updatedProject } = await supabase
          .from('projects')
          .select('data')
          .eq('id', currentProjectId)
          .single();

        if (updatedProject) {
          setProjectData(prev => ({
            ...prev,
            step2: {
              ...prev.step2,
              ...updatedProject.data.step2,
            },
          }));
        }

        showNotification(`${data.newCandidates.length}명의 새로운 후보자가 추가되었습니다`, 'success');
        return true;
      }

      return false;
    } catch (err) {
      console.error('New responses check error:', err);
      return false;
    }
  };

  // 폴링 간격이 변경되면 인터벌 재설정
  useEffect(() => {
    if (checkInterval && projectData.step2.isRunning) {
      clearInterval(checkInterval);

      const performSmartCheck = async () => {
        const supabase = createClient();
        const { data: project } = await supabase
          .from('projects')
          .select('data')
          .eq('id', projectId)
          .single();

        const isRunning = project?.data?.step2?.isRunning;
        const sheetUrl = project?.data?.step2?.sheetUrl;
        const usingFormData = project?.data?.step2?.usingFormData;

        if (isRunning && (sheetUrl || usingFormData)) {
          const hasNewData = await checkForNewResponses(projectId || undefined);

          if (hasNewData) {
            setPollingInterval(2000);
            setLastDataTime(Date.now());
            setMinutesSinceLastData(0);
          } else {
            const timeSinceLastData = Date.now() - lastDataTime;
            const minutes = Math.floor(timeSinceLastData / 60000);
            setMinutesSinceLastData(minutes);

            if (minutes > 60 && pollingInterval !== 60000) {
              setPollingInterval(60000);
            } else if (minutes > 30 && pollingInterval !== 30000) {
              setPollingInterval(30000);
            } else if (minutes > 10 && pollingInterval !== 15000) {
              setPollingInterval(15000);
            }
          }
        }
      };

      const interval = setInterval(performSmartCheck, pollingInterval);
      setCheckInterval(interval);
      console.log(`🔄 폴링 간격 변경됨: ${pollingInterval / 1000}초`);
    }
  }, [pollingInterval]);

  // 컴포넌트 언마운트 시 interval 정리
  useEffect(() => {
    return () => {
      console.log('🧹 컴포넌트 언마운트 - 모든 interval 정리');
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

  // Small helper to standardize error toasts
  const showErrorFrom = (err: unknown, fallback: string) => {
    showNotification(errorMessage(err, fallback), 'error')
  }

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
    await trackActivity('automation.step3.send_attempt', {
      campaign_id: campaignId || undefined,
      project_id: projectId || undefined
    })
    console.log('[handleStep3Send] emailSubject:', projectData.step3.emailSubject);
    console.log('[handleStep3Send] emailBody:', projectData.step3.emailBody);

    const subject = projectData.step3.targetType === 'selected'
      ? (projectData.step3.subjectSelected || projectData.step3.emailSubject)
      : (projectData.step3.subjectNotSelected || projectData.step3.emailSubject)
    const body = projectData.step3.targetType === 'selected'
      ? (projectData.step3.bodySelected || projectData.step3.emailBody)
      : (projectData.step3.bodyNotSelected || projectData.step3.emailBody)

    if (!subject || !body) {
      showNotification('제목과 본문을 입력해주세요', 'error');
      return;
    }

    if (!gmailEmail && !projectData.step3.senderEmail) {
      showNotification('Gmail을 연결하거나 발신 이메일을 입력해주세요', 'error');
      return;
    }

    if ((projectData.step2.candidates?.length || 0) === 0) {
      showNotification('발송할 대상이 없습니다. Step 2에서 데이터를 가져와주세요', 'error');
      return;
    }

    setLoading(true);
    try {
      // Gmail이 연결되어 있으면 Gmail API 사용, 아니면 기존 방식 사용
      const endpoint = gmailEmail ? '/api/emails/send-gmail' : '/api/emails/send-batch';

      // 대상 필터링 - 이미 이메일을 받은 사람은 제외 + 기간 필터
      const recipients = projectData.step2.candidates.filter(c => {
        // 이미 이메일을 받은 사람은 제외 (emailSent 또는 emailSentAt 체크)
        if (c.emailSent || c.emailSentAt) {
          console.log(`[Email Skip] ${c.email} - 이미 발송됨 (${c.emailSentAt || '이전 발송'})`);
          return false;
        }
        // 기간 필터 적용(응답 생성일 기준)
        const from = projectData.step3.dateFrom ? new Date(`${projectData.step3.dateFrom}T00:00:00`) : null;
        const to = projectData.step3.dateTo ? new Date(`${projectData.step3.dateTo}T23:59:59.999`) : null;
        if (from || to) {
          const created = c.createdAt ? new Date(c.createdAt) : null;
          // createdAt이 없으면 포함(레거시) — 명시적 제외를 원하면 createdAt 있는 대상만 발송하도록 옵션화 가능
          if (created) {
            if (from && created < from) return false;
            if (to && created > to) return false;
          }
        }

        // 대상 타입에 따른 필터링
        if (projectData.step3.targetType === 'selected') return c.status === 'selected';
        if (projectData.step3.targetType === 'notSelected') return c.status === 'notSelected';
        return true; // 'all'인 경우
      });

      // 필터링 후 대상이 없으면 서버 호출하지 않음(400 예방)
      if (recipients.length === 0) {
        showNotification('발송 대상이 없습니다. 선택 조건을 확인해주세요.', 'error');
        return;
      }

      const requestBody = {
        recipients: recipients,
        subject,
        body,
        replyTo: projectData.step3.senderEmail,
        // 기존 API와의 호환성을 위해
        candidates: recipients,
        targetType: projectData.step3.targetType,
        projectId: projectId,
      };

      console.log('[handleStep3Send] Sending to API:', endpoint);
      console.log('[handleStep3Send] Request body:', requestBody);

      let data: any
      try {
        data = await fetchJSON(endpoint, { method: 'POST', body: requestBody, timeoutMs: 120000 })
      } catch (e: any) {
        showErrorFrom(e, '이메일 발송 실패')
        return
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

      // 발송 수 저장 및 후보자 상태 업데이트
      if (emailsSent > 0) {
        setProjectData(prev => {
          // 이메일이 발송된 후보자들을 표시
          const updatedCandidates = prev.step2.candidates.map(candidate => {
            // 발송 대상이었던 후보자들에게 emailSentAt 추가
            const wasRecipient = recipients.some(r => r.email === candidate.email);
            if (wasRecipient) {
              return {
                ...candidate,
                emailSentAt: new Date().toISOString(),
                emailSent: true
              };
            }
            return candidate;
          });

          return {
            ...prev,
            step2: {
              ...prev.step2,
              candidates: updatedCandidates
            },
            step3: {
              ...prev.step3,
              emailsSent: (prev.step3.emailsSent || 0) + emailsSent,
            },
          };
        });

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
      await trackActivity('automation.step3.send_success', {
        campaign_id: campaignId || undefined,
        project_id: projectId || undefined
      })
    } catch (err) {
      showNotification('이메일 발송 중 오류가 발생했습니다', 'error');
      await trackActivity('automation.step3.send_failure', {
        campaign_id: campaignId || undefined,
        project_id: projectId || undefined,
        error: (err as any)?.message || String(err)
      })
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
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-foreground">Step 1: 고객모집 글쓰기</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 블로그 자동화 툴 */}
        <a
          href="https://www.haribot.co.kr/products/7d2c35b8-ea06-4fcd-93aa-38b7e59f854d"
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-muted/30 border border-border rounded-xl overflow-hidden hover:border-primary hover:shadow-lg transition-all duration-300"
        >
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 transition-colors">
            {/* 이미지 플레이스홀더 */}
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <span className="text-sm font-medium">블로그 이미지 영역</span>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">블로그 자동화 툴</h3>
            <p className="text-muted-foreground text-sm">AI가 블로그 포스팅을 자동으로 작성하고 관리해줍니다.</p>
          </div>
        </a>

        {/* 스레드 자동화 툴 (Coming Soon) */}
        <div className="relative group bg-muted/30 border border-border rounded-xl overflow-hidden cursor-not-allowed">
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground opacity-50 group-hover:opacity-40 transition-opacity">
            {/* 이미지 플레이스홀더 */}
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm font-medium">스레드 이미지 영역</span>
            </div>
          </div>
          <div className="p-6 opacity-50 group-hover:opacity-40 transition-opacity">
            <h3 className="text-xl font-bold text-foreground mb-2">스레드 자동화 툴</h3>
            <p className="text-muted-foreground text-sm">스레드 콘텐츠를 자동으로 생성하고 업로드합니다.</p>
          </div>

          {/* Hover Overlay - Coming Soon */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-white font-bold text-lg px-6 py-2 border-2 border-white/50 rounded-full backdrop-blur-sm">
              곧 연동 예정
            </span>
          </div>
        </div>
      </div>

      {/* 다음 단계로 넘어가는 버튼 (임시 제공 - 실제 흐름에 따라 필요 여부 결정) */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setExpandedStep(2)}
          className="text-muted-foreground hover:text-foreground text-sm underline transition"
        >
          Step 2(DB 관리)로 넘어가기
        </button>
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

      {/* 폼 생성/수정 버튼 */}
      <div className="mb-6 space-y-4">
        <button
          onClick={async () => {
            try {
              let pid = projectId
              if (!pid && campaignId) {
                const result = await saveProjectData(campaignId, projectData)
                if (result?.id) {
                  pid = result.id
                  setProjectId(result.id)
                }
              }
              router.push(`/automation/customer-acquisition/form-builder?projectId=${pid ?? ''}`)
            } catch (e) {
              console.error('폼 빌더 진입 전 프로젝트 생성 실패:', e)
              router.push(`/automation/customer-acquisition/form-builder?projectId=${projectId ?? ''}`)
            }
          }}
          className="w-full py-3 px-4 bg-[#131313] hover:bg-[#131313]/90 text-[#FFFFFF] font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          폼 생성/수정하기
        </button>

        {/* 폼 상태 표시 */}
        {projectData.step2.formUrl || projectData.step2.usingFormData || projectData.step2.isRunning || (projectData.step2.candidates?.length || 0) > 0 ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 mb-2">
              {projectData.step2.formUrl ? '폼이 생성되었습니다!' : '폼이 생성되어 자동화가 정상적으로 동작 중입니다'}
            </p>
            {projectData.step2.formUrl && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectData.step2.formUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white border rounded"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(projectData.step2.formUrl || '')
                      .then(() => showNotification('링크가 복사되었습니다', 'success'))
                      .catch(() => showNotification('복사에 실패했습니다', 'error'))
                  }}
                  className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
                >
                  복사
                </button>
                <button
                  onClick={() => window.open(projectData.step2.formUrl || '', '_blank')}
                  className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
                >
                  열기
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              폼 링크가 비어 있습니다. 아래 버튼으로 폼을 생성한 뒤, 다시 이 화면으로 돌아오면 링크가 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 후보자 목록 표시 */}
      <div className="space-y-6">
        {/* 구글시트 URL (숨김 - 백그라운드 호환용) */}
        <input
          type="hidden"
          value={projectData.step2.sheetUrl}
          onChange={(e) => setProjectData({ ...projectData, step2: { ...projectData.step2, sheetUrl: e.target.value } })}
        />

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
                  value={projectData.step2.selectionCriteria?.threads || 500}
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
                  value={projectData.step2.selectionCriteria?.blog || 300}
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
                  value={projectData.step2.selectionCriteria?.instagram || 1000}
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
          disabled={false}  // 항상 활성화 (자체 폼 또는 Google Sheets 중 하나 사용)
          className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${projectData.step2.isRunning
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
        >
          {projectData.step2.isRunning ? '일시정지' : '자동화 시작'}
        </button>

        {/* 자동화 상태 표시 */}
        {(projectData.step2.isRunning || loading || progress.status === 'loading' || progress.status === 'processing') && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  {progress.phase === 'sheet_loading' ? '구글 시트 데이터를 불러오는 중...' :
                    progress.phase === 'sns_checking' ? 'SNS 팔로워/이웃수를 체크하는 중...' :
                      `자동화 실행 중 - ${pollingInterval / 1000}초마다 체크`}
                </span>
              </div>
              {minutesSinceLastData > 0 && (
                <span className="text-xs text-gray-500">
                  마지막 데이터: {minutesSinceLastData}분 전
                </span>
              )}
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
                              className={`h-1 rounded-full transition-all duration-300 ${progress.currentSns === 'threads' ? 'bg-blue-500 animate-pulse' :
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
                              className={`h-1 rounded-full transition-all duration-300 ${progress.currentSns === 'blog' ? 'bg-blue-500 animate-pulse' :
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
                              className={`h-1 rounded-full transition-all duration-300 ${progress.currentSns === 'instagram' ? 'bg-blue-500 animate-pulse' :
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
        {(projectData.step2.candidates?.length || 0) > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h4 className="font-semibold text-text">수집된 후보 ({projectData.step2.candidates.length}명)</h4>
                <div className="text-sm text-muted-foreground">
                  선정: <span className="font-bold text-green-600">{projectData.step2.candidates.filter(c => c.status === 'selected').length}명</span> |
                  탈락: <span className="font-bold text-gray-500">{projectData.step2.candidates.filter(c => c.status === 'notSelected').length}명</span> |
                  발송 완료: <span className="font-bold text-blue-600">{projectData.step2.candidates.filter(c => c.emailSent).length}명</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {projectData.step2.isRunning && (
                  <span className="text-xs text-gray-500">
                    실시간 업데이트 중...
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (!(process.env.NEXT_PUBLIC_ENABLE_SHEETS_INTEGRATION === 'true')) {
                      showNotification('관리자 설정에서 시트 통합을 활성화해야 합니다', 'info')
                      return
                    }

                    setLoading(true)
                    try {
                      // 1. DB에서 데이터 가져오기
                      const data = await fetchCandidates(projectId!)
                      if (data.candidates) {
                        const updatedCandidates = (function () {
                          const prevList = projectData.step2?.candidates || []
                          const merged = mergeCandidatesSafely(prevList as any, data.candidates as any) as any[]
                          const criteria = projectData.step2?.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
                          return merged.map((c: any) => ({
                            ...c,
                            status: ((c.threads || 0) >= criteria.threads || (c.blog || 0) >= criteria.blog || (c.instagram || 0) >= criteria.instagram) ? 'selected' : 'notSelected'
                          }))
                        })()

                        setProjectData(prev => ({
                          ...prev,
                          step2: {
                            ...prev.step2,
                            candidates: updatedCandidates
                          }
                        }))

                        showNotification('후보 목록을 새로고침했습니다', 'success')

                        // 2. SNS 링크가 있는데 0인 항목 찾기
                        const needsCheck = updatedCandidates.filter((c: any) => {
                          const hasThreadsUrl = c.threadsUrl && c.threadsUrl.trim() !== ''
                          const hasInstagramUrl = c.instagramUrl && c.instagramUrl.trim() !== ''
                          const hasBlogUrl = c.blogUrl && c.blogUrl.trim() !== ''

                          return (hasThreadsUrl && c.threads === 0) ||
                            (hasInstagramUrl && c.instagram === 0) ||
                            (hasBlogUrl && c.blog === 0)
                        })

                        // 3. 자동 SNS 재체크
                        if (needsCheck.length > 0) {
                          showNotification(`${needsCheck.length}명의 SNS를 자동 체크합니다`, 'info')

                          const measureWithRetry = async (cand: any, channel: 'threads' | 'blog' | 'instagram', retries = 1) => {
                            while (true) {
                              try {
                                return await fetchJSON<any>('/api/sheets/measure', {
                                  method: 'POST',
                                  body: { candidate: cand, channel },
                                  timeoutMs: 30000,
                                })
                              } catch (err: any) {
                                const msg = String(err?.message || '')
                                if (retries > 0 && (err?.code === 'ETIMEDOUT' || msg.toLowerCase().includes('timeout'))) {
                                  await new Promise(r => setTimeout(r, 800))
                                  retries -= 1
                                  continue
                                }
                                throw err
                              }
                            }
                          }

                          for (const candidate of needsCheck) {
                            // Threads 체크
                            if (candidate.threadsUrl && candidate.threads === 0) {
                              try {
                                const data = await measureWithRetry(candidate, 'threads')
                                if (data && typeof data.threads === 'number' && data.threads > 0) {
                                  candidate.threads = data.threads
                                  setProjectData(prev => {
                                    const next = { ...prev }
                                    const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                    if (idx >= 0) {
                                      next.step2.candidates[idx] = { ...next.step2.candidates[idx], threads: candidate.threads }
                                    }
                                    return next
                                  })
                                }
                              } catch (err) {
                                console.error('[자동 체크] Threads 오류:', err)
                              }
                              await new Promise(resolve => setTimeout(resolve, 500))
                            }

                            // Blog 체크
                            if (candidate.blogUrl && candidate.blog === 0) {
                              try {
                                const data = await measureWithRetry(candidate, 'blog')
                                if (data && typeof data.blog === 'number' && data.blog > 0) {
                                  candidate.blog = data.blog
                                  setProjectData(prev => {
                                    const next = { ...prev }
                                    const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                    if (idx >= 0) {
                                      next.step2.candidates[idx] = { ...next.step2.candidates[idx], blog: candidate.blog }
                                    }
                                    return next
                                  })
                                }
                              } catch (err) {
                                console.error('[자동 체크] Blog 오류:', err)
                              }
                              await new Promise(resolve => setTimeout(resolve, 500))
                            }

                            // Instagram 체크
                            if (candidate.instagramUrl && candidate.instagram === 0) {
                              try {
                                const data = await measureWithRetry(candidate, 'instagram')
                                if (data && typeof data.instagram === 'number' && data.instagram > 0) {
                                  candidate.instagram = data.instagram
                                  setProjectData(prev => {
                                    const next = { ...prev }
                                    const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                    if (idx >= 0) {
                                      next.step2.candidates[idx] = { ...next.step2.candidates[idx], instagram: candidate.instagram }
                                    }
                                    return next
                                  })
                                }
                              } catch (err) {
                                console.error('[자동 체크] Instagram 오류:', err)
                              }
                              await new Promise(resolve => setTimeout(resolve, 500))
                            }
                          }

                          showNotification('자동 SNS 체크가 완료되었습니다', 'success')
                        }
                      }
                    } catch (e) {
                      showNotification('후보 목록 새로고침에 실패했습니다', 'error')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  목록 새로고침
                </button>
                <button
                  title={!SHEETS_ENABLED ? '관리자 설정에서 시트 통합을 활성화해야 합니다' : undefined}
                  onClick={async () => {
                    // SNS API 서버 연결 체크
                    try {
                      const healthCheck = await fetch('/api/sns/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: 'test' })
                      }).catch(() => null)

                      if (!healthCheck) {
                        showNotification('SNS API 서버에 연결할 수 없습니다. 개발 서버(yarn dev)가 실행 중인지 확인하세요.', 'error')
                        return
                      }
                    } catch (e) {
                      console.error('SNS API 연결 체크 실패:', e)
                    }

                    // SNS 체크 실패한 항목들 찾기
                    const failedChecks = (projectData.step2.candidates || []).filter((c: any) => {
                      const hasThreadsUrl = c.threadsUrl && c.threadsUrl.trim() !== ''
                      const hasInstagramUrl = c.instagramUrl && c.instagramUrl.trim() !== ''
                      const hasBlogUrl = c.blogUrl && c.blogUrl.trim() !== ''

                      return (hasThreadsUrl && c.threads === 0) ||
                        (hasInstagramUrl && c.instagram === 0) ||
                        (hasBlogUrl && c.blog === 0)
                    })

                    if (failedChecks.length === 0) {
                      showNotification('재체크할 항목이 없습니다', 'info')
                      return
                    }

                    showNotification(`${failedChecks.length}명의 SNS를 재체크합니다`, 'info')
                    setLoading(true)

                    try {
                      // 실패한 항목들만 순차적으로 재체크
                      const measureWithRetry = async (cand: any, channel: 'threads' | 'blog' | 'instagram', retries = 1) => {
                        while (true) {
                          try {
                            return await fetchJSON<any>('/api/sheets/measure', {
                              method: 'POST',
                              body: { candidate: cand, channel },
                              timeoutMs: 30000,
                            })
                          } catch (err: any) {
                            const msg = String(err?.message || '')
                            if (retries > 0 && (err?.code === 'ETIMEDOUT' || msg.toLowerCase().includes('timeout'))) {
                              await new Promise(r => setTimeout(r, 800))
                              retries -= 1
                              continue
                            }
                            throw err
                          }
                        }
                      }
                      for (const candidate of failedChecks) {
                        console.log(`[SNS 재체크] 시작: ${candidate.name || candidate.email}`)

                        // Threads 재체크
                        if (candidate.threadsUrl && candidate.threads === 0) {
                          console.log(`[SNS 재체크] Threads URL: ${candidate.threadsUrl}`)
                          try {
                            const data = await measureWithRetry(candidate, 'threads')
                            console.log(`[SNS 재체크] Threads 결과:`, data)

                            // API 응답 유효성 검증
                            if (data && typeof data.threads === 'number') {
                              candidate.threads = data.threads
                              // 즉시 UI 반영
                              setProjectData(prev => {
                                const next = { ...prev }
                                const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                if (idx >= 0) {
                                  next.step2.candidates[idx] = { ...next.step2.candidates[idx], threads: candidate.threads }
                                }
                                return next
                              })

                              if (data.threads > 0) {
                                console.log(`[SNS 재체크] ✅ Threads 성공: ${data.threads}명`)
                                showNotification(`${candidate.name}: Threads ${data.threads}명 확인`, 'success')
                              } else {
                                console.warn(`[SNS 재체크] ⚠️ Threads 결과: 0명 (스크래핑 실패 가능성)`)
                                showNotification(`${candidate.name}: Threads 0명 (확인 필요)`, 'info')
                              }
                            } else {
                              console.error('[SNS 재체크] Threads 응답 형식 오류:', data)
                              showNotification(`${candidate.name}: Threads API 오류`, 'error')
                            }
                          } catch (err) {
                            console.error('[SNS 재체크] Threads 오류:', err)
                            showNotification(`${candidate.name}: Threads 체크 오류 - ${(err as Error).message}`, 'error')
                          }
                          await new Promise(resolve => setTimeout(resolve, 500))
                        }

                        // Blog 재체크
                        if (candidate.blogUrl && candidate.blog === 0) {
                          console.log(`[SNS 재체크] Blog URL: ${candidate.blogUrl}`)
                          try {
                            const data = await measureWithRetry(candidate, 'blog')
                            console.log(`[SNS 재체크] Blog 결과:`, data)

                            // API 응답 유효성 검증
                            if (data && typeof data.blog === 'number') {
                              candidate.blog = data.blog
                              // 즉시 UI 반영
                              setProjectData(prev => {
                                const next = { ...prev }
                                const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                if (idx >= 0) {
                                  next.step2.candidates[idx] = { ...next.step2.candidates[idx], blog: candidate.blog }
                                }
                                return next
                              })

                              if (data.blog > 0) {
                                console.log(`[SNS 재체크] ✅ Blog 성공: ${data.blog}명`)
                                showNotification(`${candidate.name}: 블로그 ${data.blog}명 확인`, 'success')
                              } else {
                                console.warn(`[SNS 재체크] ⚠️ Blog 결과: 0명 (스크래핑 실패 가능성)`)
                                showNotification(`${candidate.name}: 블로그 0명 (확인 필요)`, 'info')
                              }
                            } else {
                              console.error('[SNS 재체크] Blog 응답 형식 오류:', data)
                              showNotification(`${candidate.name}: 블로그 API 오류`, 'error')
                            }
                          } catch (err) {
                            console.error('[SNS 재체크] Blog 오류:', err)
                            showNotification(`${candidate.name}: 블로그 체크 오류 - ${(err as Error).message}`, 'error')
                          }
                          await new Promise(resolve => setTimeout(resolve, 500))
                        }

                        // Instagram 재체크
                        if (candidate.instagramUrl && candidate.instagram === 0) {
                          console.log(`[SNS 재체크] Instagram URL: ${candidate.instagramUrl}`)
                          try {
                            const data = await measureWithRetry(candidate, 'instagram')
                            console.log(`[SNS 재체크] Instagram 결과:`, data)

                            // API 응답 유효성 검증
                            if (data && typeof data.instagram === 'number') {
                              candidate.instagram = data.instagram
                              // 즉시 UI 반영
                              setProjectData(prev => {
                                const next = { ...prev }
                                const idx = next.step2.candidates.findIndex((c: any) => c.email === candidate.email && c.name === candidate.name)
                                if (idx >= 0) {
                                  next.step2.candidates[idx] = { ...next.step2.candidates[idx], instagram: candidate.instagram }
                                }
                                return next
                              })

                              if (data.instagram > 0) {
                                console.log(`[SNS 재체크] ✅ Instagram 성공: ${data.instagram}명`)
                                showNotification(`${candidate.name}: 인스타그램 ${data.instagram}명 확인`, 'success')
                              } else {
                                console.warn(`[SNS 재체크] ⚠️ Instagram 결과: 0명 (스크래핑 실패 가능성)`)
                                showNotification(`${candidate.name}: 인스타그램 0명 (확인 필요)`, 'info')
                              }
                            } else {
                              console.error('[SNS 재체크] Instagram 응답 형식 오류:', data)
                              showNotification(`${candidate.name}: 인스타그램 API 오류`, 'error')
                            }
                          } catch (err) {
                            console.error('[SNS 재체크] Instagram 오류:', err)
                            showNotification(`${candidate.name}: 인스타그램 체크 오류 - ${(err as Error).message}`, 'error')
                          }
                          await new Promise(resolve => setTimeout(resolve, 500))
                        }

                        // 선정 상태 업데이트
                        const criteria = projectData.step2.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
                        candidate.status = (candidate.threads >= criteria.threads ||
                          candidate.blog >= criteria.blog ||
                          candidate.instagram >= criteria.instagram) ? 'selected' : 'notSelected'
                      }

                      // 수정된 candidates 배열로 새 상태 생성
                      // failedChecks 배열의 수정사항을 반영
                      const updatedCandidates = projectData.step2.candidates.map((c) => {
                        // 재체크한 항목 찾기
                        const wasChecked = failedChecks.some(fc =>
                          fc.email === c.email && fc.name === c.name
                        )

                        if (wasChecked) {
                          // 재체크된 항목은 failedChecks에서 수정된 값 사용
                          const updated = failedChecks.find(fc =>
                            fc.email === c.email && fc.name === c.name
                          )
                          return { ...c, ...updated }
                        }

                        return { ...c }
                      })

                      // 상태 업데이트
                      const updatedStep2 = {
                        ...projectData.step2,
                        candidates: updatedCandidates
                      }

                      setProjectData(prev => ({
                        ...prev,
                        step2: updatedStep2
                      }))

                      // DB에 업데이트 저장 (프로젝트 전체 데이터 형태 유지)
                      if (projectId && campaignId) {
                        try {
                          // step2만 보내면 projects.data가 step2 구조로 덮여써져
                          // 다음 방문 시 candidates가 초기화되는 문제가 있어 전체 구조로 저장
                          const fullProjectData = { ...projectData, step2: updatedStep2 }

                          await fetchJSON('/api/projects', {
                            method: 'POST',
                            body: {
                              campaign_id: campaignId,
                              type: 'customer_acquisition',
                              step: 2,
                              data: fullProjectData,
                            },
                          })
                          console.log('[SNS 재체크] DB 저장 성공 (전체 데이터)')
                        } catch (e) {
                          console.error('[SNS 재체크] DB 저장 실패:', e)
                          showNotification('재체크 결과를 저장하는 데 실패했습니다', 'error')
                        }
                      } else {
                        console.warn('[SNS 재체크] projectId 또는 campaignId가 없어서 DB 저장을 건너뜁니다')
                      }

                      showNotification('SNS 재체크가 완료되었습니다', 'success')
                    } catch (error) {
                      showNotification('재체크 중 오류가 발생했습니다', 'error')
                      console.error('SNS recheck error:', error)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="px-3 py-1 text-sm border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"
                  disabled={loading || !SHEETS_ENABLED}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  SNS 재체크
                </button>
                <button
                  onClick={() => {
                    const list: any[] = projectData.step2.candidates || []
                    if (!list.length) {
                      showNotification('다운로드할 데이터가 없습니다', 'error')
                      return
                    }
                    // 1) 모든 응답에서 나타나는 동적 필드 수집(폼의 커스텀 필드 포함)
                    const allFieldKeys = new Set<string>()
                    for (const c of list) {
                      const data = (c && (c.data || c.formData || {})) as Record<string, any>
                      Object.keys(data || {}).forEach((k) => allFieldKeys.add(k))
                    }
                    // 2) 우선순위 필드 정의(상단 고정). 실제로 존재하거나 값이 있는 경우에만 포함
                    const priority: string[] = ['name', 'email', 'phone', 'threadsUrl', 'instagramUrl', 'blogUrl', 'source']
                    const existsOnAny = (key: string) => {
                      if (key === 'name' || key === 'email' || key === 'phone') return true
                      return list.some((c: any) => {
                        const data = (c && (c.data || c.formData || {})) as Record<string, any>
                        const vTop = c?.[key]
                        const vData = data?.[key]
                        const v = vTop ?? vData
                        return !(v === undefined || v === null || String(v).trim() === '')
                      })
                    }
                    const priorityExisting = priority.filter(existsOnAny)
                    const others = Array.from(allFieldKeys).filter((k) => !priority.includes(k))
                    const ordered = [...priorityExisting, ...others]
                    // 3) 헤더명 매핑(가독성)
                    const headerMap: Record<string, string> = {
                      name: '이름',
                      email: '이메일',
                      phone: '연락처',
                      threadsUrl: '스레드URL',
                      instagramUrl: '인스타URL',
                      blogUrl: '블로그URL',
                      source: '신청경로',
                    }
                    // 4) 엑셀용 행 구성(동적 필드 + SNS 수치 + 상태)
                    const rows = list.map((c: any) => {
                      const row: Record<string, any> = {}
                      const data = (c && (c.data || c.formData || {})) as Record<string, any>
                      for (const key of ordered) {
                        const header = headerMap[key] || key
                        let value = (key === 'name' ? c.name : key === 'email' ? c.email : key === 'phone' ? c.phone : undefined)
                        if (value === undefined) value = data?.[key]
                        if (value === undefined || value === null) value = ''
                        else if (typeof value === 'boolean') value = value ? '예' : '아니오'
                        else if (Array.isArray(value)) value = value.join(', ')
                        else if (typeof value === 'object') value = JSON.stringify(value)
                        row[header] = value
                      }
                      // SNS 수치(있으면 표시)
                      const hasThreadsUrl = (data?.threadsUrl || c.threadsUrl || '').toString().trim() !== ''
                      const hasInstagramUrl = (data?.instagramUrl || c.instagramUrl || '').toString().trim() !== ''
                      const hasBlogUrl = (data?.blogUrl || c.blogUrl || '').toString().trim() !== ''
                      row['Threads팔로워'] = !hasThreadsUrl ? '-' : (c.threads ?? (data?.threads || '')) || (c.threads === 0 ? '체크실패' : '')
                      row['인스타팔로워'] = !hasInstagramUrl ? '-' : (c.instagram ?? (data?.instagram || '')) || (c.instagram === 0 ? '체크실패' : '')
                      row['블로그이웃'] = !hasBlogUrl ? '-' : (c.blog ?? (data?.blog || '')) || (c.blog === 0 ? '체크실패' : '')
                      row['선정상태'] = c.status === 'selected' ? '선정' : (c.status === 'notSelected' ? '미달' : '미정')
                      return row
                    })
                    const ws = XLSX.utils.json_to_sheet(rows)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, '지원자')
                    const fileName = `지원자_${new Date().toISOString().split('T')[0]}.xlsx`
                    XLSX.writeFile(wb, fileName)
                  }}
                  className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                >
                  엑셀 다운로드
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text/10">
                    <th className="text-left py-2 whitespace-nowrap">양식 제출일</th>
                    <th className="text-left py-2">이름</th>
                    <th className="text-left py-2">이메일</th>
                    <th className="text-center py-2">Threads</th>
                    <th className="text-center py-2">블로그</th>
                    <th className="text-center py-2">인스타</th>
                    <th className="text-center py-2">상태</th>
                    <th className="text-center py-2">제품 발송여부</th>
                    <th className="text-center py-2 w-48">후기 링크</th>
                    <th className="text-center py-2">이메일</th>
                  </tr>
                </thead>
                <tbody>
                  {projectData.step2.candidates.map((candidate, idx) => (
                    <tr key={idx} className="border-b border-text/5 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                        {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/\.$/, '') : '-'}
                      </td>
                      <td className="py-2 font-medium">{candidate.name}</td>
                      <td className="py-2 text-gray-600">{candidate.email}</td>
                      <td className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          {candidate.threadsUrl && (
                            <a
                              href={candidate.threadsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                              title="Threads 바로가기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          )}
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
                            <span className={candidate.threads >= (projectData.step2.selectionCriteria?.threads || 500) ? "text-green-600 font-semibold" : ""}>
                              {candidate.threads?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          {candidate.blogUrl && (
                            <a
                              href={candidate.blogUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-green-500 transition-colors"
                              title="블로그 바로가기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          )}
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
                            <span className={candidate.blog >= (projectData.step2.selectionCriteria?.blog || 300) ? "text-green-600 font-semibold" : ""}>
                              {candidate.blog?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          {candidate.instagramUrl && (
                            <a
                              href={candidate.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-pink-500 transition-colors"
                              title="인스타그램 바로가기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          )}
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
                            <span className={candidate.instagram >= (projectData.step2.selectionCriteria?.instagram || 1000) ? "text-green-600 font-semibold" : ""}>
                              {candidate.instagram?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className={`px-2 py-1 rounded text-xs border ${candidate.status === 'selected' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300'}`}
                            title="선정으로 표시"
                            onClick={() => {
                              setProjectData(prev => ({
                                ...prev,
                                step2: {
                                  ...prev.step2,
                                  candidates: prev.step2.candidates.map((c) => (
                                    c.email === candidate.email && c.name === candidate.name
                                      ? { ...c, status: 'selected', statusManual: true }
                                      : c
                                  )),
                                },
                              }))
                            }}
                          >선정</button>
                          <button
                            className={`px-2 py-1 rounded text-xs border ${candidate.status === 'notSelected' ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-300'}`}
                            title="비선정으로 표시"
                            onClick={() => {
                              setProjectData(prev => ({
                                ...prev,
                                step2: {
                                  ...prev.step2,
                                  candidates: prev.step2.candidates.map((c) => (
                                    c.email === candidate.email && c.name === candidate.name
                                      ? { ...c, status: 'notSelected', statusManual: true }
                                      : c
                                  )),
                                },
                              }))
                            }}
                          >비선정</button>
                          {candidate.statusManual ? (
                            <button
                              className="px-2 py-1 rounded text-xs border bg-white text-blue-600 border-blue-300"
                              title="자동판정으로 되돌리기"
                              onClick={() => {
                                setProjectData(prev => {
                                  const criteria = prev.step2.selectionCriteria || { threads: 500, blog: 300, instagram: 1000 }
                                  const recomputed = ((candidate.threads || 0) >= criteria.threads || (candidate.blog || 0) >= criteria.blog || (candidate.instagram || 0) >= criteria.instagram) ? 'selected' : 'notSelected'
                                  return {
                                    ...prev,
                                    step2: {
                                      ...prev.step2,
                                      candidates: prev.step2.candidates.map((c) => (
                                        c.email === candidate.email && c.name === candidate.name
                                          ? { ...c, status: recomputed, statusManual: false }
                                          : c
                                      )),
                                    }
                                  }
                                })
                              }}
                            >자동</button>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-center py-2 h-full">
                        <div className="flex items-center justify-center h-full">
                          <button
                            onClick={() => updateCandidateField(candidate.email, candidate.name, 'isProductSent', !candidate.isProductSent)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${candidate.isProductSent ? 'bg-blue-600' : 'bg-gray-200'
                              }`}
                          >
                            <span
                              className={`${candidate.isProductSent ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="text-center py-2">
                        <div className="relative flex items-center gap-2 px-2">
                          <input
                            type="text"
                            defaultValue={candidate.reviewUrl || ''}
                            onBlur={(e) => updateCandidateField(candidate.email, candidate.name, 'reviewUrl', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            placeholder="URL 입력"
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                          />
                          {candidate.reviewUrl && (
                            <a
                              href={candidate.reviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                              title="후기 링크 바로가기"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2">
                        {candidate.emailSent || candidate.emailSentAt ? (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                            완료
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
                            미발송
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 다음 단계 버튼 */}
        {(projectData.step2.candidates?.length || 0) > 0 && (
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
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${projectData.step3.targetType === "selected"
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/50"
                }`}
            >
              선정 대상
            </button>
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, targetType: "notSelected" } })}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${projectData.step3.targetType === "notSelected"
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/50"
                }`}
            >
              비선정 대상
            </button>
          </div>
        </div>

        {/* 기간 필터 (모집일 기준) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">기간 필터 (모집일 기준)</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={projectData.step3.dateFrom || ''}
              onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, dateFrom: e.target.value || null } })}
              className="px-3 py-2 rounded-lg border border-border"
            />
            <span className="text-muted-foreground">~</span>
            <input
              type="date"
              value={projectData.step3.dateTo || ''}
              onChange={(e) => setProjectData({ ...projectData, step3: { ...projectData.step3, dateTo: e.target.value || null } })}
              className="px-3 py-2 rounded-lg border border-border"
            />
            <button
              onClick={() => setProjectData({ ...projectData, step3: { ...projectData.step3, dateFrom: null, dateTo: null } })}
              className="px-3 py-2 rounded border text-sm"
            >필터 해제</button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">설정된 기간 동안 신청한 인원 중 선택된 대상에게만 발송됩니다.</p>
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
          <label className="block text-sm font-medium text-foreground mb-2">이메일 제목 ({projectData.step3.targetType === 'selected' ? '선정' : '비선정'})</label>
          <input
            type="text"
            ref={subjectRef}
            value={projectData.step3.targetType === 'selected' ? (projectData.step3.subjectSelected || '') : (projectData.step3.subjectNotSelected || '')}
            onChange={(e) => setProjectData({
              ...projectData,
              step3: {
                ...projectData.step3,
                emailSubject: e.target.value,
                subjectSelected: projectData.step3.targetType === 'selected' ? e.target.value : projectData.step3.subjectSelected,
                subjectNotSelected: projectData.step3.targetType === 'notSelected' ? e.target.value : projectData.step3.subjectNotSelected,
              }
            })}
            placeholder="예: {이름}님, 특별한 제안이 있습니다"
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">변수 삽입:</span>
            {['이름', '이메일', '전화번호', '상태', 'threads', 'instagram', 'blog'].map(tok => (
              <button
                key={`subj-${tok}`}
                type="button"
                onClick={() => insertVarIntoSubject(tok)}
                className="px-2 py-1 rounded border text-xs bg-white hover:bg-muted"
                title={`{${tok}} 삽입`}
              >{`{${tok}}`}</button>
            ))}
          </div>
        </div>

        {/* 이메일 본문 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">이메일 본문 ({projectData.step3.targetType === 'selected' ? '선정' : '비선정'})</label>
            <button
              onClick={() => setShowEmailComposer(true)}
              className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded font-semibold">
              GPT-5로 자동작성
            </button>
          </div>
          <textarea
            ref={bodyRef}
            value={projectData.step3.targetType === 'selected' ? (projectData.step3.bodySelected || '') : (projectData.step3.bodyNotSelected || '')}
            onChange={(e) => setProjectData({
              ...projectData,
              step3: {
                ...projectData.step3,
                emailBody: e.target.value,
                bodySelected: projectData.step3.targetType === 'selected' ? e.target.value : projectData.step3.bodySelected,
                bodyNotSelected: projectData.step3.targetType === 'notSelected' ? e.target.value : projectData.step3.bodyNotSelected,
              }
            })}
            placeholder="안녕하세요 {이름}님,\n\n..."
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">변수 삽입:</span>
            {['이름', '이메일', '전화번호', '상태', 'threads', 'instagram', 'blog', 'source', 'threadsUrl', 'instagramUrl', 'blogUrl'].map(tok => (
              <button
                key={`body-${tok}`}
                type="button"
                onClick={() => insertVarIntoBody(tok)}
                className="px-2 py-1 rounded border text-xs bg-white hover:bg-muted"
                title={`{${tok}} 삽입`}
              >{`{${tok}}`}</button>
            ))}
          </div>
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
                  className={`flex-1 py-2 px-3 rounded border ${emailComposerType === 'selected'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-300'
                    }`}
                >
                  선정 안내
                </button>
                <button
                  onClick={() => setEmailComposerType('notSelected')}
                  className={`flex-1 py-2 px-3 rounded border ${emailComposerType === 'notSelected'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-300'
                    }`}
                >
                  미선정 안내
                </button>
                <button
                  onClick={() => setEmailComposerType('custom')}
                  className={`flex-1 py-2 px-3 rounded border ${emailComposerType === 'custom'
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

            {/* API 키 입력 필드 제거 - 환경 변수에서 자동으로 사용 */}

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

                    const data = await fetchJSON('/api/ai/compose-email', {
                      method: 'POST',
                      body: {
                        candidateInfo: sampleCandidate,
                        emailType: emailComposerType,
                        customInstructions: emailComposerInstructions,
                        productInfo: emailComposerProductInfo,
                      },
                    })

                    setProjectData(prev => ({
                      ...prev,
                      step3: {
                        ...prev.step3,
                        emailSubject: data.subject,
                        emailBody: data.body,
                        subjectSelected: emailComposerType === 'selected' ? data.subject : prev.step3.subjectSelected,
                        bodySelected: emailComposerType === 'selected' ? data.body : prev.step3.bodySelected,
                        subjectNotSelected: emailComposerType === 'notSelected' ? data.subject : prev.step3.subjectNotSelected,
                        bodyNotSelected: emailComposerType === 'notSelected' ? data.body : prev.step3.bodyNotSelected,
                      },
                    }));

                    showNotification('이메일이 자동 작성되었습니다', 'success');
                    setShowEmailComposer(false);
                    setEmailComposerInstructions('');
                    setEmailComposerProductInfo('');
                  } catch (err) {
                    showErrorFrom(err, '이메일 자동 작성에 실패했습니다')
                  } finally {
                    setComposingEmail(false);
                  }
                }}
                disabled={composingEmail || (emailComposerType === 'custom' && !emailComposerInstructions)}
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
          <div className={`px-6 py-3 rounded-lg shadow-lg font-semibold ${showToast.type === 'success' ? 'bg-green-500 text-white' :
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
            <div className="bg-primary/10 rounded-lg px-4 py-2 inline-block mb-4">
              <h2 className="text-xl font-semibold text-primary">📁 {campaignName}</h2>
            </div>
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
              className={`bg-card border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${expandedStep === step
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
              <button className={`w-full py-2 rounded-lg font-semibold transition ${expandedStep === step
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
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 rounded border">취소</button>
              <button
                onClick={async () => {
                  try {
                    await fetchJSON(`/api/projects/${projectId}`, { method: 'DELETE' })
                    setShowDeleteConfirm(false)
                    showNotification('프로젝트가 삭제되었습니다', 'success')
                    // 완전 삭제: 상태 초기화 후 대시보드로 이동
                    setProjectId(null)
                    setProjectData({
                      step1: { keyword: '', productDescription: '', contentType: 'blog', contentPurpose: 'informative', instructions: '', generatedContent: '', generatedImages: [] },
                      step2: { formId: null, formUrl: null, sheetUrl: '', isRunning: false, candidates: [], usingFormData: false, selectionCriteria: { threads: 500, blog: 300, instagram: 1000 } },
                      step3: { targetType: 'selected', emailSubject: '', emailBody: '', subjectSelected: '', bodySelected: '', subjectNotSelected: '', bodyNotSelected: '', senderEmail: '', emailsSent: 0, dateFrom: null, dateTo: null }
                    })
                    window.location.href = '/automation/customer-acquisition/dashboard'
                  } catch (e: any) {
                    showErrorFrom(e, '삭제 중 오류가 발생했습니다')
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
