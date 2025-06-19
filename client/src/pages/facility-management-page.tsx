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
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: z.infer<typeof createFacilitySchema>) => {
      return apiRequest("/api/facilities", "POST", facilityData);
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
      return fetch(`/api/facilities/search-external?${params.toString()}`).then(res => res.json());
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
      return apiRequest("/api/facilities/import", "POST", { cmsId });
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

  // Filter facilities based on search and state
  const filteredFacilities = facilities.filter((facility: Facility) => {
    const matchesSearch = !searchQuery || 
      facility.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesState = !selectedState || facility.state === selectedState;
    
    return matchesSearch && matchesState;
  });

  // FacilityDetailView component
  const FacilityDetailView = ({ facility }: { facility: Facility }) => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{facility.name}</h1>
        <p className="text-muted-foreground">
          {facility.facilityType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{formatAddress(facility)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{facility.phone || "No phone"}</p>
                <p className="text-sm text-muted-foreground">{facility.email || "No email"}</p>
              </CardContent>
            </Card>

            {facility.bedCount && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{facility.bedCount} beds</p>
                </CardContent>
              </Card>
            )}
          </div>

          {facility.overallRating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Quality Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{facility.overallRating}</div>
                    <div className="text-sm text-muted-foreground">Overall</div>
                  </div>
                  {facility.staffingRating && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">{facility.staffingRating}</div>
                      <div className="text-sm text-muted-foreground">Staffing</div>
                    </div>
                  )}
                  {facility.qualityMeasureRating && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">{facility.qualityMeasureRating}</div>
                      <div className="text-sm text-muted-foreground">Quality</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Facility Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm">{facility.name}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="text-sm">{facility.facilityType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={facility.isActive ? "default" : "secondary"}>
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Facility Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable this facility</p>
                  </div>
                  <Switch checked={facility.isActive} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h2 className="text-lg font-semibold">Facility Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage healthcare facilities
          </p>
        </div>

        {/* Search in Sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by state" />
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
        </div>

        {/* Facilities List in Sidebar */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="p-3 border-b border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            filteredFacilities.map((facility: Facility) => (
              <div
                key={facility.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedFacility?.id === facility.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                }`}
                onClick={() => setSelectedFacility(facility)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{facility.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {facility.facilityType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatAddress(facility)}
                    </p>
                    {facility.bedCount && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {facility.bedCount} beds
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant={facility.isActive ? "default" : "secondary"}
                    className="text-xs ml-2"
                  >
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons in Sidebar */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Facility
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Import className="h-4 w-4 mr-2" />
                Import Facility
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {selectedFacility ? (
            <FacilityDetailView facility={selectedFacility} />
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Facility</h3>
              <p className="text-gray-500">
                Choose a facility from the sidebar to view and edit its details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FacilityManagementPage;
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