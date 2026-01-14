import { supabase } from '@/lib/supabaseClient';
import { CertificationApplication, ApplicationStatus, OCRResult } from '@/types';

/**
 * Supabase certification_applications 테이블의 신청 데이터 타입
 */
export interface SupabaseCertificationApplication {
  id: string;
  user_id: string;
  employee_id: string;
  employee_name: string;
  company: string | null;
  department: string;
  certification_name: string;
  acquisition_date: string;
  education_cost: number;
  exam_fee: number;
  support_amount: number | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  notes: string | null;
  ocr_raw_text: string | null;
  ocr_extracted_amount: number | null;
  ocr_extracted_cert_name: string | null;
  ocr_extracted_date: string | null;
  ocr_confidence: number | null;
  ocr_is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 자격증 신청 생성 데이터 타입
 */
export interface CreateCertificationApplicationData {
  employee_id: string;
  employee_name: string;
  company?: string;
  department: string;
  certification_name: string;
  acquisition_date: string;
  education_cost: number;
  exam_fee: number;
  notes?: string;
  ocr_results?: OCRResult;
}

/**
 * Supabase 신청 데이터를 앱의 CertificationApplication 타입으로 변환
 */
function mapSupabaseApplicationToApplication(
  supabaseApp: SupabaseCertificationApplication,
  files: any[] = []
): CertificationApplication {
  return {
    id: supabaseApp.id,
    userId: supabaseApp.user_id,
    employeeId: supabaseApp.employee_id,
    employeeName: supabaseApp.employee_name,
    company: supabaseApp.company || undefined,
    department: supabaseApp.department,
    certificationName: supabaseApp.certification_name,
    acquisitionDate: supabaseApp.acquisition_date,
    educationCost: supabaseApp.education_cost,
    examFee: supabaseApp.exam_fee,
    supportAmount: supabaseApp.support_amount || undefined,
    status: supabaseApp.status,
    rejectionReason: supabaseApp.rejection_reason || undefined,
    notes: supabaseApp.notes || undefined,
    createdAt: supabaseApp.created_at,
    updatedAt: supabaseApp.updated_at,
    files: files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      url: file.url,
      size: file.size,
      uploadedAt: file.uploaded_at,
    })),
    ocrResults: supabaseApp.ocr_raw_text ? {
      rawText: supabaseApp.ocr_raw_text,
      extractedAmount: supabaseApp.ocr_extracted_amount || undefined,
      extractedCertName: supabaseApp.ocr_extracted_cert_name || undefined,
      extractedDate: supabaseApp.ocr_extracted_date || undefined,
      confidence: supabaseApp.ocr_confidence || 0,
      isVerified: supabaseApp.ocr_is_verified,
    } : undefined,
  };
}

/**
 * 자격증 신청 생성 (insert)
 * RLS 정책에 따라 사용자 본인 데이터만 접근 가능
 * 
 * @param applicationData 신청 데이터
 * @returns 생성된 신청 정보 또는 null
 */
export async function createCertificationApplication(
  applicationData: CreateCertificationApplicationData
): Promise<CertificationApplication | null> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return null;
    }

    // OCR 결과를 JSON 형태로 변환
    const ocrRawText = applicationData.ocr_results?.rawText || null;
    const ocrExtractedAmount = applicationData.ocr_results?.extractedAmount || null;
    const ocrExtractedCertName = applicationData.ocr_results?.extractedCertName || null;
    const ocrExtractedDate = applicationData.ocr_results?.extractedDate || null;
    const ocrConfidence = applicationData.ocr_results?.confidence || null;
    const ocrIsVerified = applicationData.ocr_results?.isVerified || false;

    // certification_applications 테이블에 insert
    const { data, error } = await supabase
      .from('certification_applications')
      .insert({
        user_id: authUser.id, // 현재 로그인된 사용자 ID
        employee_id: applicationData.employee_id,
        employee_name: applicationData.employee_name,
        company: applicationData.company || null,
        department: applicationData.department,
        certification_name: applicationData.certification_name,
        acquisition_date: applicationData.acquisition_date,
        education_cost: applicationData.education_cost,
        exam_fee: applicationData.exam_fee,
        status: 'pending' as ApplicationStatus, // 신청 상태는 'pending'으로 시작
        notes: applicationData.notes || null,
        ocr_raw_text: ocrRawText,
        ocr_extracted_amount: ocrExtractedAmount,
        ocr_extracted_cert_name: ocrExtractedCertName,
        ocr_extracted_date: ocrExtractedDate,
        ocr_confidence: ocrConfidence,
        ocr_is_verified: ocrIsVerified,
      })
      .select()
      .single();

    if (error) {
      console.error('자격증 신청 생성 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // 파일 목록은 빈 배열로 초기화 (파일은 별도로 업로드)
    return mapSupabaseApplicationToApplication(data as SupabaseCertificationApplication, []);
  } catch (error) {
    console.error('createCertificationApplication 오류:', error);
    return null;
  }
}

