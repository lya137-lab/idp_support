import Tesseract from 'tesseract.js';
import { OCRResult } from '@/types';

// Tesseract 워커는 recognize 함수에서 자동으로 관리되므로 별도 초기화 불필요

// PDF → 이미지 변환을 위한 pdf.js 로더 (지연 로딩)
let pdfjsLoader: Promise<any> | null = null;

async function getPdfJs() {
  if (!pdfjsLoader) {
    pdfjsLoader = (async () => {
      const pdfjs = await import('pdfjs-dist');
      // Vite 환경: 번들러가 처리 가능한 정적 URL 생성
      const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
      if (pdfjs.GlobalWorkerOptions && workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      }
      return pdfjs;
    })();
  }
  return await pdfjsLoader;
}

// PDF 파일을 이미지 DataURL 배열로 변환 (모든 페이지 처리)
async function convertPdfToImageDataUrls(file: File, maxPages?: number): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pagesToProcess = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
    const imageDataUrls: string[] = [];

    for (let pageIndex = 1; pageIndex <= pagesToProcess; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const viewport = page.getViewport({ scale: 2 }); // 해상도 개선
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        continue;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const renderContext = {
        canvasContext: ctx,
        viewport,
      };
      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl && dataUrl.length > 100) {
        imageDataUrls.push(dataUrl);
      }
    }

    return imageDataUrls;
  } catch (error) {
    console.error('PDF를 이미지로 변환하는 중 오류:', error);
    return [];
  }
}

// 날짜 정규화: YYYY-MM-DD
function normalizeDateHyphen(value?: string): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/년|\.|\//g, '-')
    .replace(/월/g, '-')
    .replace(/일/g, '')
    .replace(/\s+/g, '');
  const parts = cleaned.split('-').filter(Boolean);
  if (parts.length === 3) {
    let [yy, mm, dd] = parts;
    if (yy.length === 2) {
      yy = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
    }
    const month = mm.padStart(2, '0');
    const day = dd.padStart(2, '0');
    return `${yy}-${month}-${day}`;
  }
  return null;
}

// 문서 유형 추정
function detectDocType(raw: string): 'receipt' | 'sales' | 'certificate' | 'other' {
  const upper = raw.toUpperCase();
  const receiptKeys = ['영수증', 'RECEIPT', '매출전표', 'CREDIT', '승인', '결제', '거래'];
  const certKeys = ['자격증', 'CERTIFICATE', '합격', '발급', '면허', 'LICENSE'];
  const hasReceipt = receiptKeys.some((k) => upper.includes(k));
  const hasCert = certKeys.some((k) => upper.includes(k));
  if (hasCert && !hasReceipt) return 'certificate';
  if (hasReceipt && !hasCert) return 'receipt';
  if (hasReceipt && hasCert) return 'sales';
  return 'other';
}

