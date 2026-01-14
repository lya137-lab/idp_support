import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  Users,
  TrendingUp,
  Download,
  Loader2
} from 'lucide-react';
import { getAllSupportCriteria } from '@/services/supportCriteriaService';

// 데모 데이터
const monthlyData = [
  { month: '10월', applications: 15, approved: 12, amount: 1500000 },
  { month: '11월', applications: 22, approved: 18, amount: 2200000 },
  { month: '12월', applications: 18, approved: 15, amount: 1800000 },
  { month: '1월', applications: 25, approved: 20, amount: 2500000 },
  { month: '2월', applications: 30, approved: 24, amount: 3000000 },
  { month: '3월', applications: 12, approved: 8, amount: 1200000 },
];

// 자격증 분야별 통계 데이터 (동적으로 로드됨)

const pendingApplications = [
  {
    id: '1',
    employeeName: '김철수',
    department: '개발팀',
    certificationName: 'AWS Solutions Architect',
    createdAt: '2024-02-12',
    totalAmount: 350000,
  },
  {
    id: '2',
    employeeName: '이영희',
    department: '기획팀',
    certificationName: 'PMP',
    createdAt: '2024-02-14',
    totalAmount: 500000,
  },
  {
    id: '3',
    employeeName: '박민수',
    department: '디자인팀',
    certificationName: 'Adobe Certified Expert',
    createdAt: '2024-02-15',
    totalAmount: 280000,
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [categoryStats, setCategoryStats] = useState<{ name: string; count: number; color: string }[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // 자격증 분야별 통계 로드
  useEffect(() => {
    const loadCategoryStats = async () => {
      try {
        setIsLoadingStats(true);
        const criteria = await getAllSupportCriteria({ isActive: undefined }); // 모든 데이터 조회
        
        // 분야별로 집계
        const categoryMap = new Map<string, number>();
        criteria.forEach(c => {
          const category = c.category || '미분류';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        // 색상 팔레트
        const colors = [
          'hsl(19, 100%, 48%)',
          'hsl(40, 100%, 50%)',
          'hsl(145, 60%, 40%)',
          'hsl(217, 91%, 60%)',
          'hsl(280, 70%, 50%)',
          'hsl(0, 70%, 50%)',
          'hsl(200, 70%, 50%)',
          'hsl(30, 80%, 50%)',
        ];

        // 배열로 변환 및 정렬 (건수 내림차순)
        const stats = Array.from(categoryMap.entries())
          .map(([name, count], index) => ({
            name,
            count,
            color: colors[index % colors.length],
          }))
          .sort((a, b) => b.count - a.count);

        setCategoryStats(stats);
      } catch (error) {
        console.error('분야별 통계 로드 오류:', error);
        setCategoryStats([]);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadCategoryStats();
  }, []);

  return (
    <AppLayout allowedRoles={['admin', 'system_admin']}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              관리자 대시보드
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.department} · {user?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/reports">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                보고서 다운로드
              </Button>
            </Link>
            <Link to="/admin/approvals">
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Clock className="h-4 w-4" />
                승인 대기 ({pendingApplications.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="전체 신청"
            value="65건"
            icon={<FileText className="h-5 w-5" />}
            variant="primary"
            trend={{ value: 15, label: '전월 대비' }}
          />
          <StatCard
            title="승인 대기"
            value="12건"
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="이번달 승인"
            value="8건"
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="총 지원금액"
            value="12,200,000원"
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: 8, label: '전월 대비' }}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly Bar Chart */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">월별 신청 현황</CardTitle>
              <CardDescription>최근 6개월 신청 및 승인 건수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="applications" name="신청" fill="hsl(19, 100%, 48%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="승인" fill="hsl(40, 100%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Statistics Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">자격증 분야별 통계</CardTitle>
              <CardDescription>지원 기준표 기준 분야별 자격증 수</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="h-72 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : categoryStats.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  <p>데이터가 없습니다</p>
                </div>
              ) : (
                <>
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          className="text-xs"
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value}개`, '자격증 수']}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {categoryStats.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.name} ({item.count}개)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">승인 대기 목록</CardTitle>
              <CardDescription>처리가 필요한 신청 건</CardDescription>
            </div>
            <Link to="/admin/approvals">
              <Button variant="ghost" size="sm" className="gap-1">
                전체보기 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Clock className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {app.certificationName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {app.employeeName} · {app.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{app.totalAmount.toLocaleString()}원</p>
                    <p className="text-sm text-muted-foreground">{app.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
