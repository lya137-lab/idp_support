import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, User, Lock, Mail, Building, ArrowLeft } from 'lucide-react';
import mascotImage from '@/assets/mascot.png';
import { Position } from '@/types';

const POSITIONS: Position[] = [
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
  'RM지점장',
];

const COMPANY_EMAIL_DOMAIN = '@okfngroup.com';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    company: '',
    department: '',
    rank: '',
    position: '' as Position | '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 사내 메일 도메인 강제 부여
  const normalizeCompanyEmail = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN)) return trimmed;
    const local = trimmed.replace(/@.*/, '');
    return `${local}${COMPANY_EMAIL_DOMAIN}`;
  };

  const validateForm = (): boolean => {
    if (!formData.employeeId.trim()) {
      setError('사번을 입력해주세요.');
      return false;
    }
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return false;
    }
    if (!formData.company.trim()) {
      setError('회사명을 입력해주세요.');
      return false;
    }
    if (!formData.department.trim()) {
      setError('소속부서를 입력해주세요.');
      return false;
    }
    if (!formData.rank.trim()) {
      setError('직급을 입력해주세요.');
      return false;
    }
    if (!formData.position) {
      setError('직책을 선택해주세요.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    const normalizedEmail = normalizeCompanyEmail(formData.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('사내 이메일 형식을 확인해주세요.');
      return false;
    }
    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = normalizeCompanyEmail(formData.email);
      const success = await signup({
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
        company: formData.company.trim(),
        department: formData.department.trim(),
        rank: formData.rank.trim(),
        position: formData.position as Position,
        email: normalizedEmail,
        password: formData.password,
      });

      if (success) {
        // 회원가입 성공 시 로그인 페이지로 이동
        navigate('/login', { 
          state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } 
        });
      } else {
        setError('회원가입에 실패했습니다. 이미 등록된 사번일 수 있습니다.');
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left - Mascot & Branding */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center">
            <img 
              src={mascotImage} 
              alt="OK금융그룹 마스코트" 
              className="w-40 h-auto"
            />
            <div className="space-y-2 mt-4">
              <h2 className="text-xl font-bold text-secondary">
                자격증 취득을 응원합니다!
              </h2>
              <p className="text-sm text-muted-foreground">
                OK금융그룹 임직원 자격증 취득 지원 시스템
              </p>
            </div>
          </div>

          {/* Right - Signup Form */}
          <div className="w-full max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link to="/login">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">회원가입</h1>
                <p className="text-sm text-muted-foreground">임직원 정보를 입력해주세요</p>
              </div>
            </div>

            {/* Mascot for mobile */}
            <div className="lg:hidden flex justify-center mb-6">
              <img 
                src={mascotImage} 
                alt="OK금융그룹 마스코트" 
                className="w-24 h-auto"
              />
            </div>

            {/* Signup Card */}
            <Card className="shadow-elevated border-border/50">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-center font-bold">임직원 정보 입력</CardTitle>
                <CardDescription className="text-center">
                  모든 항목을 정확히 입력해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="animate-scale-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 사번 */}
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">사번 *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employeeId"
                          name="employeeId"
                          type="text"
                          placeholder="사번을 입력하세요"
                          value={formData.employeeId}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {/* 이름 */}
                    <div className="space-y-2">
                      <Label htmlFor="name">이름 *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="이름을 입력하세요"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 회사명 */}
                    <div className="space-y-2">
                      <Label htmlFor="company">회사명 (약자) *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          placeholder="예: OKH"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {/* 소속부서 */}
                    <div className="space-y-2">
                      <Label htmlFor="department">소속부서 *</Label>
                      <Input
                        id="department"
                        name="department"
                        type="text"
                        placeholder="예: 개발팀"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 직급 */}
                    <div className="space-y-2">
                      <Label htmlFor="rank">직급 *</Label>
                      <Input
                        id="rank"
                        name="rank"
                        type="text"
                        placeholder="예: 대리, 차장, 부장 등"
                        value={formData.rank}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* 직책 */}
                    <div className="space-y-2">
                      <Label htmlFor="position">직책 *</Label>
                      <Select
                        value={formData.position}
                        onValueChange={(value) => handleSelectChange('position', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="직책을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 이메일 */}
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일 *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="사내메일 계정 입력 (예: hong.gildong)"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @okfngroup.com 도메인을 자동으로 적용합니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 비밀번호 */}
                    <div className="space-y-2">
                      <Label htmlFor="password">비밀번호 *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="최소 4자 이상"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                          minLength={4}
                        />
                      </div>
                    </div>

                    {/* 비밀번호 확인 */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="비밀번호를 다시 입력하세요"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                          minLength={4}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground font-bold text-base py-5"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        가입 중...
                      </span>
                    ) : (
                      '회원가입'
                    )}
                  </Button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    이미 계정이 있으신가요?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      로그인
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
