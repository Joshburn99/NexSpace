import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Building, DollarSign, QrCode, Copy, Share2, Mail, MessageSquare,
  Gift, TrendingUp, Star, Award, ArrowLeft, Home, Settings, Plus,
  Download, Scan, ExternalLink, MapPin, Phone, Calendar
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReferralSettings {
  id: number;
  staffReferralBonus: number;
  facilityReferralBonus: {
    small: number; // 1-50 beds
    medium: number; // 51-150 beds
    large: number; // 151-300 beds
    enterprise: number; // 300+ beds
  };
  qualificationPeriod: number; // days
  payoutSchedule: string;
  requireBackground: boolean;
  minimumShifts: number;
  qrCodeEnabled: boolean;
}

interface StaffReferral {
  id: number;
  referrerId: number;
  referrerName: string;
  refereeEmail: string;
  refereeName?: string;
  status: 'pending' | 'qualified' | 'paid' | 'rejected';
  dateReferred: string;
  dateQualified?: string;
  bonusAmount: number;
  notes?: string;
}

interface FacilityReferral {
  id: number;
  referrerId: number;
  referrerName: string;
  facilityName: string;
  facilityType: 'hospital' | 'ltc' | 'rehab' | 'clinic' | 'home_health';
  facilitySize: 'small' | 'medium' | 'large' | 'enterprise';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedBeds: number;
  location: string;
  status: 'pending' | 'contacted' | 'meeting_scheduled' | 'contract_sent' | 'signed' | 'rejected';
  dateReferred: string;
  dateContacted?: string;
  bonusAmount: number;
  notes?: string;
}

interface ReferralCode {
  id: number;
  userId: number;
  userName: string;
  code: string;
  qrCodeUrl: string;
  type: 'staff' | 'facility' | 'both';
  uses: number;
  maxUses?: number;
  isActive: boolean;
}

const facilityTypeLabels = {
  hospital: 'Hospital',
  ltc: 'Long Term Care',
  rehab: 'Rehabilitation',
  clinic: 'Clinic',
  home_health: 'Home Health'
};

const facilitySizeLabels = {
  small: 'Small (1-50 beds)',
  medium: 'Medium (51-150 beds)',
  large: 'Large (151-300 beds)',
  enterprise: 'Enterprise (300+ beds)'
};

const statusColors = {
  pending: 'bg-yellow-500',
  qualified: 'bg-blue-500',
  paid: 'bg-green-500',
  rejected: 'bg-red-500',
  contacted: 'bg-blue-500',
  meeting_scheduled: 'bg-purple-500',
  contract_sent: 'bg-orange-500',
  signed: 'bg-green-500'
};

