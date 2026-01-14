import { supabase } from '@/lib/supabaseClient';
import { SupportCriteria } from '@/types';

/**
 * Supabase support_criteria 테이블의 지원 기준표 데이터 타입
 */
export interface SupabaseSupportCriteria {
  id: string;
  qualification_category: string;
  certification_name: string;
  organizer: string;
  support_criteria: string;
  exam_fee_krw?: number | null; // 응시료(원) - nullable
  education_cost: number;
  support_target: string;
  effective_start_date: string;
  effective_end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: string; // 분야
  exam_fee_usd?: number | null; // 응시료(달러)
}

/**
 * Supabase 지원 기준표를 앱의 SupportCriteria 타입으로 변환
 */
function mapSupabaseCriteriaToCriteria(
  supabaseCriteria: SupabaseSupportCriteria
): SupportCriteria {
  return {
    id: supabaseCriteria.id,
    qualificationCategory: supabaseCriteria.qualification_category || '',
    certificationName: supabaseCriteria.certification_name || '',
    organizer: supabaseCriteria.organizer || '',
    supportCriteria: supabaseCriteria.support_criteria || '',
    examFee: supabaseCriteria.exam_fee_krw != null && supabaseCriteria.exam_fee_krw !== 0 ? supabaseCriteria.exam_fee_krw : 0, // 응시료(원) - null 또는 0일 경우 0으로 표시
    educationCost: supabaseCriteria.education_cost ?? 0, // null/undefined일 경우 0으로 설정
    supportTarget: supabaseCriteria.support_target || '',
    effectiveStartDate: supabaseCriteria.effective_start_date || '',
    effectiveEndDate: supabaseCriteria.effective_end_date || '',
    isActive: supabaseCriteria.is_active ?? true,
    updatedAt: supabaseCriteria.updated_at || '',
    category: supabaseCriteria.category || undefined, // 분야
    examFeeUsd: supabaseCriteria.exam_fee_usd != null ? supabaseCriteria.exam_fee_usd : undefined, // 응시료(달러) - null/undefined일 경우 undefined로 설정
  };
}

/**
 * 조회 옵션 타입
 */
export interface SupportCriteriaQueryOptions {
  isActive?: boolean; // 활성화된 것만 조회 (기본값: true)
  certificationName?: string; // 자격증명으로 필터링
  qualificationCategory?: string; // 자격구분으로 필터링
  organizer?: string; // 주관으로 필터링
  supportTarget?: string; // 지원대상으로 필터링
  effectiveDate?: string; // 특정 날짜에 유효한 기준표 조회 (YYYY-MM-DD 형식)
  searchTerm?: string; // 자격증명, 주관, 자격구분에서 검색
}

/**
 * 모든 지원 기준표 조회 (활성화된 것만 기본)
 * 
 * @param options 조회 옵션
 * @returns 지원 기준표 목록
 */
