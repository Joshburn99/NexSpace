import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useFacilities,
  getFacilityDisplayName,
  getFacilityAddress,
  type EnhancedFacility,
} from "@/hooks/use-facility";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFacilitySchema, type Facility } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Bed,
  RefreshCw,
  Import,
  Map,
  Edit,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";
import InteractiveMap from "@/components/InteractiveMap";
import { z } from "zod";

const createFacilitySchema = insertFacilitySchema.extend({
  bedCount: z.number().optional(),
  privateRooms: z.number().optional(),
  semiPrivateRooms: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export default function FacilitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [facilityToEdit, setFacilityToEdit] = useState<EnhancedFacility | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<EnhancedFacility | null>(null);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Enhanced facility edit form schema
  const enhancedFacilityEditSchema = z.object({
    // Basic Information
    name: z.string().min(1, "Facility name is required"),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    website: z.string().optional(),
    facilityType: z.string().optional(),
    bedCount: z.number().min(0).optional(),
    isActive: z.boolean(),

    // Enhanced Fields
    autoAssignmentEnabled: z.boolean().optional(),
    teamId: z.number().optional(),
    netTerms: z.string().optional(),
    timezone: z.string().optional(),
    billingContactName: z.string().optional(),
    billingContactEmail: z.string().email().optional().or(z.literal("")),
    emrSystem: z.string().optional(),
    contractStartDate: z.string().optional(),
    payrollProviderId: z.number().optional(),

    // JSON Fields - simplified for form handling
    floatPoolMargins: z.string().optional(),
    billRates: z.string().optional(),
    payRates: z.string().optional(),
    workflowAutomationConfig: z.string().optional(),
    shiftManagementSettings: z.string().optional(),
    staffingTargets: z.string().optional(),
    customRules: z.string().optional(),
    regulatoryDocs: z.string().optional(),
  });

  // Fetch facilities using centralized hook
  const { data: facilities = [], isLoading } = useFacilities();

  // Create facility form
  const createForm = useForm<z.infer<typeof createFacilitySchema>>({
    resolver: zodResolver(createFacilitySchema),
    defaultValues: {
      name: "",
      facilityType: "hospital",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      isActive: true,
    },
  });

  // Import form for CMS ID
  const importForm = useForm({
    defaultValues: {
      cmsId: "",
    },
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createFacilitySchema>) => {
      const response = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create facility");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Facility created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create facility",
        variant: "destructive",
      });
    },
  });

  // Import facility mutation
  const importFacilityMutation = useMutation({
    mutationFn: async (cmsId: string) => {
      const response = await fetch("/api/facilities/import/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmsId }),
      });
      if (!response.ok) throw new Error("Failed to import facility");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setIsImportDialogOpen(false);
      importForm.reset();
      toast({
        title: "Success",
        description: "Facility imported successfully from CMS database",
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import facility from CMS database",
        variant: "destructive",
      });
    },
  });

  // Enhanced facility edit form
  const editForm = useForm<z.infer<typeof enhancedFacilityEditSchema>>({
    resolver: zodResolver(enhancedFacilityEditSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      website: "",
      facilityType: "",
      bedCount: 0,
      isActive: true,
      autoAssignmentEnabled: false,
      teamId: undefined,
      netTerms: "",
      timezone: "",
      billingContactName: "",
      billingContactEmail: "",
      emrSystem: "",
      contractStartDate: "",
      payrollProviderId: undefined,
      floatPoolMargins: "",
      billRates: "",
      payRates: "",
      workflowAutomationConfig: "",
      shiftManagementSettings: "",
      staffingTargets: "",
      customRules: "",
      regulatoryDocs: "",
    },
  });

  // Edit facility mutation with downstream effects handling
  const editFacilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof enhancedFacilityEditSchema>) => {
      if (!facilityToEdit) throw new Error("No facility selected for editing");

      // Prepare JSON fields
      const payload = {
        ...data,
        floatPoolMargins: data.floatPoolMargins ? JSON.parse(data.floatPoolMargins) : null,
        billRates: data.billRates ? JSON.parse(data.billRates) : null,
        payRates: data.payRates ? JSON.parse(data.payRates) : null,
        workflowAutomationConfig: data.workflowAutomationConfig
          ? JSON.parse(data.workflowAutomationConfig)
          : null,
        shiftManagementSettings: data.shiftManagementSettings
          ? JSON.parse(data.shiftManagementSettings)
          : null,
        staffingTargets: data.staffingTargets ? JSON.parse(data.staffingTargets) : null,
        customRules: data.customRules ? JSON.parse(data.customRules) : null,
        regulatoryDocs: data.regulatoryDocs ? JSON.parse(data.regulatoryDocs) : null,
      };

      const response = await fetch(`/api/enhanced-facilities/${facilityToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update facility");
      }

      return response.json();
    },
    onSuccess: (updatedFacility) => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enhanced-facilities"] });

      // Handle downstream effects if facility was deactivated
      if (!updatedFacility.isActive && facilityToEdit?.isActive) {
        handleFacilityDeactivation(facilityToEdit.id);
      }

      setIsEditDialogOpen(false);
      setFacilityToEdit(null);
      editForm.reset();

      toast({
        title: "Success",
        description: `Facility "${updatedFacility.name}" updated successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update facility",
        variant: "destructive",
      });
    },
  });

  // Handle facility deactivation downstream effects
  const handleFacilityDeactivation = async (facilityId: number) => {
    try {
      // Disable all shift templates for deactivated facility
      const response = await fetch(`/api/shift-templates/deactivate-by-facility/${facilityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
        toast({
          title: "Templates Disabled",
          description:
            "All shift templates for this facility have been disabled to prevent new shift generation.",
        });
      }
    } catch (error) {
      console.error("Failed to disable facility templates:", error);
      toast({
        title: "Warning",
        description:
          "Facility updated but some templates may still be active. Please review shift templates manually.",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog with facility data
  const openEditDialog = (facility: EnhancedFacility) => {
    setFacilityToEdit(facility);
    editForm.reset({
      name: facility.name || "",
      address: facility.address || "",
      city: facility.city || "",
      state: facility.state || "",
      zipCode: facility.zipCode || "",
      phone: facility.phone || "",
      email: facility.email || "",
      website: facility.website || "",
      facilityType: facility.facilityType || "",
      bedCount: facility.bedCount || 0,
      isActive: facility.isActive ?? true,
      autoAssignmentEnabled: facility.autoAssignmentEnabled ?? false,
      teamId: facility.teamId || undefined,
      netTerms: facility.netTerms || "",
      timezone: facility.timezone || "",
      billingContactName: facility.billingContactName || "",
      billingContactEmail: facility.billingContactEmail || "",
      emrSystem: facility.emrSystem || "",
      contractStartDate: facility.contractStartDate || "",
      payrollProviderId: facility.payrollProviderId || undefined,
      floatPoolMargins: facility.floatPoolMargins
        ? JSON.stringify(facility.floatPoolMargins, null, 2)
        : "",
      billRates: facility.billRates ? JSON.stringify(facility.billRates, null, 2) : "",
      payRates: facility.payRates ? JSON.stringify(facility.payRates, null, 2) : "",
      workflowAutomationConfig: facility.workflowAutomationConfig
        ? JSON.stringify(facility.workflowAutomationConfig, null, 2)
        : "",
      shiftManagementSettings: facility.shiftManagementSettings
        ? JSON.stringify(facility.shiftManagementSettings, null, 2)
        : "",
      staffingTargets: facility.staffingTargets
        ? JSON.stringify(facility.staffingTargets, null, 2)
        : "",
      customRules: facility.customRules ? JSON.stringify(facility.customRules, null, 2) : "",
      regulatoryDocs: facility.regulatoryDocs
        ? JSON.stringify(facility.regulatoryDocs, null, 2)
        : "",
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (data: z.infer<typeof createFacilitySchema>) => {
    const facilityData = {
      ...data,
      latitude: mapLocation?.lat,
      longitude: mapLocation?.lng,
    };
    createFacilityMutation.mutate(facilityData);
  };

  const onEditSubmit = (data: z.infer<typeof enhancedFacilityEditSchema>) => {
    editFacilityMutation.mutate(data);
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address?: string }) => {
    setMapLocation(location);
    if (location.address) {
      // Parse address components and update form
      const addressParts = location.address.split(", ");
      const formData = createForm.getValues();

      // Try to extract city, state, zip from formatted address
      if (addressParts.length >= 3) {
        const lastPart = addressParts[addressParts.length - 1]; // Country
        const secondLast = addressParts[addressParts.length - 2]; // State ZIP
        const thirdLast = addressParts[addressParts.length - 3]; // City

        if (secondLast) {
          const stateZipMatch = secondLast.match(/([A-Z]{2})\s+(\d{5})/);
          if (stateZipMatch) {
            createForm.setValue("state", stateZipMatch[1]);
            createForm.setValue("zipCode", stateZipMatch[2]);
          }
        }

        if (thirdLast) {
          createForm.setValue("city", thirdLast);
        }

        // Set the full address minus city, state, zip
        const streetAddress = addressParts.slice(0, -3).join(", ");
        if (streetAddress) {
          createForm.setValue("address", streetAddress);
        }
      }
    }
  };

  const onImportSubmit = (data: any) => {
    if (data.cmsId) {
      importFacilityMutation.mutate(data.cmsId);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return "bg-gray-500";
    if (rating >= 4) return "bg-green-500";
    if (rating >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatAddress = (facility: Facility) => {
    return [facility.address, facility.city, facility.state, facility.zipCode]
      .filter(Boolean)
      .join(", ");
  };

  const US_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  const filteredFacilities = facilities.filter((facility: EnhancedFacility) => {
    const matchesSearch =
      !searchQuery ||
      facility.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.cmsId?.includes(searchQuery);
    const matchesState = !selectedState || facility.state === selectedState;
    return matchesSearch && matchesState;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Facility Management</h1>
          <p className="text-muted-foreground">
            Manage healthcare facilities with comprehensive profiles and external data integration
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Import className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Facility Data</DialogTitle>
              </DialogHeader>
              <Form {...importForm}>
                <form onSubmit={importForm.handleSubmit(onImportSubmit)} className="space-y-4">
                  <FormField
                    control={importForm.control}
                    name="cmsId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CMS Provider Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter CMS Provider Number (e.g., 345678)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={importFacilityMutation.isPending}
                    className="w-full"
                  >
                    {importFacilityMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Import from CMS Database
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Facility
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Facility</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="facilityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hospital">Hospital</SelectItem>
                              <SelectItem value="nursing_home">Nursing Home</SelectItem>
                              <SelectItem value="assisted_living">Assisted Living</SelectItem>
                              <SelectItem value="home_health">Home Health</SelectItem>
                              <SelectItem value="hospice">Hospice</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code *</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Location Settings</label>
                    <InteractiveMap
                      height="300px"
                      onLocationSelect={handleLocationSelect}
                      showSearch={true}
                    />
                    {mapLocation && (
                      <div className="text-xs text-muted-foreground">
                        Coordinates: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
                      </div>
                    )}
                  </div>

                  <FormField
                    control={createForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this facility for operations
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createFacilityMutation.isPending}>
                      {createFacilityMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Facility
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search facilities by name, city, or CMS ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility: EnhancedFacility) => (
            <Card key={facility.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{getFacilityDisplayName(facility)}</CardTitle>
                    <CardDescription className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {facility.facilityType?.replace("_", " ")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {facility.overallRating && (
                      <Badge className={getRatingColor(facility.overallRating)}>
                        {facility.overallRating}★
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span>{formatAddress(facility)}</span>
                  </div>
                  {facility.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{facility.phone}</span>
                    </div>
                  )}
                  {facility.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{facility.email}</span>
                    </div>
                  )}
                </div>

                {(facility.bedCount || facility.privateRooms) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {facility.bedCount && (
                      <div className="flex items-center">
                        <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>{facility.bedCount} beds</span>
                      </div>
                    )}
                    {facility.privateRooms && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>{facility.privateRooms} private</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {facility.cmsId && <Badge variant="outline">CMS: {facility.cmsId}</Badge>}
                  {facility.autoImported && <Badge variant="secondary">Auto-Imported</Badge>}
                  {facility.participatesMedicare && <Badge variant="outline">Medicare</Badge>}
                  {facility.participatesMedicaid && <Badge variant="outline">Medicaid</Badge>}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFacility(facility)}
                    >
                      View Details
                    </Button>
                    {user?.role === "superuser" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(facility)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <Badge variant={facility.isActive ? "default" : "secondary"}>
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredFacilities.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No facilities found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedState
                ? "No facilities match your search criteria."
                : "Get started by adding your first facility or importing from external databases."}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Facility
              </Button>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Import className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Facility Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Facility Profile: {facilityToEdit?.name}
            </DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="billing">Billing & Rates</TabsTrigger>
                  <TabsTrigger value="operations">Operations</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="facilityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select facility type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hospital">Hospital</SelectItem>
                              <SelectItem value="clinic">Clinic</SelectItem>
                              <SelectItem value="urgent_care">Urgent Care</SelectItem>
                              <SelectItem value="nursing_home">Nursing Home</SelectItem>
                              <SelectItem value="rehab_center">Rehabilitation Center</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bedCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bed Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
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
                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Facility Status</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              {field.value
                                ? "Active - Can generate shifts"
                                : "Inactive - Templates disabled"}
                            </div>
                            {!field.value && (
                              <div className="flex items-center gap-1 text-sm text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                Deactivating will disable all shift templates
                              </div>
                            )}
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="billingContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="billingContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input type="url" {...field} placeholder="https://" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Billing & Rates Tab */}
                <TabsContent value="billing" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="netTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Terms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NET_15">Net 15</SelectItem>
                              <SelectItem value="NET_30">Net 30</SelectItem>
                              <SelectItem value="NET_45">Net 45</SelectItem>
                              <SelectItem value="NET_60">Net 60</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="contractStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="billRates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Rates (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"RN": 75, "LPN": 55, "CNA": 35}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          JSON format: {"{"}"specialty": hourlyRate{"}"}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="payRates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Rates (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"RN": 45, "LPN": 32, "CNA": 22}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          JSON format: {"{"}"specialty": hourlyRate{"}"}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="floatPoolMargins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Float Pool Margins (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder='{"standard": 1.15, "premium": 1.25, "holiday": 1.5}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          JSON format with multipliers for different shift types
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Operations Tab */}
                <TabsContent value="operations" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="autoAssignmentEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Assignment</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Automatically assign qualified staff to open shifts
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
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
                              <SelectItem value="Meditech">Meditech</SelectItem>
                              <SelectItem value="Allscripts">Allscripts</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="workflowAutomationConfig"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workflow Automation Config (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"autoApprove": true, "notificationHours": 24, "escalationThreshold": 3}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Configure automated workflow settings
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="shiftManagementSettings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Management Settings (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"maxConsecutiveDays": 5, "minRestHours": 8, "overtimeThreshold": 40}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Define shift scheduling rules and constraints
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="staffingTargets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staffing Targets (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"ICU": {"RN": 4, "CNA": 2}, "Emergency": {"RN": 6, "LPN": 2}}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Department-specific staffing targets by role
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Compliance Tab */}
                <TabsContent value="compliance" className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="customRules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Rules (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"requireCertification": true, "backgroundCheckRequired": true, "drugTestPolicy": "pre-employment"}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Facility-specific operational rules and requirements
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="regulatoryDocs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regulatory Documents (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder='{"license": {"number": "FL123456", "expiry": "2024-12-31"}, "accreditation": {"type": "Joint Commission", "status": "Active"}}'
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Track licenses, certifications, and compliance documents
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team ID</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="payrollProviderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payroll Provider ID</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={editFacilityMutation.isPending}>
                  {editFacilityMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
