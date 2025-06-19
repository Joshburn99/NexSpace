import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ExtractedInvoiceData {
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  serviceDate: string;
  description: string;
  vendorType: string;
}

interface PDFDropzoneProps {
  onInvoiceExtracted: (data: ExtractedInvoiceData) => void;
}

export default function PDFDropzone({ onInvoiceExtracted }: PDFDropzoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const extractInvoiceDataMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/vendor-invoices/extract-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: (data: ExtractedInvoiceData) => {
      setExtractionError(null);
      onInvoiceExtracted(data);
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      setExtractionError(
        error.message || 'Failed to extract invoice data from PDF',
      );
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      file => file.type === 'application/pdf',
    );
    if (pdfFiles.length === 0) {
      setExtractionError('Please upload PDF files only');
      return;
    }
    setUploadedFiles(pdfFiles);
    setExtractionError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(files => files.filter(file => file !== fileToRemove));
  };

  const processFile = (file: File) => {
    extractInvoiceDataMutation.mutate(file);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the PDF file here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop a PDF invoice here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select a file
                </p>
                <Button variant="outline" size="sm">
                  Choose PDF File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => processFile(file)}
                      disabled={extractInvoiceDataMutation.isPending}
                      className="gap-2"
                    >
                      {extractInvoiceDataMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {extractInvoiceDataMutation.isPending
                        ? 'Processing...'
                        : 'Extract Data'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file)}
                      disabled={extractInvoiceDataMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {extractionError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">Extraction Error</p>
            </div>
            <p className="text-sm text-red-600 mt-1">{extractionError}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-1">Supported format:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>PDF files containing invoice information</li>
          <li>Maximum file size: 10MB</li>
          <li>
            AI will extract vendor name, invoice number, amount, dates, and
            description
          </li>
        </ul>
      </div>
    </div>
  );
}
