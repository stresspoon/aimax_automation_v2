/**
 * 텍스트 콘텐츠를 파일로 다운로드
 */
export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 이미지를 다운로드 (URL에서)
 */
export async function downloadImage(imageUrl: string, filename: string) {
  try {
    const response = await fetch(imageUrl, { mode: 'cors' })
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('이미지 다운로드 실패:', error)
    throw new Error('이미지 다운로드에 실패했습니다')
  }
}

/**
 * 여러 이미지를 ZIP으로 압축하여 다운로드
 */
export async function downloadImagesAsZip(imageUrls: string[], zipFilename: string, imagePrefix: string = 'image') {
  // JSZip 라이브러리가 필요합니다
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    // 각 이미지를 ZIP에 추가
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const response = await fetch(imageUrls[i], { mode: 'cors' })
        const blob = await response.blob()
        const extension = getImageExtension(imageUrls[i])
        zip.file(`${imagePrefix}_${i + 1}.${extension}`, blob)
      } catch (error) {
        console.error(`이미지 ${i + 1} 다운로드 실패:`, error)
      }
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = window.URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = zipFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('ZIP 다운로드 실패:', error)
    throw new Error('이미지 ZIP 다운로드에 실패했습니다')
  }
}

/**
 * URL에서 이미지 확장자 추출
 */
function getImageExtension(url: string): string {
  const urlParts = url.split('.')
  const extension = urlParts[urlParts.length - 1].split('?')[0] // 쿼리 파라미터 제거
  
  // 일반적인 이미지 확장자 확인
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  const ext = extension.toLowerCase()
  
  return validExtensions.includes(ext) ? ext : 'jpg' // 기본값
}

/**
 * 전체 프로젝트 데이터를 JSON으로 다운로드
 */
export function downloadProjectData(projectData: any, campaignName: string) {
  const jsonContent = JSON.stringify(projectData, null, 2)
  const filename = `${campaignName}_프로젝트_데이터_${new Date().toISOString().split('T')[0]}.json`
  downloadText(jsonContent, filename)
}

/**
 * 콘텐츠를 마크다운 형식으로 다운로드
 */
export function downloadContentAsMarkdown(content: string, title: string, campaignName: string) {
  const markdownContent = `# ${title}\n\n${content}\n\n---\n생성일: ${new Date().toLocaleString('ko-KR')}\n캠페인: ${campaignName}`
  const filename = `${campaignName}_콘텐츠_${new Date().toISOString().split('T')[0]}.md`
  downloadText(markdownContent, filename)
}

/**
 * 여러 파일을 ZIP으로 묶어서 다운로드 (콘텐츠 + 이미지)
 */
export async function downloadCompleteProject(
  content: string, 
  imageUrls: string[], 
  campaignName: string, 
  contentType: 'blog' | 'thread'
) {
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    // 콘텐츠를 텍스트 파일로 추가
    const contentFilename = `${campaignName}_${contentType === 'blog' ? '블로그글' : '스레드'}.txt`
    zip.file(contentFilename, content)
    
    // 마크다운 버전도 추가
    const markdownContent = `# ${campaignName}\n\n${content}\n\n---\n생성일: ${new Date().toLocaleString('ko-KR')}`
    const markdownFilename = `${campaignName}_${contentType === 'blog' ? '블로그글' : '스레드'}.md`
    zip.file(markdownFilename, markdownContent)
    
    // 이미지들 추가
    if (imageUrls.length > 0) {
      const imageFolder = zip.folder('images')
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const response = await fetch(imageUrls[i], { mode: 'cors' })
          const blob = await response.blob()
          const extension = getImageExtension(imageUrls[i])
          const imageFilename = `${campaignName}_이미지_${i + 1}.${extension}`
          imageFolder?.file(imageFilename, blob)
        } catch (error) {
          console.error(`이미지 ${i + 1} 추가 실패:`, error)
        }
      }
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipFilename = `${campaignName}_전체프로젝트_${new Date().toISOString().split('T')[0]}.zip`
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = window.URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = zipFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('전체 프로젝트 다운로드 실패:', error)
    throw new Error('전체 프로젝트 다운로드에 실패했습니다')
  }
}