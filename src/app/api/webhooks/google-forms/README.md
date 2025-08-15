Google Forms → Google Apps Script → Webhook 설정 예시

1) 시트 onFormSubmit 트리거에 Apps Script 연결

```javascript
function onFormSubmit(e) {
  const headers = e.range.getSheet().getRange(1, 1, 1, e.values.length).getValues()[0];
  const row = {};
  e.values.forEach((v, i) => row[headers[i]] = v);

  // 컬럼명 매핑 예시 (사용 환경에 맞게 수정)
  const payload = {
    timestamp: row['타임스탬프'],
    name: row['성함'],
    phone: row['연락처'],
    email: row['메일주소'],
    source: row['어디에서 신청주셨나요?'],
    threads_url: row['후기 작성할 스레드 URL'],
    instagram_url: row['후기 작성할 인스타그램 URL'],
    blog_url: row['후기 작성할 블로그 URL'],
    video_consent: row['영상 촬영은 필수입니다. 가능하시죠?'],
    privacy_consent: row['개인정보 활용 동의'],
  };

  const url = 'https://YOUR_DOMAIN/api/webhooks/google-forms';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
```


