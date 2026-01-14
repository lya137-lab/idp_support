import * as XLSX from 'xlsx';
import { SupportCriteria } from '@/types';

// Excel 열 헤더 (한글)
const HEADERS = [
  '자격구분',
  '자격증명',
  '주관',
  '지원기준',
  '응시료(원)',
  '교육비(원)',
  '지원대상',
  '적용시작일',
  '적용종료일',
];

// 지원 기준표를 Excel로 내보내기
export function exportCriteriaToExcel(criteria: SupportCriteria[], filename: string = '지원기준표.xlsx') {
  // 데이터를 Excel 형식으로 변환
  const data = criteria.map(c => [
    c.qualificationCategory,
    c.certificationName,
    c.organizer,
    c.supportCriteria,
    c.examFee,
    c.educationCost,
    c.supportTarget,
    c.effectiveStartDate,
    c.effectiveEndDate,
  ]);

  // 헤더 추가
  const worksheetData = [HEADERS, ...data];

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 15 }, // 자격구분
    { wch: 30 }, // 자격증명
    { wch: 20 }, // 주관
    { wch: 40 }, // 지원기준
    { wch: 15 }, // 응시료
    { wch: 15 }, // 교육비
    { wch: 20 }, // 지원대상
    { wch: 15 }, // 적용시작일
    { wch: 15 }, // 적용종료일
  ];

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '지원기준표');

  // 파일 다운로드
  XLSX.writeFile(workbook, filename);
}

// 빈 템플릿 Excel 다운로드
export function downloadCriteriaTemplate(filename: string = '지원기준표_템플릿.xlsx') {
  // 예시 데이터
  const exampleData = [
    ['국가기술자격', '정보처리기사', '한국산업인력공단', '응시료 전액 지원', 19400, 200000, '전 직원', '2024-01-01', '2024-12-31'],
    ['국제자격', 'AWS Solutions Architect', 'Amazon', '응시료 50% 지원', 150000, 300000, '개발팀', '2024-01-01', '2024-12-31'],
  ];

  const worksheetData = [HEADERS, ...exampleData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '지원기준표');

  XLSX.writeFile(workbook, filename);
}

// Excel 파일에서 지원 기준 가져오기
export function parseCriteriaFromExcel(file: File): Promise<Omit<SupportCriteria, 'id' | 'updatedAt'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 첫 번째 시트 가져오기
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON으로 변환 (헤더 행 제외)
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        
        // 헤더 행 제거 (첫 번째 행)
        const rows = jsonData.slice(1).filter(row => row.length > 0 && row[0]);

        const criteria: Omit<SupportCriteria, 'id' | 'updatedAt'>[] = rows.map(row => {
          const examFeeValue = String(row[4] || '').trim();
          const parsedExamFee = examFeeValue ? parseInt(examFeeValue) : 0;
          
          return {
            qualificationCategory: String(row[0] || '').trim(),
            certificationName: String(row[1] || '').trim(),
            organizer: String(row[2] || '').trim(),
            supportCriteria: String(row[3] || '').trim(),
            examFee: parsedExamFee === 0 || isNaN(parsedExamFee) ? 0 : parsedExamFee, // Excel에서는 0으로 표시하되, 저장 시 null로 변환됨
            educationCost: parseInt(String(row[5])) || 0,
            supportTarget: String(row[6] || '').trim(),
            effectiveStartDate: String(row[7] || '').trim(),
            effectiveEndDate: String(row[8] || '').trim(),
            isActive: true,
          };
        });

        // 유효성 검사: 자격증명이 있는 항목만 필터링
        const validCriteria = criteria.filter(c => c.qualificationCategory && c.certificationName);

        resolve(validCriteria);
      } catch (error) {
        reject(new Error('Excel 파일을 파싱하는 중 오류가 발생했습니다.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsBinaryString(file);
  });
}
