import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import InteractiveMap from "@/components/InteractiveMap";
import { MapPin, Clock, Star, Heart, Shield, Navigation, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RecommendationCriteria {
  location: {
    lat: number;
    lng: number;
  };
  facilityType?: string;
  maxDistance?: number;
  minRating?: number;
  requiresSpecialty?: string[];
  bedCountMin?: number;
  participatesMedicare?: boolean;
  participatesMedicaid?: boolean;
  prioritizeQuality?: boolean;
  prioritizeDistance?: boolean;
}

interface FacilityRecommendation {
  facility: any;
  distance: number;
  score: number;
  reasons: string[];
  qualityMetrics: {
    overallRating?: number;
    staffingScore?: number;
    qualityScore?: number;
    safetyScore?: number;
  };
  travelInfo?: {
    estimatedTravelTime: string;
    directions?: string;
  };
}

export default function FacilityRecommendationsPage() {
  const [searchLocation, setSearchLocation] = useState<{lat: number; lng: number} | null>(null);
  const [criteria, setCriteria] = useState<RecommendationCriteria>({
    location: { lat: 39.7817, lng: -89.6501 }, // Springfield, IL default
    maxDistance: 25,
    minRating: 3,
    prioritizeQuality: true,
    prioritizeDistance: false,
  });
  
  const [selectedRecommendationType, setSelectedRecommendationType] = useState<string>("general");

  const getRecommendationsMutation = useMutation({
    mutationFn: async (searchCriteria: RecommendationCriteria) => {
      const endpoint = selectedRecommendationType === "emergency" 
        ? "/api/facilities/recommendations/emergency"
        : selectedRecommendationType === "specialized"
        ? "/api/facilities/recommendations/specialized" 
        : selectedRecommendationType === "insurance"
        ? "/api/facilities/recommendations/insurance"
        : "/api/facilities/recommendations";

      const requestBody = selectedRecommendationType === "emergency" 
        ? { location: searchCriteria.location, facilityType: searchCriteria.facilityType }
        : selectedRecommendationType === "specialized"
        ? { location: searchCriteria.location, specialty: "general", maxDistance: searchCriteria.maxDistance }
        : selectedRecommendationType === "insurance"
        ? { location: searchCriteria.location, insuranceType: "both", facilityType: searchCriteria.facilityType }
        : searchCriteria;

      const response = await apiRequest("POST", endpoint, requestBody);
      return await response.json();
    },
  });

  const handleLocationSelect = (location: {lat: number; lng: number; address?: string}) => {
    setSearchLocation(location);
    setCriteria(prev => ({
      ...prev,
      location
    }));
  };

  const handleGetRecommendations = () => {
    if (searchLocation || criteria.location) {
      getRecommendationsMutation.mutate(criteria);
    }
  };

  const recommendations = (getRecommendationsMutation.data || []) as FacilityRecommendation[];

  const renderQualityBadge = (rating: number | undefined, label: string) => {
    if (!rating) return null;
    
    const getVariant = (score: number) => {
      if (score >= 4) return "default";
      if (score >= 3) return "secondary";
      return "destructive";
    };

    return (
      <Badge variant={getVariant(rating)} className="text-xs">
        {label}: {rating}/5
      </Badge>
    );
  };

  const renderRecommendationCard = (rec: FacilityRecommendation, index: number) => (
    <Card key={rec.facility.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{rec.facility.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>{rec.facility.address}, {rec.facility.city}, {rec.facility.state}</span>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mb-1">
              Rank #{index + 1}
            </Badge>
            <div className="text-lg font-bold text-primary">
              {rec.score.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Match Score</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{rec.distance.toFixed(1)} miles</span>
          </div>
          {rec.travelInfo?.estimatedTravelTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-green-500" />
              <span>{rec.travelInfo.estimatedTravelTime}</span>
            </div>
          )}
          {rec.facility.facilityType && (
            <Badge variant="outline">{rec.facility.facilityType}</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {renderQualityBadge(rec.qualityMetrics.overallRating, "Overall")}
          {renderQualityBadge(rec.qualityMetrics.staffingScore, "Staffing")}
          {renderQualityBadge(rec.qualityMetrics.qualityScore, "Quality")}
          {renderQualityBadge(rec.qualityMetrics.safetyScore, "Safety")}
        </div>

        {rec.reasons.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Why This Facility:</div>
            <div className="flex flex-wrap gap-1">
              {rec.reasons.map((reason, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          {rec.facility.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{rec.facility.phone}</span>
            </div>
          )}
          {rec.facility.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{rec.facility.email}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            View Details
          </Button>
          <Button size="sm">
            Get Directions
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facility Recommendations</h1>
        <p className="text-muted-foreground">
          Find the best healthcare facilities based on your location and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Criteria Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Search Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Recommendation Type</Label>
                <Select value={selectedRecommendationType} onValueChange={setSelectedRecommendationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Recommendations</SelectItem>
                    <SelectItem value="emergency">Emergency Care</SelectItem>
                    <SelectItem value="specialized">Specialized Care</SelectItem>
                    <SelectItem value="insurance">Insurance-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Facility Type</Label>
                <Select value={criteria.facilityType || "any"} onValueChange={(value) => 
                  setCriteria(prev => ({ ...prev, facilityType: value === "any" ? undefined : value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Type</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="nursing_home">Nursing Home</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="urgent_care">Urgent Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Maximum Distance: {criteria.maxDistance} miles
                </Label>
                <Slider
                  value={[criteria.maxDistance || 25]}
                  onValueChange={([value]) => setCriteria(prev => ({ ...prev, maxDistance: value }))}
                  max={100}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Minimum Rating: {criteria.minRating}/5
                </Label>
                <Slider
                  value={[criteria.minRating || 3]}
                  onValueChange={([value]) => setCriteria(prev => ({ ...prev, minRating: value }))}
                  max={5}
                  min={1}
                  step={0.5}
                  className="mt-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Prioritize Quality</Label>
                  <Switch
                    checked={criteria.prioritizeQuality}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, prioritizeQuality: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Prioritize Distance</Label>
                  <Switch
                    checked={criteria.prioritizeDistance}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, prioritizeDistance: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Accepts Medicare</Label>
                  <Switch
                    checked={criteria.participatesMedicare}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, participatesMedicare: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Accepts Medicaid</Label>
                  <Switch
                    checked={criteria.participatesMedicaid}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, participatesMedicaid: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Search Location</Label>
                <InteractiveMap
                  height="200px"
                  onLocationSelect={handleLocationSelect}
                  showSearch={true}
                />
                {searchLocation && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Selected: {searchLocation.lat.toFixed(6)}, {searchLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleGetRecommendations}
                className="w-full"
                disabled={getRecommendationsMutation.isPending}
              >
                {getRecommendationsMutation.isPending ? "Searching..." : "Get Recommendations"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {getRecommendationsMutation.isPending && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Analyzing facilities and generating recommendations...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {getRecommendationsMutation.error && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-red-600">
                  <p>Error generating recommendations. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {recommendations.length} Recommended Facilities
                </h2>
                <Badge variant="outline">
                  {selectedRecommendationType === "emergency" ? "Emergency Care" :
                   selectedRecommendationType === "specialized" ? "Specialized Care" :
                   selectedRecommendationType === "insurance" ? "Insurance-Based" : "General"}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {recommendations.map((rec, index) => renderRecommendationCard(rec, index))}
              </div>
            </div>
          )}

          {getRecommendationsMutation.isSuccess && recommendations.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    No facilities found matching your criteria. Try adjusting your search parameters.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}