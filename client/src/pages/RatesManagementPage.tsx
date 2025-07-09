import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  DollarSign, 
  Plus,
  Edit,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

const rateSchema = z.object({
  facilityId: z.number(),
  specialty: z.string().min(1, 'Specialty is required'),
  position: z.string().min(1, 'Position is required'),
  payRate: z.number().positive('Pay rate must be positive'),
  billRate: z.number().positive('Bill rate must be positive'),
  contractType: z.enum(['full_time', 'part_time', 'contract', 'per_diem']),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  department: z.string().optional(),
  shiftType: z.enum(['day', 'evening', 'night', 'weekend']).optional(),
  experienceLevel: z.enum(['entry', 'intermediate', 'senior', 'expert']).optional(),
  overtimeMultiplier: z.number().optional(),
  holidayMultiplier: z.number().optional(),
  weekendMultiplier: z.number().optional(),
});

type BillingRate = {
  id: number;
  facilityId: number;
  specialty: string;
  position: string;
  payRate: number;
  billRate: number;
  contractType: string;
  effectiveDate: string;
  department?: string;
  shiftType?: string;
  experienceLevel?: string;
  overtimeMultiplier?: number;
  holidayMultiplier?: number;
  weekendMultiplier?: number;
  createdAt: string;
  updatedAt: string;
};

export default function RatesManagementPage() {
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateRate, setShowCreateRate] = useState(false);
  const [editingRate, setEditingRate] = useState<BillingRate | null>(null);
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterContractType, setFilterContractType] = useState<string>('all');

  // Permission check - only users with view_rates permission can access this page
  if (!hasPermission('view_rates')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">You don't have permission to view billing rates.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query for billing rates
  const { data: billingRates = [], isLoading: ratesLoading } = useQuery<BillingRate[]>({
    queryKey: ['/api/billing/rates', facilityId],
    enabled: !!facilityId,
  });

  // Get unique specialties and contract types for filtering
  const specialties = [...new Set(billingRates.map(rate => rate.specialty))];
  const contractTypes = [...new Set(billingRates.map(rate => rate.contractType))];

  // Filter rates based on selected filters
  const filteredRates = billingRates.filter(rate => {
    const specialtyMatch = filterSpecialty === 'all' || rate.specialty === filterSpecialty;
    const contractMatch = filterContractType === 'all' || rate.contractType === filterContractType;
    return specialtyMatch && contractMatch;
  });

  // Calculate rate analytics
  const rateAnalytics = {
    averagePayRate: filteredRates.reduce((sum, rate) => sum + rate.payRate, 0) / filteredRates.length || 0,
    averageBillRate: filteredRates.reduce((sum, rate) => sum + rate.billRate, 0) / filteredRates.length || 0,
    averageMargin: filteredRates.reduce((sum, rate) => sum + (rate.billRate - rate.payRate), 0) / filteredRates.length || 0,
    totalPositions: filteredRates.length,
    highestPayRate: Math.max(...filteredRates.map(rate => rate.payRate)),
    lowestPayRate: Math.min(...filteredRates.map(rate => rate.payRate)),
  };

  // Form for creating/editing rates
  const form = useForm<z.infer<typeof rateSchema>>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      facilityId: facilityId || 0,
      specialty: '',
      position: '',
      payRate: 0,
      billRate: 0,
      contractType: 'full_time',
      effectiveDate: new Date().toISOString().split('T')[0],
      department: '',
      shiftType: 'day',
      experienceLevel: 'intermediate',
      overtimeMultiplier: 1.5,
      holidayMultiplier: 2.0,
      weekendMultiplier: 1.2,
    }
  });

  // Mutation for creating/updating rates
  const rateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rateSchema>) => {
      const endpoint = editingRate ? `/api/billing/rates/${editingRate.id}` : '/api/billing/rates';
      const method = editingRate ? 'PATCH' : 'POST';
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/rates'] });
      setShowCreateRate(false);
      setEditingRate(null);
      form.reset();
      toast({
        title: "Success",
        description: `Rate ${editingRate ? 'updated' : 'created'} successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${editingRate ? 'update' : 'create'} rate`,
        variant: "destructive",
      });
    }
  });

  const handleCreateRate = (data: z.infer<typeof rateSchema>) => {
    rateMutation.mutate(data);
  };

  const handleEditRate = (rate: BillingRate) => {
    setEditingRate(rate);
    form.reset({
      facilityId: rate.facilityId,
      specialty: rate.specialty,
      position: rate.position,
      payRate: rate.payRate,
      billRate: rate.billRate,
      contractType: rate.contractType as any,
      effectiveDate: rate.effectiveDate,
      department: rate.department || '',
      shiftType: rate.shiftType as any,
      experienceLevel: rate.experienceLevel as any,
      overtimeMultiplier: rate.overtimeMultiplier || 1.5,
      holidayMultiplier: rate.holidayMultiplier || 2.0,
      weekendMultiplier: rate.weekendMultiplier || 1.2,
    });
    setShowCreateRate(true);
  };

  const getContractTypeBadge = (contractType: string) => {
    switch (contractType) {
      case 'full_time': return <Badge className="bg-green-100 text-green-800">Full Time</Badge>;
      case 'part_time': return <Badge className="bg-blue-100 text-blue-800">Part Time</Badge>;
      case 'contract': return <Badge className="bg-purple-100 text-purple-800">Contract</Badge>;
      case 'per_diem': return <Badge className="bg-orange-100 text-orange-800">Per Diem</Badge>;
      default: return <Badge variant="outline">{contractType}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Pay Rates</h1>
          <p className="text-gray-600">Manage facility billing rates and staff compensation</p>
        </div>
        
        {hasPermission('edit_rates') && (
          <Button onClick={() => setShowCreateRate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        )}
      </div>

      {/* Rate Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Pay Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${rateAnalytics.averagePayRate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bill Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${rateAnalytics.averageBillRate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${rateAnalytics.averageMargin.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rateAnalytics.totalPositions}</div>
            <p className="text-xs text-muted-foreground">rate configurations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialty-filter">Specialty</Label>
              <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="All specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map(specialty => (
                    <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contract-filter">Contract Type</Label>
              <Select value={filterContractType} onValueChange={setFilterContractType}>
                <SelectTrigger>
                  <SelectValue placeholder="All contract types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contract Types</SelectItem>
                  {contractTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {ratesLoading ? (
            <div className="text-center py-8">Loading rates...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Bill Rate</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Effective Date</TableHead>
                  {hasPermission('edit_rates') && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.specialty}</TableCell>
                    <TableCell>{rate.position}</TableCell>
                    <TableCell>${rate.payRate.toFixed(2)}/hr</TableCell>
                    <TableCell>${rate.billRate.toFixed(2)}/hr</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        (rate.billRate - rate.payRate) < 10 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${(rate.billRate - rate.payRate).toFixed(2)}/hr
                      </span>
                    </TableCell>
                    <TableCell>{getContractTypeBadge(rate.contractType)}</TableCell>
                    <TableCell>{new Date(rate.effectiveDate).toLocaleDateString()}</TableCell>
                    {hasPermission('edit_rates') && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRate(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Rate Dialog */}
      <Dialog open={showCreateRate} onOpenChange={setShowCreateRate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit Rate' : 'Create New Rate'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateRate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <FormControl>
                        <Input placeholder="RN, LPN, CNA, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Staff Nurse, Charge Nurse, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Rate ($/hr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Rate ($/hr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="per_diem">Per Diem</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="ICU, ER, Med-Surg, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateRate(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={rateMutation.isPending}>
                  {editingRate ? 'Update' : 'Create'} Rate
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}