import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// Note: Using react-day-picker directly since @radix-ui/react-calendar doesn't exist
// import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarIcon, 
  Filter, 
  X, 
  Search,
  Building2,
  Users,
  Clock,
  MapPin
} from "lucide-react";
import { formatDate, DATE_RANGE_PRESETS } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export interface FilterState {
  search: string;
  facility: string;
  role: string;
  status: string;
  dateRange: { start: Date | null; end: Date | null } | null;
  specialty: string;
  location: string;
}

interface QuickFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  facilities?: Array<{ id: number; name: string }>;
  roles?: string[];
  statuses?: string[];
  specialties?: string[];
  className?: string;
}

const DEFAULT_ROLES = ['staff', 'facility_manager', 'super_admin'];
const DEFAULT_STATUSES = ['active', 'inactive', 'pending'];
const DEFAULT_SPECIALTIES = ['nursing', 'physician', 'tech', 'admin'];

export function QuickFilters({
  filters,
  onFiltersChange,
  facilities = [],
  roles = DEFAULT_ROLES,
  statuses = DEFAULT_STATUSES,
  specialties = DEFAULT_SPECIALTIES,
  className = ""
}: QuickFiltersProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.facility) count++;
    if (filters.role) count++;
    if (filters.status) count++;
    if (filters.dateRange) count++;
    if (filters.specialty) count++;
    if (filters.location.trim()) count++;
    return count;
  }, [filters]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      facility: '',
      role: '',
      status: '',
      dateRange: null,
      specialty: '',
      location: '',
    });
  };

  const setDateRangePreset = (preset: keyof typeof DATE_RANGE_PRESETS) => {
    const range = DATE_RANGE_PRESETS[preset]();
    updateFilter('dateRange', range);
    setIsDatePickerOpen(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and primary filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search staff, shifts, or facilities..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Facility Filter */}
          {facilities.length > 0 && (
            <Select value={filters.facility} onValueChange={(value) => updateFilter('facility', value)}>
              <SelectTrigger className="w-40">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Facilities</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Role Filter */}
          <Select value={filters.role} onValueChange={(value) => updateFilter('role', value)}>
            <SelectTrigger className="w-36">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal",
                  !filters.dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange ? (
                  <>
                    {formatDate(filters.dateRange.start, 'SHORT')} -{' '}
                    {formatDate(filters.dateRange.end, 'SHORT')}
                  </>
                ) : (
                  "Date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-2 border-b">
                <Label className="text-sm font-medium">Quick presets:</Label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('today')}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('thisWeek')}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('thisMonth')}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('next7Days')}
                  >
                    Next 7 Days
                  </Button>
                </div>
              </div>
              {/* Calendar component will be implemented when available */}
              <div className="p-4 text-sm text-gray-500">
                Calendar date picker will be available once UI components are properly configured.
              </div>
            </PopoverContent>
          </Popover>

          {/* More filters popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Additional Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Specialty Filter */}
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={filters.specialty} onValueChange={(value) => updateFilter('specialty', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Specialties</SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={(e) => updateFilter('location', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters button */}
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search.trim() && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('search', '')} 
              />
            </Badge>
          )}
          
          {filters.facility && (
            <Badge variant="secondary" className="gap-1">
              Facility: {facilities.find(f => f.id.toString() === filters.facility)?.name || filters.facility}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('facility', '')} 
              />
            </Badge>
          )}
          
          {filters.role && (
            <Badge variant="secondary" className="gap-1">
              Role: {filters.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('role', '')} 
              />
            </Badge>
          )}
          
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('status', '')} 
              />
            </Badge>
          )}
          
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              Date: {formatDate(filters.dateRange.start, 'SHORT')} - {formatDate(filters.dateRange.end, 'SHORT')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('dateRange', null)} 
              />
            </Badge>
          )}
          
          {filters.specialty && (
            <Badge variant="secondary" className="gap-1">
              Specialty: {filters.specialty.charAt(0).toUpperCase() + filters.specialty.slice(1)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('specialty', '')} 
              />
            </Badge>
          )}
          
          {filters.location.trim() && (
            <Badge variant="secondary" className="gap-1">
              Location: {filters.location}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('location', '')} 
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}