export async function getAllSupportCriteria(
  options: SupportCriteriaQueryOptions = {}
): Promise<SupportCriteria[]> {
  try {
    console.log('getAllSupportCriteria 호출, 옵션:', options);
    
    let query = supabase
      .from('support_criteria')
      .select('*');

    // 기본적으로 활성화된 것만 조회
    if (options.isActive !== false) {
      query = query.eq('is_active', true);
    }

    // 자격증명으로 필터링
    if (options.certificationName) {
      query = query.ilike('certification_name', `%${options.certificationName}%`);
    }

    // 자격구분으로 필터링
    if (options.qualificationCategory) {
      query = query.eq('qualification_category', options.qualificationCategory);
    }

    // 주관으로 필터링
    if (options.organizer) {
      query = query.ilike('organizer', `%${options.organizer}%`);
    }

    // 지원대상으로 필터링
    if (options.supportTarget) {
      query = query.ilike('support_target', `%${options.supportTarget}%`);
    }

    // 특정 날짜에 유효한 기준표 조회
    if (options.effectiveDate) {
      query = query
        .lte('effective_start_date', options.effectiveDate)
        .gte('effective_end_date', options.effectiveDate);
    }

    // 검색어로 필터링 (자격증명, 주관, 자격구분에서 검색)
    if (options.searchTerm) {
      query = query.or(
        `certification_name.ilike.%${options.searchTerm}%,organizer.ilike.%${options.searchTerm}%,qualification_category.ilike.%${options.searchTerm}%`
      );
    }

    // 정렬: Supabase 최초 데이터 입력 순서와 동일하게 (created_at 오름차순)
    query = query.order('created_at', { ascending: true });

    console.log('Supabase 쿼리 실행 중...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ 지원 기준표 조회 오류:', error);
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('에러 상세:', error.details);
      console.error('에러 힌트:', error.hint);
      
      // RLS 정책 오류인 경우 안내 메시지
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('');
        console.error('⚠️ RLS 정책 오류로 보입니다.');
        console.error('해결 방법:');
        console.error('1. Supabase Dashboard → SQL Editor로 이동');
        console.error('2. supabase/fix_support_criteria_rls.sql 파일의 SQL을 실행하세요');
        console.error('3. 또는 README_SUPABASE_RLS.md 파일을 참고하세요');
      }
      
      return [];
    }

    console.log('쿼리 결과:', data);
    console.log('데이터 개수:', data?.length || 0);

    if (!data || data.length === 0) {
      console.warn('데이터가 없습니다. Supabase 테이블에 데이터가 있는지 확인하세요.');
      return [];
    }

    const mapped = data.map(criteria => mapSupabaseCriteriaToCriteria(criteria as SupabaseSupportCriteria));
    console.log('매핑된 데이터:', mapped);
    return mapped;
  } catch (error) {
    console.error('getAllSupportCriteria 예외 발생:', error);
    console.error('에러 타입:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('에러 스택:', error instanceof Error ? error.stack : 'N/A');
    return [];
  }
}

/**
 * ID로 지원 기준표 조회
 * 
 * @param id 지원 기준표 ID
 * @returns 지원 기준표 정보 또는 null
 */
