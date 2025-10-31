import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  totalRows: number;
  processedRows: number;
}

export function UploadProgress({ fileName, progress, totalRows, processedRows }: UploadProgressProps) {
  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg z-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading {fileName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {processedRows.toLocaleString()} / {totalRows.toLocaleString()} records ({progress.toFixed(1)}%)
        </p>
      </CardContent>
    </Card>
  );
}
