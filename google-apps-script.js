/**
 * Google Apps Script - Google Sheets 실시간 변경 감지
 * 
 * 사용법:
 * 1. Google Sheets 열기
 * 2. 확장 프로그램 > Apps Script 선택
 * 3. 이 코드 전체를 복사하여 붙여넣기
 * 4. WEBHOOK_URL과 PROJECT_ID를 실제 값으로 변경
 * 5. 저장 후 실행 권한 부여
 * 6. 트리거 설정: 트리거 > 트리거 추가 > onChange 선택
 */

// 설정값 - 실제 값으로 변경 필요
const WEBHOOK_URL = 'https://your-domain.com/api/sheets/webhook'; // 실제 도메인으로 변경
const PROJECT_ID = 'your-project-id'; // 실제 프로젝트 ID로 변경

/**
 * 시트 변경 시 자동 실행되는 함수
 */
function onChange(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    
    // 변경 이벤트 정보
    const eventData = {
      projectId: PROJECT_ID,
      sheetUrl: sheetUrl,
      event: {
        changeType: e.changeType,
        user: e.user,
        timestamp: new Date().toISOString(),
        sheetName: sheet.getName(),
        rowCount: sheet.getLastRow(),
        columnCount: sheet.getLastColumn()
      }
    };
    
    console.log('Sending webhook:', eventData);
    
    // 웹훅 전송
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(eventData),
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log('✅ Webhook sent successfully');
    } else {
      console.error('❌ Webhook failed:', response.getContentText());
    }
    
  } catch (error) {
    console.error('Error in onChange:', error);
  }
}

/**
 * 수동 테스트용 함수
 */
function testWebhook() {
  onChange({
    changeType: 'INSERT_ROW',
    user: Session.getActiveUser().getEmail(),
  });
}

/**
 * 초기 설정 함수 - 처음 한 번만 실행
 */
function setup() {
  // 트리거 설정
  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();
  
  console.log('✅ Trigger created successfully');
}