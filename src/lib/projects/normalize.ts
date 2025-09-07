export function normalizeProjectData(dbData: any) {
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

  const step3 = dbData?.step3 || {
    targetType: 'selected',
    emailSubject: '',
    emailBody: '',
    senderEmail: '',
    emailsSent: 0
  }

  return {
    ...dbData,
    step1,
    step2,
    step3,
  }
}

