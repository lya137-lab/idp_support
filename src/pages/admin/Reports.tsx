import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default function Reports() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const years = ['2025', '2026', '2027', '2028', '2029'];
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

  // 더미 승인 데이터 제거: 실제 조회 연동 전까지 빈 배열 사용
  const sampleApprovedData = useMemo(() => [], [selectedYear, selectedMonth]);

  const triggerDownload = (filename: string, content: string, mime = 'text/plain', addBom = false) => {
    // 한글 깨짐 방지를 위해 UTF-8 BOM 추가 옵션
    const data = addBom ? '\uFEFF' + content : content;
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildExcelCsv = () => {
    const headers = [
      '사번',
      '이름',
      '부서',
      '자격증명',
      '취득일',
      '교육비',
      '응시료',
      '지원금액',
      '상태',
      '승인일',
    ];
    const rows = sampleApprovedData.map((row) => [
      row.employeeId,
      row.employeeName,
      row.department,
      row.certificationName,
      row.acquisitionDate,
      row.educationCost,
      row.examFee,
      row.supportAmount,
      row.status,
      row.approvedAt,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    return csv;
  };

  const buildWordContent = () => {
    // 지급대상 기간 계산: 전월 15일 ~ 당월 14일
    const monthNum = parseInt(selectedMonth, 10);
    const yearNum = parseInt(selectedYear, 10);
    const startMonth = monthNum === 1 ? 12 : monthNum - 1;
    const startYear = monthNum === 1 ? yearNum - 1 : yearNum;
    const startDate = new Date(startYear, startMonth - 1, 15);
    const endDate = new Date(yearNum, monthNum - 1, 14);

    const formatDot = (d: Date) =>
      `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;

    const payPeriod = `${formatDot(startDate)} ~ ${formatDot(endDate)}`;
    const reportDate = formatDot(new Date());
    const yearText = `${yearNum}`;
    const monthText = `${monthNum}`;
    const peopleCount = sampleApprovedData.length;
    const totalAmount = sampleApprovedData.reduce(
      (sum, row) => sum + (row.supportAmount || 0),
      0
    ).toLocaleString();

    // 문구는 템플릿을 그대로 유지하고 대괄호 부분만 치환
    const paragraphs: Paragraph[] = [
      new Paragraph(`${yearText}년 ${monthText}월 IDP 지원금 지급의 건`),
      new Paragraph(''),
      new Paragraph('담당부서 : 인재개발팀'),
      new Paragraph('담 당 자 : 임영아'),
      new Paragraph(`보고일자 : ${reportDate}`),
      new Paragraph(''),
      new Paragraph(''),
      new Paragraph(''),
      new Paragraph(''),
      new Paragraph('목적'),
      new Paragraph(''),
      new Paragraph('자기주도학습을 통한 개인 및 조직의 직무 전문성을 높이고, 학습문화 정착을 통한 지속가능한 성장 기반을 마련하고자 함'),
      new Paragraph(''),
      new Paragraph(''),
      new Paragraph('개요'),
      new Paragraph(''),
      new Paragraph('지급항목 : IDP 지원금'),
      new Paragraph(`지급대상 : ${payPeriod} 中 지원금 신청자 ${peopleCount}명`),
      new Paragraph(`지급금액 : ${totalAmount}원`),
      new Paragraph(`지급기준 : 그룹사 ${yearText}년 IDP 과정별 지원 기준표에 따름`),
      new Paragraph('           ※ 기준표 한도 內 실비 지원'),
      new Paragraph(`지급방법 : ${yearText}년 ${monthText}월 급여 지급 시 지급`),
      ...Array.from({ length: 18 }, () => new Paragraph('')), // 공백 줄 유지
      new Paragraph(`※ 첨부 : 1. ${yearText}년 ${monthText}월 IDP 지원금 지급리스트`),
      new Paragraph(`※ 첨부 : 2. ${yearText}년 IDP 과정별 지원기준표, 끝.`),
    ];

    return new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });
  };

  const handleDownload = async (type: 'excel' | 'word') => {
    setIsDownloading(type);
    
    try {
      if (type === 'excel') {
        const csv = buildExcelCsv();
        const filename = `${selectedYear}-${selectedMonth}_정산내역.csv`;
        triggerDownload(filename, csv, 'text/csv;charset=utf-8;', true); // BOM 추가
      } else {
        const doc = buildWordContent();
        const filename = `${selectedYear}-${selectedMonth}_품의서.docx`;
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: '다운로드 완료',
        description: `${selectedYear}년 ${selectedMonth}월 ${type === 'excel' ? '정산 내역' : '품의서'}가 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('보고서 다운로드 오류:', error);
      toast({
        title: '다운로드 실패',
        description: '파일 생성 또는 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
    
    setIsDownloading(null);
  };

  return (
    <AppLayout allowedRoles={['admin', 'system_admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">보고서 다운로드</h1>
          <p className="text-muted-foreground mt-1">
            월별 정산 자료 및 품의서를 다운로드합니다
          </p>
        </div>

        {/* Date Selection */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              기간 선택
            </CardTitle>
            <CardDescription>
              다운로드할 보고서의 기간을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>연도</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>{year}년</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>월</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Excel Report */}
          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-success/10">
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                </div>
              </div>
              <CardTitle className="text-lg mt-4">월별 정산 내역 (Excel)</CardTitle>
              <CardDescription>
                해당 월의 모든 승인 완료된 신청 내역을 Excel 파일로 다운로드합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">포함 항목:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    사번, 이름, 부서
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    자격증명, 취득일
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    교육비, 응시료, 지원금액
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    승인 상태 및 일자
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => handleDownload('excel')}
                disabled={isDownloading !== null}
                className="w-full gap-2"
                variant="outline"
              >
                {isDownloading === 'excel' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Excel 다운로드
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Word Report */}
          <Card className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-lg mt-4">월별 품의서 (Word)</CardTitle>
              <CardDescription>
                해당 월의 자격증 취득 지원 품의서를 Word 파일로 자동 생성합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">포함 항목:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    사내 IDP 품의서 양식 적용
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    승인 완료 건 자동 취합
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    지원금 총액 자동 계산
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    결재선 정보 포함
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => handleDownload('word')}
                disabled={isDownloading !== null}
                className="w-full gap-2 gradient-primary text-primary-foreground"
              >
                {isDownloading === 'word' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    품의서 생성
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Downloads */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">최근 다운로드 이력</CardTitle>
            <CardDescription>
              최근 생성된 보고서 목록
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: 'Excel', date: '2024-02-10', period: '2024년 1월', size: '45KB' },
                { type: 'Word', date: '2024-02-10', period: '2024년 1월', size: '128KB' },
                { type: 'Excel', date: '2024-01-08', period: '2023년 12월', size: '52KB' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'Excel' ? (
                      <div className="p-2 rounded-lg bg-success/10">
                        <FileSpreadsheet className="h-5 w-5 text-success" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {item.period} {item.type === 'Excel' ? '정산내역' : '품의서'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.date} 생성 · {item.size}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Download className="h-4 w-4" />
                    다시 받기
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
