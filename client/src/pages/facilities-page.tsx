import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertFacilitySchema, type Facility } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
import InteractiveMap from '@/components/InteractiveMap';
import { z } from 'zod';

const createFacilitySchema = insertFacilitySchema.extend({
  bedCount: z.number().optional(),
  privateRooms: z.number().optional(),
  semiPrivateRooms: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export default function FacilitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null,
  );
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facilities
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const response = await fetch('/api/facilities');
      if (!response.ok) throw new Error('Failed to fetch facilities');
      return response.json();
    },
  });

  // Create facility form
  const createForm = useForm<z.infer<typeof createFacilitySchema>>({
    resolver: zodResolver(createFacilitySchema),
    defaultValues: {
      name: '',
      facilityType: 'hospital',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      isActive: true,
    },
  });

  // Import form for CMS ID
  const importForm = useForm({
    defaultValues: {
      cmsId: '',
    },
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createFacilitySchema>) => {
      const response = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create facility');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: 'Success',
        description: 'Facility created successfully',
      });
    },
    onError: error => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create facility',
        variant: 'destructive',
      });
    },
  });

  // Import facility mutation
  const importFacilityMutation = useMutation({
    mutationFn: async (cmsId: string) => {
      const response = await fetch('/api/facilities/import/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmsId }),
      });
      if (!response.ok) throw new Error('Failed to import facility');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
      setIsImportDialogOpen(false);
      importForm.reset();
      toast({
        title: 'Success',
        description: 'Facility imported successfully from CMS database',
      });
    },
    onError: error => {
      toast({
        title: 'Import Failed',
        description:
          error.message || 'Failed to import facility from CMS database',
        variant: 'destructive',
      });
    },
  });

  const onCreateSubmit = (data: z.infer<typeof createFacilitySchema>) => {
    const facilityData = {
      ...data,
      latitude: mapLocation?.lat,
      longitude: mapLocation?.lng,
    };
    createFacilityMutation.mutate(facilityData);
  };

  const handleLocationSelect = (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => {
    setMapLocation(location);
    if (location.address) {
      // Parse address components and update form
      const addressParts = location.address.split(', ');
      const formData = createForm.getValues();

      // Try to extract city, state, zip from formatted address
      if (addressParts.length >= 3) {
        const lastPart = addressParts[addressParts.length - 1]; // Country
        const secondLast = addressParts[addressParts.length - 2]; // State ZIP
        const thirdLast = addressParts[addressParts.length - 3]; // City

        if (secondLast) {
          const stateZipMatch = secondLast.match(/([A-Z]{2})\s+(\d{5})/);
          if (stateZipMatch) {
            createForm.setValue('state', stateZipMatch[1]);
            createForm.setValue('zipCode', stateZipMatch[2]);
          }
        }

        if (thirdLast) {
          createForm.setValue('city', thirdLast);
        }

        // Set the full address minus city, state, zip
        const streetAddress = addressParts.slice(0, -3).join(', ');
        if (streetAddress) {
          createForm.setValue('address', streetAddress);
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
    if (!rating) return 'bg-gray-500';
    if (rating >= 4) return 'bg-green-500';
    if (rating >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatAddress = (facility: Facility) => {
    return [facility.address, facility.city, facility.state, facility.zipCode]
      .filter(Boolean)
      .join(', ');
  };

  const US_STATES = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ];

  const filteredFacilities = facilities.filter((facility: Facility) => {
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
            Manage healthcare facilities with comprehensive profiles and
            external data integration
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
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
                <form
                  onSubmit={importForm.handleSubmit(onImportSubmit)}
                  className="space-y-4"
                >
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

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
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
                <form
                  onSubmit={createForm.handleSubmit(onCreateSubmit)}
                  className="space-y-4"
                >
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hospital">Hospital</SelectItem>
                              <SelectItem value="nursing_home">
                                Nursing Home
                              </SelectItem>
                              <SelectItem value="assisted_living">
                                Assisted Living
                              </SelectItem>
                              <SelectItem value="home_health">
                                Home Health
                              </SelectItem>
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
                          <Input {...field} value={field.value || ''} />
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
                            <Input {...field} value={field.value || ''} />
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map(state => (
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
                            <Input {...field} value={field.value || ''} />
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
                            <Input
                              type="tel"
                              {...field}
                              value={field.value || ''}
                            />
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
                            <Input
                              type="email"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Location Settings
                    </label>
                    <InteractiveMap
                      height="300px"
                      onLocationSelect={handleLocationSelect}
                      showSearch={true}
                    />
                    {mapLocation && (
                      <div className="text-xs text-muted-foreground">
                        Coordinates: {mapLocation.lat.toFixed(6)},{' '}
                        {mapLocation.lng.toFixed(6)}
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
                  onChange={e => setSearchQuery(e.target.value)}
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
                {US_STATES.map(state => (
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
          {filteredFacilities.map((facility: Facility) => (
            <Card
              key={facility.id}
              className="hover:shadow-lg transition-shadow"
            >
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
                  <Badge variant={facility.isActive ? 'default' : 'secondary'}>
                    {facility.isActive ? 'Active' : 'Inactive'}
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
                ? 'No facilities match your search criteria.'
                : 'Get started by adding your first facility or importing from external databases.'}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Facility
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Import className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
