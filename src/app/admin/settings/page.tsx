'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Save, RefreshCw, Globe, Mail, Shield, Database, Bell, Brain } from 'lucide-react'

interface SystemSettings {
  // 일반 설정
  site_name?: string
  site_url?: string
  maintenance_mode?: boolean
  maintenance_message?: string
  
  // AI 설정
  openai_model?: string
  max_free_trials?: number
  
  // 이메일 설정
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_from?: string
  email_notifications?: boolean
  
  // 보안 설정
  session_timeout?: number
  max_login_attempts?: number
  password_min_length?: number
  require_2fa?: boolean
  
  // 알림 설정
  slack_webhook?: string
  discord_webhook?: string
  notification_email?: string
  
  // API 설정
  api_rate_limit?: number
  api_timeout?: number
  max_file_size?: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      
      // JSON 문자열로 저장된 값들을 파싱
      const parsedSettings: SystemSettings = {}
      for (const key in data) {
        try {
          parsedSettings[key as keyof SystemSettings] = JSON.parse(data[key])
        } catch {
          parsedSettings[key as keyof SystemSettings] = data[key]
        }
      }
      
      setSettings(parsedSettings)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: '오류',
        description: '설정을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const saveSetting = async (key: string, value: any) => {
    // 베타 테스트 중에는 설정 변경 비활성화
    toast({
      title: '알림',
      description: '베타 테스트 중에는 설정을 변경할 수 없습니다.',
      variant: 'destructive'
    })
    return;
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value })
      })

      if (!response.ok) {
        throw new Error('Failed to save setting')
      }

      setSettings(prev => ({ ...prev, [key]: value }))
      
      toast({
        title: '저장 완료',
        description: '설정이 성공적으로 저장되었습니다.',
      })
    } catch (error) {
      console.error('Error saving setting:', error)
      toast({
        title: '오류',
        description: '설정 저장 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">시스템 설정</h1>
          <p className="text-gray-500 mt-1">시스템 전반의 설정을 관리합니다</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSettings()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Globe className="w-4 h-4 mr-2" />
            일반
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="w-4 h-4 mr-2" />
            AI 설정
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            이메일
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            보안
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            알림
          </TabsTrigger>
          <TabsTrigger value="api">
            <Database className="w-4 h-4 mr-2" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>일반 설정</CardTitle>
              <CardDescription>사이트 기본 정보 및 유지보수 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">사이트 이름</Label>
                <div className="flex gap-2">
                  <Input
                    id="site_name"
                    value={settings.site_name || ''}
                    onChange={(e) => handleInputChange('site_name', e.target.value)}
                    placeholder="AIMAX v2"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('site_name', settings.site_name)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_url">사이트 URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="site_url"
                    value={settings.site_url || ''}
                    onChange={(e) => handleInputChange('site_url', e.target.value)}
                    placeholder="https://aimax.kr"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('site_url', settings.site_url)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance_mode">유지보수 모드</Label>
                  <p className="text-sm text-gray-500">사이트를 유지보수 모드로 전환합니다</p>
                </div>
                <Switch
                  id="maintenance_mode"
                  checked={settings.maintenance_mode || false}
                  onCheckedChange={(checked) => {
                    handleInputChange('maintenance_mode', checked)
                    saveSetting('maintenance_mode', checked)
                  }}
                />
              </div>

              {settings.maintenance_mode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenance_message">유지보수 메시지</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="maintenance_message"
                      value={settings.maintenance_message || ''}
                      onChange={(e) => handleInputChange('maintenance_message', e.target.value)}
                      placeholder="시스템 점검 중입니다. 잠시 후 다시 이용해 주세요."
                      rows={3}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => saveSetting('maintenance_message', settings.maintenance_message)}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI 설정</CardTitle>
              <CardDescription>OpenAI API 및 콘텐츠 생성 관련 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_model">OpenAI 모델</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.openai_model || 'gpt-5-mini'}
                    onValueChange={(value) => handleInputChange('openai_model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="모델을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5">GPT-5 (최고 성능)</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5-mini (빠르고 효율적)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('openai_model', settings.openai_model || 'gpt-5-mini')}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  GPT-5는 최고 품질의 콘텐츠를 생성하고, GPT-5-mini는 빠르고 효율적입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_free_trials">무료 체험 횟수</Label>
                <div className="flex gap-2">
                  <Input
                    id="max_free_trials"
                    type="number"
                    value={settings.max_free_trials || 3}
                    onChange={(e) => handleInputChange('max_free_trials', parseInt(e.target.value))}
                    placeholder="3"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('max_free_trials', settings.max_free_trials || 3)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  0으로 설정하면 무료 체험을 비활성화합니다. -1로 설정하면 무제한입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label>API 키 상태</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">
                    OpenAI API 키는 환경 변수에서 관리됩니다.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vercel 대시보드 또는 .env.local 파일에서 OPENAI_API_KEY를 설정하세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>이메일 설정</CardTitle>
              <CardDescription>이메일 발송 관련 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">SMTP 호스트</Label>
                <div className="flex gap-2">
                  <Input
                    id="smtp_host"
                    value={settings.smtp_host || ''}
                    onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('smtp_host', settings.smtp_host)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP 포트</Label>
                <div className="flex gap-2">
                  <Input
                    id="smtp_port"
                    type="number"
                    value={settings.smtp_port || ''}
                    onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value))}
                    placeholder="587"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('smtp_port', settings.smtp_port)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_from">발신자 이메일</Label>
                <div className="flex gap-2">
                  <Input
                    id="smtp_from"
                    type="email"
                    value={settings.smtp_from || ''}
                    onChange={(e) => handleInputChange('smtp_from', e.target.value)}
                    placeholder="noreply@aimax.kr"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('smtp_from', settings.smtp_from)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">이메일 알림</Label>
                  <p className="text-sm text-gray-500">시스템 알림을 이메일로 발송합니다</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications || false}
                  onCheckedChange={(checked) => {
                    handleInputChange('email_notifications', checked)
                    saveSetting('email_notifications', checked)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
              <CardDescription>시스템 보안 관련 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session_timeout">세션 타임아웃 (분)</Label>
                <div className="flex gap-2">
                  <Input
                    id="session_timeout"
                    type="number"
                    value={settings.session_timeout || ''}
                    onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                    placeholder="30"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('session_timeout', settings.session_timeout)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_login_attempts">최대 로그인 시도 횟수</Label>
                <div className="flex gap-2">
                  <Input
                    id="max_login_attempts"
                    type="number"
                    value={settings.max_login_attempts || ''}
                    onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value))}
                    placeholder="5"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('max_login_attempts', settings.max_login_attempts)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_min_length">최소 비밀번호 길이</Label>
                <div className="flex gap-2">
                  <Input
                    id="password_min_length"
                    type="number"
                    value={settings.password_min_length || ''}
                    onChange={(e) => handleInputChange('password_min_length', parseInt(e.target.value))}
                    placeholder="8"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('password_min_length', settings.password_min_length)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require_2fa">2단계 인증 필수</Label>
                  <p className="text-sm text-gray-500">모든 관리자에게 2단계 인증을 요구합니다</p>
                </div>
                <Switch
                  id="require_2fa"
                  checked={settings.require_2fa || false}
                  onCheckedChange={(checked) => {
                    handleInputChange('require_2fa', checked)
                    saveSetting('require_2fa', checked)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>외부 알림 서비스 연동 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="slack_webhook"
                    value={settings.slack_webhook || ''}
                    onChange={(e) => handleInputChange('slack_webhook', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('slack_webhook', settings.slack_webhook)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discord_webhook">Discord Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="discord_webhook"
                    value={settings.discord_webhook || ''}
                    onChange={(e) => handleInputChange('discord_webhook', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('discord_webhook', settings.discord_webhook)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_email">알림 수신 이메일</Label>
                <div className="flex gap-2">
                  <Input
                    id="notification_email"
                    type="email"
                    value={settings.notification_email || ''}
                    onChange={(e) => handleInputChange('notification_email', e.target.value)}
                    placeholder="admin@aimax.kr"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('notification_email', settings.notification_email)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API 설정</CardTitle>
              <CardDescription>API 제한 및 성능 관련 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_rate_limit">API Rate Limit (요청/분)</Label>
                <div className="flex gap-2">
                  <Input
                    id="api_rate_limit"
                    type="number"
                    value={settings.api_rate_limit || ''}
                    onChange={(e) => handleInputChange('api_rate_limit', parseInt(e.target.value))}
                    placeholder="60"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('api_rate_limit', settings.api_rate_limit)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_timeout">API 타임아웃 (초)</Label>
                <div className="flex gap-2">
                  <Input
                    id="api_timeout"
                    type="number"
                    value={settings.api_timeout || ''}
                    onChange={(e) => handleInputChange('api_timeout', parseInt(e.target.value))}
                    placeholder="30"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('api_timeout', settings.api_timeout)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_file_size">최대 파일 크기 (MB)</Label>
                <div className="flex gap-2">
                  <Input
                    id="max_file_size"
                    type="number"
                    value={settings.max_file_size || ''}
                    onChange={(e) => handleInputChange('max_file_size', parseInt(e.target.value))}
                    placeholder="10"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => saveSetting('max_file_size', settings.max_file_size)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}