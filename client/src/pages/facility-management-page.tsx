import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, 
  Settings, 
  DollarSign, 
  Users, 
  Clock, 
  FileText, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  Shield,
  Workflow,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

// Enhanced Facility Types
interface EnhancedFacility {
  id: number;
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  bedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields
  autoAssignmentEnabled?: boolean;
  timezone?: string;
  netTerms?: string;
  teamId?: number;
  billRates?: Record<string, number>;
  payRates?: Record<string, number>;
  floatPoolMargins?: Record<string, number>;
  workflowAutomationConfig?: {
    autoApproveShifts?: boolean;
    autoNotifyManagers?: boolean;
    autoGenerateInvoices?: boolean;
    requireManagerApproval?: boolean;
    enableOvertimeAlerts?: boolean;
    autoAssignBySpecialty?: boolean;
  };
  shiftManagementSettings?: {
    overtimeThreshold?: number;
    maxConsecutiveShifts?: number;
    minHoursBetweenShifts?: number;
    allowBackToBackShifts?: boolean;
    requireManagerApprovalForOvertime?: boolean;
    autoCalculateOvertime?: boolean;
  };
  staffingTargets?: Record<string, {
    targetHours: number;
    minStaff: number;
    maxStaff: number;
    preferredStaffMix?: Record<string, number>;
  }>;
  customRules?: {
    floatPoolRules?: {
      maxHoursPerWeek?: number;
      specialtyRestrictions?: string[];
      requireAdditionalTraining?: boolean;
    };
    overtimeRules?: {
      maxOvertimeHours?: number;
      overtimeApprovalRequired?: boolean;
      overtimeRate?: number;
    };
    attendanceRules?: {
      maxLateArrivals?: number;
      maxNoCallNoShows?: number;
      probationaryPeriod?: number;
    };
    requiredDocuments?: string[];
  };
  regulatoryDocs?: Array<{
    id: string;
    name: string;
    type: 'license' | 'certification' | 'policy' | 'procedure' | 'contract';
    url?: string;
    uploadDate: string;
    expirationDate?: string;
    status: 'active' | 'expired' | 'pending_renewal';
  }>;
  emrSystem?: string;
  contractStartDate?: string;
  billingContactName?: string;
  billingContactEmail?: string;
}

// Form schemas
const basicFacilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  facilityType: z.string().min(1, "Facility type is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  bedCount: z.coerce.number().min(1, "Bed count must be at least 1"),
  isActive: z.boolean().default(true)
});

const enhancedFacilitySchema = basicFacilitySchema.extend({
  autoAssignmentEnabled: z.boolean().default(false),
  timezone: z.string().default("America/New_York"),
  netTerms: z.string().default("Net 30"),
  emrSystem: z.string().optional(),
  billingContactName: z.string().optional(),
  billingContactEmail: z.string().email().optional().or(z.literal(""))
});

type BasicFacilityForm = z.infer<typeof basicFacilitySchema>;
type EnhancedFacilityForm = z.infer<typeof enhancedFacilitySchema>;

