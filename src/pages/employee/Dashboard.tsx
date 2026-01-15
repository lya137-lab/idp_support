import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { CertificationApplication } from '@/types';

// 더미 신청 데이터 제거: 실제 데이터 연동 전까지 빈 목록 유지
const mockApplications: CertificationApplication[] = [];

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const stats = {
    total: mockApplications.length,
    pending: mockApplications.filter(a => a.status === 'pending').length,
    approved: mockApplications.filter(a => a.status === 'approved').length,
    rejected: mockApplications.filter(a => a.status === 'rejected').length,
  };

  const recentApplications = mockApplications.slice(0, 3);

  return (
    <AppLayout allowedRoles={['employee']}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              안녕하세요, {user?.name}님
            </h1>
            <p className="text-muted-foreground mt-1">
              자격증 취득 지원 현황을 확인하세요
            </p>
          </div>
          <Link to="/applications/new">
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              신규 신청
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="전체 신청"
            value={stats.total}
            icon={<FileText className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="대기 중"
            value={stats.pending}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="승인 완료"
            value={stats.approved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="반려"
            value={stats.rejected}
            icon={<XCircle className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Quick Actions & Recent Applications */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">빠른 작업</CardTitle>
              <CardDescription>자주 사용하는 기능</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/applications/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  자격증 취득 지원 신청
                </Button>
              </Link>
              <Link to="/applications" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                  <div className="p-1.5 rounded-md bg-accent/10">
                    <FileText className="h-4 w-4 text-accent" />
                  </div>
                  신청 내역 조회
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">최근 신청 내역</CardTitle>
                <CardDescription>최근 3건의 신청 현황</CardDescription>
              </div>
              <Link to="/applications">
                <Button variant="ghost" size="sm" className="gap-1">
                  전체보기 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {application.certificationName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{application.acquisitionDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={application.status} />
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(application.educationCost + application.examFee).toLocaleString()}원
                      </p>
                    </div>
                  </div>
                ))}

                {recentApplications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>신청 내역이 없습니다</p>
                    <Link to="/applications/new">
                      <Button variant="link" className="mt-2">
                        첫 신청하기
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
