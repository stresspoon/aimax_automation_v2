'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Bell, 
  Shield, 
  Database,
  Mail,
  Globe,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Zap
} from 'lucide-react'
import { toast } from "sonner"

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [apiRateLimit, setApiRateLimit] = useState('1000')
  const [sessionTimeout, setSessionTimeout] = useState('30')

  const handleSave = () => {
    toast.success("설정이 저장되었습니다")
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-500 mt-2">플랫폼 전체 설정을 관리합니다</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="general">일반</TabsTrigger>
          <TabsTrigger value="notifications">알림</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
          <TabsTrigger value="database">데이터베이스</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="maintenance">유지보수</TabsTrigger>
        </TabsList>

        {/* 일반 설정 */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                일반 설정
              </CardTitle>
              <CardDescription>
                기본 시스템 설정을 구성합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="site-name">사이트 이름</Label>
                  <Input id="site-name" defaultValue="AIMAX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-url">사이트 URL</Label>
                  <Input id="site-url" defaultValue="https://aimax.co.kr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">관리자 이메일</Label>
                  <Input id="admin-email" type="email" defaultValue="admin@aimax.co.kr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">지원 이메일</Label>
                  <Input id="support-email" type="email" defaultValue="support@aimax.co.kr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-description">사이트 설명</Label>
                <Textarea 
                  id="site-description" 
                  defaultValue="AI 기반 마케팅 자동화 플랫폼"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">시간대</Label>
                <Select defaultValue="asia-seoul">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia-seoul">Asia/Seoul (UTC+9)</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                    <SelectItem value="us-eastern">US/Eastern (UTC-5)</SelectItem>
                    <SelectItem value="us-pacific">US/Pacific (UTC-8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 알림 설정 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                알림 설정
              </CardTitle>
              <CardDescription>
                시스템 알림 방식을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>이메일 알림</Label>
                    <p className="text-sm text-gray-500">중요한 시스템 이벤트를 이메일로 받습니다</p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>푸시 알림</Label>
                    <p className="text-sm text-gray-500">브라우저 푸시 알림을 활성화합니다</p>
                  </div>
                  <Switch 
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>알림 받을 이벤트</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">새 사용자 가입</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">캠페인 완료</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">시스템 오류</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">일일 리포트</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 보안 설정 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                보안 설정
              </CardTitle>
              <CardDescription>
                시스템 보안 정책을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">세션 타임아웃 (분)</Label>
                  <Input 
                    id="session-timeout" 
                    type="number" 
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">최대 로그인 시도 횟수</Label>
                  <Input id="max-login-attempts" type="number" defaultValue="5" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>2단계 인증 필수</Label>
                    <p className="text-sm text-gray-500">모든 관리자 계정에 2FA를 강제합니다</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>IP 화이트리스트</Label>
                    <p className="text-sm text-gray-500">특정 IP만 관리자 페이지 접근 허용</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 데이터베이스 설정 */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                데이터베이스 설정
              </CardTitle>
              <CardDescription>
                데이터베이스 백업 및 최적화 설정
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>자동 백업</Label>
                    <p className="text-sm text-gray-500">매일 자동으로 데이터베이스를 백업합니다</p>
                  </div>
                  <Switch 
                    checked={autoBackup}
                    onCheckedChange={setAutoBackup}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>백업 주기</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">매시간</SelectItem>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">매주</SelectItem>
                      <SelectItem value="monthly">매월</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>백업 보관 기간</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7일</SelectItem>
                      <SelectItem value="14">14일</SelectItem>
                      <SelectItem value="30">30일</SelectItem>
                      <SelectItem value="90">90일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  수동 백업 실행
                </Button>
                <Button variant="outline">
                  데이터베이스 최적화
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API 설정 */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                API 설정
              </CardTitle>
              <CardDescription>
                API 사용량 제한 및 인증 설정
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">API Rate Limit (요청/시간)</Label>
                  <Input 
                    id="rate-limit" 
                    type="number" 
                    value={apiRateLimit}
                    onChange={(e) => setApiRateLimit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-timeout">API 타임아웃 (초)</Label>
                  <Input id="api-timeout" type="number" defaultValue="30" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>API 키</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    defaultValue="sk_live_xxxxxxxxxxxxxxxxxxx" 
                    readOnly
                  />
                  <Button variant="outline">재생성</Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>API 로깅</Label>
                    <p className="text-sm text-gray-500">모든 API 요청을 로깅합니다</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 유지보수 설정 */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                유지보수 모드
              </CardTitle>
              <CardDescription>
                시스템 유지보수 모드를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>유지보수 모드 활성화</Label>
                    <p className="text-sm text-gray-500">사용자의 서비스 접근을 일시적으로 차단합니다</p>
                  </div>
                  <Switch 
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>
                {maintenanceMode && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="font-medium">유지보수 모드 활성화됨</p>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      현재 관리자를 제외한 모든 사용자의 접근이 차단되어 있습니다.
                    </p>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="maintenance-message">유지보수 안내 메시지</Label>
                  <Textarea 
                    id="maintenance-message"
                    defaultValue="시스템 점검 중입니다. 잠시 후 다시 이용해 주세요."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-start">시작 시간</Label>
                    <Input id="maintenance-start" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-end">종료 시간</Label>
                    <Input id="maintenance-end" type="datetime-local" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">취소</Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          설정 저장
        </Button>
      </div>
    </div>
  )
}