import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Phone, Star, Clock, Bed } from "lucide-react";

interface Facility {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  facilityType?: string;
  bedCount?: number;
  overallRating?: number;
}

interface GoogleMapsIntegrationProps {
  facilities: Facility[];
  selectedFacility?: Facility | null;
  onFacilitySelect?: (facility: Facility) => void;
}

export default function GoogleMapsIntegration({
  facilities,
  selectedFacility,
  onFacilitySelect,
}: GoogleMapsIntegrationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [markers, setMarkers] = useState<any[]>([]);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
        styles: [
          {
            featureType: "poi.medical",
            elementType: "geometry",
            stylers: [{ color: "#ffeaa7" }],
          },
          {
            featureType: "poi.medical",
            elementType: "labels.text.fill",
            stylers: [{ color: "#2d3436" }],
          },
        ],
      });

      setMapInstance(map);
      setIsLoading(false);
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      // Load Google Maps API dynamically
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    }
  }, []);

  // Add markers for facilities
  useEffect(() => {
    if (!mapInstance || !facilities.length) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));
    const newMarkers: any[] = [];

    facilities.forEach((facility) => {
      const lat = facility.latitude || getEstimatedCoordinates(facility).lat;
      const lng = facility.longitude || getEstimatedCoordinates(facility).lng;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        title: facility.name,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="12" font-weight="bold">H</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(facility),
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker);
        onFacilitySelect?.(facility);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach((marker) => bounds.extend(marker.getPosition()));
      mapInstance.fitBounds(bounds);
    }
  }, [mapInstance, facilities]);

  const getEstimatedCoordinates = (facility: Facility) => {
    // Simple geocoding fallback based on state
    const stateCoordinates: { [key: string]: { lat: number; lng: number } } = {
      CA: { lat: 36.7783, lng: -119.4179 },
      NY: { lat: 42.1657, lng: -74.9481 },
      TX: { lat: 31.9686, lng: -99.9018 },
      FL: { lat: 27.8006, lng: -81.8154 },
      IL: { lat: 40.3363, lng: -89.0022 },
      PA: { lat: 41.2033, lng: -77.1945 },
      OH: { lat: 40.3888, lng: -82.7649 },
      GA: { lat: 33.76, lng: -84.39 },
      NC: { lat: 35.771, lng: -78.638 },
      MI: { lat: 43.3266, lng: -84.5361 },
    };

    return stateCoordinates[facility.state] || { lat: 39.8283, lng: -98.5795 }; // Center of US
  };

  const createInfoWindowContent = (facility: Facility) => {
    const rating = facility.overallRating || 0;
    const stars = "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));

    return `
      <div style="max-width: 300px; padding: 12px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
          ${facility.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
            ${facility.facilityType?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Healthcare"}
          </span>
        </div>
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
          📍 ${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}
        </p>
        ${facility.phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">📞 ${facility.phone}</p>` : ""}
        ${facility.bedCount ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">🛏️ ${facility.bedCount} beds</p>` : ""}
        ${rating > 0 ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">⭐ ${stars} (${rating}/5)</p>` : ""}
        <div style="margin-top: 12px;">
          <button 
            onclick="window.open('https://maps.google.com/search/${encodeURIComponent(facility.address + ", " + facility.city + ", " + facility.state)}', '_blank')"
            style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;"
          >
            Get Directions
          </button>
        </div>
      </div>
    `;
  };

  const handleSearch = () => {
    if (!mapInstance || !searchQuery.trim()) return;

    const service = new window.google.maps.places.PlacesService(mapInstance);
    const request = {
      query: searchQuery + " healthcare facility",
      fields: ["name", "geometry", "formatted_address", "rating", "types"],
    };

    service.textSearch(request, (results: any[], status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const bounds = new window.google.maps.LatLngBounds();

        results.slice(0, 5).forEach((place) => {
          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: mapInstance,
            title: place.name,
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="15" cy="15" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
                  <text x="15" y="19" text-anchor="middle" fill="white" font-size="10" font-weight="bold">?</text>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(30, 30),
            },
          });

          bounds.extend(place.geometry.location);
        });

        mapInstance.fitBounds(bounds);
      }
    });
  };

  const filteredFacilities = facilities.filter(
    (facility) =>
      facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facility.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Container */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Facility Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search facilities or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <div
                ref={mapRef}
                className="w-full h-96 bg-gray-100 rounded-lg border"
                style={{ minHeight: "400px" }}
              >
                {isLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading map...</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility List */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Nearby Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFacility?.id === facility.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onFacilitySelect?.(facility)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{facility.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {facility.city}, {facility.state}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {facility.facilityType && (
                          <Badge variant="secondary" className="text-xs">
                            {facility.facilityType.replace("_", " ")}
                          </Badge>
                        )}

                        {facility.bedCount && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Bed className="h-3 w-3" />
                            {facility.bedCount}
                          </div>
                        )}
                      </div>

                      {facility.overallRating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-gray-600">{facility.overallRating}/5</span>
                        </div>
                      )}
                    </div>

                    {facility.phone && (
                      <Button size="sm" variant="outline" className="ml-2">
                        <Phone className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredFacilities.length === 0 && (
                <div className="text-center py-8 text-gray-500">No facilities found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
