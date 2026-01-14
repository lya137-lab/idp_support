export type UserRole = 'employee' | 'admin' | 'system_admin';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type Position = 
  | '팀원' 
  | '팀장' 
  | '팀장업무대행' 
  | '지점장' 
  | '지부장' 
  | '실장' 
  | '센터장' 
  | '부장' 
  | '단장' 
  | '국장' 
  | '기업금융센터장' 
  | 'RM' 
  | 'RM지점장';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  company: string; // 회사명 (약자)
  department: string;
  rank: string; // 직급
  position: Position; // 직책
  email: string;
  phone: string; // 연락처
  role: UserRole;
  password?: string; // 비밀번호 (저장 시 해시화 필요)
}

export interface CertificationApplication {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  company?: string; // 계열사명 (약자)
  department: string;
  certificationName: string;
  acquisitionDate: string;
  educationCost: number;
  examFee: number;
  supportAmount?: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  files: UploadedFile[];
  ocrResults?: OCRResult;
  rejectionReason?: string;
  notes?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'receipt' | 'certificate';
  url: string;
  size: number;
  uploadedAt: string;
}

export interface OCRResult {
  documentType: 'A' | 'B' | 'OTHER'; // A: 합격증/자격증명서, B: 영수증/매출전표, OTHER: 기타
  certificationName?: string; // 자격증명 (유형 A만)
  grade?: string; // 급수 또는 등급 (유형 A만)
  finalPaymentAmount?: string; // 최종 결제금액 (유형 B만, 쉼표 포함 가능)
  confidence: number;
  rawText: string;
  isVerified: boolean;
  // 하위 호환성을 위한 필드들 (deprecated)
  extractedAmount?: number;
  extractedCertName?: string;
  extractedDate?: string;
}

export interface SupportCriteria {
  id: string;
  qualificationCategory: string; // 자격구분
  certificationName: string; // 자격증명
  organizer: string; // 주관
  supportCriteria: string; // 지원기준 (text)
  examFee: number; // 응시료(원)
  educationCost: number; // 교육비(원)
  supportTarget: string; // 지원대상
  effectiveStartDate: string; // 적용시작일
  effectiveEndDate: string; // 적용종료일
  isActive: boolean;
  updatedAt: string;
  category?: string; // 분야
  examFeeUsd?: number; // 응시료(달러)
}

export interface DashboardStats {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalSupportAmount: number;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  month: string;
  applications: number;
  approved: number;
  totalAmount: number;
}
