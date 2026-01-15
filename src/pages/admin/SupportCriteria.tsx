import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Table as TableIcon, 
  Download, 
  Upload, 
  FileSpreadsheet,
  ChevronDown,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SupportCriteria } from '@/types';
import { exportCriteriaToExcel, downloadCriteriaTemplate, parseCriteriaFromExcel } from '@/lib/excel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getAllSupportCriteria, 
  searchSupportCriteria,
  createSupportCriteria,
  updateSupportCriteria,
  deleteSupportCriteria,
  toggleSupportCriteriaActive
} from '@/services/supportCriteriaService';
import { validateSupabaseConfig } from '@/lib/supabaseClient';

interface CriteriaFormData {
  qualificationCategory: string;
  certificationName: string;
  organizer: string;
  category: string;
  supportCriteria: string;
  examFee: string;
  examFeeUsd: string;
  educationCost: string;
  supportTarget: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  isActive: boolean;
}

const defaultFormData: CriteriaFormData = {
  qualificationCategory: '',
  certificationName: '',
  organizer: '',
  category: '',
  supportCriteria: '',
  examFee: '',
  examFeeUsd: '',
  educationCost: '',
  supportTarget: '',
  effectiveStartDate: '',
  effectiveEndDate: '',
  isActive: true,
};

