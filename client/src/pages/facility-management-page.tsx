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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFacilities } from "@/hooks/use-facility";
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
  XCircle,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Download
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

// Available credentials that can be set as requirements
const AVAILABLE_CREDENTIALS = [
  { id: 'rn_license', name: 'RN License', category: 'nursing' },
  { id: 'lpn_license', name: 'LPN License', category: 'nursing' },
  { id: 'cna_certification', name: 'CNA Certification', category: 'nursing' },
  { id: 'bls_certification', name: 'BLS Certification', category: 'safety' },
  { id: 'acls_certification', name: 'ACLS Certification', category: 'safety' },
  { id: 'pals_certification', name: 'PALS Certification', category: 'safety' },
  { id: 'cpr_certification', name: 'CPR Certification', category: 'safety' },
  { id: 'background_check', name: 'Background Check', category: 'screening' },
  { id: 'drug_screening', name: 'Drug Screening', category: 'screening' },
  { id: 'tb_test', name: 'TB Test', category: 'health' },
  { id: 'hep_b_vaccination', name: 'Hepatitis B Vaccination', category: 'health' },
  { id: 'covid_vaccination', name: 'COVID-19 Vaccination', category: 'health' },
  { id: 'flu_vaccination', name: 'Flu Vaccination', category: 'health' },
  { id: 'professional_liability', name: 'Professional Liability Insurance', category: 'insurance' },
];

