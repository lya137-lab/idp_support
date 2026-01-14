/**
 * 환경변수 확인 유틸리티
 * 개발 환경에서만 사용
 */

export function checkSupabaseEnv(): {
  hasUrl: boolean;
  hasKey: boolean;
  isValid: boolean;
  url: string;
  key: string;
} {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    hasUrl: !!url,
    hasKey: !!key,
    isValid: !!url && !!key,
    url: url || '(설정되지 않음)',
    key: key ? `${key.substring(0, 20)}...` : '(설정되지 않음)',
  };
}

// 개발 환경에서만 콘솔에 출력
if (import.meta.env.DEV) {
  const envCheck = checkSupabaseEnv();
  console.log('=== 환경변수 확인 ===');
  console.log('VITE_SUPABASE_URL:', envCheck.hasUrl ? '✓ 설정됨' : '✗ 설정되지 않음');
  if (!envCheck.hasUrl) {
    console.error('  → .env 파일에 VITE_SUPABASE_URL을 추가하세요');
  }
  console.log('VITE_SUPABASE_ANON_KEY:', envCheck.hasKey ? '✓ 설정됨' : '✗ 설정되지 않음');
  if (!envCheck.hasKey) {
    console.error('  → .env 파일에 VITE_SUPABASE_ANON_KEY를 추가하세요');
  }
  console.log('상태:', envCheck.isValid ? '✓ 정상' : '✗ 오류');
  if (!envCheck.isValid) {
    console.error('  → .env 파일을 프로젝트 루트에 생성하고 환경변수를 설정하세요');
    console.error('  → .env.example 파일을 참고하세요');
  }
  console.log('==================');
  
  // 환경변수 값 일부 출력 (디버깅용)
  if (envCheck.hasUrl) {
    console.log('URL (일부):', envCheck.url.substring(0, 30) + '...');
  }
  if (envCheck.hasKey) {
    console.log('KEY (일부):', envCheck.key);
  }
}
