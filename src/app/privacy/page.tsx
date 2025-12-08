'use client'

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 prose prose-neutral">
      <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>
      <p className="mb-8 text-gray-600">
        AIMAX(이하 “회사”)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">1. 개인정보의 처리목적</h2>
          <p className="text-gray-700">회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            <li><strong>서비스 제공 및 계약의 이행</strong>: 콘텐츠 생성, 자동화 서비스 제공, 맞춤형 서비스 제공, 서비스 관련 안내</li>
            <li><strong>회원 관리</strong>: 회원제 서비스 이용에 따른 본인확인, 개인식별, 가입의사 확인, 불량회원의 부정이용 방지와 비인가 사용방지</li>
            <li><strong>고충 처리</strong>: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보</li>
            <li><strong>마케팅 및 광고에의 활용 (선택 시)</strong>: 신규 서비스(제품) 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">2. 수집하는 개인정보의 항목 및 수집방법</h2>
          <p className="text-gray-700 mb-2">회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
            <h3 className="font-bold mb-2">[필수항목]</h3>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>수집항목: 성명, 이메일 주소, 휴대전화번호, 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
            </ul>
            <h3 className="font-bold mb-2">[선택항목]</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>수집항목: 마케팅 수신 동의 여부, SNS 계정 정보(블로그, 인스타그램 등), 기타 신청 폼을 통해 입력한 정보</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">3. 개인정보의 처리 및 보유기간</h2>
          <p className="text-gray-700">① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
          <p className="text-gray-700 mt-2">② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            <li><strong>서비스 가입 및 관리</strong>: 서비스 탈퇴 시까지 (단, 관계 법령에 의하여 보존할 필요가 있는 경우 해당 법령에서 정한 기간까지)</li>
            <li><strong>마케팅 및 광고 활용</strong>: 동의 철회 시 또는 회원 탈퇴 시까지</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">4. 개인정보의 제3자 제공</h2>
          <p className="text-gray-700">회사는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            <li>정보주체들이 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">5. 개인정보 처리 위탁</h2>
          <p className="text-gray-700">회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            <li>위탁받는 자 (수탁자): Supabase, Vercel</li>
            <li>위탁하는 업무의 내용: 시스템 데이터 저장 및 서버 운영</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">6. 정보주체와 법정대리인의 권리·의무 및 그 행사방법</h2>
          <p className="text-gray-700">정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있으며, 이메일을 통해 요청하실 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">7. 개인정보 보호책임자</h2>
          <p className="text-gray-700">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <div className="mt-2 bg-gray-50 p-4 rounded-lg text-gray-700">
            <p><strong>이메일</strong>: naminsoo@aimax.ai.kr</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-800">8. 개인정보 처리방침 변경</h2>
          <p className="text-gray-700">이 개인정보처리방침은 2025년 8월 27일부터 적용됩니다.</p>
        </section>
      </div>
    </main>
  )
}