export default function FacilityManagementPage() {
  const [selectedFacility, setSelectedFacility] = useState<EnhancedFacility | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showJsonView, setShowJsonView] = useState<Record<string, boolean>>({});
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is superuser with fallback check for admin  
  const isSuperuser = user?.role === 'super_admin' || user?.role === 'superuser' || user?.role === 'admin' || user?.role === 'facility_admin';
  
  // Debug user authentication (remove in production)
  console.log('User data in facility management:', { user, isSuperuser, role: user?.role });

  // Fetch facilities using centralized hook
  const { data: facilities = [], isLoading, error } = useFacilities();

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: (data: EnhancedFacilityForm) => {
      return fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.refetchQueries({ queryKey: ["/api/facilities"] });
      setShowCreateModal(false);
      toast({ title: "Success", description: "Facility created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create facility",
        variant: "destructive"
      });
    }
  });

  // Update facility PATCH mutation
  const updateFacilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EnhancedFacility> }) => {
      return fetch(`/api/facilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setEditingSection(null);
      toast({ title: "Success", description: "Facility updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update facility",
        variant: "destructive"
      });
    }
  });

  // Update facility rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: ({ id, rates }: { id: number; rates: any }) => {
      return fetch(`/api/facilities/${id}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates)
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Success", description: "Rates updated successfully" });
    }
  });

  // Update staffing targets mutation
  const updateStaffingMutation = useMutation({
    mutationFn: ({ id, staffingTargets }: { id: number; staffingTargets: any }) => {
      return fetch(`/api/facilities/${id}/staffing-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffingTargets })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Success", description: "Staffing targets updated successfully" });
    }
  });

  // Update workflow configuration mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, workflowAutomationConfig }: { id: number; workflowAutomationConfig: any }) => {
      return fetch(`/api/facilities/${id}/workflow-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowAutomationConfig })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Success", description: "Workflow configuration updated successfully" });
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

  // Enhanced editing forms for complex fields
  const RatesEditForm = ({ facility, onSave }: { facility: EnhancedFacility; onSave: (data: any) => void }) => {
    const [billRates, setBillRates] = useState(facility.billRates || {});
    const [payRates, setPayRates] = useState(facility.payRates || {});
    const [floatPoolMargins, setFloatPoolMargins] = useState(facility.floatPoolMargins || {});

    const specialties = ["Registered Nurse", "Licensed Practical Nurse", "Certified Nursing Assistant", "Physical Therapist", "Respiratory Therapist"];

    const handleSave = () => {
      onSave({ billRates, payRates, floatPoolMargins });
    };

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Bill Rates (per hour)</h4>
          <div className="grid grid-cols-2 gap-4">
            {specialties.map(specialty => (
              <div key={`bill-${specialty}`} className="space-y-2">
                <Label>{specialty}</Label>
                <Input
                  type="number"
                  value={billRates[specialty] || ''}
                  onChange={(e) => setBillRates({...billRates, [specialty]: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Pay Rates (per hour)</h4>
          <div className="grid grid-cols-2 gap-4">
            {specialties.map(specialty => (
              <div key={`pay-${specialty}`} className="space-y-2">
                <Label>{specialty}</Label>
                <Input
                  type="number"
                  value={payRates[specialty] || ''}
                  onChange={(e) => setPayRates({...payRates, [specialty]: parseFloat(e.target.value) || 0})}
                  placeholder="$0.00"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Float Pool Margins (%)</h4>
          <div className="grid grid-cols-3 gap-4">
            {specialties.slice(0, 3).map(specialty => (
              <div key={`margin-${specialty}`} className="space-y-2">
                <Label>{specialty}</Label>
                <Input
                  type="number"
                  value={floatPoolMargins[specialty] || ''}
                  onChange={(e) => setFloatPoolMargins({...floatPoolMargins, [specialty]: parseFloat(e.target.value) || 0})}
                  placeholder="0%"
                  max="100"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
          <Button onClick={handleSave}>Save Rates</Button>
        </div>
      </div>
    );
  };

  const StaffingTargetsEditForm = ({ facility, onSave }: { facility: EnhancedFacility; onSave: (data: any) => void }) => {
    const [targets, setTargets] = useState(facility.staffingTargets || {});

    const departments = ["ICU", "Emergency", "Medical/Surgical", "Operating Room", "Labor & Delivery"];

    const addDepartment = (dept: string) => {
      setTargets({
        ...targets,
        [dept]: {
          targetHours: 168,
          minStaff: 1,
          maxStaff: 10,
          preferredStaffMix: {}
        }
      });
    };

    const updateDepartment = (dept: string, field: string, value: any) => {
      setTargets({
        ...targets,
        [dept]: {
          ...targets[dept],
          [field]: value
        }
      });
    };

    const removeDepartment = (dept: string) => {
      const newTargets = { ...targets };
      delete newTargets[dept];
      setTargets(newTargets);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold">Staffing Targets by Department</h4>
          <Select onValueChange={addDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Add Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.filter(dept => !targets[dept]).map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {Object.entries(targets).map(([dept, target]) => (
            <Card key={dept}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">{dept}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDepartment(dept)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Target Hours/Week</Label>
                    <Input
                      type="number"
                      value={target.targetHours}
                      onChange={(e) => updateDepartment(dept, 'targetHours', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Min Staff</Label>
                    <Input
                      type="number"
                      value={target.minStaff}
                      onChange={(e) => updateDepartment(dept, 'minStaff', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Max Staff</Label>
                    <Input
                      type="number"
                      value={target.maxStaff}
                      onChange={(e) => updateDepartment(dept, 'maxStaff', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
          <Button onClick={() => onSave({ staffingTargets: targets })}>Save Targets</Button>
        </div>
      </div>
    );
  };

  const WorkflowConfigEditForm = ({ facility, onSave }: { facility: EnhancedFacility; onSave: (data: any) => void }) => {
    const [config, setConfig] = useState<Record<string, boolean>>(facility.workflowAutomationConfig || {});

    const updateConfig = (field: string, value: boolean) => {
      setConfig({ ...config, [field]: value });
    };

    const workflowOptions = [
      { key: 'autoApproveShifts', label: 'Auto-approve shifts', description: 'Automatically approve shift assignments' },
      { key: 'autoNotifyManagers', label: 'Auto-notify managers', description: 'Send notifications to managers for important events' },
      { key: 'autoGenerateInvoices', label: 'Auto-generate invoices', description: 'Automatically create invoices for completed shifts' },
      { key: 'requireManagerApproval', label: 'Require manager approval', description: 'Manager approval required for certain actions' },
      { key: 'enableOvertimeAlerts', label: 'Enable overtime alerts', description: 'Alert when workers approach overtime limits' },
      { key: 'autoAssignBySpecialty', label: 'Auto-assign by specialty', description: 'Automatically match workers to shifts by specialty' }
    ];

    return (
      <div className="space-y-6">
        <h4 className="font-semibold">Workflow Automation Configuration</h4>
        
        <div className="space-y-4">
          {workflowOptions.map(option => (
            <div key={option.key} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              <Switch
                checked={config[option.key] || false}
                onCheckedChange={(checked) => updateConfig(option.key, checked)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
          <Button onClick={() => onSave({ workflowAutomationConfig: config })}>Save Configuration</Button>
        </div>
      </div>
    );
  };

  // Filter facilities
  const filteredFacilities = Array.isArray(facilities) ? facilities.filter((facility: EnhancedFacility) => {
    const matchesSearch = !searchTerm || 
      facility.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !filterState || filterState === "all" || facility.state === filterState;
    const matchesType = !filterType || filterType === "all" || facility.facilityType === filterType;
    return matchesSearch && matchesState && matchesType;
  }) : [];

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
                  <SelectItem value="all">All states</SelectItem>
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
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Hospital">Hospital</SelectItem>
                  <SelectItem value="Clinic">Clinic</SelectItem>
                  <SelectItem value="Skilled Nursing">Skilled Nursing</SelectItem>
                  <SelectItem value="Assisted Living">Assisted Living</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterState("all");
                  setFilterType("all");
                }}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
                  queryClient.refetchQueries({ queryKey: ["/api/facilities"] });
                  toast({ title: "Refreshed", description: "Facility list updated" });
                }}
              >
                Refresh
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
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                        {isSuperuser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSection(editingSection === 'contact' ? null : 'contact')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {editingSection === 'contact' ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Address</Label>
                            <Input defaultValue={selectedFacility.address} />
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <Input defaultValue={selectedFacility.phone} />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input defaultValue={selectedFacility.email} />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                            <Button size="sm">Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                          {selectedFacility.billingContactName && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Billing: {selectedFacility.billingContactName}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">Operational Settings</CardTitle>
                        {isSuperuser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSection(editingSection === 'operations' ? null : 'operations')}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {editingSection === 'operations' ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Bed Count</Label>
                            <Input type="number" defaultValue={selectedFacility.bedCount} />
                          </div>
                          <div>
                            <Label>EMR System</Label>
                            <Select defaultValue={selectedFacility.emrSystem || ""}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select EMR" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Epic">Epic</SelectItem>
                                <SelectItem value="Cerner">Cerner</SelectItem>
                                <SelectItem value="Allscripts">Allscripts</SelectItem>
                                <SelectItem value="Meditech">Meditech</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Payment Terms</Label>
                            <Select defaultValue={selectedFacility.netTerms || "Net 30"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Net 15">Net 15</SelectItem>
                                <SelectItem value="Net 30">Net 30</SelectItem>
                                <SelectItem value="Net 45">Net 45</SelectItem>
                                <SelectItem value="Net 60">Net 60</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Timezone</Label>
                            <Select defaultValue={selectedFacility.timezone || "America/New_York"}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                                <SelectItem value="America/Chicago">Central Time</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Auto Assignment</Label>
                            <Switch defaultChecked={selectedFacility.autoAssignmentEnabled} />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                            <Button size="sm">Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                            <span className="text-sm text-muted-foreground">Timezone:</span>
                            <span className="text-sm font-medium">{selectedFacility.timezone?.replace("America/", "") || "Eastern"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Auto Assignment:</span>
                            <Badge variant={selectedFacility.autoAssignmentEnabled ? "default" : "secondary"}>
                              {selectedFacility.autoAssignmentEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          {selectedFacility.contractStartDate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Contract Start:</span>
                              <span className="text-sm font-medium">
                                {new Date(selectedFacility.contractStartDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {!isSuperuser && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You have read-only access to facility information. Contact a superuser to make changes.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="rates" className="space-y-4">
                {editingSection === 'rates' ? (
                  <RatesEditForm 
                    facility={selectedFacility} 
                    onSave={(data) => updateRatesMutation.mutate({ id: selectedFacility.id, rates: data })}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Facility Rates & Margins</h3>
                      {isSuperuser && (
                        <Button
                          variant="outline"
                          onClick={() => setEditingSection('rates')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Rates
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Bill Rates (per hour)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedFacility.billRates && Object.keys(selectedFacility.billRates).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(selectedFacility.billRates).map(([specialty, rate]) => (
                                <div key={specialty} className="flex justify-between">
                                  <span className="text-sm">{specialty}:</span>
                                  <span className="text-sm font-medium text-green-600">${rate}/hr</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No bill rates configured</p>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Pay Rates (per hour)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedFacility.payRates && Object.keys(selectedFacility.payRates).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(selectedFacility.payRates).map(([specialty, rate]) => (
                                <div key={specialty} className="flex justify-between">
                                  <span className="text-sm">{specialty}:</span>
                                  <span className="text-sm font-medium text-blue-600">${rate}/hr</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No pay rates configured</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Float Pool Margins (%)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedFacility.floatPoolMargins && Object.keys(selectedFacility.floatPoolMargins).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(selectedFacility.floatPoolMargins).map(([specialty, margin]) => (
                                <div key={specialty} className="flex justify-between">
                                  <span className="text-sm">{specialty}:</span>
                                  <span className="text-sm font-medium text-purple-600">{margin}%</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No margins configured</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {selectedFacility.billRates && selectedFacility.payRates && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Profit Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.keys(selectedFacility.billRates).map(specialty => {
                              const billRate = selectedFacility.billRates?.[specialty] || 0;
                              const payRate = selectedFacility.payRates?.[specialty] || 0;
                              const profit = billRate - payRate;
                              const margin = billRate > 0 ? ((profit / billRate) * 100).toFixed(1) : '0';
                              
                              return (
                                <div key={specialty} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm font-medium">{specialty}</span>
                                  <div className="text-right">
                                    <div className="text-sm">Profit: ${profit}/hr</div>
                                    <div className="text-xs text-muted-foreground">Margin: {margin}%</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="staffing" className="space-y-4">
                {editingSection === 'staffing' ? (
                  <StaffingTargetsEditForm 
                    facility={selectedFacility} 
                    onSave={(data) => updateStaffingMutation.mutate({ id: selectedFacility.id, staffingTargets: data.staffingTargets })}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Department Staffing Targets</h3>
                      {isSuperuser && (
                        <Button
                          variant="outline"
                          onClick={() => setEditingSection('staffing')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Targets
                        </Button>
                      )}
                    </div>

                    {selectedFacility.staffingTargets && Object.keys(selectedFacility.staffingTargets).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedFacility.staffingTargets).map(([dept, targets]) => (
                          <Card key={dept}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                {dept}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">{targets.targetHours}</div>
                                  <div className="text-xs text-muted-foreground">Target Hours/Week</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">{targets.minStaff}</div>
                                  <div className="text-xs text-muted-foreground">Min Staff</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-600">{targets.maxStaff}</div>
                                  <div className="text-xs text-muted-foreground">Max Staff</div>
                                </div>
                              </div>
                              
                              {targets.preferredStaffMix && Object.keys(targets.preferredStaffMix).length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="text-xs font-medium text-muted-foreground mb-2">Preferred Staff Mix:</div>
                                  <div className="space-y-1">
                                    {Object.entries(targets.preferredStaffMix).map(([role, percentage]) => (
                                      <div key={role} className="flex justify-between text-xs">
                                        <span>{role}:</span>
                                        <span>{percentage}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600">No staffing targets configured</h3>
                            <p className="text-sm text-gray-500 mt-2">
                              {isSuperuser 
                                ? "Click 'Edit Targets' to set up department-specific staffing goals"
                                : "Contact a superuser to configure staffing targets"
                              }
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="workflow" className="space-y-4">
                {editingSection === 'workflow' ? (
                  <WorkflowConfigEditForm 
                    facility={selectedFacility} 
                    onSave={(data) => updateWorkflowMutation.mutate({ id: selectedFacility.id, workflowAutomationConfig: data.workflowAutomationConfig })}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Workflow & Automation</h3>
                      {isSuperuser && (
                        <Button
                          variant="outline"
                          onClick={() => setEditingSection('workflow')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Workflow
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Workflow className="h-4 w-4" />
                            Automation Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedFacility.workflowAutomationConfig && Object.keys(selectedFacility.workflowAutomationConfig).length > 0 ? (
                            <div className="space-y-3">
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
                            <p className="text-sm text-muted-foreground">No automation rules configured</p>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Shift Management Rules
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedFacility.shiftManagementSettings && Object.keys(selectedFacility.shiftManagementSettings).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(selectedFacility.shiftManagementSettings).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-sm capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                                     key.includes('Hours') ? `${value} hrs` :
                                     key.includes('Shifts') ? `${value} shifts` : value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No shift rules configured</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {selectedFacility.customRules && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Custom Operational Rules</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedFacility.customRules.floatPoolRules && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Float Pool Rules</h4>
                                <div className="text-sm space-y-1">
                                  <div>Max Hours/Week: {selectedFacility.customRules.floatPoolRules.maxHoursPerWeek}</div>
                                  <div>Additional Training: {selectedFacility.customRules.floatPoolRules.requireAdditionalTraining ? 'Required' : 'Not Required'}</div>
                                  {selectedFacility.customRules.floatPoolRules.specialtyRestrictions && (
                                    <div>Restrictions: {selectedFacility.customRules.floatPoolRules.specialtyRestrictions.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {selectedFacility.customRules.overtimeRules && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Overtime Rules</h4>
                                <div className="text-sm space-y-1">
                                  <div>Max Overtime: {selectedFacility.customRules.overtimeRules.maxOvertimeHours} hrs</div>
                                  <div>Overtime Rate: {selectedFacility.customRules.overtimeRules.overtimeRate}x</div>
                                  <div>Approval Required: {selectedFacility.customRules.overtimeRules.overtimeApprovalRequired ? 'Yes' : 'No'}</div>
                                </div>
                              </div>
                            )}

                            {selectedFacility.customRules.attendanceRules && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Attendance Rules</h4>
                                <div className="text-sm space-y-1">
                                  <div>Max Late Arrivals: {selectedFacility.customRules.attendanceRules.maxLateArrivals}</div>
                                  <div>Max No-Shows: {selectedFacility.customRules.attendanceRules.maxNoCallNoShows}</div>
                                  <div>Probation: {selectedFacility.customRules.attendanceRules.probationaryPeriod} days</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="compliance" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Regulatory Compliance & Documentation</h3>
                  {isSuperuser && (
                    <Button
                      variant="outline"
                      onClick={() => setShowDocumentModal(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Manage Documents
                    </Button>
                  )}
                </div>

                {selectedFacility.regulatoryDocs && selectedFacility.regulatoryDocs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedFacility.regulatoryDocs.map((doc) => (
                      <Card key={doc.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">{doc.name}</CardTitle>
                            <Badge 
                              variant={
                                doc.status === 'active' ? 'default' : 
                                doc.status === 'expired' ? 'destructive' : 'secondary'
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="capitalize">{doc.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Uploaded:</span>
                              <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                            </div>
                            {doc.expirationDate && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Expires:</span>
                                <span className={new Date(doc.expirationDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                                  {new Date(doc.expirationDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {doc.url && (
                              <div className="pt-2">
                                <Button variant="ghost" size="sm" className="w-full">
                                  <FileText className="h-3 w-3 mr-2" />
                                  View Document
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">No regulatory documents uploaded</h3>
                        <p className="text-sm text-gray-500 mt-2">
                          {isSuperuser 
                            ? "Click 'Manage Documents' to upload licenses, certifications, and compliance documents"
                            : "Contact a superuser to upload regulatory documents"
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Compliance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedFacility.regulatoryDocs?.filter(doc => doc.status === 'active').length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Documents</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedFacility.regulatoryDocs?.filter(doc => doc.status === 'pending_renewal').length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Pending Renewal</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {selectedFacility.regulatoryDocs?.filter(doc => doc.status === 'expired').length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Expired</div>
                      </div>
                    </div>
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