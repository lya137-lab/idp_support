import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Calendar, 
  FileText, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Filter,
  Download
} from 'lucide-react';
import { CertificationApplication, ApplicationStatus } from '@/types';

// 확장된 데모 데이터
const mockApplications: CertificationApplication[] = [
  {
    id: '1',
    userId: '1',
    employeeId: 'EMP001',
    employeeName: '김철수',
    company: 'OKH',
    department: '개발팀',
    certificationName: 'AWS Solutions Architect',
    acquisitionDate: '2024-02-10',
    educationCost: 200000,
    examFee: 150000,
    status: 'pending',
    createdAt: '2024-02-12',
    updatedAt: '2024-02-12',
    files: [
      {
        id: 'f1',
        name: '영수증.pdf',
        type: 'receipt',
        url: 'https://via.placeholder.com/900x1200.png?text=Receipt+Sample',
        size: 180_000,
        uploadedAt: '2024-02-12',
      },
      {
        id: 'f2',
        name: '합격증.pdf',
        type: 'certificate',
        url: 'https://via.placeholder.com/1200x900.png?text=Certificate+Sample',
        size: 240_000,
        uploadedAt: '2024-02-12',
      },
    ],
  },
  {
    id: '2',
    userId: '2',
    employeeId: 'EMP002',
    employeeName: '이영희',
    company: 'OKH',
    department: '기획팀',
    certificationName: 'PMP',
    acquisitionDate: '2024-02-08',
    educationCost: 350000,
    examFee: 150000,
    status: 'pending',
    createdAt: '2024-02-14',
    updatedAt: '2024-02-14',
    files: [
      {
        id: 'f3',
        name: '영수증.pdf',
        type: 'receipt',
        url: 'https://via.placeholder.com/900x1200.png?text=Receipt+PMP',
        size: 95_000,
        uploadedAt: '2024-02-14',
      },
    ],
  },
  {
    id: '3',
    userId: '3',
    employeeId: 'EMP003',
    employeeName: '박민수',
    company: 'OKS',
    department: '디자인팀',
    certificationName: 'Adobe Certified Expert',
    acquisitionDate: '2024-02-05',
    educationCost: 180000,
    examFee: 100000,
    status: 'pending',
    createdAt: '2024-02-15',
    updatedAt: '2024-02-15',
    files: [
      {
        id: 'f4',
        name: '합격증.pdf',
        type: 'certificate',
        url: 'https://via.placeholder.com/1200x900.png?text=Adobe+Certificate',
        size: 130_000,
        uploadedAt: '2024-02-15',
      },
    ],
  },
  {
    id: '4',
    userId: '4',
    employeeId: 'EMP004',
    employeeName: '정수진',
    company: 'OKH',
    department: '인사팀',
    certificationName: '공인노무사',
    acquisitionDate: '2024-01-20',
    educationCost: 500000,
    examFee: 80000,
    supportAmount: 435000,
    status: 'approved',
    createdAt: '2024-01-25',
    updatedAt: '2024-01-28',
    files: [
      {
        id: 'f5',
        name: '영수증.pdf',
        type: 'receipt',
        url: 'https://via.placeholder.com/900x1200.png?text=Receipt+노무사',
        size: 210_000,
        uploadedAt: '2024-01-25',
      },
      {
        id: 'f6',
        name: '합격증.pdf',
        type: 'certificate',
        url: 'https://via.placeholder.com/1200x900.png?text=Certificate+노무사',
        size: 260_000,
        uploadedAt: '2024-01-25',
      },
    ],
  },
  {
    id: '5',
    userId: '5',
    employeeId: 'EMP005',
    employeeName: '최동욱',
    company: 'OKS',
    department: '영업팀',
    certificationName: '토익스피킹',
    acquisitionDate: '2024-01-15',
    educationCost: 50000,
    examFee: 80000,
    status: 'rejected',
    createdAt: '2024-01-18',
    updatedAt: '2024-01-20',
    files: [],
    rejectionReason: '지원 기준에 해당하지 않는 자격증입니다.',
  },
];