export default function SupportCriteriaPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 가로 스크롤 동기화를 위한 ref
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const fakeScrollRef = useRef<HTMLDivElement>(null);
  const [criteria, setCriteria] = useState<SupportCriteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CriteriaFormData>(defaultFormData);
  
  // 업로드 관련 상태
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedCriteria, setUploadedCriteria] = useState<Omit<SupportCriteria, 'id' | 'updatedAt'>[]>([]);
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('merge');

  // Supabase에서 지원 기준표 데이터 로드
  const loadCriteria = async () => {
    try {
      setIsLoading(true);
      
      // Supabase 환경변수 확인
      if (!validateSupabaseConfig()) {
        toast({
          title: '환경변수 미설정',
          description: 'Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      console.log('지원 기준표 데이터 로드 시작...');
      const data = await getAllSupportCriteria({ isActive: undefined }); // 모든 데이터 조회 (활성/비활성 모두)
      console.log('로드된 데이터:', data);
      console.log('데이터 개수:', data.length);
      
      if (data.length === 0) {
        console.warn('데이터가 없습니다. Supabase 테이블에 데이터가 있는지 확인하세요.');
        toast({
          title: '데이터 없음',
          description: '지원 기준표 데이터가 없습니다. Supabase 테이블에 데이터를 추가해주세요.',
          variant: 'default',
        });
      }
      
      setCriteria(data);
    } catch (error) {
      console.error('지원 기준표 로드 오류:', error);
      toast({
        title: '데이터 로드 실패',
        description: error instanceof Error ? error.message : '지원 기준표를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCriteria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색어가 변경될 때마다 Supabase에서 검색
  useEffect(() => {
    if (searchTerm.trim()) {
      const searchCriteria = async () => {
        try {
          setIsLoading(true);
          const data = await searchSupportCriteria(searchTerm, false); // 활성/비활성 모두 검색
          setCriteria(data);
        } catch (error) {
          console.error('검색 오류:', error);
          toast({
            title: '검색 실패',
            description: '검색 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      searchCriteria();
    } else {
      // 검색어가 비어있으면 전체 데이터 다시 로드
      loadCriteria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredCriteria = criteria.filter(c =>
    c.certificationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.qualificationCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (item: SupportCriteria) => {
    setEditingId(item.id);
    setFormData({
      qualificationCategory: item.qualificationCategory,
      certificationName: item.certificationName,
      organizer: item.organizer,
      category: item.category || '',
      supportCriteria: item.supportCriteria,
      examFee: item.examFee.toString(),
      examFeeUsd: item.examFeeUsd?.toString() || '',
      educationCost: item.educationCost.toString(),
      supportTarget: item.supportTarget,
      effectiveStartDate: item.effectiveStartDate,
      effectiveEndDate: item.effectiveEndDate,
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.qualificationCategory || !formData.certificationName) {
      toast({
        title: '입력 오류',
        description: '자격구분과 자격증명은 필수 입력 항목입니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        // 수정
        const updated = await updateSupportCriteria(editingId, {
          qualification_category: formData.qualificationCategory,
          certification_name: formData.certificationName,
          organizer: formData.organizer,
          category: formData.category || undefined,
          support_criteria: formData.supportCriteria,
          exam_fee_krw: formData.examFee && formData.examFee.trim() !== '' && parseInt(formData.examFee) !== 0 ? parseInt(formData.examFee) : null, // 응시료(원) - 빈 문자열 또는 0일 경우 null
          exam_fee_usd: formData.examFeeUsd && formData.examFeeUsd.trim() !== '' ? parseFloat(formData.examFeeUsd) : null, // 응시료(달러) - 빈 문자열일 경우 null
          education_cost: parseInt(formData.educationCost) || 0,
          support_target: formData.supportTarget,
          effective_start_date: formData.effectiveStartDate,
          effective_end_date: formData.effectiveEndDate,
          is_active: formData.isActive,
        });

        if (updated) {
          await loadCriteria(); // 데이터 다시 로드
          toast({
            title: '수정 완료',
            description: '지원 기준이 수정되었습니다.',
          });
        } else {
          toast({
            title: '수정 실패',
            description: '지원 기준 수정 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
          return;
        }
      } else {
        // 추가
        const created = await createSupportCriteria({
          qualification_category: formData.qualificationCategory,
          certification_name: formData.certificationName,
          organizer: formData.organizer,
          category: formData.category || undefined,
          support_criteria: formData.supportCriteria,
          exam_fee_krw: formData.examFee && formData.examFee.trim() !== '' && parseInt(formData.examFee) !== 0 ? parseInt(formData.examFee) : null, // 응시료(원) - 빈 문자열 또는 0일 경우 null
          exam_fee_usd: formData.examFeeUsd && formData.examFeeUsd.trim() !== '' ? parseFloat(formData.examFeeUsd) : null, // 응시료(달러) - 빈 문자열일 경우 null
          education_cost: parseInt(formData.educationCost) || 0,
          support_target: formData.supportTarget,
          effective_start_date: formData.effectiveStartDate,
          effective_end_date: formData.effectiveEndDate,
          is_active: formData.isActive,
        });

        if (created) {
          await loadCriteria(); // 데이터 다시 로드
          toast({
            title: '추가 완료',
            description: '새 지원 기준이 추가되었습니다.',
          });
        } else {
          toast({
            title: '추가 실패',
            description: '지원 기준 추가 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
          return;
        }
      }

      setDialogOpen(false);
      setFormData(defaultFormData);
      setEditingId(null);
    } catch (error) {
      console.error('handleSubmit 오류:', error);
      toast({
        title: '오류 발생',
        description: '작업 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteSupportCriteria(id);
      if (success) {
        await loadCriteria(); // 데이터 다시 로드
        toast({
          title: '삭제 완료',
          description: '지원 기준이 삭제되었습니다.',
        });
      } else {
        toast({
          title: '삭제 실패',
          description: '지원 기준 삭제 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('handleDelete 오류:', error);
      toast({
        title: '삭제 실패',
        description: '지원 기준 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string) => {
    try {
      const item = criteria.find(c => c.id === id);
      if (!item) return;

      const success = await toggleSupportCriteriaActive(id, !item.isActive);
      if (success) {
        await loadCriteria(); // 데이터 다시 로드
        toast({
          title: '상태 변경 완료',
          description: `지원 기준이 ${!item.isActive ? '활성화' : '비활성화'}되었습니다.`,
        });
      } else {
        toast({
          title: '상태 변경 실패',
          description: '상태 변경 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('toggleActive 오류:', error);
      toast({
        title: '상태 변경 실패',
        description: '상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Excel 다운로드 핸들러
  const handleExportExcel = () => {
    try {
      exportCriteriaToExcel(criteria);
      toast({
        title: '다운로드 완료',
        description: '지원 기준표가 Excel 파일로 저장되었습니다.',
      });
    } catch (error) {
      toast({
        title: '다운로드 실패',
        description: 'Excel 파일 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = () => {
    try {
      downloadCriteriaTemplate();
      toast({
        title: '템플릿 다운로드 완료',
        description: '빈 템플릿 Excel 파일이 저장되었습니다.',
      });
    } catch (error) {
      toast({
        title: '다운로드 실패',
        description: '템플릿 파일 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 확장자 확인
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: '지원하지 않는 파일 형식',
        description: 'Excel 파일(.xlsx, .xls)만 업로드 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const parsed = await parseCriteriaFromExcel(file);
      
      if (parsed.length === 0) {
        toast({
          title: '데이터 없음',
          description: 'Excel 파일에서 유효한 데이터를 찾을 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      setUploadedCriteria(parsed);
      setUploadDialogOpen(true);
    } catch (error) {
      toast({
        title: '파일 읽기 실패',
        description: error instanceof Error ? error.message : 'Excel 파일을 읽는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 업로드 확정 핸들러
  const handleConfirmUpload = async () => {
    try {
      setIsLoading(true);
      
      const criteriaToCreate = uploadedCriteria.map(c => ({
        qualification_category: c.qualificationCategory,
        certification_name: c.certificationName,
        organizer: c.organizer,
        category: c.category || undefined,
        support_criteria: c.supportCriteria,
        exam_fee_krw: c.examFee != null && c.examFee !== 0 ? c.examFee : null, // 응시료(원) - null 또는 0일 경우 null
        exam_fee_usd: c.examFeeUsd != null && c.examFeeUsd !== 0 ? c.examFeeUsd : null, // 응시료(달러) - null 또는 0일 경우 null
        education_cost: c.educationCost,
        support_target: c.supportTarget,
        effective_start_date: c.effectiveStartDate,
        effective_end_date: c.effectiveEndDate,
        is_active: c.isActive !== undefined ? c.isActive : true,
      }));

      if (uploadMode === 'replace') {
        // 전체 교체: 기존 데이터 모두 삭제 후 새로 추가
        // 주의: 실제로는 기존 데이터를 모두 삭제하는 것은 위험할 수 있으므로
        // 여기서는 모든 항목을 비활성화하고 새 항목을 추가하는 방식으로 처리
        // 또는 관리자가 수동으로 삭제하도록 안내
        
        // 새 항목들을 일괄 생성
        const createPromises = criteriaToCreate.map(data => createSupportCriteria(data));
        const results = await Promise.all(createPromises);
        const successCount = results.filter(r => r !== null).length;

        await loadCriteria();
        toast({
          title: '업로드 완료',
          description: `${successCount}개의 지원 기준이 추가되었습니다.`,
        });
      } else {
        // 병합: 자격증명 기준으로 중복 체크
        const existingData = await getAllSupportCriteria({ isActive: undefined });
        const existingNames = new Set(existingData.map(c => c.certificationName));
        const uniqueNew = criteriaToCreate.filter(c => !existingNames.has(c.certification_name));
        const duplicateCount = criteriaToCreate.length - uniqueNew.length;

        // 중복되지 않은 항목만 생성
        const createPromises = uniqueNew.map(data => createSupportCriteria(data));
        const results = await Promise.all(createPromises);
        const successCount = results.filter(r => r !== null).length;

        await loadCriteria();
        toast({
          title: '병합 완료',
          description: duplicateCount > 0 
            ? `${successCount}개 추가됨 (${duplicateCount}개 중복 제외)`
            : `${successCount}개의 지원 기준이 추가되었습니다.`,
        });
      }

      setUploadDialogOpen(false);
      setUploadedCriteria([]);
    } catch (error) {
      console.error('handleConfirmUpload 오류:', error);
      toast({
        title: '업로드 실패',
        description: 'Excel 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout allowedRoles={['admin', 'system_admin']}>
      {/* 페이지 기본 세로 스크롤 유지, 하단 고정 스크롤바 공간 확보 */}
      <div className="space-y-6 pb-14">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">지원 기준표</h1>
            <p className="text-muted-foreground mt-1">
              자격증별 지원 기준을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Excel 다운로드/업로드 드롭다운 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  현재 목록 다운로드
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  빈 템플릿 다운로드
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Excel 업로드
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={openAddDialog} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              기준 추가
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Search */}
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="자격구분, 자격증명 또는 주관으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Criteria Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-primary" />
              지원 기준 목록
            </CardTitle>
            <CardDescription>
              {isLoading ? '로딩 중...' : `총 ${filteredCriteria.length}개의 지원 기준`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-lg border">
                {/* 표 컨테이너: 세로 스크롤 없음, 가로 스크롤을 별도 컨트롤로 분리 */}
                <div
                  ref={tableScrollRef}
                  className="overflow-x-hidden"
                  onScroll={() => {
                    if (tableScrollRef.current && fakeScrollRef.current) {
                      fakeScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
                    }
                  }}
                >
                  <Table className="min-w-[1400px]">
                    <TableHeader className="bg-background">
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-[100px]">분야</TableHead>
                      <TableHead className="min-w-[120px]">자격구분</TableHead>
                      <TableHead className="min-w-[180px]">자격증명</TableHead>
                      <TableHead className="min-w-[150px]">주관</TableHead>
                      <TableHead className="min-w-[200px]">지원기준</TableHead>
                      <TableHead className="text-right min-w-[100px]">응시료(원)</TableHead>
                      <TableHead className="text-right min-w-[110px]">응시료(달러)</TableHead>
                      <TableHead className="text-right min-w-[100px]">교육비(원)</TableHead>
                      <TableHead className="min-w-[120px]">지원대상</TableHead>
                      <TableHead className="min-w-[110px]">적용시작일</TableHead>
                      <TableHead className="min-w-[110px]">적용종료일</TableHead>
                      <TableHead className="text-center min-w-[80px]">활성</TableHead>
                      <TableHead className="text-right min-w-[100px]">관리</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCriteria.map((item) => (
                      <TableRow key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                        <TableCell className="py-3">
                          {item.category ? (
                            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary whitespace-nowrap">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground whitespace-nowrap">
                            {item.qualificationCategory}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium py-3 text-sm whitespace-nowrap">
                          {item.certificationName}
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-nowrap">
                          {item.organizer}
                        </TableCell>
                        <TableCell className="py-3 text-sm" title={item.supportCriteria}>
                          <div className="break-words max-w-[200px]">
                            {item.supportCriteria}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm whitespace-nowrap">
                          {(item.examFee ?? 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm whitespace-nowrap">
                          {item.examFeeUsd ? `$${(item.examFeeUsd).toLocaleString()}` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm whitespace-nowrap">
                          {(item.educationCost ?? 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-nowrap">
                          {item.supportTarget}
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-nowrap">
                          {item.effectiveStartDate}
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-nowrap">
                          {item.effectiveEndDate}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() => toggleActive(item.id)}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                      {filteredCriteria.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <TableIcon className="h-10 w-10 opacity-30" />
                              <p>{searchTerm ? '검색 결과가 없습니다' : '등록된 기준이 없습니다'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 스티키 가로 스크롤 컨트롤러: viewport 하단에 고정 */}
                <div
                  ref={fakeScrollRef}
                  className="fixed left-0 right-0 bottom-0 z-40 bg-background border-t"
                  style={{ overflowX: 'auto', scrollbarGutter: 'stable', height: '16px' }}
                  onScroll={() => {
                    if (tableScrollRef.current && fakeScrollRef.current) {
                      tableScrollRef.current.scrollLeft = fakeScrollRef.current.scrollLeft;
                    }
                  }}
                >
                  <div
                    style={{
                      width: tableScrollRef.current?.scrollWidth
                        ? `${tableScrollRef.current.scrollWidth}px`
                        : '2000px',
                      height: '1px',
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? '지원 기준 수정' : '지원 기준 추가'}
              </DialogTitle>
              <DialogDescription>
                자격증별 지원 기준 정보를 입력하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualificationCategory">자격구분 *</Label>
                  <Input
                    id="qualificationCategory"
                    name="qualificationCategory"
                    placeholder="예: 국가기술자격"
                    value={formData.qualificationCategory}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificationName">자격증명 *</Label>
                  <Input
                    id="certificationName"
                    name="certificationName"
                    placeholder="예: 정보처리기사"
                    value={formData.certificationName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizer">주관</Label>
                <Input
                  id="organizer"
                  name="organizer"
                  placeholder="예: 한국산업인력공단"
                  value={formData.organizer}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">분야</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="예: IT, 금융, 회계 등"
                  value={formData.category}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="examFee">응시료 (원)</Label>
                  <Input
                    id="examFee"
                    name="examFee"
                    type="number"
                    placeholder="0"
                    value={formData.examFee}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examFeeUsd">응시료 (달러)</Label>
                  <Input
                    id="examFeeUsd"
                    name="examFeeUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.examFeeUsd}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="educationCost">교육비 (원)</Label>
                <Input
                  id="educationCost"
                  name="educationCost"
                  type="number"
                  placeholder="0"
                  value={formData.educationCost}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportCriteria">지원기준</Label>
                <Textarea
                  id="supportCriteria"
                  name="supportCriteria"
                  placeholder="예: 응시료 전액 지원"
                  value={formData.supportCriteria}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportTarget">지원대상</Label>
                <Input
                  id="supportTarget"
                  name="supportTarget"
                  placeholder="예: 전 직원"
                  value={formData.supportTarget}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effectiveStartDate">적용시작일</Label>
                  <Input
                    id="effectiveStartDate"
                    name="effectiveStartDate"
                    type="date"
                    value={formData.effectiveStartDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveEndDate">적용종료일</Label>
                  <Input
                    id="effectiveEndDate"
                    name="effectiveEndDate"
                    type="date"
                    value={formData.effectiveEndDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">활성화</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
                {editingId ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Preview Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Excel 업로드 미리보기
              </DialogTitle>
              <DialogDescription>
                업로드할 데이터를 확인하고 적용 방식을 선택하세요
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto py-4">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  총 {uploadedCriteria.length}개의 지원 기준이 발견되었습니다.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>자격구분</TableHead>
                      <TableHead>자격증명</TableHead>
                      <TableHead>주관</TableHead>
                      <TableHead>분야</TableHead>
                      <TableHead>지원기준</TableHead>
                      <TableHead className="text-right">응시료(원)</TableHead>
                      <TableHead className="text-right">응시료(달러)</TableHead>
                      <TableHead className="text-right">교육비</TableHead>
                      <TableHead>지원대상</TableHead>
                      <TableHead>적용기간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedCriteria.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.qualificationCategory}</TableCell>
                        <TableCell className="font-medium">{item.certificationName}</TableCell>
                        <TableCell>{item.organizer}</TableCell>
                        <TableCell>
                          {item.category ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.supportCriteria}</TableCell>
                        <TableCell className="text-right">
                          {(item.examFee || 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right">
                          {item.examFeeUsd ? `$${(item.examFeeUsd).toLocaleString()}` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.educationCost || 0).toLocaleString()}원
                        </TableCell>
                        <TableCell>{item.supportTarget}</TableCell>
                        <TableCell className="text-sm">
                          {item.effectiveStartDate} ~ {item.effectiveEndDate}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {uploadedCriteria.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  외 {uploadedCriteria.length - 10}건 더 있음
                </p>
              )}

              {/* 적용 방식 선택 */}
              <div className="mt-6 space-y-3">
                <Label>적용 방식</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadMode('merge')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      uploadMode === 'merge' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">병합</p>
                    <p className="text-sm text-muted-foreground">
                      기존 데이터에 새 항목 추가 (중복 제외)
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('replace')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      uploadMode === 'replace' 
                        ? 'border-destructive bg-destructive/5' 
                        : 'border-border hover:border-destructive/50'
                    }`}
                  >
                    <p className="font-medium">전체 교체</p>
                    <p className="text-sm text-muted-foreground">
                      기존 데이터 삭제 후 새로 적용
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                취소
              </Button>
              <Button 
                onClick={handleConfirmUpload} 
                className={uploadMode === 'replace' ? 'bg-destructive hover:bg-destructive/90' : 'gradient-primary text-primary-foreground'}
              >
                {uploadMode === 'replace' ? '전체 교체' : '병합 적용'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
