-- support_criteria 테이블 RLS 정책 수정
-- 인증 없이도 조회 가능하도록 변경

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can view active criteria" ON support_criteria;
DROP POLICY IF EXISTS "Admins can manage all criteria" ON support_criteria;

-- 모든 사용자가 조회 가능하도록 정책 생성
CREATE POLICY "Anyone can view support criteria" ON support_criteria
  FOR SELECT USING (true);

-- 모든 사용자가 추가/수정/삭제 가능하도록 정책 생성 (개발/테스트용)
CREATE POLICY "Anyone can manage support criteria" ON support_criteria
  FOR ALL USING (true);
