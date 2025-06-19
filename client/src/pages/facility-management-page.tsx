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
import { Loader2, Plus, Search, Building2, MapPin, Phone, Mail, Users, Bed, Star, RefreshCw, Import, ExternalLink, TrendingUp, Settings, Clock, DollarSign } from "lucide-react";
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
    queryKey: ["/api/facilities", { search: searchQuery, state: selectedState }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedState) params.append('state', selectedState);
      const queryString = params.toString();
      return apiRequest(`/api/facilities${queryString ? `?${queryString}` : ''}`);
    },
  });

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
      searchName: "",
      searchState: "",
      searchCity: "",
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

  // External search mutation
  const searchExternalMutation = useMutation({
    mutationFn: async (data: { name: string; state?: string; city?: string }) => {
      const response = await fetch("/api/facilities/search/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to search external databases");
      return response.json();
    },
    onSuccess: (results) => {
      setExternalSearchResults(results);
      setIsSearchingExternal(false);
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search external databases",
        variant: "destructive",
      });
      setIsSearchingExternal(false);
    },
  });

  // Refresh facility data mutation
  const refreshFacilityMutation = useMutation({
    mutationFn: async (facilityId: number) => {
      const response = await fetch(`/api/facilities/${facilityId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to refresh facility data");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({
        title: "Success",
        description: "Facility data refreshed from external sources",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh facility data",
        variant: "destructive",
      });
    },
  });

  const handleExternalSearch = () => {
    const data = importForm.getValues();
    if (!data.searchName) {
      toast({
        title: "Error",
        description: "Please enter a facility name to search",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearchingExternal(true);
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Facility Data</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="cms" className="w-full">
                <TabsList>
                  <TabsTrigger value="cms">CMS Import</TabsTrigger>
                  <TabsTrigger value="search">External Search</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cms" className="space-y-4">
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
                </TabsContent>

                <TabsContent value="search" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={importForm.control}
                      name="searchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter facility name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={importForm.control}
                      name="searchState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={importForm.control}
                      name="searchCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleExternalSearch}
                    disabled={isSearchingExternal}
                    className="w-full"
                  >
                    {isSearchingExternal && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Search External Databases
                  </Button>

                  {externalSearchResults.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <h4 className="font-semibold">Search Results:</h4>
                      {externalSearchResults.map((facility, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h5 className="font-medium">{facility.provider_name}</h5>
                              <p className="text-sm text-muted-foreground">
                                {facility.address}, {facility.city_name}, {facility.state_abbr} {facility.zip_code}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  CMS: {facility.federal_provider_number}
                                </Badge>
                                {facility.overall_rating && (
                                  <Badge className={getRatingColor(facility.overall_rating)}>
                                    {facility.overall_rating}★
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleImportFromExternal(facility)}
                              disabled={importFacilityMutation.isPending}
                            >
                              Import
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                          <Input {...field} />
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
                            <Input {...field} />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                            <Input {...field} />
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
                            <Input type="tel" {...field} />
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
                            <Input type="email" {...field} />
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
                              {...field} 
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
                              {...field} 
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
                              {...field} 
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
                            checked={field.value} 
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
          {facilities.map((facility: Facility) => (
            <Card key={facility.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {facility.facilityType?.replace('_', ' ')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {facility.cmsId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshFacilityMutation.mutate(facility.id)}
                        disabled={refreshFacilityMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
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

                {(facility.bedCount || facility.privateRooms || facility.semiPrivateRooms) && (
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
                  {facility.cmsId && (
                    <Badge variant="outline">CMS: {facility.cmsId}</Badge>
                  )}
                  {facility.autoImported && (
                    <Badge variant="secondary">Auto-Imported</Badge>
                  )}
                  {facility.participatesMedicare && (
                    <Badge variant="outline">Medicare</Badge>
                  )}
                  {facility.participatesMedicaid && (
                    <Badge variant="outline">Medicaid</Badge>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedFacility(facility)}
                  >
                    View Details
                  </Button>
                  <Badge variant={facility.isActive ? "default" : "secondary"}>
                    {facility.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {facilities.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No facilities found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedState 
                ? "No facilities match your search criteria."
                : "Get started by adding your first facility or importing from external databases."
              }
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

      {/* Facility Details Dialog */}
      {selectedFacility && (
        <Dialog open={!!selectedFacility} onOpenChange={() => setSelectedFacility(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedFacility.name}</span>
                <div className="flex items-center gap-2">
                  {selectedFacility.overallRating && (
                    <Badge className={getRatingColor(selectedFacility.overallRating)}>
                      {selectedFacility.overallRating}★ Overall
                    </Badge>
                  )}
                  {selectedFacility.cmsId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refreshFacilityMutation.mutate(selectedFacility.id)}
                      disabled={refreshFacilityMutation.isPending}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh Data
                    </Button>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ratings">Quality Ratings</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="shift-settings">Shift Settings</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Type</Label>
                        <p className="text-sm">{selectedFacility.facilityType?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Address</Label>
                        <p className="text-sm">{formatAddress(selectedFacility)}</p>
                      </div>
                      {selectedFacility.phone && (
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <p className="text-sm">{selectedFacility.phone}</p>
                        </div>
                      )}
                      {selectedFacility.email && (
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm">{selectedFacility.email}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Capacity & Structure</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedFacility.bedCount && (
                        <div>
                          <Label className="text-sm font-medium">Total Beds</Label>
                          <p className="text-sm">{selectedFacility.bedCount}</p>
                        </div>
                      )}
                      {selectedFacility.privateRooms && (
                        <div>
                          <Label className="text-sm font-medium">Private Rooms</Label>
                          <p className="text-sm">{selectedFacility.privateRooms}</p>
                        </div>
                      )}
                      {selectedFacility.semiPrivateRooms && (
                        <div>
                          <Label className="text-sm font-medium">Semi-Private Rooms</Label>
                          <p className="text-sm">{selectedFacility.semiPrivateRooms}</p>
                        </div>
                      )}
                      {selectedFacility.ownershipType && (
                        <div>
                          <Label className="text-sm font-medium">Ownership</Label>
                          <p className="text-sm capitalize">{selectedFacility.ownershipType}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="ratings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedFacility.overallRating && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${getRatingColor(selectedFacility.overallRating)}`}>
                          {selectedFacility.overallRating}
                        </div>
                        <p className="text-sm font-medium">Overall Rating</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.healthInspectionRating && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${getRatingColor(selectedFacility.healthInspectionRating)}`}>
                          {selectedFacility.healthInspectionRating}
                        </div>
                        <p className="text-sm font-medium">Health Inspection</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.qualityMeasureRating && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${getRatingColor(selectedFacility.qualityMeasureRating)}`}>
                          {selectedFacility.qualityMeasureRating}
                        </div>
                        <p className="text-sm font-medium">Quality Measures</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.staffingRating && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${getRatingColor(selectedFacility.staffingRating)}`}>
                          {selectedFacility.staffingRating}
                        </div>
                        <p className="text-sm font-medium">Staffing</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="operations" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Administration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedFacility.adminName && (
                        <div>
                          <Label className="text-sm font-medium">Administrator</Label>
                          <p className="text-sm">{selectedFacility.adminName}</p>
                          {selectedFacility.adminTitle && (
                            <p className="text-xs text-muted-foreground">{selectedFacility.adminTitle}</p>
                          )}
                        </div>
                      )}
                      {selectedFacility.medicalDirector && (
                        <div>
                          <Label className="text-sm font-medium">Medical Director</Label>
                          <p className="text-sm">{selectedFacility.medicalDirector}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Payment Programs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Medicare</Label>
                        <Badge variant={selectedFacility.participatesMedicare ? "default" : "secondary"}>
                          {selectedFacility.participatesMedicare ? "Accepted" : "Not Accepted"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Medicaid</Label>
                        <Badge variant={selectedFacility.participatesMedicaid ? "default" : "secondary"}>
                          {selectedFacility.participatesMedicaid ? "Accepted" : "Not Accepted"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedFacility.deficiencyCount !== null && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {selectedFacility.deficiencyCount}
                        </div>
                        <p className="text-sm font-medium">Standard Deficiencies</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.complaintsCount !== null && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600 mb-1">
                          {selectedFacility.complaintsCount}
                        </div>
                        <p className="text-sm font-medium">Complaints</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.finesTotal && (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600 mb-1">
                          ${parseFloat(selectedFacility.finesTotal).toLocaleString()}
                        </div>
                        <p className="text-sm font-medium">Total Fines</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {selectedFacility.lastInspectionDate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Last Health Inspection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {new Date(selectedFacility.lastInspectionDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="shift-settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Preset Times Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Preset Shift Times
                      </CardTitle>
                      <CardDescription>
                        Configure standard shift times for quick selection during shift posting
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground">
                          <span>Shift Name</span>
                          <span>Start Time</span>
                          <span>End Time</span>
                        </div>
                        {[
                          { name: "Day Shift", start: "07:00", end: "19:00" },
                          { name: "Night Shift", start: "19:00", end: "07:00" },
                          { name: "Morning Shift", start: "06:00", end: "18:00" },
                          { name: "Evening Shift", start: "18:00", end: "06:00" },
                          { name: "Extended Day", start: "08:00", end: "20:00" },
                          { name: "Extended Night", start: "20:00", end: "08:00" }
                        ].map((shift, index) => (
                          <div key={index} className="grid grid-cols-3 gap-2">
                            <Input 
                              value={shift.name}
                              placeholder="Shift name"
                              className="text-sm"
                            />
                            <Input 
                              type="time"
                              value={shift.start}
                              className="text-sm"
                            />
                            <Input 
                              type="time"
                              value={shift.end}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Preset Time
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Base Rates Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Base Hourly Rates
                      </CardTitle>
                      <CardDescription>
                        Set standard hourly rates by specialty (before premium adjustments)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {[
                          { specialty: "Registered Nurse", rate: 35 },
                          { specialty: "Licensed Practical Nurse", rate: 28 },
                          { specialty: "Certified Nursing Assistant", rate: 18 },
                          { specialty: "Physical Therapist", rate: 45 },
                          { specialty: "Respiratory Therapist", rate: 32 },
                          { specialty: "Medical Doctor", rate: 85 },
                          { specialty: "Nurse Practitioner", rate: 55 },
                          { specialty: "Physician Assistant", rate: 50 }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.specialty}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input 
                                type="number"
                                value={item.rate}
                                className="w-20 text-sm"
                                min="0"
                                step="0.50"
                              />
                              <span className="text-sm text-muted-foreground">/hr</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Premium Rate Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Premium Rate Settings
                      </CardTitle>
                      <CardDescription>
                        Configure allowed premium multipliers for shift rates
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Minimum Premium</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              value="100"
                              className="w-20 text-sm"
                              min="100"
                              max="200"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Maximum Premium</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              value="170"
                              className="w-20 text-sm"
                              min="100"
                              max="200"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Step Size</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              value="5"
                              className="w-20 text-sm"
                              min="1"
                              max="10"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Premium Examples:</div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>• RN Base $35/hr → 120% = $42/hr</div>
                          <div>• LPN Base $28/hr → 150% = $42/hr</div>
                          <div>• CNA Base $18/hr → 170% = $30.60/hr</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Department Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Departments & Specialties
                      </CardTitle>
                      <CardDescription>
                        Manage available departments and specialty services
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Departments</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            "Emergency Department",
                            "Intensive Care Unit", 
                            "Medical/Surgical",
                            "Pediatrics",
                            "Oncology",
                            "Cardiology",
                            "Orthopedics",
                            "Rehabilitation",
                            "Operating Room",
                            "Labor & Delivery"
                          ].map((dept, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Specialty Services</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            "RN", "LPN", "CNA", "PT", "RT", "MD", "NP", "PA"
                          ].map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Customize Departments
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                  <Button>
                    Save Settings
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}