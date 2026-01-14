# Supabase 데이터베이스 스키마

## 설치 방법

1. Supabase 프로젝트 생성 후 SQL Editor로 이동
2. `schema.sql` 파일의 전체 내용을 복사하여 실행
3. 또는 Supabase CLI를 사용하는 경우:
   ```bash
   supabase db reset
   ```

## 테이블 구조

### 1. users (사용자)
- 사용자 기본 정보 및 인증 정보 저장
- employee_id를 고유 키로 사용
- role: employee, admin, system_admin

### 2. certification_applications (자격증 신청)
- 자격증 취득 지원 신청 내역
- OCR 결과 포함
- status: pending, approved, rejected

### 3. application_files (신청 파일)
- 신청서에 첨부된 파일 정보
- type: receipt (영수증), certificate (합격증)

### 4. support_criteria (지원 기준표)
- 자격증별 지원 기준 정보
- 관리자가 관리

## Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있으며:
- 사용자는 자신의 데이터만 조회/수정 가능
- 관리자는 모든 데이터 조회/수정 가능
- 지원 기준표는 모든 인증된 사용자가 조회 가능

## 인덱스

주요 조회 필드에 인덱스가 생성되어 있습니다:
- employee_id, email, company, department
- application status, created_at, company
- certification_name, is_active