// 금액 후보 추출
function extractAmounts(raw: string) {
  const amountRegex = /([가-힣A-Za-z]+)?\s*[:\s]*([0-9]{1,3}(?:,[0-9]{3})+|\d{4,})\s*(원)?/g;
  const candidates: { label: string | null; value: number }[] = [];
  for (const match of raw.matchAll(amountRegex)) {
    const label = match[1]?.trim() || null;
    const num = parseInt(match[2].replace(/,/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      candidates.push({ label, value: num });
    }
  }
  return candidates;
}

// 날짜 후보 추출
function extractDates(raw: string) {
  const dateRegexes = [
    /(\d{4})[.\-\/년\s](\d{1,2})[.\-\/월\s](\d{1,2})[일]?/g,
    /(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/g,
  ];
  const candidates: { label: string | null; value: string }[] = [];
  dateRegexes.forEach((regex) => {
    for (const match of raw.matchAll(regex)) {
      const [full] = match;
      const normalized = normalizeDateHyphen(full);
      if (normalized) {
        // 라벨 추정: 앞뒤 5글자 내 텍스트
        const idx = raw.indexOf(full);
        const context = raw.slice(Math.max(0, idx - 5), Math.min(raw.length, idx + full.length + 5));
        const labelMatch = context.match(/(결제|승인|거래|취득|합격|발급)/);
        candidates.push({ label: labelMatch?.[1] || null, value: normalized });
      }
    }
  });
  return candidates;
}

// 자격증 정보 추출
function extractCertificateFields(raw: string) {
  const namePatterns = [
    /(?:자격증명|자격명|Certificate)[:\s]*([^\n\r]+)/i,
    /(정보처리기사|PMP|AWS|Azure|GCP|토익|토플|JLPT|HSK)/i,
  ];
  let name: string | null = null;
  for (const p of namePatterns) {
    const m = raw.match(p);
    if (m && m[1]) {
      name = m[1].trim();
      break;
    }
  }

  const issuerPatterns = [/발급기관[:\s]*([^\n\r]+)/i, /주관기관[:\s]*([^\n\r]+)/i, /시행기관[:\s]*([^\n\r]+)/i];
  let issuer: string | null = null;
  for (const p of issuerPatterns) {
    const m = raw.match(p);
    if (m && m[1]) {
      issuer = m[1].trim();
      break;
    }
  }

  // 날짜 우선순위: 취득일 > 합격일 > 발급일
  const dateCandidates = extractDates(raw).filter((d) => d.label && ['취득', '합격', '발급'].includes(d.label));
  const priority = ['취득', '합격', '발급'];
  let certDate: string | null = null;
  for (const key of priority) {
    const found = dateCandidates.find((d) => d.label && d.label.includes(key));
    if (found) {
      certDate = found.value;
      break;
    }
  }

  return { name, date: certDate, issuer };
}

// 자격증명 후보 추출
function extractCertNameCandidates(raw: string): string[] {
  const set = new Set<string>();
  const patterns = [
    /자격증명[:\s]*([^\n\r]{2,60})/gi,
    /자격명[:\s]*([^\n\r]{2,60})/gi,
    /Certificate[:\s]*([^\n\r]{2,60})/gi,
    /Certificat[e]?\s+([A-Za-z0-9\s\-&]{2,80})/gi,
  ];
  patterns.forEach((p) => {
    for (const m of raw.matchAll(p)) {
      if (m[1]) set.add(m[1].trim());
    }
  });
  const tailPattern = /([A-Za-z0-9가-힣\s\-&]{3,80})(?:자격|시험|Cert|Certificate|Certification)/gi;
  for (const m of raw.matchAll(tailPattern)) {
    if (m[1]) set.add(m[1].trim());
  }
  return Array.from(set);
}

// 최종 결제금액 판정 (영수증/매출전표)
function pickFinalAmount(amounts: { label: string | null; value: number }[]) {
  const allowed = ['합계', '총액', '승인금액', '결제금액'];
  const filtered = amounts.filter((a) => a.label && allowed.some((k) => (a.label as string).includes(k)));
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => b.value - a.value);
  return filtered[0].value;
}

// 결제일자 판정
function pickPaymentDate(dates: { label: string | null; value: string }[]) {
  const priority = ['결제', '승인', '거래'];
  for (const key of priority) {
    const found = dates.find((d) => d.label && d.label.includes(key));
    if (found) return found.value;
  }
  return null;
}

export interface StructuredPageResult {
  file: string;
  page: number;
  doc_type: 'receipt' | 'sales' | 'certificate' | 'other';
  date_candidates: { label: string | null; value: string }[];
  amount_candidates: { label: string | null; value: number }[];
  certificate_candidates: {
    name: string | null;
    date: string | null;
    issuer: string | null;
  };
  cert_name_candidates: string[];
  final_amount?: number | null;
  payment_date?: string | null;
}

export interface StructuredOCRResult {
  pages: StructuredPageResult[];
  receipts: {
    file: string;
    page: number;
    paymentDate: string | null;
    finalAmount: number | null;
  }[];
  certificates: {
    file: string;
    page: number;
    name: string | null;
    date: string | null;
    issuer: string | null;
  }[];
  cert_name_candidates: string[];
  totalFinalAmount: number;
}

// 이미지 전처리를 위한 Canvas 기반 처리
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result || typeof result !== 'string') {
            reject(new Error('파일 읽기 실패: 결과가 없습니다.'));
            return;
          }
          
          // DataURL 형식 검증
          if (!result.startsWith('data:image/') && !result.startsWith('data:application/pdf')) {
            reject(new Error('지원하지 않는 파일 형식입니다.'));
            return;
          }
          
          const img = new Image();
          
          // CORS 문제 방지를 위한 설정
          img.crossOrigin = 'anonymous';
          
          // 타임아웃 설정 (10초)
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          
          const handleImageLoad = () => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            try {
              // 이미지 유효성 검사
              if (img.width === 0 || img.height === 0) {
                console.warn('이미지 크기가 0입니다. 원본 DataURL 사용');
                resolve(result);
                return;
              }
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d', { 
                willReadFrequently: true,
                alpha: false // 투명도 불필요 시 성능 향상
              });
              
              if (!ctx) {
                console.warn('Canvas 컨텍스트를 가져올 수 없습니다. 원본 DataURL 사용');
                resolve(result);
                return;
              }
              
              // 이미지 크기 조정 (해상도 보정)
              const maxWidth = 2000;
              const maxHeight = 2000;
              let { width, height } = img;
              
              // 너무 작은 이미지는 확대하지 않음
              if (width < 100 || height < 100) {
                console.warn('이미지가 너무 작습니다. 원본 크기 유지');
              }
              
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
              }
              
              // 최소 크기 보장
              width = Math.max(width, 100);
              height = Math.max(height, 100);
              
              canvas.width = width;
              canvas.height = height;
              
              // 이미지 그리기 (안티앨리어싱 비활성화로 선명도 향상)
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(img, 0, 0, width, height);
              
              try {
                // 이미지 데이터 가져오기
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                // 그레이스케일 변환 및 대비 향상
                for (let i = 0; i < data.length; i += 4) {
                  // 그레이스케일 변환
                  const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                  
                  // 대비 향상 (Contrast stretching)
                  const contrast = 1.5;
                  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
                  const enhanced = factor * (gray - 128) + 128;
                  const value = Math.max(0, Math.min(255, enhanced));
                  
                  data[i] = value;
                  data[i + 1] = value;
                  data[i + 2] = value;
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // 이진화 (Binarization) - 적응형 임계값
                const threshold = 128;
                for (let i = 0; i < data.length; i += 4) {
                  const value = data[i] > threshold ? 255 : 0;
                  data[i] = value;
                  data[i + 1] = value;
                  data[i + 2] = value;
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // PNG 형식으로 변환 (JPEG보다 안정적)
                const processedDataUrl = canvas.toDataURL('image/png', 1.0);
                
                if (!processedDataUrl || processedDataUrl.length < 100) {
                  console.warn('처리된 이미지 데이터가 유효하지 않습니다. 원본 사용');
                  resolve(result);
                  return;
                }
                
                resolve(processedDataUrl);
              } catch (imageDataError) {
                console.error('이미지 데이터 처리 오류:', imageDataError);
                // 전처리 실패 시 원본 사용
                resolve(result);
              }
            } catch (error) {
              console.error('이미지 전처리 오류:', error);
              // 전처리 실패 시 원본 사용
              resolve(result);
            }
          };
          
          img.onload = handleImageLoad;
          
          img.onerror = (error) => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            console.error('이미지 로드 오류:', error);
            // 이미지 로드 실패 시 원본 DataURL 사용 시도
            resolve(result);
          };
          
          // 타임아웃 설정
          timeoutId = setTimeout(() => {
            console.warn('이미지 로드 타임아웃. 원본 DataURL 사용');
            resolve(result);
          }, 10000);
          
          img.src = result;
        } catch (error) {
          console.error('파일 읽기 처리 오류:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader 오류:', error);
        reject(new Error('파일 읽기 실패'));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('preprocessImage 오류:', error);
      reject(error);
    }
  });
}

