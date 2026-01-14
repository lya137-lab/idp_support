import { createClient } from '@supabase/supabase-js';
import { checkSupabaseEnv } from '@/utils/envCheck';

// 환경변수 확인
const envCheck = checkSupabaseEnv();

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 환경변수가 없을 때 더 명확한 에러 메시지
if (!envCheck.isValid && import.meta.env.DEV) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!');
  console.error('');
  console.error('해결 방법:');
  console.error('1. 프로젝트 루트에 .env 파일을 생성하세요');
  console.error('2. 다음 내용을 추가하세요:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.error('3. 개발 서버를 재시작하세요 (npm run dev)');
  console.error('');
  console.error('자세한 내용은 README_ENV.md 파일을 참고하세요.');
}

// Supabase 클라이언트 생성 및 export
// 환경변수가 없어도 클라이언트는 생성하되, 사용 시 에러가 발생할 수 있음
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');

// 환경변수 검증 함수 (필요 시 호출)
export function validateSupabaseConfig(): boolean {
  if (!envCheck.isValid) {
    console.warn('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    console.warn('필요한 환경변수:');
    console.warn('  - VITE_SUPABASE_URL');
    console.warn('  - VITE_SUPABASE_ANON_KEY');
    console.warn('자세한 내용은 README_ENV.md 파일을 참고하세요.');
    return false;
  }
  return true;
}
