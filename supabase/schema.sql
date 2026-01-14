-- ============================================
-- SkillCert Automator Database Schema
-- ============================================

-- 사용자 역할 타입
CREATE TYPE user_role AS ENUM ('employee', 'admin', 'system_admin');

-- 직책 타입
CREATE TYPE position_type AS ENUM (
  '팀원', 
  '팀장', 
  '팀장업무대행', 
  '지점장', 
  '지부장', 
  '실장', 
  '센터장', 
  '부장', 
  '단장', 
  '국장', 
  '기업금융센터장', 
  'RM', 
  'RM지점장'
);

-- 신청 상태 타입
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- 파일 타입
CREATE TYPE file_type AS ENUM ('receipt', 'certificate');

-- ============================================
-- 사용자 테이블 (users)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(50) NOT NULL, -- 계열사명 (약자)
  department VARCHAR(100) NOT NULL,
  rank VARCHAR(50) NOT NULL, -- 직급
  position position_type NOT NULL, -- 직책
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  password_hash TEXT NOT NULL, -- 해시화된 비밀번호
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 테이블 인덱스
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX idx_users_department ON users(department);

-- ============================================
-- 지원 기준표 테이블 (support_criteria)
-- ============================================
CREATE TABLE support_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_category VARCHAR(100) NOT NULL, -- 자격구분
  certification_name VARCHAR(200) NOT NULL, -- 자격증명
  organizer VARCHAR(200) NOT NULL, -- 주관
  support_criteria TEXT NOT NULL, -- 지원기준
  exam_fee INTEGER NOT NULL DEFAULT 0, -- 응시료(원)
  education_cost INTEGER NOT NULL DEFAULT 0, -- 교육비(원)
  support_target VARCHAR(200) NOT NULL, -- 지원대상
  effective_start_date DATE NOT NULL, -- 적용시작일
  effective_end_date DATE NOT NULL, -- 적용종료일
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 지원 기준표 인덱스
CREATE INDEX idx_support_criteria_certification_name ON support_criteria(certification_name);
CREATE INDEX idx_support_criteria_is_active ON support_criteria(is_active);
CREATE INDEX idx_support_criteria_dates ON support_criteria(effective_start_date, effective_end_date);

-- ============================================
-- 자격증 신청 테이블 (certification_applications)
-- ============================================
CREATE TABLE certification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  company VARCHAR(50), -- 계열사명 (약자)
  department VARCHAR(100) NOT NULL,
  certification_name VARCHAR(200) NOT NULL,
  acquisition_date DATE NOT NULL, -- 취득일
  education_cost INTEGER NOT NULL DEFAULT 0,
  exam_fee INTEGER NOT NULL DEFAULT 0,
  support_amount INTEGER, -- 지원금액
  status application_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT, -- 반려 사유
  notes TEXT, -- 비고
  ocr_raw_text TEXT, -- OCR 원본 텍스트
  ocr_extracted_amount INTEGER, -- OCR 추출 금액
  ocr_extracted_cert_name VARCHAR(200), -- OCR 추출 자격증명
  ocr_extracted_date DATE, -- OCR 추출 날짜
  ocr_confidence DECIMAL(5,2), -- OCR 정확도
  ocr_is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자격증 신청 테이블 인덱스
CREATE INDEX idx_applications_user_id ON certification_applications(user_id);
CREATE INDEX idx_applications_employee_id ON certification_applications(employee_id);
CREATE INDEX idx_applications_status ON certification_applications(status);
CREATE INDEX idx_applications_company ON certification_applications(company);
CREATE INDEX idx_applications_created_at ON certification_applications(created_at);
CREATE INDEX idx_applications_acquisition_date ON certification_applications(acquisition_date);

-- ============================================
-- 신청 파일 테이블 (application_files)
-- ============================================
CREATE TABLE application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES certification_applications(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type file_type NOT NULL,
  url TEXT NOT NULL, -- 파일 URL (Supabase Storage 또는 외부 URL)
  size INTEGER NOT NULL, -- 파일 크기 (bytes)
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 신청 파일 테이블 인덱스
CREATE INDEX idx_files_application_id ON application_files(application_id);
CREATE INDEX idx_files_type ON application_files(type);

-- ============================================
-- 업데이트 시간 자동 갱신 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_criteria_updated_at BEFORE UPDATE ON support_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON certification_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- 사용자 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR employee_id IN (
    SELECT employee_id FROM users WHERE id::text = auth.uid()::text
  ));

-- 관리자는 모든 사용자 조회 가능
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'system_admin')
    )
  );

-- 자격증 신청 테이블 RLS
ALTER TABLE certification_applications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 신청만 조회 가능
CREATE POLICY "Users can view own applications" ON certification_applications
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE id::text = auth.uid()::text
    )
  );

-- 관리자는 모든 신청 조회 가능
CREATE POLICY "Admins can view all applications" ON certification_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'system_admin')
    )
  );

-- 사용자는 자신의 신청만 생성 가능
CREATE POLICY "Users can create own applications" ON certification_applications
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE id::text = auth.uid()::text
    )
  );

-- 관리자는 신청 상태 변경 가능
CREATE POLICY "Admins can update applications" ON certification_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'system_admin')
    )
  );

-- 신청 파일 테이블 RLS
ALTER TABLE application_files ENABLE ROW LEVEL SECURITY;

-- 신청 파일은 해당 신청의 사용자와 관리자만 조회 가능
CREATE POLICY "Users can view own application files" ON application_files
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM certification_applications 
      WHERE user_id IN (
        SELECT id FROM users WHERE id::text = auth.uid()::text
      )
    )
  );

-- 지원 기준표는 모든 인증된 사용자가 조회 가능
ALTER TABLE support_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active criteria" ON support_criteria
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = true
  );

-- 관리자는 모든 지원 기준표 관리 가능
CREATE POLICY "Admins can manage all criteria" ON support_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role IN ('admin', 'system_admin')
    )
  );