export default function ApprovalManagement() {
  const { toast } = useToast();
  const [applications, setApplications] = useState(mockApplications);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 상세 보기 다이얼로그
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<CertificationApplication | null>(null);
  
  // 반려 다이얼로그
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const departments = [...new Set(applications.map(a => a.department))];
  const companies = [...new Set(applications.map(a => a.company).filter(Boolean))];

  // 신청년도 목록 생성 (최근 5년)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  
  // 월 목록
  const months = [
    { value: '01', label: '1월' },
    { value: '02', label: '2월' },
    { value: '03', label: '3월' },
    { value: '04', label: '4월' },
    { value: '05', label: '5월' },
    { value: '06', label: '6월' },
    { value: '07', label: '7월' },
    { value: '08', label: '8월' },
    { value: '09', label: '9월' },
    { value: '10', label: '10월' },
    { value: '11', label: '11월' },
    { value: '12', label: '12월' },
  ];

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.certificationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || app.department === departmentFilter;
    const matchesCompany = companyFilter === 'all' || app.company === companyFilter;
    
    // 신청년도 필터링
    let matchesYear = true;
    if (yearFilter !== 'all') {
      const appYear = app.createdAt.split('-')[0];
      matchesYear = appYear === yearFilter;
    }
    
    // 신청월 필터링
    let matchesMonth = true;
    if (monthFilter !== 'all' && yearFilter !== 'all') {
      const appMonth = app.createdAt.split('-')[1];
      matchesMonth = appMonth === monthFilter;
    }
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesCompany && matchesYear && matchesMonth;
  });

  const pendingApplications = filteredApplications.filter(a => a.status === 'pending');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pendingApplications.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const openDetailDialog = (app: CertificationApplication) => {
    setSelectedApplication(app);
    setDetailDialogOpen(true);
  };

  const handleApprove = (id: string) => {
    setApplications(prev => prev.map(app => 
      app.id === id 
        ? { 
            ...app, 
            status: 'approved' as ApplicationStatus,
            supportAmount: Math.floor((app.educationCost + app.examFee) * 0.75),
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : app
    ));
    toast({
      title: '승인 완료',
      description: '신청이 승인되었습니다.',
    });
  };

  const handleBulkApprove = () => {
    setApplications(prev => prev.map(app => 
      selectedIds.includes(app.id) && app.status === 'pending'
        ? { 
            ...app, 
            status: 'approved' as ApplicationStatus,
            supportAmount: Math.floor((app.educationCost + app.examFee) * 0.75),
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : app
    ));
    toast({
      title: '일괄 승인 완료',
      description: `${selectedIds.length}건의 신청이 승인되었습니다.`,
    });
    setSelectedIds([]);
  };

  const openRejectDialog = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectingId) {
      toast({
        title: '오류',
        description: '반려할 신청을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 반려 사유 검증
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast({
        title: '반려 사유 필요',
        description: '반려 사유를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedReason.length < 10) {
      toast({
        title: '반려 사유 부족',
        description: '반려 사유는 최소 10자 이상 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 반려할 신청 정보 가져오기
    const application = applications.find(app => app.id === rejectingId);
    if (!application) {
      toast({
        title: '오류',
        description: '신청 정보를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    setApplications(prev => prev.map(app => 
      app.id === rejectingId
        ? { 
            ...app, 
            status: 'rejected' as ApplicationStatus,
            rejectionReason: trimmedReason,
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : app
    ));
    
    toast({
      title: '반려 완료',
      description: `${application.employeeName}님의 신청이 반려되었습니다.`,
    });
    
    setRejectDialogOpen(false);
    setRejectingId(null);
    setRejectionReason('');
  };

  return (
    <AppLayout allowedRoles={['admin', 'system_admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">승인 관리</h1>
            <p className="text-muted-foreground mt-1">
              자격증 취득 지원 신청을 검토하고 승인합니다
            </p>
          </div>
          {selectedIds.length > 0 && (
            <Button 
              onClick={handleBulkApprove}
              className="gradient-primary text-primary-foreground gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              선택 항목 일괄 승인 ({selectedIds.length}건)
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              필터
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 검색 및 기본 필터 */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="사번, 이름, 자격증명 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as ApplicationStatus | 'all')}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 계열사명, 신청년도, 신청월 필터 */}
            <div className="flex flex-col md:flex-row gap-4">
              <Select
                value={companyFilter}
                onValueChange={setCompanyFilter}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="계열사명" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 계열사</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={yearFilter}
                onValueChange={(value) => {
                  setYearFilter(value);
                  // 년도 변경 시 월 필터 초기화
                  if (value === 'all') {
                    setMonthFilter('all');
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="신청년도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 년도</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={monthFilter}
                onValueChange={setMonthFilter}
                disabled={yearFilter === 'all'}
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder={yearFilter === 'all' ? '먼저 년도를 선택하세요' : '신청월'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 월</SelectItem>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 필터 초기화 버튼 */}
              {(statusFilter !== 'all' || departmentFilter !== 'all' || companyFilter !== 'all' || yearFilter !== 'all' || monthFilter !== 'all' || searchTerm) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setDepartmentFilter('all');
                    setCompanyFilter('all');
                    setYearFilter('all');
                    setMonthFilter('all');
                    setSearchTerm('');
                  }}
                  className="w-full md:w-auto"
                >
                  필터 초기화
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">신청 목록</CardTitle>
            <CardDescription>
              총 {filteredApplications.length}건 | 대기 {pendingApplications.length}건
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          pendingApplications.length > 0 &&
                          selectedIds.length === pendingApplications.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>신청자</TableHead>
                    <TableHead>계열사</TableHead>
                    <TableHead>자격증명</TableHead>
                    <TableHead>취득일</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="text-right">총 비용</TableHead>
                    <TableHead className="text-right">지원금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id} className="group">
                      <TableCell>
                        {app.status === 'pending' && (
                          <Checkbox
                            checked={selectedIds.includes(app.id)}
                            onCheckedChange={(checked) => 
                              handleSelectOne(app.id, checked as boolean)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{app.employeeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {app.employeeId} · {app.department}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.company ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground font-medium">
                            {app.company}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/5">
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
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          {app.createdAt}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(app.educationCost + app.examFee).toLocaleString()}원
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openDetailDialog(app)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleApprove(app.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => openRejectDialog(app.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredApplications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center">
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

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                신청 상세 정보
              </DialogTitle>
              <DialogDescription>
                신청자가 제출한 정보와 첨부파일을 확인할 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">신청자 정보</p>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <p>{selectedApplication.employeeName} ({selectedApplication.employeeId})</p>
                      <p>{selectedApplication.department}</p>
                      <p>계열사: {selectedApplication.company || '-'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">신청 세부 정보</p>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <p>자격증명: {selectedApplication.certificationName}</p>
                      <p>취득일: {selectedApplication.acquisitionDate}</p>
                      <p>신청일: {selectedApplication.createdAt}</p>
                      <p>상태: <StatusBadge status={selectedApplication.status} /></p>
                      {selectedApplication.rejectionReason && (
                        <p className="text-destructive">반려 사유: {selectedApplication.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <p className="text-sm font-medium">비용 정보</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>교육비: {selectedApplication.educationCost.toLocaleString()}원</p>
                    <p>응시료: {selectedApplication.examFee.toLocaleString()}원</p>
                    <p>총 비용: {(selectedApplication.educationCost + selectedApplication.examFee).toLocaleString()}원</p>
                    <p>지원금액: {selectedApplication.supportAmount ? `${selectedApplication.supportAmount.toLocaleString()}원` : '-'}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium mb-2">첨부파일</p>
                  {selectedApplication.files && selectedApplication.files.length > 0 ? (
                    <div className="space-y-2">
                      {selectedApplication.files.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              유형: {file.type === 'receipt' ? '영수증' : '합격증'} · {(file.size / 1024).toFixed(1)} KB · 업로드: {file.uploadedAt}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                새 창으로 보기
                              </a>
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                              <a href={file.url} download={file.name}>
                                <Download className="h-4 w-4 mr-1" />
                                다운로드
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">첨부파일이 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectionReason('');
            setRejectingId(null);
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                신청 반려
              </DialogTitle>
              <DialogDescription>
                반려 사유를 입력해주세요. 신청자에게 반려 사유가 전달됩니다.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  (최소 10자 이상 입력 필요)
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {/* 신청 정보 미리보기 */}
              {rejectingId && (() => {
                const app = applications.find(a => a.id === rejectingId);
                if (!app) return null;
                return (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium mb-1">신청 정보</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>신청자: {app.employeeName} ({app.employeeId})</p>
                      <p>자격증명: {app.certificationName}</p>
                      <p>부서: {app.department}</p>
                    </div>
                  </div>
                );
              })()}

              {/* 반려 사유 입력 */}
              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-sm font-medium">
                  반려 사유 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="예: 지원 기준표에 해당 자격증이 등록되어 있지 않습니다.&#10;예: 제출하신 서류가 불완전합니다.&#10;예: 자격증 취득일이 지원 기간을 벗어났습니다."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={6}
                  className="resize-none"
                  required
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={`${
                    rejectionReason.length < 10 
                      ? 'text-destructive' 
                      : 'text-muted-foreground'
                  }`}>
                    {rejectionReason.length}자 / 최소 10자 이상
                  </span>
                  {rejectionReason.length > 0 && rejectionReason.length < 10 && (
                    <span className="text-destructive">
                      최소 10자 이상 입력해주세요
                    </span>
                  )}
                </div>
              </div>

              {/* 반려 사유 예시 */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  반려 사유 예시:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>지원 기준표에 해당 자격증이 등록되어 있지 않습니다.</li>
                  <li>제출하신 서류가 불완전하거나 확인이 어렵습니다.</li>
                  <li>자격증 취득일이 지원 기간을 벗어났습니다.</li>
                  <li>지원 대상에 해당하지 않습니다.</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setRejectingId(null);
                }}
              >
                취소
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={rejectionReason.trim().length < 10}
              >
                반려 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
