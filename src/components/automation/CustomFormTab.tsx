'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Copy, ExternalLink, Loader2, AlertCircle,
  FileSpreadsheet, Link
} from 'lucide-react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

interface CustomFormTabProps {
  projectId: string | null
  projectData: any
  onUpdate: (data: any) => void
}

export default function CustomFormTab({ projectId, projectData, onUpdate }: CustomFormTabProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [sheetsConnected, setSheetsConnected] = useState(false)
  
  // 폼 정보 로드
  useEffect(() => {
    if (projectId) {
      loadForm()
      checkSheetsConnection()
    }
  }, [projectId])
  
  // 자동 새로고침 제거 (응답 현황 섹션이 제거되어 불필요)
  
  const loadForm = async () => {
    if (!projectId) {
      console.log('No projectId provided')
      return
    }
    
    try {
      console.log('Loading form for projectId:', projectId)
      const res = await fetch(`/api/forms?projectId=${projectId}`)
      if (res.ok) {
        const forms = await res.json()
        console.log('Forms loaded:', forms)
        if (forms.length > 0) {
          setForm(forms[0])
          setGoogleSheetUrl(forms[0].google_sheet_url || '')
          generateQRCode(forms[0].slug)
        }
      }
    } catch (error) {
      console.error('Failed to load form:', error)
    }
  }
  
  // QR 코드 생성
  const generateQRCode = async (slug: string) => {
    try {
      const url = `${window.location.origin}/form/${slug}`
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2
      })
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('QR generation failed:', error)
    }
  }
  
  // Google Sheets 연결 상태 확인
  const checkSheetsConnection = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: connection } = await supabase
        .from('sheets_connections')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setSheetsConnected(!!connection)
    } catch (error) {
      console.error('Failed to check sheets connection:', error)
    }
  }
  
  // Google Sheets OAuth 연결
  const connectGoogleSheets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sheets')
      if (!res.ok) throw new Error('OAuth URL 생성 실패')
      
      const { url } = await res.json()
      window.location.href = url
    } catch (error) {
      alert('Google Sheets 연결에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  
  // 폼 생성 또는 업데이트
  const handleCreateForm = async () => {
    if (!projectId) {
      alert('프로젝트를 먼저 저장해주세요')
      return
    }
    
    setLoading(true)
    try {
      console.log('Creating form with projectId:', projectId)
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: projectData.businessName || '고객 정보 수집',
          googleSheetUrl
        })
      })
      
      if (!res.ok) throw new Error('폼 생성 실패')
      
      const data = await res.json()
      setForm(data.form)
      generateQRCode(data.form.slug)
      
      // 프로젝트 데이터 업데이트
      onUpdate({
        ...projectData,
        formId: data.form.id,
        formUrl: data.formUrl
      })
      
      alert('폼이 생성되었습니다!')
    } catch (error) {
      alert('폼 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // Google Sheets URL 업데이트
  const handleUpdateSheetUrl = async () => {
    if (!form) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          google_sheet_url: googleSheetUrl,
          google_sheet_id: googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1]
        })
      })
      
      if (!res.ok) throw new Error('업데이트 실패')
      
      alert('Google Sheets 연결이 업데이트되었습니다')
    } catch (error) {
      alert('업데이트에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // 링크 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('링크가 복사되었습니다')
  }
  
  return (
    <div className="space-y-6">
      {/* 폼 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>자체 폼 시스템</CardTitle>
          <CardDescription>
            고객 정보를 수집할 폼을 생성하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!form ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  폼을 생성하면 고객이 직접 신청할 수 있는 링크가 생성됩니다.
                  Google Sheets를 연결하면 자동으로 데이터가 저장됩니다.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Google Sheets 연결</Label>
                {!sheetsConnected ? (
                  <div className="space-y-2">
                    <Button 
                      onClick={connectGoogleSheets} 
                      disabled={loading}
                      className="w-full"
                      variant="outline"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          연결 중...
                        </>
                      ) : (
                        <>
                          <Link className="mr-2 h-4 w-4" />
                          Google Sheets 연결하기
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-gray-500">
                      * Google 계정으로 인증하여 자동으로 데이터를 동기화합니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge className="mb-2 bg-green-100 text-green-800">
                      <FileSpreadsheet className="mr-1 h-3 w-3" />
                      Google Sheets 연결됨
                    </Badge>
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      * 데이터를 저장할 Google Sheets URL을 입력하세요
                    </p>
                  </div>
                )}
              </div>
              
              <Button onClick={handleCreateForm} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '폼 생성하기'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 폼 URL */}
              <div className="space-y-2">
                <Label>폼 URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/form/${form.slug}`}
                    readOnly
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/form/${form.slug}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`/form/${form.slug}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* QR 코드 */}
              {qrCodeUrl && (
                <div className="space-y-2">
                  <Label>QR 코드</Label>
                  <div className="p-4 bg-white rounded-lg border inline-block">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}
              
              {/* 프로젝트 연결 (임시 수정 버튼) */}
              {form && !form.project_id && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    이 폼이 프로젝트와 연결되지 않았습니다.
                    <Button 
                      size="sm" 
                      className="ml-2"
                      onClick={async () => {
                        const res = await fetch('/api/forms', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: form.id,
                            project_id: projectId
                          })
                        })
                        if (res.ok) {
                          alert('프로젝트와 연결되었습니다')
                          loadForm()
                        }
                      }}
                    >
                      프로젝트 연결
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Google Sheets 연결 */}
              <div className="space-y-2">
                <Label>Google Sheets 연결</Label>
                {!sheetsConnected ? (
                  <div className="space-y-2">
                    <Button 
                      onClick={connectGoogleSheets} 
                      disabled={loading}
                      className="w-full"
                      variant="outline"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          연결 중...
                        </>
                      ) : (
                        <>
                          <Link className="mr-2 h-4 w-4" />
                          Google Sheets 연결하기
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-gray-500">
                      * Google 계정으로 인증하여 자동으로 데이터를 동기화합니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge className="mb-2 bg-green-100 text-green-800">
                      <FileSpreadsheet className="mr-1 h-3 w-3" />
                      Google Sheets 연결됨
                    </Badge>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      />
                      <Button onClick={handleUpdateSheetUrl} disabled={loading}>
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          '업데이트'
                        )}
                      </Button>
                    </div>
                    {form.google_sheet_url && (
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => window.open(form.google_sheet_url, '_blank')}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Google Sheets 열기
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  )
}