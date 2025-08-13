import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Upload, Plus, Eye } from "lucide-react";

interface Credential {
  id: number;
  type: string;
  number?: string;
  issuingAuthority?: string;
  issuedAt?: string;
  expiresAt?: string;
  status: "verified" | "pending" | "expired" | "rejected";
  verifiedBy?: number;
  verifiedAt?: string;
  fileUrl?: string;
  notes?: string;
}

export default function CredentialsPage() {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const { toast } = useToast();

  // Fetch credentials for selected staff
  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ["/api/credentials/staff", selectedStaffId],
    enabled: !!selectedStaffId,
  });

  // Fetch expiring credentials (30 days)
  const { data: expiringCredentials = [] } = useQuery<Credential[]>({
    queryKey: ["/api/credentials/expiring?days=30"],
  });

  // Verify credential mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/credentials/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credentials"] });
      toast({
        title: "Credential updated",
        description: "The credential status has been updated successfully.",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: JSX.Element }> = {
      verified: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
      expired: { color: "bg-red-100 text-red-800", icon: <XCircle className="w-4 h-4" /> },
      rejected: { color: "bg-gray-100 text-gray-800", icon: <XCircle className="w-4 h-4" /> },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Credential Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Credential
        </Button>
      </div>

      {/* Expiring Credentials Alert */}
      {expiringCredentials.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">
              ⚠️ Expiring Credentials ({expiringCredentials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringCredentials.slice(0, 3).map((cred) => (
                <div key={cred.id} className="flex justify-between items-center">
                  <span className="font-medium">{cred.type}</span>
                  <span className="text-sm text-orange-600">
                    Expires in {getDaysUntilExpiry(cred.expiresAt!)} days
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Issuing Authority</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((credential) => (
                <TableRow key={credential.id}>
                  <TableCell className="font-medium">{credential.type}</TableCell>
                  <TableCell>{credential.number || "-"}</TableCell>
                  <TableCell>{credential.issuingAuthority || "-"}</TableCell>
                  <TableCell>
                    {credential.issuedAt
                      ? format(new Date(credential.issuedAt), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {credential.expiresAt ? (
                      <span
                        className={
                          getDaysUntilExpiry(credential.expiresAt) <= 30
                            ? "text-orange-600 font-medium"
                            : ""
                        }
                      >
                        {format(new Date(credential.expiresAt), "MMM dd, yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(credential.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCredential(credential)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {credential.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() =>
                              verifyMutation.mutate({ id: credential.id, status: "verified" })
                            }
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() =>
                              verifyMutation.mutate({ id: credential.id, status: "rejected" })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Credential Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Credential Type</Label>
              <Input id="type" placeholder="e.g., RN License, BLS, CPR" />
            </div>
            <div>
              <Label htmlFor="number">Credential Number</Label>
              <Input id="number" placeholder="License/Certificate number" />
            </div>
            <div>
              <Label htmlFor="authority">Issuing Authority</Label>
              <Input id="authority" placeholder="e.g., State Board of Nursing" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issued">Issue Date</Label>
                <Input id="issued" type="date" />
              </div>
              <div>
                <Label htmlFor="expires">Expiry Date</Label>
                <Input id="expires" type="date" />
              </div>
            </div>
            <div>
              <Label htmlFor="file">Upload Document</Label>
              <div className="flex items-center gap-2">
                <Input id="file" type="file" accept=".pdf,.jpg,.png" />
                <Button size="sm" variant="outline">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Save Credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}