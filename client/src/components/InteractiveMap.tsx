import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, Target } from "lucide-react";

interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface InteractiveMapProps {
  initialLocation?: MapLocation;
  onLocationSelect?: (location: MapLocation) => void;
  height?: string;
  showSearch?: boolean;
  readonly?: boolean;
}

export default function InteractiveMap({
  initialLocation = { lat: 39.8283, lng: -98.5795 }, // Center of US
  onLocationSelect,
  height = "400px",
  showSearch = true,
  readonly = false,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [currentLocation, setCurrentLocation] = useState<MapLocation>(initialLocation);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        // Check if Google Maps is already loaded
        if (typeof google === "undefined") {
          // Load Google Maps script
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;

          script.onload = () => {
            createMap();
          };

          script.onerror = () => {
            console.error("Failed to load Google Maps script");
            setIsLoading(false);
          };

          document.head.appendChild(script);
        } else {
          createMap();
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsLoading(false);
      }
    };

    const createMap = () => {
      if (!mapRef.current) return;

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      const markerInstance = new google.maps.Marker({
        position: currentLocation,
        map: mapInstance,
        draggable: !readonly,
        title: "Facility Location",
      });

      if (!readonly) {
        // Add click listener to map
        mapInstance.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newLocation = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };
            updateLocation(newLocation);
          }
        });

        // Add drag listener to marker
        markerInstance.addListener("dragend", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newLocation = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };
            updateLocation(newLocation);
          }
        });
      }

      setMap(mapInstance);
      setMarker(markerInstance);
      setIsLoading(false);
    };

    initMap();
  }, []);

  const updateLocation = async (location: MapLocation) => {
    setCurrentLocation(location);

    if (marker) {
      marker.setPosition(location);
    }

    if (map) {
      map.setCenter(location);
    }

    // Get address from coordinates
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location });

      if (response.results[0]) {
        const address = response.results[0].formatted_address;
        const locationWithAddress = { ...location, address };
        setCurrentLocation(locationWithAddress);
        onLocationSelect?.(locationWithAddress);
      } else {
        onLocationSelect?.(location);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      onLocationSelect?.(location);
    }
  };

  const searchLocation = async () => {
    if (!searchValue.trim() || !map) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: searchValue });

      if (response.results[0]) {
        const location = response.results[0].geometry.location;
        const newLocation = {
          lat: location.lat(),
          lng: location.lng(),
          address: response.results[0].formatted_address,
        };

        updateLocation(newLocation);
        map.setZoom(15);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        updateLocation(location);
        if (map) {
          map.setZoom(15);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoading(false);
        alert("Unable to retrieve your location.");
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchLocation();
    }
  };

  if (typeof window === "undefined") {
    return (
      <Card style={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Map loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ height }}>
      {showSearch && !readonly && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Location Settings</CardTitle>
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search for an address..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={searchLocation}
                disabled={!searchValue.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={getCurrentLocation} disabled={isLoading}>
              <Target className="h-4 w-4" />
            </Button>
          </div>
          {currentLocation.address && (
            <p className="text-sm text-muted-foreground">{currentLocation.address}</p>
          )}
        </CardHeader>
      )}

      <CardContent className={`${showSearch && !readonly ? "pt-0" : "p-0"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : typeof google === "undefined" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Maps require an API key to load</p>
              <p className="text-xs text-muted-foreground mt-2">
                Add VITE_GOOGLE_MAPS_API_KEY to environment variables
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={mapRef}
              style={{
                height: showSearch && !readonly ? "calc(100% - 120px)" : "100%",
                minHeight: "300px",
                width: "100%",
              }}
            />
            {!readonly && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Click on the map or drag the marker to set location
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
