import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import mascotImage from '@/assets/mascot.png';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 회원가입 성공 메시지 표시
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // URL에서 state 제거
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 이미 로그인된 경우 적절한 페이지로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'system_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(employeeId, password);
    
    if (success) {
      // 역할에 따라 적절한 대시보드로 이동
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.role === 'admin' || user.role === 'system_admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } else {
      setError('사번 또는 비밀번호가 올바르지 않습니다.');
    }
    
    setIsSubmitting(false);
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

          {/* Right - Login Form */}
          <div className="w-full max-w-md mx-auto">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-primary-foreground">OK</span>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-primary">OK금융그룹</p>
                    <p className="text-xs text-muted-foreground">자격증 취득 지원 시스템</p>
                  </div>
                </div>
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

            {/* Login Card */}
            <Card className="shadow-elevated border-border/50">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-center font-bold">로그인</CardTitle>
                <CardDescription className="text-center">
                  사번과 비밀번호를 입력하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {successMessage && (
                    <Alert className="bg-success/10 border-success/30 animate-scale-in">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <AlertDescription className="text-success">{successMessage}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="destructive" className="animate-scale-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="employeeId">사번</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="employeeId"
                        type="text"
                        placeholder="사번을 입력하세요"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
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
                        로그인 중...
                      </span>
                    ) : (
                      '로그인'
                    )}
                  </Button>
                </form>

                {/* Links */}
                <div className="mt-6 space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    계정이 없으신가요?{' '}
                    <Link to="/signup" className="text-primary hover:underline font-medium">
                      회원가입
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    비밀번호를 잊으셨나요?{' '}
                    <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                      비밀번호 찾기
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                30분간 미사용 시 자동 로그아웃됩니다
              </p>
              <p className="text-xs text-muted-foreground">
                본 시스템은 사내 인트라넷 전용입니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
