import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Building,
  MapPin,
  DollarSign,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Star,
  User
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface WorkerShift {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  status: "open" | "requested";
  rate: number;
  urgency: "low" | "medium" | "high" | "critical";
  description: string;
}

export default function WorkerOpenShiftsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState<WorkerShift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  // Fetch open shifts filtered for worker
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["/api/shifts/worker-open"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/shifts/worker-open");
      return await response.json();
    }
  });

  // Request shift mutation
  const requestShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const response = await apiRequest("POST", "/api/shifts/request", { shiftId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/worker-open"] });
      toast({
        title: "Shift Requested",
        description: "Your shift request has been submitted successfully."
      });
      setSelectedShift(null);
    },
    onError: () => {
      toast({
        title: "Request Failed", 
        description: "Failed to request shift. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Filter shifts based on search and filters
  const filteredShifts = shifts.filter((shift: WorkerShift) => {
    const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFacility = facilityFilter === "all" || shift.facilityId.toString() === facilityFilter;
    const matchesUrgency = urgencyFilter === "all" || shift.urgency === urgencyFilter;
    
    return matchesSearch && matchesFacility && matchesUrgency;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800 border-blue-200";
      case "requested": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Available Shifts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and request shifts that match your specialty and facilities
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                <SelectItem value="1">Portland General Hospital</SelectItem>
                <SelectItem value="2">OHSU Hospital</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Urgency Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              {user?.specialty || "All Specialties"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShifts.map((shift: WorkerShift) => (
          <Card key={shift.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{shift.title}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Building className="h-4 w-4" />
                    {shift.facilityName}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={getUrgencyColor(shift.urgency)}>
                    {shift.urgency.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(shift.status)}>
                    {shift.status === "open" ? "Available" : "Requested"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(shift.date)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{shift.department}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">${shift.rate}/hour</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span>{shift.specialty}</span>
                </div>

                {shift.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {shift.description}
                  </p>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setSelectedShift(shift)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  {shift.status === "open" && (
                    <Button
                      onClick={() => requestShiftMutation.mutate(shift.id)}
                      disabled={requestShiftMutation.isPending}
                      size="sm"
                      className="flex-1"
                    >
                      {requestShiftMutation.isPending ? "Requesting..." : "Request Shift"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredShifts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Available Shifts
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are currently no shifts available that match your specialty and facility associations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shift Details Modal */}
      {selectedShift && (
        <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedShift.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge className={getUrgencyColor(selectedShift.urgency)}>
                  {selectedShift.urgency.toUpperCase()}
                </Badge>
                <Badge className={getStatusColor(selectedShift.status)}>
                  {selectedShift.status === "open" ? "Available" : "Requested"}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span>{selectedShift.facilityName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(selectedShift.date)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{selectedShift.department}</span>
                </div>
                
                <div className="flex items-center gap-2 font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">${selectedShift.rate}/hour</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span>{selectedShift.specialty}</span>
                </div>
              </div>

              {selectedShift.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedShift.description}
                  </p>
                </div>
              )}

              {selectedShift.status === "open" && (
                <Button
                  onClick={() => requestShiftMutation.mutate(selectedShift.id)}
                  disabled={requestShiftMutation.isPending}
                  className="w-full"
                >
                  {requestShiftMutation.isPending ? "Requesting..." : "Request This Shift"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}