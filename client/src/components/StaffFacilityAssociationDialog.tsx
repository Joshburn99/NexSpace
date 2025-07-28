import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  associatedFacilities?: number[];
}

interface Facility {
  id: number;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
}

interface StaffFacilityAssociationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  facilities: Facility[];
}

export function StaffFacilityAssociationDialog({
  isOpen,
  onClose,
  staff,
  facilities,
}: StaffFacilityAssociationDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add facility association mutation
  const addFacilityAssociation = useMutation({
    mutationFn: async (facilityId: number) => {
      return apiRequest("POST", `/api/staff/${staff.id}/facilities`, { facilityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Facility association added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add facility association",
        variant: "destructive",
      });
    },
  });

  // Remove facility association mutation
  const removeFacilityAssociation = useMutation({
    mutationFn: async (facilityId: number) => {
      return apiRequest("DELETE", `/api/staff/${staff.id}/facilities/${facilityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Facility association removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove facility association",
        variant: "destructive",
      });
    },
  });

  const handleAddFacility = (facilityId: number) => {
    addFacilityAssociation.mutate(facilityId);
  };

  const handleRemoveFacility = (facilityId: number) => {
    removeFacilityAssociation.mutate(facilityId);
  };

  const associatedFacilities = staff.associatedFacilities || [];
  const filteredFacilities = facilities.filter(
    (facility) =>
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableFacilities = filteredFacilities.filter(
    (f) => !associatedFacilities.includes(f.id)
  );
  const currentFacilities = facilities.filter((f) => associatedFacilities.includes(f.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add Facility Association
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Select facilities to associate with {staff.firstName} {staff.lastName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search facilities by name, location, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Associations */}
          {currentFacilities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-700">Current Associations</h3>
              <div className="grid gap-2">
                {currentFacilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{facility.name}</p>
                        <p className="text-xs text-gray-600">
                          Type: {facility.type}
                          {facility.address && ` • ${facility.address}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFacility(facility.id)}
                      disabled={removeFacilityAssociation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Facilities */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">Available Facilities</h3>
            {availableFacilities.length > 0 ? (
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {availableFacilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-sm">{facility.name}</p>
                        <p className="text-xs text-gray-600">
                          Type: {facility.type}
                          {facility.address && ` • ${facility.address}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddFacility(facility.id)}
                      disabled={addFacilityAssociation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                {searchTerm
                  ? "No facilities match your search"
                  : "No available facilities to associate"}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
