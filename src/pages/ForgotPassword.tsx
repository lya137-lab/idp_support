import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { AlertCircle, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import mascotImage from '@/assets/mascot.png';
import { useAuth } from '@/contexts/AuthContext';

type FindMethod = 'email' | 'phone';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { findPassword } = useAuth();
  
  const [findMethod, setFindMethod] = useState<FindMethod>('email');
  const [employeeId, setEmployeeId] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!employeeId.trim()) {
      setError('사번을 입력해주세요.');
      return;
    }

    if (!contact.trim()) {
      setError(findMethod === 'email' ? '이메일을 입력해주세요.' : '연락처를 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    if (findMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    // 연락처 형식 검증
    if (findMethod === 'phone' && !/^[0-9-]+$/.test(contact.replace(/-/g, ''))) {
      setError('올바른 연락처 형식을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await findPassword(employeeId, findMethod, contact);
      
      if (result.success) {
        setSuccess(true);
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate('/login', {
            state: { message: result.message || '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' }
          });
        }, 3000);
      } else {
        setError(result.message || '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('비밀번호 찾기 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
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

          {/* Right - Forgot Password Form */}
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link to="/login">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">비밀번호 찾기</h1>
                <p className="text-sm text-muted-foreground">사번과 이메일 또는 연락처를 입력해주세요</p>
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

            {/* Forgot Password Card */}
            <Card className="shadow-elevated border-border/50">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-center font-bold">비밀번호 찾기</CardTitle>
                <CardDescription className="text-center">
                  등록된 이메일 또는 연락처로 비밀번호를 재설정할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {success ? (
                  <div className="space-y-4">
                    <Alert className="bg-success/10 border-success/30">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <AlertDescription className="text-success">
                        비밀번호가 재설정되었습니다. 임시 비밀번호는 {findMethod === 'email' ? '이메일' : 'SMS'}로 발송되었습니다.
                        <br />
                        잠시 후 로그인 페이지로 이동합니다.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive" className="animate-scale-in">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* 사번 */}
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">사번 *</Label>
                      <Input
                        id="employeeId"
                        type="text"
                        placeholder="사번을 입력하세요"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                      />
                    </div>

                    {/* 찾기 방법 선택 */}
                    <div className="space-y-2">
                      <Label htmlFor="findMethod">찾기 방법 *</Label>
                      <Select value={findMethod} onValueChange={(value) => {
                        setFindMethod(value as FindMethod);
                        setContact('');
                        setError('');
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">이메일로 찾기</SelectItem>
                          <SelectItem value="phone">연락처로 찾기</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 이메일 또는 연락처 */}
                    <div className="space-y-2">
                      <Label htmlFor="contact">
                        {findMethod === 'email' ? '이메일' : '연락처'} *
                      </Label>
                      <div className="relative">
                        {findMethod === 'email' ? (
                          <>
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="contact"
                              type="email"
                              placeholder="example@okfngroup.com"
                              value={contact}
                              onChange={(e) => setContact(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </>
                        ) : (
                          <>
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="contact"
                              type="tel"
                              placeholder="010-1234-5678"
                              value={contact}
                              onChange={(e) => setContact(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </>
                        )}
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
                          처리 중...
                        </span>
                      ) : (
                        '비밀번호 찾기'
                      )}
                    </Button>
                  </form>
                )}

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    비밀번호를 기억하시나요?{' '}
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
