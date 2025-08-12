import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import our new components
import { 
  CalendarSkeleton, 
  StaffListSkeleton, 
  DashboardStatsSkeleton,
  TableSkeleton 
} from "@/components/LoadingSkeletons";

import { 
  CalendarEmptyState, 
  StaffEmptyState, 
  ErrorState, 
  SearchEmptyState,
  SuccessState
} from "@/components/EmptyStates";

import { QuickFilters, type FilterState } from "@/components/QuickFilters";

import { 
  formatDate, 
  formatTime, 
  formatDateTime, 
  formatRelativeTime, 
  getTimezoneInfo,
  DATE_RANGE_PRESETS,
  formatDuration
} from "@/lib/date-utils";

import { Clock, Users, Calendar, Search, Building } from "lucide-react";

/**
 * Demonstration of all UI quality improvements:
 * - Loading skeletons for better perceived performance
 * - Empty states with helpful messaging and actions
 * - Normalized date/time handling with timezone awareness
 * - Quick filters for efficient data filtering
 */
export function UIImprovementsDemo() {
  const [activeTab, setActiveTab] = useState("loading");
  const [showContent, setShowContent] = useState(false);
  
  // Demo filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    facility: '',
    role: '',
    status: '',
    dateRange: null,
    specialty: '',
    location: '',
  });

  const timezone = getTimezoneInfo();
  const sampleDates = [
    new Date().toISOString(),
    new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    new Date(Date.now() - 86400000 * 7).toISOString(), // Week ago
  ];

  const mockFacilities = [
    { id: 1, name: "Portland General Hospital" },
    { id: 2, name: "OHSU Hospital" },
    { id: 3, name: "Legacy Emanuel" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">UI Quality Improvements</h1>
        <p className="text-muted-foreground">
          Enhanced loading states, empty states, date handling, and quick filters
        </p>
        <Badge variant="secondary" className="text-sm">
          Times displayed in {timezone.abbreviation} ({timezone.offset})
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="loading">Loading States</TabsTrigger>
          <TabsTrigger value="empty">Empty States</TabsTrigger>
          <TabsTrigger value="dates">Date Handling</TabsTrigger>
          <TabsTrigger value="filters">Quick Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="loading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Loading Skeletons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Calendar Loading State</h3>
                <CalendarSkeleton />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Staff List Loading State</h3>
                <StaffListSkeleton />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Dashboard Stats Loading</h3>
                <DashboardStatsSkeleton />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Table Loading State</h3>
                <TableSkeleton rows={4} columns={5} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Empty States & Error Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Calendar Empty State</h3>
                <CalendarEmptyState onCreateShift={() => alert('Create shift clicked!')} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Staff Empty State</h3>
                <StaffEmptyState onAddStaff={() => alert('Add staff clicked!')} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Search Results Empty</h3>
                <SearchEmptyState searchQuery="advanced nurse practitioner" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Error State</h3>
                <ErrorState 
                  title="Failed to load data"
                  description="Connection timeout while fetching staff information."
                  onRetry={() => alert('Retry clicked!')}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Success State</h3>
                <SuccessState 
                  title="All staff profiles updated!"
                  description="Successfully synchronized 45 staff members with the latest data."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Normalized Date/Time Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Date Formatting Examples</h3>
                  <div className="space-y-2 text-sm">
                    {sampleDates.map((date, i) => (
                      <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="font-mono text-xs text-gray-500">
                          {date.slice(0, 19)}
                        </span>
                        <div className="space-y-1 text-right">
                          <div><strong>Short:</strong> {formatDate(date, 'SHORT')}</div>
                          <div><strong>Time:</strong> {formatTime(date)}</div>
                          <div><strong>DateTime:</strong> {formatDateTime(date)}</div>
                          <div><strong>Relative:</strong> {formatRelativeTime(date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Timezone Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-blue-50 rounded">
                      <div><strong>Full Timezone:</strong> {timezone.full}</div>
                      <div><strong>Abbreviation:</strong> {timezone.abbreviation}</div>
                      <div><strong>Offset:</strong> {timezone.offset}</div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-6">Duration Formatting</h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <strong>8-hour shift:</strong> {formatDuration(
                        new Date().toISOString(),
                        new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
                      )}
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <strong>30-minute break:</strong> {formatDuration(
                        new Date().toISOString(),
                        new Date(Date.now() + 30 * 60 * 1000).toISOString()
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Quick Filters Component
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Interactive filters for searching and filtering staff, shifts, and facilities.
                  Try different combinations to see how they work together.
                </p>
                
                <QuickFilters 
                  filters={filters}
                  onFiltersChange={setFilters}
                  facilities={mockFacilities}
                  roles={['staff', 'facility_manager', 'super_admin']}
                  statuses={['active', 'inactive', 'pending']}
                  specialties={['nursing', 'physician', 'tech', 'admin']}
                />

                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Current Filter State:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(filters, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center space-y-2 pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          These improvements enhance user experience with better loading feedback,
          helpful empty states, consistent date formatting, and efficient filtering.
        </p>
      </div>
    </div>
  );
}