// PDF 파일을 DataURL로 변환 (PDF는 직접 OCR 불가, 이미지로 변환 필요 안내)
async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result || typeof result !== 'string') {
          reject(new Error('파일 읽기 실패: 결과가 없습니다.'));
          return;
        }
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error('FileReader 오류:', error);
        reject(new Error('파일 읽기 실패'));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('readFileAsDataURL 오류:', error);
      reject(error);
    }
  });
}

// [1단계] 문서 유형 판단
function detectDocumentType(text: string): 'A' | 'B' | 'OTHER' {
  // null/undefined 체크
  if (!text || typeof text !== 'string') {
    return 'OTHER';
  }
  
  try {
    const upperText = text.toUpperCase();
    
    // 유형 A: 자격시험 합격증 / 자격증명서 키워드
    const typeAKeywords = [
      '합격증', '합격', '자격증명서', '자격증', '자격시험', '기사', '산업기사',
      '급수', '등급', '1급', '2급', '3급', '기사', '산업기사', '기능사',
      'CERTIFICATE', 'PASS', 'QUALIFICATION', 'LICENSE'
    ];
    
    // 유형 B: 매출전표 / 영수증 키워드
    const typeBKeywords = [
      '매출전표', '영수증', '거래명세서', '세금계산서', '계산서',
      '결제금액', '합계금액', '총액', '최종금액', '청구금액',
      'RECEIPT', 'INVOICE', 'BILL', 'PAYMENT', 'TOTAL'
    ];
    
    // 유형 A 점수 계산
    let typeAScore = 0;
    for (const keyword of typeAKeywords) {
      if (upperText.includes(keyword)) {
        typeAScore++;
      }
    }
    
    // 유형 B 점수 계산
    let typeBScore = 0;
    for (const keyword of typeBKeywords) {
      if (upperText.includes(keyword)) {
        typeBScore++;
      }
    }
    
    // 점수가 높은 유형 반환
    if (typeAScore > typeBScore && typeAScore > 0) {
      return 'A';
    } else if (typeBScore > typeAScore && typeBScore > 0) {
      return 'B';
    }
  } catch (error) {
    console.error('문서 유형 판단 오류:', error);
  }
  
  return 'OTHER';
}

