import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Users,
  Phone,
  Mail,
  Edit,
  Plus,
  Settings,
  Eye,
} from "lucide-react";

interface Facility {
  id: number;
  name: string;
  facilityType: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  bedCount?: number;
  isActive: boolean;
  teamId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function SimpleFacilityManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facilities using the basic facilities API
  const { data: facilities = [], isLoading, error } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    retry: 3,
  });

  // Get unique values for filters
  const states = [...new Set(facilities.map(f => f.state).filter(Boolean))].sort();
  const facilityTypes = [...new Set(facilities.map(f => f.facilityType))].sort();

  // Filter facilities based on search and filters
  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = searchTerm === "" || 
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (facility.city && facility.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (facility.state && facility.state.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesState = filterState === "all" || facility.state === filterState;
    const matchesType = filterType === "all" || facility.facilityType === filterType;
    
    return matchesSearch && matchesState && matchesType;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hospital": return "bg-blue-100 text-blue-800";
      case "Clinic": return "bg-purple-100 text-purple-800";
      case "Nursing Home": return "bg-orange-100 text-orange-800";
      case "Assisted Living": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading facilities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Facilities</h3>
            <p className="text-red-600 mb-4">Unable to fetch facilities. Please try again.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/facilities"] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facility Management</h1>
          <p className="text-gray-600 mt-1">
            Manage all healthcare facilities ({filteredFacilities.length} of {facilities.length})
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Facility
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(state => (
                  <SelectItem key={state} value={state!}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {facilityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facilities List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Beds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacilities.map((facility) => (
                  <TableRow key={facility.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {facility.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(facility.facilityType)}>
                        {facility.facilityType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {facility.city && facility.state ? `${facility.city}, ${facility.state}` : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {facility.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {facility.phone}
                          </div>
                        )}
                        {facility.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {facility.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        {facility.bedCount || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(facility.isActive)}>
                        {facility.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Facility Details: {facility.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Basic Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Name:</strong> {facility.name}</p>
                                    <p><strong>Type:</strong> {facility.facilityType}</p>
                                    <p><strong>Beds:</strong> {facility.bedCount || "N/A"}</p>
                                    <p><strong>Status:</strong> {facility.isActive ? "Active" : "Inactive"}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Contact Information</h4>
                                  <div className="space-y-1 text-sm">
                                    {facility.address && <p><strong>Address:</strong> {facility.address}</p>}
                                    {facility.city && facility.state && (
                                      <p><strong>Location:</strong> {facility.city}, {facility.state} {facility.zipCode}</p>
                                    )}
                                    {facility.phone && <p><strong>Phone:</strong> {facility.phone}</p>}
                                    {facility.email && <p><strong>Email:</strong> {facility.email}</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredFacilities.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Facilities Found</h3>
              <p className="text-gray-600 mb-4">
                No facilities match your current search and filter criteria.
              </p>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}