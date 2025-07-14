import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Building, DollarSign, Star, Mail, Phone, Plus, Search, Filter } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Referral {
  id: number;
  type: 'staff' | 'facility';
  referrerName: string;
  referrerEmail: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone?: string;
  specialty?: string;
  facilityName?: string;
  status: 'pending' | 'contacted' | 'interviewed' | 'hired' | 'declined';
  referralBonus?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ReferralForm {
  type: 'staff' | 'facility';
  refereeName: string;
  refereeEmail: string;
  refereePhone: string;
  specialty: string;
  facilityName: string;
  notes: string;
}

export default function ReferralSystemPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ReferralForm>({
    type: 'staff',
    refereeName: '',
    refereeEmail: '',
    refereePhone: '',
    specialty: '',
    facilityName: '',
    notes: ''
  });

  const { data: referrals, isLoading } = useQuery<Referral[]>({
    queryKey: ['/api/referrals'],
    initialData: [
      {
        id: 1,
        type: 'staff',
        referrerName: 'Sarah Johnson',
        referrerEmail: 'sarah.johnson@email.com',
        refereeName: 'Michael Chen',
        refereeEmail: 'michael.chen@email.com',
        refereePhone: '(555) 123-4567',
        specialty: 'Registered Nurse',
        status: 'interviewed',
        referralBonus: 2000,
        notes: 'Excellent ICU experience, highly recommended',
        createdAt: '2025-07-01',
        updatedAt: '2025-07-12'
      },
      {
        id: 2,
        type: 'facility',
        referrerName: 'David Rodriguez',
        referrerEmail: 'david.rodriguez@email.com',
        refereeName: 'Lisa Park',
        refereeEmail: 'lisa.park@email.com',
        refereePhone: '(555) 987-6543',
        facilityName: 'Sunset Care Center',
        status: 'contacted',
        referralBonus: 1500,
        notes: 'Interested in partnership opportunities',
        createdAt: '2025-07-05',
        updatedAt: '2025-07-10'
      },
      {
        id: 3,
        type: 'staff',
        referrerName: 'Emily Watson',
        referrerEmail: 'emily.watson@email.com',
        refereeName: 'James Miller',
        refereeEmail: 'james.miller@email.com',
        refereePhone: '(555) 456-7890',
        specialty: 'Physical Therapist',
        status: 'hired',
        referralBonus: 1800,
        notes: 'Great addition to our PT team',
        createdAt: '2025-06-20',
        updatedAt: '2025-07-08'
      }
    ]
  });

  const createReferral = useMutation({
    mutationFn: async (data: ReferralForm) => {
      return apiRequest('POST', '/api/referrals', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      setIsCreateModalOpen(false);
      setFormData({
        type: 'staff',
        refereeName: '',
        refereeEmail: '',
        refereePhone: '',
        specialty: '',
        facilityName: '',
        notes: ''
      });
      toast({
        title: "Success",
        description: "Referral submitted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit referral",
        variant: "destructive",
      });
    },
  });

  const filteredReferrals = referrals?.filter(referral => {
    const matchesSearch = referral.refereeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.facilityName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;
    const matchesType = typeFilter === 'all' || referral.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'staff' ? Users : Building;
  };

  const handleInputChange = (field: keyof ReferralForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.refereeName || !formData.refereeEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createReferral.mutate(formData);
  };

  if (!hasPermission('view_referral_system')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view the referral system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalReferrals = referrals?.length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
  const hiredReferrals = referrals?.filter(r => r.status === 'hired').length || 0;
  const totalEarnings = referrals?.filter(r => r.status === 'hired').reduce((sum, r) => sum + (r.referralBonus || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-8 w-8" />
            Referral System
          </h1>
          <p className="text-gray-600 mt-2">Manage staff and facility referrals</p>
        </div>
        {hasPermission('manage_referral_system') && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Referral
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit New Referral</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Referral Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff Referral</SelectItem>
                      <SelectItem value="facility">Facility Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="refereeName">Referee Name *</Label>
                    <Input
                      id="refereeName"
                      value={formData.refereeName}
                      onChange={(e) => handleInputChange('refereeName', e.target.value)}
                      placeholder="Enter referee name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="refereeEmail">Referee Email *</Label>
                    <Input
                      id="refereeEmail"
                      type="email"
                      value={formData.refereeEmail}
                      onChange={(e) => handleInputChange('refereeEmail', e.target.value)}
                      placeholder="Enter referee email"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="refereePhone">Referee Phone</Label>
                  <Input
                    id="refereePhone"
                    value={formData.refereePhone}
                    onChange={(e) => handleInputChange('refereePhone', e.target.value)}
                    placeholder="Enter referee phone number"
                  />
                </div>

                {formData.type === 'staff' && (
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Registered Nurse">Registered Nurse</SelectItem>
                        <SelectItem value="Licensed Practical Nurse">Licensed Practical Nurse</SelectItem>
                        <SelectItem value="Certified Nursing Assistant">Certified Nursing Assistant</SelectItem>
                        <SelectItem value="Physical Therapist">Physical Therapist</SelectItem>
                        <SelectItem value="Respiratory Therapist">Respiratory Therapist</SelectItem>
                        <SelectItem value="Medical Doctor">Medical Doctor</SelectItem>
                        <SelectItem value="Nurse Practitioner">Nurse Practitioner</SelectItem>
                        <SelectItem value="Physician Assistant">Physician Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.type === 'facility' && (
                  <div>
                    <Label htmlFor="facilityName">Facility Name</Label>
                    <Input
                      id="facilityName"
                      value={formData.facilityName}
                      onChange={(e) => handleInputChange('facilityName', e.target.value)}
                      placeholder="Enter facility name"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any additional notes about the referral"
                    className="min-h-20"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createReferral.isPending}>
                    {createReferral.isPending ? 'Submitting...' : 'Submit Referral'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">All Referrals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReferrals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingReferrals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hired</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hiredReferrals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search referrals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="facility">Facility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReferrals.map((referral) => {
              const TypeIcon = getTypeIcon(referral.type);
              return (
                <Card key={referral.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-lg">{referral.refereeName}</CardTitle>
                          <p className="text-sm text-gray-600">{referral.specialty || referral.facilityName}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(referral.status)}>
                        {referral.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {referral.refereeEmail}
                      </div>
                      {referral.refereePhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          {referral.refereePhone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="h-3 w-3" />
                        Referred by: {referral.referrerName}
                      </div>
                      {referral.referralBonus && (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                          <DollarSign className="h-3 w-3" />
                          ${referral.referralBonus.toLocaleString()} bonus
                        </div>
                      )}
                      {referral.notes && (
                        <p className="text-sm text-gray-700 mt-2">{referral.notes}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Submitted: {new Date(referral.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredReferrals.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No referrals found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No referrals have been submitted yet'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Earnings Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">${totalEarnings.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Earned</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{hiredReferrals}</div>
                    <div className="text-sm text-gray-600">Successful Referrals</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${hiredReferrals > 0 ? (totalEarnings / hiredReferrals).toFixed(0) : '0'}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Bonus</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}