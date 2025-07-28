import { useState } from "react";
import { Check, ChevronsUpDown, Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useFacilities, EnhancedFacility, getFacilityDisplayName } from "@/hooks/use-facility";

interface FacilitySelectorProps {
  value?: number;
  onSelect: (facilityId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  showDetails?: boolean;
  filterActive?: boolean;
}

export function FacilitySelector({
  value,
  onSelect,
  placeholder = "Select facility...",
  className,
  allowClear = false,
  showDetails = false,
  filterActive = true,
}: FacilitySelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: facilities = [], isLoading } = useFacilities({
    isActive: filterActive ? true : undefined,
  });

  const selectedFacility = facilities.find((f) => f.id === value);

  const handleSelect = (facility: EnhancedFacility | null) => {
    onSelect(facility?.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedFacility ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{getFacilityDisplayName(selectedFacility)}</span>
              {showDetails && selectedFacility.address?.city && (
                <Badge variant="secondary" className="text-xs">
                  {selectedFacility.address.city}, {selectedFacility.address.state}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search facilities..." />
          <CommandEmpty>
            {isLoading ? "Loading facilities..." : "No facilities found."}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {allowClear && selectedFacility && (
              <CommandItem onSelect={() => handleSelect(null)} className="cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-4 h-4" /> {/* Spacer for alignment */}
                  <span className="text-muted-foreground">Clear selection</span>
                </div>
              </CommandItem>
            )}
            {facilities.map((facility) => (
              <CommandItem
                key={facility.id}
                value={`${facility.name} ${facility.facilityType} ${facility.address?.city || ""}`}
                onSelect={() => handleSelect(facility)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === facility.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{facility.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {facility.facilityType}
                    </Badge>
                  </div>
                  {showDetails && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {facility.address
                          ? `${facility.address.street || ""}, ${facility.address.city}, ${facility.address.state}`
                          : "No address"}
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {facility.bedCount} beds
                      </Badge>
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Lightweight version for forms
export function FacilitySelectField({
  value,
  onSelect,
  placeholder = "Select facility...",
  className,
  error,
}: {
  value?: number;
  onSelect: (facilityId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <FacilitySelector
        value={value}
        onSelect={onSelect}
        placeholder={placeholder}
        className={cn("w-full", error && "border-destructive")}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
