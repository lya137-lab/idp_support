import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { performOCR, OCRResult, performStructuredOCROnFiles, StructuredOCRResult } from '@/lib/ocr';
import { getAllSupportCriteria } from '@/services/supportCriteriaService';
import { OCREditModal, OCREditData } from '@/components/OCREditModal';

interface UploadedFile {
  id: string;
  file: File;
  type: 'receipt' | 'certificate';
  preview?: string;
}

interface OCRExtractedData {
  rawText: string;
  extractedAmount: string;
  extractedCertName: string;
  extractedDate: string;
  confidence: number;
  documentType?: 'A' | 'B' | 'OTHER';
  documentTypeName?: string;
  grade?: string;
  finalPaymentAmount?: string;
}

export default function NewApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    certificationName: '',
    acquisitionDate: '',
    educationCost: '',
    examFee: '',
    notes: '',
  });
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrData, setOcrData] = useState<OCRExtractedData | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [ocrEditModalOpen, setOcrEditModalOpen] = useState(false);
const [structuredResult, setStructuredResult] = useState<StructuredOCRResult | null>(null);
const [criteriaNames, setCriteriaNames] = useState<string[]>([]);
const [matchedCertNames, setMatchedCertNames] = useState<string[]>([]);
const [criteriaMap, setCriteriaMap] = useState<{ name: string; organizer: string }[]>([]);

  // 날짜를 yyyy-mm-dd 형식으로 정규화
  const normalizeDateString = useCallback((value?: string) => {
    if (!value) return '';
    const cleaned = value
      .replace(/년|월|일|\./g, '-')
      .replace(/\//g, '-')
      .replace(/,/g, '-')
      .replace(/\s+/g, '');
    const parts = cleaned.split('-').filter(Boolean);
    if (parts.length === 3) {
      const [yy, mm, dd] = parts;
      const year = yy.length === 2 ? `20${yy}` : yy;
      const month = mm.padStart(2, '0');
      const day = dd.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'acquisitionDate' ? normalizeDateString(value) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
  };

  const handleFileDrop = useCallback((e: React.DragEvent, type: 'receipt' | 'certificate') => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles, type);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'certificate') => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles, type);
    }
  };

  // Supabase 기준표 자격증명 로드
  useEffect(() => {
    const loadCriteria = async () => {
      try {
        const data = await getAllSupportCriteria();
        const names = Array.from(new Set((data || []).map((c) => c.certificationName).filter(Boolean)));
        const map = (data || []).map((c) => ({
          name: c.certificationName,
          organizer: c.organizer || 'N/A',
        }));
        setCriteriaNames(names);
        setCriteriaMap(map);
      } catch (error) {
        console.error('기준표 로드 오류:', error);
      }
    };
    loadCriteria();
  }, []);

  // OCR 후보명과 기준표 매칭
  useEffect(() => {
    if (!structuredResult || criteriaNames.length === 0) return;

    const normalize = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '');

    const gradeKeywords = ['associate', 'professional', 'expert', 'advanced', 'foundation', 'practitioner'];

    const candidateNames = Array.from(
      new Set(structuredResult.cert_name_candidates || [])
    );

    const matches: string[] = [];

    candidateNames.forEach((candidate) => {
      const normCandidate = normalize(candidate);
      const hasGrade = gradeKeywords.some((g) => normCandidate.includes(g));

      const found = criteriaNames.find((name) => {
        const normName = normalize(name);
        if (hasGrade && !gradeKeywords.some((g) => normName.includes(g))) return false;
        return normCandidate.includes(normName) || normName.includes(normCandidate);
      });

      if (found) {
        matches.push(found);
      }
    });

    setMatchedCertNames(Array.from(new Set(matches)));
  }, [structuredResult, criteriaNames]);

  const processFiles = async (newFiles: File[], type: 'receipt' | 'certificate') => {
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/tiff'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = newFiles.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast({
          title: '지원하지 않는 파일 형식',
          description: 'JPG, PNG, PDF, TIF 파일만 업로드 가능합니다.',
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > maxSize) {
        toast({
          title: '파일 크기 초과',
          description: '파일 크기는 10MB 이하여야 합니다.',
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setFiles(prev => [...prev, ...newUploadedFiles]);
  };

  // 업로드 완료 후 사용자가 명시적으로 OCR 실행을 눌렀을 때 처리
  const handleRunOCROnAll = async () => {
    if (!files.length) {
      toast({
        title: '파일이 없습니다',
        description: '합격증 또는 영수증 파일을 먼저 업로드하세요.',
        variant: 'destructive',
      });
      return;
    }

    setOcrProcessing(true);
    setOcrProgress(0);
    try {
      const result = await performStructuredOCROnFiles(
        files.map((f) => f.file),
        (fileIndex, progress) => {
          setOcrProgress(Math.round(progress));
        }
      );
      setStructuredResult(result);
      // 기존 단일 OCR 로직과 병행 사용: 첫 번째 파일로 간단 표시
      if (files[0]) {
        await runOCR(files[0].file);
      }
      toast({
        title: 'OCR 처리 완료',
        description: '첨부된 모든 페이지를 분석했습니다.',
      });
    } catch (error) {
      console.error('구조화 OCR 오류:', error);
      toast({
        title: 'OCR 처리 실패',
        description: '파일 분석 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setOcrProcessing(false);
      setOcrProgress(0);
    }
  };

  const runOCR = async (file: File) => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrData(null);
    
    try {
      const result = await performOCR(file, (progress) => {
        setOcrProgress(progress);
      });
      
      // 문서 유형에 따라 데이터 설정
      let extractedAmountStr = '';
      let extractedCertNameStr = '';
      
      const normalizedDate = normalizeDateString(result.extractedDate);

      if (result.documentType === 'A') {
        // 유형 A: 합격증/자격증명서
        extractedCertNameStr = result.certificationName || '';
        // 자격증명과 급수를 결합하여 표시
        if (result.grade) {
          extractedCertNameStr = extractedCertNameStr ? `${extractedCertNameStr} (${result.grade})` : result.grade;
        }
      } else if (result.documentType === 'B') {
        // 유형 B: 영수증/매출전표
        extractedAmountStr = result.finalPaymentAmount || '';
      }
      
      // 하위 호환성: 기존 필드도 사용 가능
      if (!extractedCertNameStr && result.extractedCertName) {
        extractedCertNameStr = result.extractedCertName;
      }
      if (!extractedAmountStr && result.extractedAmount) {
        extractedAmountStr = result.extractedAmount.toString();
      }
      
      // 문서 유형명 변환
      const documentTypeName = 
        result.documentType === 'A' ? '합격증/자격증명서' :
        result.documentType === 'B' ? '영수증/매출전표' :
        '기타 문서';
      
      setOcrData({
        rawText: result.rawText,
        extractedAmount: extractedAmountStr,
        extractedCertName: extractedCertNameStr,
        extractedDate: normalizedDate || '',
        confidence: result.confidence,
        documentType: result.documentType,
        documentTypeName: documentTypeName,
        grade: result.grade,
        finalPaymentAmount: result.finalPaymentAmount,
      });
      
      // 추출된 데이터로 폼 자동 채우기
      if (extractedCertNameStr && !formData.certificationName) {
        setFormData(prev => ({ ...prev, certificationName: extractedCertNameStr }));
      }
      if (normalizedDate && !formData.acquisitionDate) {
        setFormData(prev => ({ ...prev, acquisitionDate: normalizedDate }));
      }
      if (extractedAmountStr && !formData.examFee) {
        // 쉼표 제거하여 숫자만 저장
        const amountNum = extractedAmountStr.replace(/,/g, '');
        setFormData(prev => ({ ...prev, examFee: amountNum }));
      }
      
      toast({
        title: 'OCR 처리 완료',
        description: `정확도: ${Math.round(result.confidence)}% - 결과를 확인하고 필요시 수정해주세요.`,
      });
      
      // 정확도가 낮으면 자동으로 편집 모달 열기
      if (result.confidence < 80) {
        setOcrEditModalOpen(true);
      }
    } catch (error) {
      console.error('OCR 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast({
        title: 'OCR 처리 실패',
        description: errorMessage.length > 100 ? `${errorMessage.substring(0, 100)}...` : errorMessage,
        variant: 'destructive',
        duration: 5000, // 5초간 표시
      });
    } finally {
      setOcrProcessing(false);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleOCREditConfirm = (editedData: OCREditData) => {
    const normalizedEditedDate = normalizeDateString(editedData.extractedDate);

    setOcrData({
      rawText: editedData.rawText,
      extractedAmount: editedData.extractedAmount || null,
      extractedCertName: editedData.extractedCertName || null,
      extractedDate: normalizedEditedDate || null,
      confidence: editedData.confidence,
    });
    
    // 수정된 데이터로 폼 업데이트
    if (editedData.extractedCertName) {
      setFormData(prev => ({ ...prev, certificationName: editedData.extractedCertName }));
    }
    if (normalizedEditedDate) {
      setFormData(prev => ({ ...prev, acquisitionDate: normalizedEditedDate }));
    }
    if (editedData.extractedAmount) {
      setFormData(prev => ({ ...prev, examFee: editedData.extractedAmount.replace(/,/g, '') }));
    }
    
    toast({
      title: 'OCR 결과 적용',
      description: '수정된 정보가 신청서에 반영되었습니다.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast({
        title: '파일 필요',
        description: '영수증 또는 합격증을 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // 제출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: '신청 완료',
      description: '자격증 취득 지원 신청이 접수되었습니다.',
    });
    
    navigate('/applications');
  };

  const renderStructuredOutput = () => {
    if (!structuredResult) return null;

    const receiptsList = structuredResult.receipts.map((r) => ({
      file: r.file,
      page: r.page,
      paymentDate: r.paymentDate || 'N/A',
      finalAmount: r.finalAmount != null ? r.finalAmount.toLocaleString() : 'N/A',
    }));

    const certificatesList = structuredResult.certificates.map((c) => ({
      name: c.name || 'N/A',
      date: c.date || 'N/A',
      issuer: c.issuer || 'N/A',
    }));

    // 자격증 최종 확정: 명칭/발급기관은 Supabase 기준표, 취득일은 OCR
    const normalize = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '');

    const certPages = structuredResult.pages.filter((p) => p.doc_type === 'certificate');
    const finalCerts =
      certPages.map((p) => {
        const pageCandidates = [
          ...(p.cert_name_candidates || []),
          p.certificate_candidates.name || '',
        ].filter(Boolean);
        const matched = matchedCertNames.find((m) => {
          const normM = normalize(m);
          return pageCandidates.some((cand) => {
            const normC = normalize(cand);
            return normC === normM || normC.includes(normM) || normM.includes(normC);
          });
        });
        const finalName = matched || p.certificate_candidates.name || 'N/A';
        const organizer =
          (matched && criteriaMap.find((c) => c.name === matched)?.organizer) ||
          p.certificate_candidates.issuer ||
          'N/A';
        const date = p.certificate_candidates.date || 'N/A';
        return { name: finalName, date, issuer: organizer };
      }) ||
      certificatesList;

    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">OCR 결과 (구조화)</CardTitle>
          <CardDescription>파일/페이지별 결과와 합계를 표시합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {matchedCertNames.length > 0 && (
            <div>
              <p className="font-medium mb-2">자격증명 매칭 (Supabase 기준표)</p>
              <div className="space-y-1 text-sm">
                {matchedCertNames.map((name) => (
                  <div key={name} className="p-2 rounded bg-primary/5 border border-primary/20">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="font-medium mb-2">1) 영수증/매출전표 목록</p>
            {receiptsList.length > 0 ? (
              <div className="space-y-1 text-sm">
                {receiptsList.map((item, idx) => (
                  <div key={`${item.file}-${item.page}-${idx}`} className="p-2 rounded bg-muted/40">
                    {item.file} / p.{item.page} / 결제일: {item.paymentDate} / 최종 결제금액: {item.finalAmount}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">- 없음</p>
            )}
          </div>

          <div>
            <p className="font-medium mb-2">2) 전체 결제금액 합계</p>
            <p className="text-sm">
              {structuredResult.totalFinalAmount.toLocaleString()} 원
            </p>
          </div>

          <div>
            <p className="font-medium mb-2">3) 자격증 정보 목록</p>
            {finalCerts.length > 0 ? (
              <div className="space-y-1 text-sm">
                {finalCerts.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="p-2 rounded bg-muted/40">
                    {item.name} / 취득일자: {item.date} / 발급기관: {item.issuer}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">- 없음</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const FileDropZone = ({ type, label }: { type: 'receipt' | 'certificate'; label: string }) => {
    const typeFiles = files.filter(f => f.type === type);

    return (
      <div className="space-y-3">
        <Label>{label}</Label>
        <div
          onDrop={(e) => handleFileDrop(e, type)}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            'border-border bg-muted/30'
          )}
        >
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.tif,.tiff"
            onChange={(e) => handleFileSelect(e, type)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, PDF, TIF (최대 10MB)
            </p>
          </div>
        </div>

        {/* 업로드된 파일 목록 */}
        {typeFiles.length > 0 && (
          <div className="space-y-2">
            {typeFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center rounded bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout allowedRoles={['employee']}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">신규 신청</h1>
            <p className="text-muted-foreground">자격증 취득 지원을 신청합니다</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 파일 업로드 */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                서류 업로드
              </CardTitle>
              <CardDescription>
                영수증과 합격증을 업로드해주세요. OCR을 통해 자동으로 정보를 추출합니다.
              </CardDescription>
            </CardHeader>
              <CardContent className="space-y-6">
                <FileDropZone type="receipt" label="영수증" />
                <FileDropZone type="certificate" label="합격증" />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleRunOCROnAll}
                    disabled={ocrProcessing || files.length === 0}
                  >
                    {ocrProcessing ? 'OCR 실행 중...' : '첨부파일에서 정보 추출'}
                  </Button>
                </div>

              {/* OCR 결과 */}
              {ocrProcessing && (
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>OCR로 문서를 분석하고 있습니다... ({ocrProgress}%)</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {ocrData && (
                <div className="space-y-3">
                  <Alert className="bg-success/5 border-success/20">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      OCR 완료 (정확도: {Math.round(ocrData.confidence)}%)
                      {ocrData.documentTypeName && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          - 문서 유형: {ocrData.documentTypeName}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">추출된 정보</span>
                      <div className="flex gap-1">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setOcrEditModalOpen(true)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          수정
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowRawText(!showRawText)}
                        >
                          {showRawText ? '숨기기' : '원본 보기'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm">
                      {ocrData.documentType === 'A' && (
                        <>
                          <p><span className="text-muted-foreground">자격증명:</span> {ocrData.extractedCertName || '추출 실패'}</p>
                          {ocrData.grade && (
                            <p><span className="text-muted-foreground">급수/등급:</span> {ocrData.grade}</p>
                          )}
                        </>
                      )}
                      {ocrData.documentType === 'B' && (
                        <p><span className="text-muted-foreground">최종 결제금액:</span> {ocrData.finalPaymentAmount ? `${ocrData.finalPaymentAmount}원` : '추출 실패'}</p>
                      )}
                      {ocrData.documentType === 'OTHER' && (
                        <>
                          <p><span className="text-muted-foreground">자격증명:</span> {ocrData.extractedCertName || '추출 실패'}</p>
                          <p><span className="text-muted-foreground">금액:</span> {ocrData.extractedAmount ? `${ocrData.extractedAmount}원` : '추출 실패'}</p>
                        </>
                      )}
                      {/* 하위 호환성: documentType이 없는 경우 기존 표시 */}
                      {!ocrData.documentType && (
                        <>
                          <p><span className="text-muted-foreground">금액:</span> {ocrData.extractedAmount ? `${ocrData.extractedAmount}원` : '추출 실패'}</p>
                          <p><span className="text-muted-foreground">자격증명:</span> {ocrData.extractedCertName || '추출 실패'}</p>
                          <p><span className="text-muted-foreground">날짜:</span> {ocrData.extractedDate || '추출 실패'}</p>
                        </>
                      )}
                    </div>
                    {showRawText && (
                      <div className="mt-2 p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                        {ocrData.rawText || '텍스트 없음'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {renderStructuredOutput()}

          {/* 신청 정보 */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                신청 정보
              </CardTitle>
              <CardDescription>
                자격증 취득 정보를 입력해주세요. OCR 결과를 확인하고 수정할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="certificationName">자격증명 *</Label>
                  <Input
                    id="certificationName"
                    name="certificationName"
                    placeholder="예: 정보처리기사"
                    value={formData.certificationName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acquisitionDate">취득일 *</Label>
                  <Input
                    id="acquisitionDate"
                    name="acquisitionDate"
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                  <Label htmlFor="examFee">응시료 (원) *</Label>
                  <Input
                    id="examFee"
                    name="examFee"
                    type="number"
                    placeholder="0"
                    value={formData.examFee}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">비고 (선택)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="추가 설명이 필요한 경우 입력해주세요"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  제출 중...
                </span>
              ) : (
                '신청서 제출'
              )}
            </Button>
          </div>
        </form>

        {/* OCR 편집 모달 */}
        <OCREditModal
          open={ocrEditModalOpen}
          onOpenChange={setOcrEditModalOpen}
          ocrData={ocrData ? {
            rawText: ocrData.rawText,
            extractedAmount: ocrData.extractedAmount || '',
            extractedCertName: ocrData.extractedCertName || '',
            extractedDate: ocrData.extractedDate || '',
            confidence: ocrData.confidence,
          } : null}
          onConfirm={handleOCREditConfirm}
        />
      </div>
    </AppLayout>
  );
}
