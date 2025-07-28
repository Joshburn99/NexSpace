import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Users, MapPin, Search } from "lucide-react";

// Import our TypeScript interfaces and utilities
import type { Shift, Facility, User, ShiftFilters } from "../types";
import {
  mockShifts,
  mockFacilities,
  mockUsers,
  getShiftsWithDetails,
  getDashboardData,
} from "../data";
import {
  getShiftsForDate,
  isShiftFilled,
  groupShiftsBySpecialty,
  getShiftStaffingRatio,
  getUnderStaffedShifts,
  formatShiftTime,
  sortShiftsByDateTime,
} from "../utils/shiftUtils";
import { getUserFullName } from "../utils/userUtils";
import { getFacilityById } from "../utils/facilityUtils";

const ShiftDashboard: React.FC = () => {
  // State for filters and search
  const [filters, setFilters] = useState<ShiftFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Get enhanced shifts data using our utilities
  const shiftsWithDetails = useMemo(() => getShiftsWithDetails(), []);
  const dashboardData = useMemo(() => getDashboardData(), []);

  // Apply filters and search to shifts
  const filteredShifts = useMemo(() => {
    let filtered = [...mockShifts];

    // Apply filters
    if (filters.facilityId) {
      filtered = filtered.filter((shift) => shift.facilityId === filters.facilityId);
    }
    if (filters.specialty) {
      filtered = filtered.filter((shift) => shift.specialty === filters.specialty);
    }
    if (filters.status) {
      filtered = filtered.filter((shift) => shift.status === filters.status);
    }

    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (shift) =>
          shift.title.toLowerCase().includes(lowerSearch) ||
          shift.specialty.toLowerCase().includes(lowerSearch) ||
          (shift.description && shift.description.toLowerCase().includes(lowerSearch))
      );
    }

    return sortShiftsByDateTime(filtered);
  }, [filters, searchTerm]);

  // Get shifts for selected date
  const todayShifts = useMemo(
    () => getShiftsForDate(filteredShifts, selectedDate),
    [filteredShifts, selectedDate]
  );

  // Group shifts by specialty for the selected date
  const shiftsBySpecialty = useMemo(() => groupShiftsBySpecialty(todayShifts), [todayShifts]);

  // Get understaffed shifts
  const understaffedShifts = useMemo(() => getUnderStaffedShifts(todayShifts), [todayShifts]);

  const handleFilterChange = (key: keyof ShiftFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.shifts.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboardData.shifts.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fill Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.shifts.fillRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.Staff.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.facilityId || ""}
              onValueChange={(value) => handleFilterChange("facilityId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Facilities</SelectItem>
                {mockFacilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.specialty || ""}
              onValueChange={(value) => handleFilterChange("specialty", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Specialties</SelectItem>
                <SelectItem value="RN">RN</SelectItem>
                <SelectItem value="LPN">LPN</SelectItem>
                <SelectItem value="CNA">CNA</SelectItem>
                <SelectItem value="RT">RT</SelectItem>
                <SelectItem value="PT">PT</SelectItem>
                <SelectItem value="CST">CST</SelectItem>
                <SelectItem value="LabTech">Lab Tech</SelectItem>
                <SelectItem value="PharmTech">Pharmacy Tech</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status || ""}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <div className="flex items-center gap-4">
        <label htmlFor="date-select" className="text-sm font-medium">
          View Date:
        </label>
        <Input
          id="date-select"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">{todayShifts.length} shifts found</span>
      </div>

      {/* Understaffed Shifts Alert */}
      {understaffedShifts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">⚠️ Understaffed Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-2">
              {understaffedShifts.length} shifts need additional staff
            </p>
            <div className="space-y-1">
              {understaffedShifts.slice(0, 3).map((shift) => {
                const staffing = getShiftStaffingRatio(shift);
                const facility = getFacilityById(mockFacilities, shift.facilityId);
                return (
                  <div key={shift.id} className="text-sm">
                    <strong>{shift.title}</strong> at {facility?.name} - Staffed {staffing.ratio} (
                    {staffing.needsStaff} needed)
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts by Specialty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(shiftsBySpecialty).map(([specialty, shifts], idx) => (
          <Card key={`${specialty}-${idx}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {specialty} Shifts
                <Badge variant="secondary">{shifts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shifts.map((shift) => {
                  const staffing = getShiftStaffingRatio(shift);
                  const facility = getFacilityById(mockFacilities, shift.facilityId);
                  const assignedWorkers = mockUsers.filter((user) =>
                    shift.assignedWorkerIds.includes(user.id)
                  );

                  return (
                    <div key={shift.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{shift.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {facility?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={staffing.isFullyStaffed ? "default" : "destructive"}
                            className="mb-1"
                          >
                            {staffing.ratio}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{formatShiftTime(shift)}</p>
                        </div>
                      </div>

                      {assignedWorkers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Assigned Workers:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedWorkers.map((worker) => (
                              <Badge key={worker.id} variant="outline" className="text-xs">
                                {getUserFullName(worker)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {shift.payRate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Rate: ${shift.payRate}/hour
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ShiftDashboard;