// 유형 A: 자격증명 추출
function extractCertificationName(text: string): string | undefined {
  // null/undefined 체크
  if (!text || typeof text !== 'string') {
    return undefined;
  }
  
  try {
    // 자격증명 패턴 (보이는 텍스트만 기준)
    const patterns = [
      /(?:자격증명|자격명|시험명|자격종목)\s*[:\s]*([가-힣a-zA-Z0-9\s]+?)(?:\s|$|합격|급수|등급)/i,
      /(정보처리기사|정보처리산업기사|컴퓨터활용능력|네트워크관리사|SQLD|SQLP|빅데이터분석기사|데이터분석전문가|AWS|Azure|GCP|PMP|CCNA|CCNP|CCIE|토익|토플|JLPT|HSK)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // 자격증명은 2자 이상 50자 이하
        if (name.length >= 2 && name.length <= 50) {
          return name;
        }
      }
    }
  } catch (error) {
    console.error('자격증명 추출 오류:', error);
  }
  
  return undefined;
}

// 유형 A: 급수 또는 등급 추출
function extractGrade(text: string): string | undefined {
  // null/undefined 체크
  if (!text || typeof text !== 'string') {
    return undefined;
  }
  
  try {
    // 급수/등급 패턴 (보이는 텍스트만 기준)
    const patterns = [
      /(?:급수|등급|자격등급)\s*[:\s]*([0-9]+급|기사|산업기사|기능사|1급|2급|3급|4급)/i,
      /([0-9]+급|기사|산업기사|기능사)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const grade = match[1].trim();
        if (grade.length >= 1 && grade.length <= 20) {
          return grade;
        }
      }
    }
  } catch (error) {
    console.error('급수 추출 오류:', error);
  }
  
  return undefined;
}

// 유형 B: 최종 결제금액 추출 (숫자만, 쉼표 포함 가능, 원 단위)
function extractFinalPaymentAmount(text: string): string | undefined {
  // null/undefined 체크
  if (!text || typeof text !== 'string') {
    return undefined;
  }
  
  try {
    // 최종 결제금액 패턴 (보이는 텍스트만 기준) - 전역 플래그 필수!
    const patterns = [
      /(?:최종|결제|합계|총액|청구|최종결제|최종금액)\s*[:\s]*([0-9,]+)\s*원/gi, // 전역 플래그 추가
      /([0-9,]+)\s*원/gi, // 일반적인 금액 패턴 - 전역 플래그 추가
    ];
    
    // 가장 큰 금액을 찾기 위해 모든 매치를 수집
    const amounts: { value: number; text: string }[] = [];
    
    for (const pattern of patterns) {
      try {
        // matchAll은 전역 플래그가 있는 정규식에서만 작동
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match && match[1]) {
            const amountStr = match[1].replace(/,/g, '');
            const amount = parseInt(amountStr);
            if (!isNaN(amount) && amount > 0) {
              amounts.push({ value: amount, text: match[1] }); // 쉼표 포함 원본 저장
            }
          }
        }
      } catch (patternError) {
        // matchAll 실패 시 일반 match 사용
        const match = text.match(pattern);
        if (match && match[1]) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseInt(amountStr);
          if (!isNaN(amount) && amount > 0) {
            amounts.push({ value: amount, text: match[1] });
          }
        }
      }
    }
    
    // 가장 큰 금액 반환 (최종 결제금액은 보통 가장 큰 금액)
    if (amounts.length > 0) {
      amounts.sort((a, b) => b.value - a.value);
      return amounts[0].text; // 쉼표 포함 원본 반환
    }
  } catch (error) {
    console.error('결제금액 추출 오류:', error);
  }
  
  return undefined;
}