export async function getSupportCriteriaById(id: string): Promise<SupportCriteria | null> {
  try {
    const { data, error } = await supabase
      .from('support_criteria')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('지원 기준표 조회 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseCriteriaToCriteria(data as SupabaseSupportCriteria);
  } catch (error) {
    console.error('getSupportCriteriaById 오류:', error);
    return null;
  }
}

/**
 * 자격증명으로 지원 기준표 조회
 * 
 * @param certificationName 자격증명 (부분 일치)
 * @param isActiveOnly 활성화된 것만 조회 (기본값: true)
 * @returns 지원 기준표 목록
 */
export async function getSupportCriteriaByCertificationName(
  certificationName: string,
  isActiveOnly: boolean = true
): Promise<SupportCriteria[]> {
  try {
    let query = supabase
      .from('support_criteria')
      .select('*')
      .ilike('certification_name', `%${certificationName}%`);

    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('지원 기준표 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(criteria => mapSupabaseCriteriaToCriteria(criteria as SupabaseSupportCriteria));
  } catch (error) {
    console.error('getSupportCriteriaByCertificationName 오류:', error);
    return [];
  }
}

/**
 * 자격구분으로 지원 기준표 조회
 * 
 * @param qualificationCategory 자격구분
 * @param isActiveOnly 활성화된 것만 조회 (기본값: true)
 * @returns 지원 기준표 목록
 */
export async function getSupportCriteriaByQualificationCategory(
  qualificationCategory: string,
  isActiveOnly: boolean = true
): Promise<SupportCriteria[]> {
  try {
    let query = supabase
      .from('support_criteria')
      .select('*')
      .eq('qualification_category', qualificationCategory);

    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('지원 기준표 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(criteria => mapSupabaseCriteriaToCriteria(criteria as SupabaseSupportCriteria));
  } catch (error) {
    console.error('getSupportCriteriaByQualificationCategory 오류:', error);
    return [];
  }
}

/**
 * 현재 날짜 기준으로 유효한 지원 기준표 조회
 * 
 * @param isActiveOnly 활성화된 것만 조회 (기본값: true)
 * @returns 지원 기준표 목록
 */
export async function getActiveSupportCriteria(
  isActiveOnly: boolean = true
): Promise<SupportCriteria[]> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식

    let query = supabase
      .from('support_criteria')
      .select('*')
      .lte('effective_start_date', today)
      .gte('effective_end_date', today);

    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('지원 기준표 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(criteria => mapSupabaseCriteriaToCriteria(criteria as SupabaseSupportCriteria));
  } catch (error) {
    console.error('getActiveSupportCriteria 오류:', error);
    return [];
  }
}

/**
 * 검색어로 지원 기준표 조회
 * 자격증명, 주관, 자격구분에서 검색
 * 
 * @param searchTerm 검색어
 * @param isActiveOnly 활성화된 것만 조회 (기본값: true)
 * @returns 지원 기준표 목록
 */
export async function searchSupportCriteria(
  searchTerm: string,
  isActiveOnly: boolean = true
): Promise<SupportCriteria[]> {
  try {
    let query = supabase
      .from('support_criteria')
      .select('*')
      .or(
        `certification_name.ilike.%${searchTerm}%,organizer.ilike.%${searchTerm}%,qualification_category.ilike.%${searchTerm}%`
      );

    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('지원 기준표 검색 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(criteria => mapSupabaseCriteriaToCriteria(criteria as SupabaseSupportCriteria));
  } catch (error) {
    console.error('searchSupportCriteria 오류:', error);
    return [];
  }
}

/**
 * 모든 자격구분 목록 조회 (중복 제거)
 * 
 * @returns 자격구분 목록
 */
export async function getAllQualificationCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('support_criteria')
      .select('qualification_category')
      .eq('is_active', true);

    if (error) {
      console.error('자격구분 목록 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 중복 제거 및 정렬
    const categories = [...new Set(data.map(item => item.qualification_category))];
    return categories.sort();
  } catch (error) {
    console.error('getAllQualificationCategories 오류:', error);
    return [];
  }
}

/**
 * 모든 주관 목록 조회 (중복 제거)
 * 
 * @returns 주관 목록
 */
export async function getAllOrganizers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('support_criteria')
      .select('organizer')
      .eq('is_active', true);

    if (error) {
      console.error('주관 목록 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 중복 제거 및 정렬
    const organizers = [...new Set(data.map(item => item.organizer))];
    return organizers.sort();
  } catch (error) {
    console.error('getAllOrganizers 오류:', error);
    return [];
  }
}

/**
 * 지원 기준표 생성 데이터 타입
 */
export interface CreateSupportCriteriaData {
  qualification_category: string;
  certification_name: string;
  organizer: string;
  category?: string; // 분야
  support_criteria: string;
  exam_fee_krw?: number | null; // 응시료(원) - nullable
  exam_fee_usd?: number | null; // 응시료(달러)
  education_cost: number;
  support_target: string;
  effective_start_date: string;
  effective_end_date: string;
  is_active?: boolean;
}

/**
 * 지원 기준표 업데이트 데이터 타입
 */
export interface UpdateSupportCriteriaData {
  qualification_category?: string;
  certification_name?: string;
  organizer?: string;
  category?: string;
  support_criteria?: string;
  exam_fee_krw?: number | null; // 응시료(원) - nullable
  exam_fee_usd?: number | null; // 응시료(달러)
  education_cost?: number;
  support_target?: string;
  effective_start_date?: string;
  effective_end_date?: string;
  is_active?: boolean;
}

/**
 * 지원 기준표 생성
 * 관리자 권한 필요 (RLS 정책에 의해 자동 처리)
 * 
 * @param criteriaData 지원 기준표 생성 데이터
 * @returns 생성된 지원 기준표 정보 또는 null
 */
export async function createSupportCriteria(
  criteriaData: CreateSupportCriteriaData
): Promise<SupportCriteria | null> {
  try {
    const insertData: Record<string, any> = {
      qualification_category: criteriaData.qualification_category,
      certification_name: criteriaData.certification_name,
      organizer: criteriaData.organizer,
      support_criteria: criteriaData.support_criteria,
      education_cost: criteriaData.education_cost,
      support_target: criteriaData.support_target,
      effective_start_date: criteriaData.effective_start_date,
      effective_end_date: criteriaData.effective_end_date,
      is_active: criteriaData.is_active !== undefined ? criteriaData.is_active : true,
    };

    // 선택적 필드 추가
    if (criteriaData.category !== undefined) {
      insertData.category = criteriaData.category;
    }
    // 응시료(원) - 0 또는 undefined가 아닐 때만 추가, 그 외는 null
    if (criteriaData.exam_fee_krw !== undefined && criteriaData.exam_fee_krw !== null && criteriaData.exam_fee_krw !== 0) {
      insertData.exam_fee_krw = criteriaData.exam_fee_krw;
    } else {
      insertData.exam_fee_krw = null; // 0 또는 빈 값일 경우 null
    }
    // 응시료(달러) - null 또는 undefined가 아닐 때만 추가
    if (criteriaData.exam_fee_usd !== undefined && criteriaData.exam_fee_usd !== null) {
      insertData.exam_fee_usd = criteriaData.exam_fee_usd;
    } else if (criteriaData.exam_fee_usd === null) {
      // 명시적으로 null을 설정하려는 경우
      insertData.exam_fee_usd = null;
    }

    const { data, error } = await supabase
      .from('support_criteria')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('지원 기준표 생성 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseCriteriaToCriteria(data as SupabaseSupportCriteria);
  } catch (error) {
    console.error('createSupportCriteria 오류:', error);
    return null;
  }
}

/**
 * 지원 기준표 업데이트
 * 관리자 권한 필요 (RLS 정책에 의해 자동 처리)
 * 
 * @param id 지원 기준표 ID
 * @param updates 업데이트할 데이터
 * @returns 업데이트된 지원 기준표 정보 또는 null
 */
export async function updateSupportCriteria(
  id: string,
  updates: UpdateSupportCriteriaData
): Promise<SupportCriteria | null> {
  try {
    const updateData: Record<string, any> = {};
    
    if (updates.qualification_category !== undefined) updateData.qualification_category = updates.qualification_category;
    if (updates.certification_name !== undefined) updateData.certification_name = updates.certification_name;
    if (updates.organizer !== undefined) updateData.organizer = updates.organizer;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.support_criteria !== undefined) updateData.support_criteria = updates.support_criteria;
    // 응시료(원) - undefined가 아닐 때만 업데이트 (null 포함), 0일 경우 null로 처리
    if (updates.exam_fee_krw !== undefined) {
      updateData.exam_fee_krw = updates.exam_fee_krw === 0 ? null : updates.exam_fee_krw;
    }
    // 응시료(달러) - undefined가 아닐 때만 업데이트 (null 포함)
    if (updates.exam_fee_usd !== undefined) {
      updateData.exam_fee_usd = updates.exam_fee_usd; // null 또는 숫자 값
    }
    if (updates.education_cost !== undefined) updateData.education_cost = updates.education_cost;
    if (updates.support_target !== undefined) updateData.support_target = updates.support_target;
    if (updates.effective_start_date !== undefined) updateData.effective_start_date = updates.effective_start_date;
    if (updates.effective_end_date !== undefined) updateData.effective_end_date = updates.effective_end_date;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    const { data, error } = await supabase
      .from('support_criteria')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('지원 기준표 업데이트 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseCriteriaToCriteria(data as SupabaseSupportCriteria);
  } catch (error) {
    console.error('updateSupportCriteria 오류:', error);
    return null;
  }
}

/**
 * 지원 기준표 삭제
 * 관리자 권한 필요 (RLS 정책에 의해 자동 처리)
 * 
 * @param id 지원 기준표 ID
 * @returns 삭제 성공 여부
 */
export async function deleteSupportCriteria(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('support_criteria')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('지원 기준표 삭제 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteSupportCriteria 오류:', error);
    return false;
  }
}

/**
 * 지원 기준표 활성화 상태 토글
 * 관리자 권한 필요 (RLS 정책에 의해 자동 처리)
 * 
 * @param id 지원 기준표 ID
 * @param isActive 활성화 상태
 * @returns 업데이트된 지원 기준표 정보 또는 null
 */
export async function toggleSupportCriteriaActive(
  id: string,
  isActive: boolean
): Promise<SupportCriteria | null> {
  return updateSupportCriteria(id, { is_active: isActive });
}
