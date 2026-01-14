# 환경변수 설정 가이드

## 문제 해결

환경변수가 제대로 로드되지 않는 경우 다음을 확인하세요:

### 1. .env 파일 위치 확인
프로젝트 루트 디렉토리에 `.env` 또는 `.env.local` 파일이 있어야 합니다.

### 2. 환경변수 형식 확인
Vite에서는 환경변수 이름이 `VITE_`로 시작해야 합니다:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 파일 생성 방법

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

또는 `.env.local` 파일을 사용할 수도 있습니다 (git에 커밋되지 않음).

### 4. 개발 서버 재시작
환경변수를 변경한 후에는 **반드시 개발 서버를 재시작**해야 합니다.

```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

### 5. 확인 방법
브라우저 개발자 도구(F12) → Console 탭에서 환경변수 확인 메시지를 확인하세요.

## 주의사항

- `.env` 파일은 절대 git에 커밋하지 마세요 (보안상 위험)
- 환경변수 값에 공백이나 특수문자가 있으면 따옴표로 감싸세요
- VITE_ 접두사가 없으면 환경변수가 로드되지 않습니다
