# Supabase RLS 정책 수정 가이드

## 문제
support_criteria 테이블에 데이터가 있지만 조회가 되지 않는 경우, RLS(Row Level Security) 정책 문제일 가능성이 높습니다.

## 해결 방법

### 방법 1: RLS 정책 수정 (권장)

1. Supabase Dashboard 접속
2. SQL Editor로 이동
3. 다음 SQL을 실행:

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can view active criteria" ON support_criteria;
DROP POLICY IF EXISTS "Admins can manage all criteria" ON support_criteria;

-- 모든 사용자가 조회 가능하도록 정책 생성
CREATE POLICY "Anyone can view support criteria" ON support_criteria
  FOR SELECT USING (true);

-- 모든 사용자가 추가/수정/삭제 가능하도록 정책 생성 (개발/테스트용)
CREATE POLICY "Anyone can manage support criteria" ON support_criteria
  FOR ALL USING (true);
```

### 방법 2: RLS 임시 비활성화 (개발/테스트용)

```sql
ALTER TABLE support_criteria DISABLE ROW LEVEL SECURITY;
```

## 확인 방법

1. SQL 실행 후 브라우저에서 페이지 새로고침
2. 브라우저 콘솔(F12)에서 데이터 로드 메시지 확인
3. 관리자 페이지의 지원 기준표에서 데이터가 표시되는지 확인

## 주의사항

- 방법 1은 정책을 유지하면서 접근 권한만 변경합니다 (권장)
- 방법 2는 RLS를 완전히 비활성화합니다 (개발/테스트용)
- 실제 운영 환경에서는 적절한 권한 체크가 필요합니다
