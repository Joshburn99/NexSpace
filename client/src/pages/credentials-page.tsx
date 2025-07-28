import { useState } from "react";
import { Shield, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useCredentials } from "@/contexts/CredentialsContext";

export default function CredentialsPage() {
  const { user } = useAuth();
  const {
    credentials,
    alerts,
    getActiveCredentials,
    getExpiringCredentials,
    getExpiredCredentials,
    getComplianceRate,
    addCredential,
    updateCredential,
    isLoading,
  } = useCredentials();
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    type: "",
    name: "",
    issuingAuthority: "",
    expiryDate: "",
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "expired":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSaveCredential = async () => {
    if (!user || !credentialForm.type || !credentialForm.name || !credentialForm.expiryDate) {
      // Could add toast notification for validation error
      return;
    }

    setIsSubmitting(true);

    try {
      await addCredential({
        employeeId: user.id,
        type: credentialForm.type,
        name: credentialForm.name,
        issuingAuthority: credentialForm.issuingAuthority,
        expiryDate: credentialForm.expiryDate,
        status: "pending",
      });

      // Reset form on success
      setCredentialForm({
        type: "",
        name: "",
        issuingAuthority: "",
        expiryDate: "",
      });
      setShowAddCredential(false);
    } catch (error) {
      console.error("Credential submission error:", error);
      // Error handling could be enhanced here with toast notifications
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage professional credentials and certifications
          </p>
        </div>
        <Button onClick={() => setShowAddCredential(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Add Credential
        </Button>
      </div>

      {/* Add Credential Form */}
      {showAddCredential && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Credential</CardTitle>
            <CardDescription>Upload a new professional credential or certification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credentialType">Credential Type</Label>
                <Select
                  value={credentialForm.type}
                  onValueChange={(value) => setCredentialForm({ ...credentialForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select credential type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="license">Professional License</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="training">Training Certificate</SelectItem>
                    <SelectItem value="background">Background Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="credentialName">Credential Name</Label>
                <Input
                  placeholder="e.g., RN License, CPR Certification"
                  value={credentialForm.name}
                  onChange={(e) => setCredentialForm({ ...credentialForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                <Input
                  placeholder="e.g., State Board of Nursing"
                  value={credentialForm.issuingAuthority}
                  onChange={(e) =>
                    setCredentialForm({ ...credentialForm, issuingAuthority: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  type="date"
                  value={credentialForm.expiryDate}
                  onChange={(e) =>
                    setCredentialForm({ ...credentialForm, expiryDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="credentialFile">Upload Document</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveCredential} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Credential"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddCredential(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
                <p className="text-2xl font-bold">{(credentials as any[]).length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {(credentials as any[]).filter((c: any) => c.status === "verified").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(credentials as any[]).filter((c: any) => c.status === "pending").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {(credentials as any[]).filter((c: any) => c.status === "expired").length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credentials List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Credentials</CardTitle>
          <CardDescription>Manage and track your professional credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {(credentials as any[]).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No credentials yet
              </h3>
              <p className="text-gray-500 mb-4">Add your professional credentials to get started</p>
              <Button onClick={() => setShowAddCredential(true)}>Add Your First Credential</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(credentials as any[]).map((credential: any) => {
                const daysUntilExpiry = getDaysUntilExpiry(credential.expiryDate);
                const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                return (
                  <div key={credential.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(credential.status)}
                          <h3 className="font-medium text-lg">{credential.name}</h3>
                          {getStatusBadge(credential.status)}
                          {isExpiringSoon && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Expires in {daysUntilExpiry} days
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <p>
                            <strong>Type:</strong> {credential.type}
                          </p>
                          <p>
                            <strong>Issuing Authority:</strong> {credential.issuingAuthority}
                          </p>
                          <p>
                            <strong>Expiry Date:</strong>{" "}
                            {new Date(credential.expiryDate).toLocaleDateString()}
                          </p>
                          {credential.verifiedAt && (
                            <p>
                              <strong>Verified:</strong>{" "}
                              {new Date(credential.verifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
