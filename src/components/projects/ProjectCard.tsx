"use client"

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    campaign_name: string
    created_at: string
    updated_at: string
    data: {
      step1?: {
        generatedContent?: string
        generatedImages?: string[]
      }
      step2?: {
        candidates?: any[]
        isRunning?: boolean
      }
      step3?: {
        emailsSent?: number
        emailSubject?: string
      }
    }
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // 각 스텝별 진행 상태 계산
  const getStepStatus = (step: number) => {
    const data = project.data || {}
    
    switch (step) {
      case 1:
        if (data.step1?.generatedContent) return 'completed'
        return 'pending'
      case 2:
        if (data.step2?.candidates && data.step2.candidates.length > 0) {
          return data.step2.isRunning ? 'in_progress' : 'completed'
        }
        return 'pending'
      case 3:
        if (data.step3?.emailsSent && data.step3.emailsSent > 0) return 'completed'
        if (data.step3?.emailSubject) return 'in_progress'
        return 'pending'
      default:
        return 'pending'
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'in_progress':
        return '진행중'
      case 'pending':
        return '대기'
      default:
        return '대기'
    }
  }
  
  const getProgressPercentage = () => {
    let completed = 0
    for (let i = 1; i <= 3; i++) {
      const status = getStepStatus(i)
      if (status === 'completed') completed += 1
      else if (status === 'in_progress') completed += 0.5
    }
    return Math.round((completed / 3) * 100)
  }
  
  const progress = getProgressPercentage()
  const lastUpdated = new Date(project.updated_at).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
    >
      <Link href={`/automation/customer-acquisition?projectId=${project.id}`}>
        <div className="space-y-4">
          {/* 프로젝트 헤더 */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {project.campaign_name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                마지막 업데이트: {lastUpdated}
              </p>
            </div>
            {progress === 100 ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : progress > 0 ? (
              <div className="flex items-center gap-1">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">{progress}%</span>
              </div>
            ) : (
              <AlertCircle className="w-6 h-6 text-gray-400" />
            )}
          </div>
          
          {/* 진행 상태 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className={`h-2 rounded-full ${
                progress === 100
                  ? 'bg-green-500'
                  : progress > 0
                  ? 'bg-yellow-500'
                  : 'bg-gray-300'
              }`}
            />
          </div>
          
          {/* 스텝별 상태 */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((step) => {
              const status = getStepStatus(step)
              const stepNames = ['글쓰기', 'DB 관리', '이메일']
              
              return (
                <div
                  key={step}
                  className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-background"
                >
                  {getStatusIcon(status)}
                  <span className="text-xs font-medium">
                    Step {step}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stepNames[step - 1]}
                  </span>
                  <span className={`text-xs font-medium ${
                    status === 'completed' ? 'text-green-600' :
                    status === 'in_progress' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
              )
            })}
          </div>
          
          {/* 상세 정보 */}
          <div className="pt-2 border-t space-y-1">
            {project.data?.step1?.generatedContent && (
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                콘텐츠 생성 완료
              </div>
            )}
            {project.data?.step2?.candidates && project.data.step2.candidates.length > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                {project.data.step2.candidates.length}명의 대상자 선정
              </div>
            )}
            {project.data?.step3?.emailsSent && project.data.step3.emailsSent > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                {project.data.step3.emailsSent}명에게 이메일 발송
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}