export default function FacilityManagementPage() {
  const [selectedFacility, setSelectedFacility] = useState<EnhancedFacility | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch facilities
  const { data: facilities = [], isLoading, error } = useQuery({
    queryKey: ["/api/facilities", { search: searchTerm, state: filterState, facilityType: filterType }],
    enabled: true,
    retry: 1
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: (data: EnhancedFacilityForm) => 
      apiRequest("/api/facilities", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setShowCreateModal(false);
    }
  });

  // Update facility rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: ({ id, rates }: { id: number; rates: any }) =>
      apiRequest(`/api/facilities/${id}/rates`, {
        method: "POST",
        body: JSON.stringify(rates)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
    }
  });

  // Update staffing targets mutation
  const updateStaffingMutation = useMutation({
    mutationFn: ({ id, staffingTargets }: { id: number; staffingTargets: any }) =>
      apiRequest(`/api/facilities/${id}/staffing-targets`, {
        method: "POST",
        body: JSON.stringify({ staffingTargets })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
    }
  });

  // Update workflow configuration mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, workflowAutomationConfig }: { id: number; workflowAutomationConfig: any }) =>
      apiRequest(`/api/facilities/${id}/workflow-config`, {
        method: "POST",
        body: JSON.stringify({ workflowAutomationConfig })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
    }
  });

  // Form handling
  const form = useForm<EnhancedFacilityForm>({
    resolver: zodResolver(enhancedFacilitySchema),
    defaultValues: {
      name: "",
      facilityType: "Hospital",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      bedCount: 100,
      isActive: true,
      autoAssignmentEnabled: false,
      timezone: "America/New_York",
      netTerms: "Net 30",
      emrSystem: "",
      billingContactName: "",
      billingContactEmail: ""
    }
  });

  const onSubmit = (data: EnhancedFacilityForm) => {
    createFacilityMutation.mutate(data);
  };

  // Filter facilities
  const filteredFacilities = facilities.filter((facility: EnhancedFacility) => {
    const matchesSearch = !searchTerm || 
      facility.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !filterState || facility.state === filterState;
    const matchesType = !filterType || facility.facilityType === filterType;
    return matchesSearch && matchesState && matchesType;
  });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700">Failed to load facilities</h3>
              <p className="text-sm text-gray-600 mt-2">
                Please ensure you're logged in and have the required permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Enhanced Facility Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive facility operations, rates, and workflow management
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Enhanced Facility</DialogTitle>
              <DialogDescription>
                Add a new healthcare facility with complete operational configuration
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="operations">Operations</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facility Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Regional Medical Center" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="facilityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facility Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Hospital">Hospital</SelectItem>
                                <SelectItem value="Clinic">Clinic</SelectItem>
                                <SelectItem value="Skilled Nursing">Skilled Nursing</SelectItem>
                                <SelectItem value="Assisted Living">Assisted Living</SelectItem>
                                <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="1234 Medical Drive" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Portland" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="OR" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="97201" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(503) 555-0100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="admin@facility.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bedCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bed Count</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="250" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="operations" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="autoAssignmentEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Auto Assignment</FormLabel>
                              <FormDescription>
                                Automatically assign workers to matching shifts
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                                <SelectItem value="America/Chicago">Central Time</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="emrSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>EMR System</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select EMR system" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Epic">Epic</SelectItem>
                              <SelectItem value="Cerner">Cerner</SelectItem>
                              <SelectItem value="Allscripts">Allscripts</SelectItem>
                              <SelectItem value="Meditech">Meditech</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="billing" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="netTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Net 15">Net 15</SelectItem>
                              <SelectItem value="Net 30">Net 30</SelectItem>
                              <SelectItem value="Net 45">Net 45</SelectItem>
                              <SelectItem value="Net 60">Net 60</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billingContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="billingContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Contact Email</FormLabel>
                            <FormControl>
                              <Input placeholder="billing@facility.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createFacilityMutation.isPending}>
                    {createFacilityMutation.isPending ? "Creating..." : "Create Facility"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Facilities</Label>
              <Input
                id="search"
                placeholder="Search by name or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">Filter by State</Label>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All states</SelectItem>
                  <SelectItem value="OR">Oregon</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="WA">Washington</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="Hospital">Hospital</SelectItem>
                  <SelectItem value="Clinic">Clinic</SelectItem>
                  <SelectItem value="Skilled Nursing">Skilled Nursing</SelectItem>
                  <SelectItem value="Assisted Living">Assisted Living</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterState("");
                  setFilterType("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility: EnhancedFacility) => (
            <Card key={facility.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {facility.facilityType}
                    </CardDescription>
                  </div>
                  <Badge variant={facility.isActive ? "default" : "secondary"}>
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {facility.city}, {facility.state}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {facility.bedCount} beds
                  </div>
                  
                  {facility.emrSystem && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      EMR: {facility.emrSystem}
                    </div>
                  )}
                  
                  {facility.autoAssignmentEnabled && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Auto-assignment enabled
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-sm text-muted-foreground">
                      {facility.timezone?.replace("America/", "")}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedFacility(facility)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredFacilities.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No facilities found</h3>
              <p className="text-sm text-gray-500 mt-2">
                {searchTerm || filterState || filterType 
                  ? "Try adjusting your filters or search terms"
                  : "Get started by adding your first facility"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <Dialog open={!!selectedFacility} onOpenChange={() => setSelectedFacility(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedFacility.name}
              </DialogTitle>
              <DialogDescription>
                Enhanced facility management and configuration
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rates">Rates</TabsTrigger>
                <TabsTrigger value="staffing">Staffing</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedFacility.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedFacility.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedFacility.email}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Operational Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bed Count:</span>
                        <span className="text-sm font-medium">{selectedFacility.bedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">EMR System:</span>
                        <span className="text-sm font-medium">{selectedFacility.emrSystem || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payment Terms:</span>
                        <span className="text-sm font-medium">{selectedFacility.netTerms || "Net 30"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Auto Assignment:</span>
                        <Badge variant={selectedFacility.autoAssignmentEnabled ? "default" : "secondary"}>
                          {selectedFacility.autoAssignmentEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="rates" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Bill Rates by Specialty
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedFacility.billRates ? (
                        <div className="space-y-2">
                          {Object.entries(selectedFacility.billRates).map(([specialty, rate]) => (
                            <div key={specialty} className="flex justify-between">
                              <span className="text-sm">{specialty}:</span>
                              <span className="text-sm font-medium">${rate}/hr</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No rates configured</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Pay Rates by Specialty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedFacility.payRates ? (
                        <div className="space-y-2">
                          {Object.entries(selectedFacility.payRates).map(([specialty, rate]) => (
                            <div key={specialty} className="flex justify-between">
                              <span className="text-sm">{specialty}:</span>
                              <span className="text-sm font-medium">${rate}/hr</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No rates configured</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="staffing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Staffing Targets by Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFacility.staffingTargets ? (
                      <div className="space-y-4">
                        {Object.entries(selectedFacility.staffingTargets).map(([dept, targets]) => (
                          <div key={dept} className="border rounded-lg p-3">
                            <h4 className="font-medium mb-2">{dept}</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Target Hours:</span>
                                <p className="font-medium">{targets.targetHours}/week</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Min Staff:</span>
                                <p className="font-medium">{targets.minStaff}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Max Staff:</span>
                                <p className="font-medium">{targets.maxStaff}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No staffing targets configured</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="workflow" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Workflow className="h-4 w-4" />
                      Automation Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFacility.workflowAutomationConfig ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(selectedFacility.workflowAutomationConfig).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <Badge variant={value ? "default" : "secondary"}>
                              {value ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No workflow configuration</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Shift Management Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFacility.shiftManagementSettings ? (
                      <div className="space-y-2">
                        {Object.entries(selectedFacility.shiftManagementSettings).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                            </span>
                            <span className="text-sm font-medium">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No shift management settings</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Regulatory Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFacility.regulatoryDocs && selectedFacility.regulatoryDocs.length > 0 ? (
                      <div className="space-y-3">
                        {selectedFacility.regulatoryDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                            <div>
                              <p className="font-medium text-sm">{doc.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                            </div>
                            <Badge 
                              variant={
                                doc.status === 'active' ? 'default' : 
                                doc.status === 'expired' ? 'destructive' : 'secondary'
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No regulatory documents uploaded</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Custom Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFacility.customRules ? (
                      <div className="space-y-4">
                        {selectedFacility.customRules.floatPoolRules && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Float Pool Rules</h4>
                            <div className="text-sm space-y-1">
                              <p>Max Hours/Week: {selectedFacility.customRules.floatPoolRules.maxHoursPerWeek}</p>
                              <p>Additional Training Required: {selectedFacility.customRules.floatPoolRules.requireAdditionalTraining ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedFacility.customRules.overtimeRules && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Overtime Rules</h4>
                            <div className="text-sm space-y-1">
                              <p>Max Overtime Hours: {selectedFacility.customRules.overtimeRules.maxOvertimeHours}</p>
                              <p>Overtime Rate: {selectedFacility.customRules.overtimeRules.overtimeRate}x</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom rules configured</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}