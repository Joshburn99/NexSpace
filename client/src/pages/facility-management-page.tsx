import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFacilitySchema, type Facility, type InsertFacility } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Building2, MapPin, Phone, Mail, Users, Bed, Star, RefreshCw, Import, ExternalLink, TrendingUp, Settings, Clock, DollarSign, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

const createFacilitySchema = insertFacilitySchema.extend({
  bedCount: z.number().optional(),
  privateRooms: z.number().optional(),
  semiPrivateRooms: z.number().optional(),
});

export default function FacilityManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [externalSearchResults, setExternalSearchResults] = useState<any[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facilities
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["/api/facilities"],
    queryFn: () => apiRequest("/api/facilities"),
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: z.infer<typeof createFacilitySchema>) => {
      return apiRequest("/api/facilities", {
        method: "POST",
        body: JSON.stringify(facilityData),
      });
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create facility",
        variant: "destructive",
      });
    },
  });

  // Search external facilities mutation
  const searchExternalMutation = useMutation({
    mutationFn: async ({ name, state, city }: { name: string; state?: string; city?: string }) => {
      const params = new URLSearchParams({ name });
      if (state) params.append('state', state);
      if (city) params.append('city', city);
      return apiRequest(`/api/facilities/search-external?${params.toString()}`);
    },
    onMutate: () => {
      setIsSearchingExternal(true);
    },
    onSuccess: (data) => {
      setExternalSearchResults(data);
      setIsSearchingExternal(false);
    },
    onError: () => {
      setIsSearchingExternal(false);
      toast({
        title: "Error",
        description: "Failed to search external facilities",
        variant: "destructive",
      });
    },
  });

  // Import facility mutation
  const importFacilityMutation = useMutation({
    mutationFn: async (cmsId: string) => {
      return apiRequest("/api/facilities/import", {
        method: "POST",
        body: JSON.stringify({ cmsId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setIsImportDialogOpen(false);
      setExternalSearchResults([]);
      toast({
        title: "Success",
        description: "Facility imported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import facility",
        variant: "destructive",
      });
    },
  });

  // Forms
  const createForm = useForm<z.infer<typeof createFacilitySchema>>({
    resolver: zodResolver(createFacilitySchema),
    defaultValues: {
      name: "",
      facilityType: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      isActive: true,
    },
  });

  const importForm = useForm({
    defaultValues: {
      searchName: "",
      searchState: "",
      searchCity: "",
      cmsId: "",
    },
  });

  const onExternalSearchSubmit = (data: any) => {
    searchExternalMutation.mutate({
      name: data.searchName,
      state: data.searchState || undefined,
      city: data.searchCity || undefined,
    });
  };

  const handleImportFromExternal = (externalFacility: any) => {
    if (externalFacility.federal_provider_number) {
      importFacilityMutation.mutate(externalFacility.federal_provider_number);
    }
  };

  const onCreateSubmit = (data: z.infer<typeof createFacilitySchema>) => {
    createFacilityMutation.mutate(data);
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
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Facility Management</h1>
            <p className="text-muted-foreground">
              Manage healthcare facilities with comprehensive profiles and external data integration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Import className="h-4 w-4 mr-2" />
                Import Facility
              </Button>
            </DialogTrigger>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Facility
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Facilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search facilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All States</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          facilities.map((facility: Facility) => (
            <Card key={facility.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building2 className="h-4 w-4" />
                      {facility.facilityType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardDescription>
                  </div>
                  <Badge variant={facility.isActive ? "default" : "secondary"}>
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {formatAddress(facility)}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {facility.phone || "No phone"}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {facility.email || "No email"}
                </div>

                {facility.bedCount && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bed className="h-4 w-4" />
                    {facility.bedCount} beds
                  </div>
                )}

                {facility.overallRating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{facility.overallRating}/5</span>
                    <div className={`w-2 h-2 rounded-full ${getRatingColor(facility.overallRating)}`}></div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Facility Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <Input {...field} placeholder="Enter facility name" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select facility type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hospital">Hospital</SelectItem>
                          <SelectItem value="nursing_home">Nursing Home</SelectItem>
                          <SelectItem value="assisted_living">Assisted Living</SelectItem>
                          <SelectItem value="rehabilitation">Rehabilitation Center</SelectItem>
                          <SelectItem value="hospice">Hospice</SelectItem>
                          <SelectItem value="clinic">Clinic</SelectItem>
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
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter street address" />
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter city" />
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
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
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
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter ZIP code" />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter phone number" />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter email address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={createForm.control}
                  name="bedCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Beds</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter bed count"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="privateRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Rooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter private rooms"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="semiPrivateRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semi-Private Rooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter semi-private rooms"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <Switch 
                        checked={field.value || false} 
                        onCheckedChange={field.onChange}
                      />
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
                <Button 
                  type="submit" 
                  disabled={createFacilityMutation.isPending}
                >
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
  );
}