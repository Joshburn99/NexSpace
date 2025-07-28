import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Image,
  Shield,
  Stethoscope,
  Syringe,
  IdCard,
  Award,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

interface Document {
  id: string;
  name: string;
  type: string;
  status: "pending" | "verified" | "rejected" | "not_uploaded";
  uploadedAt?: Date;
  expiresAt?: Date;
  required: boolean;
  icon: React.ReactNode;
  description: string;
}

export default function DocumentUploadPage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "license",
      name: "Professional License",
      type: "license",
      status: "not_uploaded",
      required: true,
      icon: <Award className="h-5 w-5" />,
      description: "Active nursing license from your state board",
    },
    {
      id: "govt_id",
      name: "Government ID",
      type: "identification",
      status: "not_uploaded",
      required: true,
      icon: <IdCard className="h-5 w-5" />,
      description: "Driver's license or state-issued ID",
    },
    {
      id: "bls",
      name: "BLS Certification",
      type: "certification",
      status: "not_uploaded",
      required: true,
      icon: <Shield className="h-5 w-5" />,
      description: "Basic Life Support certification",
    },
    {
      id: "tb_test",
      name: "TB Test Results",
      type: "immunization",
      status: "not_uploaded",
      required: true,
      icon: <Stethoscope className="h-5 w-5" />,
      description: "Tuberculosis test within last 12 months",
    },
    {
      id: "flu_shot",
      name: "Flu Vaccination",
      type: "immunization",
      status: "not_uploaded",
      required: false,
      icon: <Syringe className="h-5 w-5" />,
      description: "Current season flu vaccination record",
    },
  ]);

  const uploadedCount = documents.filter((d) => d.status !== "not_uploaded").length;
  const requiredCount = documents.filter((d) => d.required).length;
  const progressPercentage = (uploadedCount / documents.length) * 100;

  const handleFileUpload = (docId: string, file: File) => {
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === docId ? { ...doc, status: "pending" as const, uploadedAt: new Date() } : doc
      )
    );

    // Simulate verification after 2 seconds
    setTimeout(() => {
      setDocuments((docs) =>
        docs.map((doc) => (doc.id === docId ? { ...doc, status: "verified" as const } : doc))
      );
    }, 2000);
  };

  const DocumentDropzone = ({ document }: { document: Document }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      accept: {
        "image/*": [".png", ".jpg", ".jpeg"],
        "application/pdf": [".pdf"],
      },
      maxFiles: 1,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          handleFileUpload(document.id, acceptedFiles[0]);
        }
      },
    });

    const getStatusBadge = () => {
      switch (document.status) {
        case "verified":
          return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
        case "pending":
          return <Badge className="bg-yellow-100 text-yellow-800">Verifying...</Badge>;
        case "rejected":
          return <Badge variant="destructive">Rejected</Badge>;
        default:
          return document.required ? (
            <Badge variant="outline" className="text-red-600">
              Required
            </Badge>
          ) : (
            <Badge variant="outline">Optional</Badge>
          );
      }
    };

    return (
      <Card className={document.status === "verified" ? "border-green-200 bg-green-50/50" : ""}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  document.status === "verified" ? "bg-green-100 text-green-700" : "bg-gray-100"
                }`}
              >
                {document.icon}
              </div>
              <div>
                <h3 className="font-semibold">{document.name}</h3>
                <p className="text-sm text-gray-600">{document.description}</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {document.status === "not_uploaded" ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive ? "Drop the file here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {document.status === "verified" && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {document.status === "pending" && (
                  <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
                )}
                {document.status === "rejected" && (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {document.status === "verified" && "Document verified"}
                    {document.status === "pending" && "Verification in progress..."}
                    {document.status === "rejected" && "Document rejected - Please reupload"}
                  </p>
                  {document.uploadedAt && (
                    <p className="text-xs text-gray-500">
                      Uploaded {document.uploadedAt.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              {document.status === "verified" && (
                <Button variant="ghost" size="sm">
                  View
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Verification</h1>
          <p className="text-gray-600">Upload your credentials for quick verification</p>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {uploadedCount} of {documents.length} documents uploaded
              </span>
              <span className="text-sm text-gray-500">{requiredCount} required</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Verification Promise */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Quick Verification Promise:</strong> Most documents are verified within 2 hours
            during business hours. You'll receive an email and in-app notification once complete.
          </AlertDescription>
        </Alert>

        {/* Document Upload Cards */}
        <div className="space-y-4 mb-8">
          {documents.map((doc) => (
            <DocumentDropzone key={doc.id} document={doc} />
          ))}
        </div>

        {/* Tips Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Faster Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Image className="h-4 w-4 mt-0.5 text-gray-400" />
                Ensure all documents are clearly readable with no glare or shadows
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-gray-400" />
                Upload current documents - expired credentials will be rejected
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-gray-400" />
                Double-check that names match across all documents
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button variant="outline">Save & Continue Later</Button>
          <div className="flex gap-3">
            <Button variant="outline">Back</Button>
            <Button
              disabled={
                documents.filter((d) => d.required && d.status === "not_uploaded").length > 0
              }
              className="gap-2"
            >
              Continue to Next Step
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
