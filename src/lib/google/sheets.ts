import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

export async function getGoogleSheetsClient(userId: string) {
  const supabase = await createClient()
  
  // 사용자의 Google Sheets 연결 정보 조회
  const { data: connection, error } = await supabase
    .from('sheets_connections')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error || !connection) {
    throw new Error('Google Sheets 연결 정보를 찾을 수 없습니다')
  }
  
  // OAuth2 클라이언트 생성
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_BASE_URL + '/auth/sheets-callback'
  )
  
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  })
  
  // Sheets API 클라이언트 반환
  return google.sheets({ version: 'v4', auth: oauth2Client })
}

export async function appendToSheet(
  userId: string,
  spreadsheetId: string,
  values: any[][]
) {
  try {
    const sheets = await getGoogleSheetsClient(userId)
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:M', // A부터 M열까지 (13개 컬럼)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    })
    
    return response.data
  } catch (error) {
    console.error('Google Sheets append error:', error)
    throw error
  }
}

export async function createSpreadsheet(userId: string, title: string) {
  try {
    const sheets = await getGoogleSheetsClient(userId)
    
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: '응답',
            },
            data: [
              {
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: '날짜' } },
                      { userEnteredValue: { stringValue: '이름' } },
                      { userEnteredValue: { stringValue: '연락처' } },
                      { userEnteredValue: { stringValue: '이메일' } },
                      { userEnteredValue: { stringValue: '신청 경로' } },
                      { userEnteredValue: { stringValue: 'Threads URL' } },
                      { userEnteredValue: { stringValue: 'Threads 팔로워' } },
                      { userEnteredValue: { stringValue: 'Instagram URL' } },
                      { userEnteredValue: { stringValue: 'Instagram 팔로워' } },
                      { userEnteredValue: { stringValue: 'Blog URL' } },
                      { userEnteredValue: { stringValue: 'Blog 이웃수' } },
                      { userEnteredValue: { stringValue: '선정여부' } },
                      { userEnteredValue: { stringValue: '선정사유' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    
    return response.data
  } catch (error) {
    console.error('Google Sheets create error:', error)
    throw error
  }
}

export function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}