export default function EnhancedReferralPage() {
  const { toast } = useToast();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showStaffReferralDialog, setShowStaffReferralDialog] = useState(false);
  const [showFacilityReferralDialog, setShowFacilityReferralDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedReferralCode, setSelectedReferralCode] = useState<ReferralCode | null>(null);

  const { data: referralSettings, isLoading: settingsLoading } = useQuery<ReferralSettings>({
    queryKey: ["/api/referral-settings"],
  });

  const { data: staffReferrals = [], isLoading: staffReferralsLoading } = useQuery<StaffReferral[]>({
    queryKey: ["/api/referrals/staff"],
  });

  const { data: facilityReferrals = [], isLoading: facilityReferralsLoading } = useQuery<FacilityReferral[]>({
    queryKey: ["/api/referrals/facilities"],
  });

  const { data: referralCodes = [], isLoading: codesLoading } = useQuery<ReferralCode[]>({
    queryKey: ["/api/referral-codes"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Calculate statistics
  const staffStats = {
    total: staffReferrals.length,
    pending: staffReferrals.filter(r => r.status === 'pending').length,
    qualified: staffReferrals.filter(r => r.status === 'qualified').length,
    paid: staffReferrals.filter(r => r.status === 'paid').length,
    totalBonus: staffReferrals.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.bonusAmount, 0)
  };

  const facilityStats = {
    total: facilityReferrals.length,
    pending: facilityReferrals.filter(r => r.status === 'pending').length,
    signed: facilityReferrals.filter(r => r.status === 'signed').length,
    totalBonus: facilityReferrals.filter(r => r.status === 'signed').reduce((sum, r) => sum + r.bonusAmount, 0)
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<ReferralSettings>) => {
      const response = await apiRequest("PATCH", "/api/referral-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-settings"] });
      setShowSettingsDialog(false);
      toast({
        title: "Settings Updated",
        description: "Referral settings have been updated successfully.",
      });
    },
  });

  const createStaffReferralMutation = useMutation({
    mutationFn: async (referralData: any) => {
      const response = await apiRequest("POST", "/api/referrals/staff", referralData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/staff"] });
      setShowStaffReferralDialog(false);
      toast({
        title: "Staff Referral Created",
        description: "Staff referral has been submitted successfully.",
      });
    },
  });

  const createFacilityReferralMutation = useMutation({
    mutationFn: async (referralData: any) => {
      const response = await apiRequest("POST", "/api/referrals/facilities", referralData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/facilities"] });
      setShowFacilityReferralDialog(false);
      toast({
        title: "Facility Referral Created",
        description: "Facility referral has been submitted successfully.",
      });
    },
  });

  const generateQRCodeMutation = useMutation({
    mutationFn: async (data: { userId: number; type: string }) => {
      const response = await apiRequest("POST", "/api/referral-codes/generate", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-codes"] });
      toast({
        title: "QR Code Generated",
        description: "New referral QR code has been generated successfully.",
      });
    },
  });

  const updateReferralStatusMutation = useMutation({
    mutationFn: async ({ type, id, status }: { type: 'staff' | 'facility'; id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/referrals/${type}/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/facilities"] });
      toast({
        title: "Status Updated",
        description: "Referral status has been updated successfully.",
      });
    },
  });

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const settings = {
      staffReferralBonus: parseFloat(formData.get('staffReferralBonus') as string),
      facilityReferralBonus: {
        small: parseFloat(formData.get('smallFacilityBonus') as string),
        medium: parseFloat(formData.get('mediumFacilityBonus') as string),
        large: parseFloat(formData.get('largeFacilityBonus') as string),
        enterprise: parseFloat(formData.get('enterpriseFacilityBonus') as string),
      },
      qualificationPeriod: parseInt(formData.get('qualificationPeriod') as string),
      payoutSchedule: formData.get('payoutSchedule') as string,
      requireBackground: formData.get('requireBackground') === 'on',
      minimumShifts: parseInt(formData.get('minimumShifts') as string),
      qrCodeEnabled: formData.get('qrCodeEnabled') === 'on',
    };
    updateSettingsMutation.mutate(settings);
  };

  const handleCreateStaffReferral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const referralData = {
      referrerId: parseInt(formData.get('referrerId') as string),
      refereeEmail: formData.get('refereeEmail') as string,
      refereeName: formData.get('refereeName') as string,
      notes: formData.get('notes') as string,
      bonusAmount: referralSettings?.staffReferralBonus || 500
    };
    createStaffReferralMutation.mutate(referralData);
  };

  const handleCreateFacilityReferral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const facilitySize = formData.get('facilitySize') as keyof typeof facilitySizeLabels;
    const referralData = {
      referrerId: parseInt(formData.get('referrerId') as string),
      facilityName: formData.get('facilityName') as string,
      facilityType: formData.get('facilityType') as string,
      facilitySize,
      contactName: formData.get('contactName') as string,
      contactEmail: formData.get('contactEmail') as string,
      contactPhone: formData.get('contactPhone') as string,
      estimatedBeds: parseInt(formData.get('estimatedBeds') as string),
      location: formData.get('location') as string,
      notes: formData.get('notes') as string,
      bonusAmount: referralSettings?.facilityReferralBonus[facilitySize] || 1000
    };
    createFacilityReferralMutation.mutate(referralData);
  };

  const copyReferralLink = async (code: string) => {
    const link = `${window.location.origin}/refer/${code}`;
    await navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Referral link has been copied to clipboard.",
    });
  };

  const downloadQRCode = async (qrCodeUrl: string, fileName: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "QR Code Downloaded",
        description: "QR code has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download QR code.",
        variant: "destructive",
      });
    }
  };

  if (settingsLoading || staffReferralsLoading || facilityReferralsLoading || codesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced Referral System</h1>
            <p className="text-muted-foreground">
              Manage staff and facility referrals with QR codes and bonuses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Referral Settings</DialogTitle>
                  <DialogDescription>
                    Configure referral bonuses and requirements
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="staffReferralBonus">Staff Referral Bonus ($)</Label>
                      <Input 
                        name="staffReferralBonus" 
                        type="number" 
                        step="0.01"
                        defaultValue={referralSettings?.staffReferralBonus}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="qualificationPeriod">Qualification Period (days)</Label>
                      <Input 
                        name="qualificationPeriod" 
                        type="number"
                        defaultValue={referralSettings?.qualificationPeriod}
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Facility Referral Bonuses</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label htmlFor="smallFacilityBonus">Small Facility ($)</Label>
                        <Input 
                          name="smallFacilityBonus" 
                          type="number" 
                          step="0.01"
                          defaultValue={referralSettings?.facilityReferralBonus.small}
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediumFacilityBonus">Medium Facility ($)</Label>
                        <Input 
                          name="mediumFacilityBonus" 
                          type="number" 
                          step="0.01"
                          defaultValue={referralSettings?.facilityReferralBonus.medium}
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="largeFacilityBonus">Large Facility ($)</Label>
                        <Input 
                          name="largeFacilityBonus" 
                          type="number" 
                          step="0.01"
                          defaultValue={referralSettings?.facilityReferralBonus.large}
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="enterpriseFacilityBonus">Enterprise Facility ($)</Label>
                        <Input 
                          name="enterpriseFacilityBonus" 
                          type="number" 
                          step="0.01"
                          defaultValue={referralSettings?.facilityReferralBonus.enterprise}
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payoutSchedule">Payout Schedule</Label>
                      <Select name="payoutSchedule" defaultValue={referralSettings?.payoutSchedule}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="minimumShifts">Minimum Shifts for Qualification</Label>
                      <Input 
                        name="minimumShifts" 
                        type="number"
                        defaultValue={referralSettings?.minimumShifts}
                        required 
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="requireBackground" 
                      name="requireBackground"
                      defaultChecked={referralSettings?.requireBackground}
                    />
                    <Label htmlFor="requireBackground">Require background check for qualification</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="qrCodeEnabled" 
                      name="qrCodeEnabled"
                      defaultChecked={referralSettings?.qrCodeEnabled}
                    />
                    <Label htmlFor="qrCodeEnabled">Enable QR code generation</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowSettingsDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateSettingsMutation.isPending}>
                      Update Settings
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Staff Referrals</p>
                <p className="text-2xl font-bold">{staffStats.total}</p>
                <p className="text-xs text-muted-foreground">
                  {staffStats.paid} paid • ${staffStats.totalBonus} earned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Facility Referrals</p>
                <p className="text-2xl font-bold">{facilityStats.total}</p>
                <p className="text-xs text-muted-foreground">
                  {facilityStats.signed} signed • ${facilityStats.totalBonus} earned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">QR Codes</p>
                <p className="text-2xl font-bold">{referralCodes.length}</p>
                <p className="text-xs text-muted-foreground">
                  {referralCodes.filter(c => c.isActive).length} active codes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Total Bonuses</p>
                <p className="text-2xl font-bold">${staffStats.totalBonus + facilityStats.totalBonus}</p>
                <p className="text-xs text-muted-foreground">All referrals combined</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff Referrals</TabsTrigger>
          <TabsTrigger value="facilities">Facility Referrals</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Staff Referrals</h2>
            <Dialog open={showStaffReferralDialog} onOpenChange={setShowStaffReferralDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Staff Referral
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Staff Referral</DialogTitle>
                  <DialogDescription>
                    Refer a new staff member to earn ${referralSettings?.staffReferralBonus}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStaffReferral} className="space-y-4">
                  <div>
                    <Label htmlFor="referrerId">Referring Staff Member</Label>
                    <Select name="referrerId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(users) && users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="refereeName">Referee Name</Label>
                    <Input name="refereeName" required />
                  </div>
                  <div>
                    <Label htmlFor="refereeEmail">Referee Email</Label>
                    <Input name="refereeEmail" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea name="notes" placeholder="Additional information..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowStaffReferralDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createStaffReferralMutation.isPending}>
                      Create Referral
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Date Referred</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>{referral.referrerName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.refereeName || 'Pending'}</div>
                          <div className="text-sm text-muted-foreground">{referral.refereeEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(referral.dateReferred).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[referral.status]} text-white`}>
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>${referral.bonusAmount}</TableCell>
                      <TableCell>
                        <Select 
                          value={referral.status} 
                          onValueChange={(newStatus) => 
                            updateReferralStatusMutation.mutate({ 
                              type: 'staff', 
                              id: referral.id, 
                              status: newStatus 
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Facility Referrals</h2>
            <Dialog open={showFacilityReferralDialog} onOpenChange={setShowFacilityReferralDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Facility Referral
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Facility Referral</DialogTitle>
                  <DialogDescription>
                    Refer a new facility to earn bonuses based on facility size
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateFacilityReferral} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="referrerId">Referring Staff Member</Label>
                      <Select name="referrerId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="facilityName">Facility Name</Label>
                      <Input name="facilityName" required />
                    </div>
                    <div>
                      <Label htmlFor="facilityType">Facility Type</Label>
                      <Select name="facilityType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(facilityTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="facilitySize">Facility Size</Label>
                      <Select name="facilitySize" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(facilitySizeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input name="contactName" required />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input name="contactEmail" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input name="contactPhone" type="tel" required />
                    </div>
                    <div>
                      <Label htmlFor="estimatedBeds">Estimated Beds</Label>
                      <Input name="estimatedBeds" type="number" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input name="location" required />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea name="notes" placeholder="Additional information about the facility..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowFacilityReferralDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createFacilityReferralMutation.isPending}>
                      Create Referral
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilityReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>{referral.referrerName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.facilityName}</div>
                          <div className="text-sm text-muted-foreground">
                            {facilityTypeLabels[referral.facilityType]} • {referral.estimatedBeds} beds
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {referral.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.contactName}</div>
                          <div className="text-sm text-muted-foreground">{referral.contactEmail}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {referral.contactPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {facilitySizeLabels[referral.facilitySize]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[referral.status]} text-white`}>
                          {referral.status.replace('_', ' ').charAt(0).toUpperCase() + referral.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>${referral.bonusAmount}</TableCell>
                      <TableCell>
                        <Select 
                          value={referral.status} 
                          onValueChange={(newStatus) => 
                            updateReferralStatusMutation.mutate({ 
                              type: 'facility', 
                              id: referral.id, 
                              status: newStatus 
                            })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                            <SelectItem value="contract_sent">Contract Sent</SelectItem>
                            <SelectItem value="signed">Signed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">QR Codes</h2>
            <Button 
              className="gap-2"
              onClick={() => generateQRCodeMutation.mutate({ userId: 1, type: 'both' })}
              disabled={generateQRCodeMutation.isPending}
            >
              <QrCode className="h-4 w-4" />
              Generate QR Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {referralCodes.map((code) => (
              <Card key={code.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{code.userName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {code.type === 'both' ? 'Staff & Facility' : code.type.charAt(0).toUpperCase() + code.type.slice(1)}
                      </p>
                    </div>
                    <Badge variant={code.isActive ? "default" : "secondary"}>
                      {code.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={code.qrCodeUrl} 
                      alt={`QR Code for ${code.userName}`}
                      className="w-32 h-32 border rounded-md"
                    />
                  </div>
                  
                  <div className="text-center">
                    <div className="font-mono text-sm bg-muted p-2 rounded">
                      {code.code}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {code.uses} uses {code.maxUses && `/ ${code.maxUses} max`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => copyReferralLink(code.code)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => downloadQRCode(code.qrCodeUrl, `qr-${code.code}`)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}