// 메인 OCR 함수
export async function performOCR(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  // 파일 유효성 검사
  if (!file) {
    throw new Error('파일이 선택되지 않았습니다.');
  }
  
  // 파일 크기 제한 (50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error(`파일 크기가 너무 큽니다. (최대: 50MB, 현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  // 지원하는 파일 타입 확인
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error(`지원하지 않는 파일 형식입니다. (${file.type})\n지원 형식: JPEG, PNG, GIF, WebP, BMP, PDF`);
  }
  
  let imageData: string;
  
  try {
    if (file.type === 'application/pdf') {
      console.log('PDF 파일 처리 중... (이미지 변환 후 OCR)');
      const pdfImages = await convertPdfToImageDataUrls(file);
      if (!pdfImages.length) {
        throw new Error('PDF를 이미지로 변환하지 못했습니다.');
      }
      // 여러 페이지 중 첫 페이지를 기본으로 사용 (필요 시 확장 가능)
      imageData = pdfImages[0];
    } else {
      // 이미지 전처리
      imageData = await preprocessImage(file);
    }
    
    if (!imageData) {
      throw new Error('이미지 데이터를 가져올 수 없습니다.');
    }
    
    // DataURL 형식 검증
    if (typeof imageData !== 'string' || !imageData.startsWith('data:')) {
      throw new Error('유효하지 않은 이미지 데이터 형식입니다.');
    }
    
    // 최소 길이 검증 (너무 짧으면 유효하지 않음)
    if (imageData.length < 100) {
      throw new Error('이미지 데이터가 너무 짧습니다.');
    }
    
    console.log('이미지 데이터 준비 완료 (길이:', imageData.length, '자)');
  } catch (error) {
    console.error('이미지 처리 오류:', error);
    throw new Error(`이미지 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
  
  // Tesseract OCR 실행
  let result;
  try {
    // Tesseract가 로드되었는지 확인
    if (!Tesseract) {
      throw new Error('Tesseract OCR 라이브러리가 로드되지 않았습니다.');
    }
    
    if (typeof Tesseract.recognize !== 'function') {
      throw new Error('Tesseract.recognize 함수를 사용할 수 없습니다.');
    }
    
    console.log('OCR 분석 시작... (파일 크기:', (file.size / 1024).toFixed(2), 'KB)');
    
    // 타임아웃 설정 (5분)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR 처리 시간 초과 (5분)')), 5 * 60 * 1000);
    });
    
    const ocrPromise = Tesseract.recognize(
      imageData,
      'kor+eng', // 한국어 + 영어
      {
        logger: (m) => {
          // 진행 상황 로깅
          if (m.status) {
            const progressInfo = m.progress ? `(${Math.round(m.progress * 100)}%)` : '';
            console.log(`OCR 상태: ${m.status}`, progressInfo);
          }
          if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );
    
    result = await Promise.race([ocrPromise, timeoutPromise]) as any;
    
    console.log('OCR 분석 완료');
  } catch (ocrError) {
    console.error('Tesseract OCR 실행 오류:', ocrError);
    const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
    
    // 구체적인 오류 메시지 제공
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      throw new Error('네트워크 오류: OCR 모델을 다운로드할 수 없습니다. 인터넷 연결을 확인해주세요.');
    } else if (errorMessage.includes('memory') || errorMessage.includes('allocation') || errorMessage.includes('out of memory')) {
      throw new Error('메모리 부족: 파일 크기가 너무 큽니다. 더 작은 이미지로 시도해주세요.');
    } else if (errorMessage.includes('시간 초과') || errorMessage.includes('timeout')) {
      throw new Error('처리 시간 초과: 파일이 너무 크거나 복잡합니다. 더 작은 이미지로 시도해주세요.');
    } else if (errorMessage.includes('worker') || errorMessage.includes('Worker')) {
      throw new Error('OCR 워커 초기화 실패: 페이지를 새로고침하고 다시 시도해주세요.');
    } else {
      throw new Error(`OCR 처리 실패: ${errorMessage}`);
    }
  }
  
  if (!result) {
    throw new Error('OCR 결과가 없습니다.');
  }
  
  if (!result.data) {
    throw new Error('OCR 데이터가 없습니다.');
  }
  
  const rawText = result.data.text || '';
  const confidence = result.data.confidence || 0;
  
  console.log(`OCR 텍스트 추출 완료 (길이: ${rawText.length}자, 정확도: ${confidence}%)`);
  
  // [1단계] 문서 유형 판단
  const documentType = detectDocumentType(rawText);
  
  // [2단계] 문서 유형별 정보 추출
  let certificationName: string | undefined;
  let grade: string | undefined;
  let finalPaymentAmount: string | undefined;
  
  if (documentType === 'A') {
    // 유형 A: 자격증명, 급수/등급 추출
    certificationName = extractCertificationName(rawText);
    grade = extractGrade(rawText);
  } else if (documentType === 'B') {
    // 유형 B: 최종 결제금액 추출
    finalPaymentAmount = extractFinalPaymentAmount(rawText);
  }
  
  // 하위 호환성을 위한 필드 (deprecated)
  const extractedAmount = finalPaymentAmount ? parseInt(finalPaymentAmount.replace(/,/g, '')) : undefined;
  const extractedCertName = certificationName;
  
  // JSON 형식으로 출력 (콘솔)
  const jsonOutput = {
    document_type: documentType,
    자격증명: certificationName || null,
    급수: grade || null,
    최종결제금액: finalPaymentAmount || null,
  };
  console.log('OCR 분석 결과 (JSON):', JSON.stringify(jsonOutput, null, 2));
  
  return {
    documentType,
    certificationName,
    grade,
    finalPaymentAmount,
    confidence,
    rawText,
    isVerified: false,
    // 하위 호환성 필드
    extractedAmount,
    extractedCertName,
  };
}

// 다중 파일 OCR
export async function performOCROnFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await performOCR(files[i], (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }
  
  return results;
}

// 파일/페이지별 구조화 OCR
export async function performStructuredOCROnFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<StructuredOCRResult> {
  const pages: StructuredPageResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.name;

    // 파일을 페이지 이미지 배열로 변환
    let images: string[] = [];
    if (file.type === 'application/pdf') {
      images = await convertPdfToImageDataUrls(file); // 모든 페이지
    } else {
      images = [await preprocessImage(file)];
    }

    for (let pageIdx = 0; pageIdx < images.length; pageIdx++) {
      const imgData = images[pageIdx];
      const result = await Tesseract.recognize(imgData, 'kor+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(i, Math.round((pageIdx / images.length) * 100 + (m.progress || 0) * 100));
          }
        },
      });

      const rawText = result.data.text || '';
      const docType = detectDocType(rawText);
      const amountCandidates = extractAmounts(rawText);
      const dateCandidates = extractDates(rawText);
      const certCandidates = extractCertificateFields(rawText);
      const certNameCandidates = extractCertNameCandidates(rawText);

      const finalAmount = docType === 'receipt' || docType === 'sales' ? pickFinalAmount(amountCandidates) : null;
      const paymentDate = docType === 'receipt' || docType === 'sales' ? pickPaymentDate(dateCandidates) : null;

      pages.push({
        file: fileName,
        page: pageIdx + 1,
        doc_type: docType,
        date_candidates: dateCandidates,
        amount_candidates: amountCandidates,
        certificate_candidates: certCandidates,
        cert_name_candidates: certNameCandidates,
        final_amount: finalAmount,
        payment_date: paymentDate,
      });
    }
  }

  // 영수증/매출전표 리스트
  const receipts = pages
    .filter((p) => p.doc_type === 'receipt' || p.doc_type === 'sales')
    .map((p) => ({
      file: p.file,
      page: p.page,
      paymentDate: p.payment_date || null,
      finalAmount: p.final_amount ?? null,
    }));

  // 자격증 리스트
  const certificates = pages
    .filter((p) => p.doc_type === 'certificate')
    .map((p) => ({
      file: p.file,
      page: p.page,
      name: p.certificate_candidates.name,
      date: p.certificate_candidates.date,
      issuer: p.certificate_candidates.issuer,
    }));

  const totalFinalAmount = receipts
    .map((r) => r.finalAmount || 0)
    .reduce((sum, v) => sum + v, 0);

  return {
    pages,
    receipts,
    certificates,
    cert_name_candidates: Array.from(new Set(pages.flatMap((p) => p.cert_name_candidates))),
    totalFinalAmount,
  };
}
