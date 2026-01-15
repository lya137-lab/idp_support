import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Filter, RefreshCw } from 'lucide-react';
import { getAllCertificationApplications } from '@/services/certificationApplicationService';
import { getAllSupportCriteria } from '@/services/supportCriteriaService';
import { CertificationApplication } from '@/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function IDPStatistics() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<CertificationApplication[]>([]);
  const [supportCriteria, setSupportCriteria] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 다중 선택 필터 (UI 상태)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [qualificationFilter, setQualificationFilter] = useState<string[]>([]);
  const [certNameFilter, setCertNameFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [rankFilter, setRankFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);

  // 조회 버튼으로 확정된 필터 상태 (null이면 전체 조회)
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState<string[] | null>(null);
  const [appliedQualificationFilter, setAppliedQualificationFilter] = useState<string[] | null>(null);
  const [appliedCertNameFilter, setAppliedCertNameFilter] = useState<string[] | null>(null);
  const [appliedCompanyFilter, setAppliedCompanyFilter] = useState<string[] | null>(null);
  const [appliedRankFilter, setAppliedRankFilter] = useState<string[] | null>(null);
  const [appliedMonthFilter, setAppliedMonthFilter] = useState<string[] | null>(null);
  const [hasApplied, setHasApplied] = useState(false); // 조회 버튼 클릭 여부

  // 옵션
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [qualificationOptions, setQualificationOptions] = useState<string[]>([]);
  const [certNameOptions, setCertNameOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [rankOptions, setRankOptions] = useState<string[]>([]);
  const [monthOptions, setMonthOptions] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [apps, criteria] = await Promise.all([
          getAllCertificationApplications(),
          getAllSupportCriteria({ isActive: undefined }),
        ]);
        setApplications(apps);
        setSupportCriteria(criteria);

        const cats = Array.from(new Set(criteria.map((c) => c.category).filter(Boolean))).sort();
        const quals = Array.from(new Set(criteria.map((c) => c.qualificationCategory).filter(Boolean))).sort();
        const certs = Array.from(new Set(criteria.map((c) => c.certificationName).filter(Boolean))).sort();
        const comps = Array.from(new Set(apps.map((a) => a.company || '미지정'))).sort();
        // 직급은 데이터에 없으므로 미지정
        const ranks = ['미지정'];
        const months = Array.from(
          new Set(
            apps
              .map((a) => (a.createdAt ? a.createdAt.slice(0, 7) : ''))
              .filter(Boolean)
          )
        ).sort();

        setCategoryOptions(cats as string[]);
        setQualificationOptions(quals as string[]);
        setCertNameOptions(certs as string[]);
        setCompanyOptions(comps as string[]);
        setRankOptions(ranks);
        setMonthOptions(months);
      } catch (error) {
        console.error(error);
        toast({
          title: '데이터 로드 실패',
          description: '통계 데이터를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [toast]);

  const matches = (value: string | undefined, selected: string[] | null) => {
    if (!selected || selected.length === 0) return true;
    return selected.includes(value || '미지정');
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const crit = supportCriteria.find((c) => c.certificationName === app.certificationName);
      const category = crit?.category || '미지정';
      const qual = crit?.qualificationCategory || '미지정';
      const certName = app.certificationName || '미지정';
      const company = app.company || '미지정';
      const rank = '미지정'; // 데이터 부재 시 미지정
      const month = app.createdAt ? app.createdAt.slice(0, 7) : '미지정';

      if (!matches(category, appliedCategoryFilter)) return false;
      if (!matches(qual, appliedQualificationFilter)) return false;
      if (!matches(certName, appliedCertNameFilter)) return false;
      if (!matches(company, appliedCompanyFilter)) return false;
      if (!matches(rank, appliedRankFilter)) return false;
      if (!matches(month, appliedMonthFilter)) return false;
      return true;
    });
  }, [
    applications,
    supportCriteria,
    appliedCategoryFilter,
    appliedQualificationFilter,
    appliedCertNameFilter,
    appliedCompanyFilter,
    appliedRankFilter,
    appliedMonthFilter,
  ]);

  // 그룹핑 기준 결정: 분야 → 자격구분 → 자격증명 → 계열사 → 직급 → 기준월
  const groupingField = useMemo(() => {
    if (appliedCategoryFilter && appliedCategoryFilter.length) return 'category';
    if (appliedQualificationFilter && appliedQualificationFilter.length) return 'qualification';
    if (appliedCertNameFilter && appliedCertNameFilter.length) return 'certName';
    if (appliedCompanyFilter && appliedCompanyFilter.length) return 'company';
    if (appliedRankFilter && appliedRankFilter.length) return 'rank';
    if (appliedMonthFilter && appliedMonthFilter.length) return 'month';
    return 'category'; // 기본
  }, [
    appliedCategoryFilter,
    appliedQualificationFilter,
    appliedCertNameFilter,
    appliedCompanyFilter,
    appliedRankFilter,
    appliedMonthFilter,
  ]);

  const grouped = useMemo(() => {
    const rows: Record<
      string,
      { key: string; count: number; amount: number }
    > = {};

    filtered.forEach((app) => {
      const crit = supportCriteria.find((c) => c.certificationName === app.certificationName);
      const category = crit?.category || '미지정';
      const qual = crit?.qualificationCategory || '미지정';
      const certName = app.certificationName || '미지정';
      const company = app.company || '미지정';
      const rank = '미지정';
      const month = app.createdAt ? app.createdAt.slice(0, 7) : '미지정';

      const key =
        groupingField === 'category' ? category :
        groupingField === 'qualification' ? qual :
        groupingField === 'certName' ? certName :
        groupingField === 'company' ? company :
        groupingField === 'rank' ? rank :
        month;

      if (!rows[key]) {
        rows[key] = { key, count: 0, amount: 0 };
      }
      rows[key].count += 1;
      rows[key].amount += app.status === 'approved' ? (app.supportAmount || 0) : 0;
    });

    return Object.values(rows).sort((a, b) => b.count - a.count);
  }, [filtered, supportCriteria, groupingField]);

  const totalCount = grouped.reduce((sum, r) => sum + r.count, 0);
  const totalAmount = grouped.reduce((sum, r) => sum + r.amount, 0);

  const handleReset = () => {
    setCategoryFilter([]);
    setQualificationFilter([]);
    setCertNameFilter([]);
    setCompanyFilter([]);
    setRankFilter([]);
    setMonthFilter([]);
    // 적용 필터도 초기화 → 전체 데이터 조회 상태
    setAppliedCategoryFilter(null);
    setAppliedQualificationFilter(null);
    setAppliedCertNameFilter(null);
    setAppliedCompanyFilter(null);
    setAppliedRankFilter(null);
    setAppliedMonthFilter(null);
    setHasApplied(false);
  };

  // 조회 버튼: 현재 선택 필터를 적용(빈 배열도 적용 → 선택 없음으로 간주)
  const handleApply = () => {
    setAppliedCategoryFilter([...categoryFilter]);
    setAppliedQualificationFilter([...qualificationFilter]);
    setAppliedCertNameFilter([...certNameFilter]);
    setAppliedCompanyFilter([...companyFilter]);
    setAppliedRankFilter([...rankFilter]);
    setAppliedMonthFilter([...monthFilter]);
    setHasApplied(true);
  };

  const MultiSelectDropdown = ({
    label,
    options,
    selected,
    setSelected,
  }: {
    label: string;
    options: string[];
    selected: string[];
    setSelected: (v: string[]) => void;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selected.length === 0 ? '전체' : `${selected.length}개 선택`}
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
          <DropdownMenuCheckboxItem
            checked={selected.length === 0}
            onCheckedChange={() => setSelected([])}
          >
            전체
          </DropdownMenuCheckboxItem>
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt}
              checked={selected.includes(opt)}
              onCheckedChange={(val) => {
                if (val) setSelected([...selected, opt]);
                else setSelected(selected.filter((v) => v !== opt));
              }}
            >
              {opt}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const MonthPicker = ({
    label,
    options,
    selected,
    setSelected,
  }: {
    label: string;
    options: string[];
    selected: string[];
    setSelected: (v: string[]) => void;
  }) => {
    const [tempMonth, setTempMonth] = useState('');

    const addMonth = (value: string) => {
      if (!value) return;
      if (selected.includes(value)) return;
      setSelected([...selected, value]);
    };

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={tempMonth}
            onChange={(e) => {
              const val = e.target.value;
              setTempMonth(val);
              addMonth(val);
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            전체
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {selected.length === 0 ? <Badge variant="outline">전체</Badge> : selected.map((m) => (
            <Badge key={m} variant="secondary" className="gap-1">
              {m}
              <button
                onClick={() => setSelected(selected.filter((x) => x !== m))}
                className="text-xs"
                aria-label="remove month"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        {/* 추천 리스트: 데이터에서 추출한 monthOptions */}
        {options.length > 0 && (
          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
            {options.map((opt) => (
              <Badge
                key={opt}
                variant="outline"
                className="cursor-pointer"
                onClick={() => addMonth(opt)}
              >
                {opt}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout allowedRoles={['admin', 'system_admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">IDP 지원 통계</h1>
            <p className="text-muted-foreground mt-1">
              필터를 모두 AND로 적용해 신청건수와 지원금액을 조회합니다.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
            필터 초기화
          </Button>
        </div>

        {/* 필터 섹션 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">필터</CardTitle>
            <CardDescription>조건을 선택하고 조회를 눌러 통계를 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MultiSelectDropdown
                    label="분야"
                    options={categoryOptions}
                    selected={categoryFilter}
                    setSelected={setCategoryFilter}
                  />
                  <MultiSelectDropdown
                    label="자격구분"
                    options={qualificationOptions}
                    selected={qualificationFilter}
                    setSelected={setQualificationFilter}
                  />
                  <MultiSelectDropdown
                    label="자격증명"
                    options={certNameOptions}
                    selected={certNameFilter}
                    setSelected={setCertNameFilter}
                  />
                  <MultiSelectDropdown
                    label="계열사"
                    options={companyOptions}
                    selected={companyFilter}
                    setSelected={setCompanyFilter}
                  />
                  <MultiSelectDropdown
                    label="직급"
                    options={rankOptions}
                    selected={rankFilter}
                    setSelected={setRankFilter}
                  />
                  <MonthPicker
                    label="기준월(YYYY-MM)"
                    options={monthOptions}
                    selected={monthFilter}
                    setSelected={setMonthFilter}
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {hasApplied
                      ? '선택된 조건으로 조회된 결과입니다.'
                      : '조건 선택 후 조회를 눌러 통계를 확인하세요.'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleReset}>
                      <RefreshCw className="h-4 w-4" />
                      필터 초기화
                    </Button>
                    <Button onClick={handleApply} className="gap-2">
                      <Filter className="h-4 w-4" />
                      조회
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선택 필터 요약 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">선택 필터</CardTitle>
            <CardDescription>선택되지 않은 항목은 전체로 간주합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: '분야', values: categoryFilter },
              { label: '자격구분', values: qualificationFilter },
              { label: '자격증명', values: certNameFilter },
              { label: '계열사', values: companyFilter },
              { label: '직급', values: rankFilter },
              { label: '기준월', values: monthFilter },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2 text-sm">
                <span className="min-w-[70px] text-muted-foreground">{f.label}:</span>
                <div className="flex flex-wrap gap-1">
                  {f.values.length === 0 ? (
                    <Badge variant="outline">전체</Badge>
                  ) : (
                    f.values.map((v) => (
                      <Badge key={`${f.label}-${v}`} variant="secondary">
                        {v}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* KPI 요약 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">총 신청건수</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalCount.toLocaleString()}건</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">총 지원금액</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalAmount.toLocaleString()}원</p>
            </CardContent>
          </Card>
        </div>

        {/* 상세 통계 테이블 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">상세 통계</CardTitle>
            <CardDescription>
              그룹핑 기준: {groupingField === 'category' ? '분야' :
              groupingField === 'qualification' ? '자격구분' :
              groupingField === 'certName' ? '자격증명' :
              groupingField === 'company' ? '계열사' :
              groupingField === 'rank' ? '직급' : '기준월'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                조건에 해당하는 데이터가 없습니다.
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">
                        {groupingField === 'category' ? '분야' :
                        groupingField === 'qualification' ? '자격구분' :
                        groupingField === 'certName' ? '자격증명' :
                        groupingField === 'company' ? '계열사' :
                        groupingField === 'rank' ? '직급' : '기준월'}
                      </TableHead>
                      <TableHead className="text-right">신청건수</TableHead>
                      <TableHead className="text-right">지원금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.key}</TableCell>
                        <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.amount.toLocaleString()}원</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
