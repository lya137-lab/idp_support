import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertTriangle, Check } from 'lucide-react';

export interface OCREditData {
  rawText: string;
  extractedAmount: string;
  extractedCertName: string;
  extractedDate: string;
  confidence: number;
}

interface OCREditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocrData: OCREditData | null;
  onConfirm: (data: OCREditData) => void;
}

export function OCREditModal({ open, onOpenChange, ocrData, onConfirm }: OCREditModalProps) {
  const [editData, setEditData] = useState<OCREditData>({
    rawText: '',
    extractedAmount: '',
    extractedCertName: '',
    extractedDate: '',
    confidence: 0,
  });

  useEffect(() => {
    if (ocrData) {
      setEditData({
        rawText: ocrData.rawText || '',
        extractedAmount: ocrData.extractedAmount || '',
        extractedCertName: ocrData.extractedCertName || '',
        extractedDate: ocrData.extractedDate || '',
        confidence: ocrData.confidence || 0,
      });
    }
  }, [ocrData]);

  const handleConfirm = () => {
    onConfirm(editData);
    onOpenChange(false);
  };

  const confidenceColor = editData.confidence >= 80 
    ? 'text-success' 
    : editData.confidence >= 50 
      ? 'text-warning' 
      : 'text-destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            OCR 추출 결과 편집
          </DialogTitle>
          <DialogDescription>
            자동 추출된 정보를 확인하고 필요시 수정해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* 정확도 표시 */}
          <Alert className={editData.confidence >= 80 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}>
            {editData.confidence >= 80 ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            <AlertDescription className={confidenceColor}>
              OCR 정확도: {Math.round(editData.confidence)}%
              {editData.confidence < 80 && ' - 추출 결과를 꼭 확인해주세요'}
            </AlertDescription>
          </Alert>

          {/* 추출 정보 편집 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-certName">자격증명</Label>
              <Input
                id="edit-certName"
                value={editData.extractedCertName}
                onChange={(e) => setEditData(prev => ({ ...prev, extractedCertName: e.target.value }))}
                placeholder="자격증명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">취득일</Label>
              <Input
                id="edit-date"
                type="date"
                value={editData.extractedDate}
                onChange={(e) => setEditData(prev => ({ ...prev, extractedDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-amount">금액 (원)</Label>
              <Input
                id="edit-amount"
                value={editData.extractedAmount}
                onChange={(e) => setEditData(prev => ({ ...prev, extractedAmount: e.target.value }))}
                placeholder="예: 50,000"
              />
            </div>
          </div>

          {/* 원본 텍스트 */}
          <div className="space-y-2">
            <Label>원본 추출 텍스트</Label>
            <ScrollArea className="h-40 border rounded-md bg-muted/30">
              <Textarea
                className="min-h-[150px] border-0 bg-transparent resize-none font-mono text-xs"
                value={editData.rawText}
                onChange={(e) => setEditData(prev => ({ ...prev, rawText: e.target.value }))}
                placeholder="추출된 텍스트가 없습니다"
              />
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              원본 텍스트를 수정하면 정보 추출에 참고할 수 있습니다.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} className="gradient-primary text-primary-foreground">
            확인 및 적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}