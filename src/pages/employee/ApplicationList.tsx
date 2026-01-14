import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Calendar, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import { CertificationApplication, ApplicationStatus } from '@/types';

// 데모 데이터
const mockApplications: CertificationApplication[] = [
  {
    id: '1',
    userId: '1',
    employeeId: 'EMP001',
    employeeName: '김철수',
    department: '개발팀',
    certificationName: '정보처리기사',
    acquisitionDate: '2024-01-15',
    educationCost: 150000,
    examFee: 30000,
    supportAmount: 135000,
    status: 'approved',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-22',
    files: [],
  },
  {
    id: '2',
    userId: '1',
    employeeId: 'EMP001',
    employeeName: '김철수',
    department: '개발팀',
    certificationName: 'AWS Solutions Architect',
    acquisitionDate: '2024-02-10',
    educationCost: 200000,
    examFee: 150000,
    status: 'pending',
    createdAt: '2024-02-12',
    updatedAt: '2024-02-12',
    files: [],
  },
  {
    id: '3',
    userId: '1',
    employeeId: 'EMP001',
    employeeName: '김철수',
    department: '개발팀',
    certificationName: 'SQLD',
    acquisitionDate: '2023-12-05',
    educationCost: 80000,
    examFee: 30000,
    status: 'rejected',
    createdAt: '2023-12-10',
    updatedAt: '2023-12-12',
    files: [],
    rejectionReason: '지원 기준에 해당하지 않는 자격증입니다.',
  },
  {
    id: '4',
    userId: '1',
    employeeId: 'EMP001',
    employeeName: '김철수',
    department: '개발팀',
    certificationName: 'CPPG',
    acquisitionDate: '2024-03-01',
    educationCost: 0,
    examFee: 50000,
    status: 'pending',
    createdAt: '2024-03-05',
    updatedAt: '2024-03-05',
    files: [],
  },
];

export default function ApplicationList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  const filteredApplications = mockApplications.filter(app => {
    const matchesSearch = app.certificationName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout allowedRoles={['employee']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">신청 내역</h1>
            <p className="text-muted-foreground mt-1">
              자격증 취득 지원 신청 현황을 확인하세요
            </p>
          </div>
          <Link to="/applications/new">
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              신규 신청
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="자격증명으로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ApplicationStatus | 'all')}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">신청 목록</CardTitle>
            <CardDescription>
              총 {filteredApplications.length}건의 신청 내역
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>자격증명</TableHead>
                    <TableHead>취득일</TableHead>
                    <TableHead className="text-right">교육비</TableHead>
                    <TableHead className="text-right">응시료</TableHead>
                    <TableHead className="text-right">지원금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{app.certificationName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {app.acquisitionDate}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {app.educationCost.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right">
                        {app.examFee.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {app.supportAmount 
                          ? `${app.supportAmount.toLocaleString()}원`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredApplications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10 opacity-30" />
                          <p>검색 결과가 없습니다</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
