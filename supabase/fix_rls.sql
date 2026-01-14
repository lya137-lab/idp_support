-- support_criteria 테이블 RLS 정책 수정
-- 인증 없이도 조회 가능하도록 변경 (개발/테스트용)

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can view active criteria" ON support_criteria;
DROP POLICY IF EXISTS "Admins can manage all criteria" ON support_criteria;

-- 모든 사용자가 조회 가능하도록 정책 생성 (개발/테스트용)
CREATE POLICY "Anyone can view support criteria" ON support_criteria
  FOR SELECT USING (true);

-- 관리자는 모든 작업 가능 (users 테이블과 연동 필요)
-- 주의: 실제 운영 환경에서는 적절한 인증 방식을 사용해야 합니다
CREATE POLICY "Admins can manage all criteria" ON support_criteria
  FOR ALL USING (
    -- 임시로 항상 true로 설정 (개발/테스트용)
    -- 실제 운영 환경에서는 users 테이블과 연동하여 관리자 확인 필요
    true
  );
