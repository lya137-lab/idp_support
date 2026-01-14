import { supabase } from '@/lib/supabaseClient';
import { UploadedFile } from '@/types';

/**
 * Supabase application_files 테이블의 파일 데이터 타입
 */
export interface SupabaseApplicationFile {
  id: string;
  application_id: string;
  name: string;
  type: 'receipt' | 'certificate';
  url: string;
  size: number;
  uploaded_at: string;
}

/**
 * 파일 생성 데이터 타입
 */
export interface CreateApplicationFileData {
  application_id: string;
  name: string;
  type: 'receipt' | 'certificate';
  url: string;
  size: number;
}

/**
 * Supabase 파일 데이터를 앱의 UploadedFile 타입으로 변환
 */
function mapSupabaseFileToFile(supabaseFile: SupabaseApplicationFile): UploadedFile {
  return {
    id: supabaseFile.id,
    name: supabaseFile.name,
    type: supabaseFile.type,
    url: supabaseFile.url,
    size: supabaseFile.size,
    uploadedAt: supabaseFile.uploaded_at,
  };
}

/**
 * application_files 테이블에 파일 메타데이터 저장
 * 
 * @param fileData 파일 메타데이터
 * @returns 저장된 파일 정보 또는 null
 */
export async function createApplicationFile(
  fileData: CreateApplicationFileData
): Promise<UploadedFile | null> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return null;
    }

    // 신청이 본인 것인지 확인 (RLS 정책에 의해 자동으로 필터링되지만 추가 검증)
    const { data: application, error: appError } = await supabase
      .from('certification_applications')
      .select('user_id')
      .eq('id', fileData.application_id)
      .single();

    if (appError || !application) {
      console.error('신청 정보를 찾을 수 없습니다:', appError);
      return null;
    }

    if (application.user_id !== authUser.id) {
      console.error('본인의 신청에만 파일을 추가할 수 있습니다.');
      return null;
    }

    // application_files 테이블에 insert
    const { data, error } = await supabase
      .from('application_files')
      .insert({
        application_id: fileData.application_id,
        name: fileData.name,
        type: fileData.type, // file_type ENUM 사용
        url: fileData.url,
        size: fileData.size,
      })
      .select()
      .single();

    if (error) {
      console.error('파일 메타데이터 저장 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseFileToFile(data as SupabaseApplicationFile);
  } catch (error) {
    console.error('createApplicationFile 오류:', error);
    return null;
  }
}

/**
 * 여러 파일 메타데이터를 일괄 저장
 * 
 * @param filesData 파일 메타데이터 배열
 * @returns 저장된 파일 정보 배열
 */
export async function createMultipleApplicationFiles(
  filesData: CreateApplicationFileData[]
): Promise<UploadedFile[]> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return [];
    }

    // 모든 신청이 본인 것인지 확인
    const applicationIds = [...new Set(filesData.map(f => f.application_id))];
    const { data: applications, error: appError } = await supabase
      .from('certification_applications')
      .select('id, user_id')
      .in('id', applicationIds);

    if (appError || !applications) {
      console.error('신청 정보 조회 오류:', appError);
      return [];
    }

    // 본인의 신청인지 확인
    const invalidApps = applications.filter(app => app.user_id !== authUser.id);
    if (invalidApps.length > 0) {
      console.error('본인의 신청에만 파일을 추가할 수 있습니다.');
      return [];
    }

    // application_files 테이블에 일괄 insert
    const { data, error } = await supabase
      .from('application_files')
      .insert(
        filesData.map(file => ({
          application_id: file.application_id,
          name: file.name,
          type: file.type,
          url: file.url,
          size: file.size,
        }))
      )
      .select();

    if (error) {
      console.error('파일 메타데이터 일괄 저장 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(file => mapSupabaseFileToFile(file as SupabaseApplicationFile));
  } catch (error) {
    console.error('createMultipleApplicationFiles 오류:', error);
    return [];
  }
}

/**
 * 신청에 첨부된 파일 목록 조회
 * 
 * @param applicationId 신청 ID
 * @returns 파일 목록
 */
export async function getApplicationFiles(
  applicationId: string
): Promise<UploadedFile[]> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return [];
    }

    // 신청이 본인 것인지 확인
    const { data: application, error: appError } = await supabase
      .from('certification_applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('신청 정보를 찾을 수 없습니다:', appError);
      return [];
    }

    if (application.user_id !== authUser.id) {
      console.error('본인의 신청 파일만 조회할 수 있습니다.');
      return [];
    }

    // 파일 목록 조회
    const { data, error } = await supabase
      .from('application_files')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('파일 목록 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(file => mapSupabaseFileToFile(file as SupabaseApplicationFile));
  } catch (error) {
    console.error('getApplicationFiles 오류:', error);
    return [];
  }
}

/**
 * 파일 메타데이터 삭제
 * 
 * @param fileId 파일 ID
 * @returns 삭제 성공 여부
 */
export async function deleteApplicationFile(fileId: string): Promise<boolean> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return false;
    }

    // 파일이 본인 신청에 속하는지 확인
    const { data: file, error: fileError } = await supabase
      .from('application_files')
      .select('application_id, certification_applications!inner(user_id)')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      console.error('파일 정보를 찾을 수 없습니다:', fileError);
      return false;
    }

    // application_files 삭제
    const { error: deleteError } = await supabase
      .from('application_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('파일 메타데이터 삭제 오류:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteApplicationFile 오류:', error);
    return false;
  }
}
