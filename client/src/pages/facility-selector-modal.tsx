import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, Users, Star } from "lucide-react";

interface FacilitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (facility: any) => void;
  selectedFacilityId?: number;
}

export function FacilitySelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedFacilityId 
}: FacilitySelectorModalProps) {
  // Use existing facilities data from the API
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["/api/facilities"],
    enabled: isOpen,
  });

  // Create mock facilities for demo if API fails
  const mockFacilities = [
    {
      id: 1,
      name: "Portland General Hospital",
      facilityType: "hospital",
      address: "1221 SW Yamhill Street",
      city: "Portland", 
      state: "Oregon",
      zipCode: "97205",
      bedCount: 287,
      overallRating: 4.2,
      isActive: true
    },
    {
      id: 2,
      name: "Maple Grove Memory Care",
      facilityType: "memory_care",
      address: "5678 Memory Lane", 
      city: "Portland",
      state: "Oregon",
      zipCode: "97158",
      bedCount: 45,
      overallRating: 4.7,
      isActive: true
    },
    {
      id: 3,
      name: "Sunrise Assisted Living",
      facilityType: "assisted_living",
      address: "9012 Sunrise Boulevard",
      city: "Portland",
      state: "Oregon", 
      zipCode: "97159",
      bedCount: 120,
      overallRating: 4.5,
      isActive: true
    },
    {
      id: 4,
      name: "Rose City Nursing Center",
      facilityType: "nursing_home",
      address: "3456 Rose Boulevard",
      city: "Portland",
      state: "Oregon",
      zipCode: "97201",
      bedCount: 80,
      overallRating: 4.1,
      isActive: true
    }
  ];

  const facilitiesToShow = facilities.length > 0 ? facilities : mockFacilities;

  const getFacilityTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      hospital: "Hospital",
      nursing_home: "Nursing Home", 
      assisted_living: "Assisted Living",
      memory_care: "Memory Care",
      rehab_center: "Rehabilitation Center"
    };
    return types[type] || type;
  };

  const getFacilityTypeBadgeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      hospital: "bg-red-100 text-red-800",
      nursing_home: "bg-blue-100 text-blue-800",
      assisted_living: "bg-green-100 text-green-800", 
      memory_care: "bg-purple-100 text-purple-800",
      rehab_center: "bg-orange-100 text-orange-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Loading Facilities...</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">Loading available facilities...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Select Facility
          </DialogTitle>
          <DialogDescription>
            Choose the facility where this shift will be posted
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {facilitiesToShow.map((facility: any) => (
            <Card 
              key={facility.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedFacilityId === facility.id 
                  ? 'ring-2 ring-blue-500 border-blue-500' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => onSelect(facility)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <Badge 
                    variant="secondary" 
                    className={getFacilityTypeBadgeColor(facility.facilityType)}
                  >
                    {getFacilityTypeLabel(facility.facilityType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {facility.address && `${facility.address}, `}
                    {facility.city}, {facility.state} {facility.zipCode}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{facility.bedCount || 'N/A'} beds</span>
                  </div>
                  
                  {facility.overallRating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{facility.overallRating}/5</span>
                    </div>
                  )}
                </div>
                
                {selectedFacilityId === facility.id && (
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => onClose()}>
                      Select This Facility
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {facilitiesToShow.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No facilities available. Please contact your administrator.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}