/**
 * 사용자의 자격증 신청 목록 조회
 * RLS 정책에 따라 사용자 본인 데이터만 조회 가능
 * 
 * @param status 필터링할 상태 (선택사항)
 * @returns 신청 목록
 */
export async function getUserCertificationApplications(
  status?: ApplicationStatus
): Promise<CertificationApplication[]> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return [];
    }

    // 쿼리 빌더 생성
    let query = supabase
      .from('certification_applications')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('자격증 신청 목록 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 각 신청의 파일 목록도 함께 조회
    const applicationsWithFiles = await Promise.all(
      data.map(async (app) => {
        const { data: files } = await supabase
          .from('application_files')
          .select('*')
          .eq('application_id', app.id);

        return mapSupabaseApplicationToApplication(
          app as SupabaseCertificationApplication,
          files || []
        );
      })
    );

    return applicationsWithFiles;
  } catch (error) {
    console.error('getUserCertificationApplications 오류:', error);
    return [];
  }
}

/**
 * 특정 자격증 신청 조회
 * RLS 정책에 따라 사용자 본인 데이터만 조회 가능
 * 
 * @param applicationId 신청 ID
 * @returns 신청 정보 또는 null
 */
export async function getCertificationApplicationById(
  applicationId: string
): Promise<CertificationApplication | null> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return null;
    }

    // 신청 조회
    const { data, error } = await supabase
      .from('certification_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', authUser.id) // 본인 데이터만 조회
      .single();

    if (error) {
      console.error('자격증 신청 조회 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // 파일 목록 조회
    const { data: files } = await supabase
      .from('application_files')
      .select('*')
      .eq('application_id', applicationId);

    return mapSupabaseApplicationToApplication(
      data as SupabaseCertificationApplication,
      files || []
    );
  } catch (error) {
    console.error('getCertificationApplicationById 오류:', error);
    return null;
  }
}

/**
 * 관리자용: 모든 자격증 신청 조회 (필터링 옵션 포함)
 * RLS 정책에 따라 관리자 권한 필요
 * 
 * @param filters 필터링 옵션
 * @returns 신청 목록
 */
export interface ApplicationFilters {
  status?: ApplicationStatus;
  company?: string;
  department?: string;
  certificationName?: string;
  employeeId?: string;
  employeeName?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export async function getAllCertificationApplications(
  filters?: ApplicationFilters
): Promise<CertificationApplication[]> {
  try {
    let query = supabase
      .from('certification_applications')
      .select('*')
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.company) {
      query = query.eq('company', filters.company);
    }
    if (filters?.department) {
      query = query.ilike('department', `%${filters.department}%`);
    }
    if (filters?.certificationName) {
      query = query.ilike('certification_name', `%${filters.certificationName}%`);
    }
    if (filters?.employeeId) {
      query = query.ilike('employee_id', `%${filters.employeeId}%`);
    }
    if (filters?.employeeName) {
      query = query.ilike('employee_name', `%${filters.employeeName}%`);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('자격증 신청 목록 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 각 신청의 파일 목록도 함께 조회
    const applicationsWithFiles = await Promise.all(
      data.map(async (app) => {
        const { data: files } = await supabase
          .from('application_files')
          .select('*')
          .eq('application_id', app.id);

        return mapSupabaseApplicationToApplication(
          app as SupabaseCertificationApplication,
          files || []
        );
      })
    );

    return applicationsWithFiles;
  } catch (error) {
    console.error('getAllCertificationApplications 오류:', error);
    return [];
  }
}
