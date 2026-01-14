import { supabase } from '@/lib/supabaseClient';

/**
 * 파일 업로드 결과 타입
 */
export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Supabase Storage에 파일 업로드
 * 
 * @param file 업로드할 파일
 * @param bucketName Storage bucket 이름
 * @param folderPath 저장할 폴더 경로 (선택사항)
 * @returns 업로드 결과 (public URL 포함)
 */
export async function uploadFileToStorage(
  file: File,
  bucketName: string,
  folderPath: string = 'applications'
): Promise<FileUploadResult> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return {
        success: false,
        error: '인증된 사용자가 없습니다.',
      };
    }

    // 고유한 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folderPath}/${authUser.id}/${timestamp}_${sanitizedFileName}`;

    // 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // 기존 파일 덮어쓰기 방지
      });

    if (uploadError) {
      console.error('파일 업로드 오류:', uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    if (!uploadData) {
      return {
        success: false,
        error: '파일 업로드 실패',
      };
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    if (!urlData) {
      return {
        success: false,
        error: 'Public URL 생성 실패',
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
    };
  } catch (error) {
    console.error('uploadFileToStorage 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 여러 파일을 일괄 업로드
 * 
 * @param files 업로드할 파일 배열
 * @param bucketName Storage bucket 이름
 * @param folderPath 저장할 폴더 경로 (선택사항)
 * @returns 업로드 결과 배열
 */
export async function uploadMultipleFilesToStorage(
  files: File[],
  bucketName: string,
  folderPath: string = 'applications'
): Promise<FileUploadResult[]> {
  const uploadPromises = files.map(file => 
    uploadFileToStorage(file, bucketName, folderPath)
  );

  return Promise.all(uploadPromises);
}

/**
 * Storage에서 파일 삭제
 * 
 * @param bucketName Storage bucket 이름
 * @param filePath 삭제할 파일 경로
 * @returns 삭제 성공 여부
 */
export async function deleteFileFromStorage(
  bucketName: string,
  filePath: string
): Promise<boolean> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return false;
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('파일 삭제 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteFileFromStorage 오류:', error);
    return false;
  }
}

/**
 * 파일의 Public URL 가져오기
 * 
 * @param bucketName Storage bucket 이름
 * @param filePath 파일 경로
 * @returns Public URL
 */
export function getFilePublicUrl(bucketName: string, filePath: string): string {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
