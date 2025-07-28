import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  MobileContainer, 
  MobileStatsGrid, 
  MobileActionButtons,
  mobileSpacing,
  mobileBreakpoints 
} from "@/components/mobile-responsive-layout";
import { DataWrapper } from "@/components/enhanced-loading-states";
import { EnhancedDataTable } from "@/components/enhanced-data-table";
import { useApiData, useRealTimeData } from "@/components/enhanced-data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  Building2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnhancedFacilityDashboard() {
  // Real-time data with enhanced error handling
  const { data: dashboardStats, isLoading: statsLoading, isError: statsError } = useApiData<any>(
    '/api/dashboard/stats',
    { staleTime: 30000 } // 30 second cache
  );

  const { data: recentShifts, isLoading: shiftsLoading } = useRealTimeData<any[]>(
    '/api/shifts/recent',
    'shift_update'
  );

  const { data: facilities, isLoading: facilitiesLoading } = useApiData<any[]>(
    '/api/facilities'
  );

  // Mobile-optimized stats
  const stats = [
    {
      label: "Active Staff",
      value: dashboardStats?.activeStaff || "0",
      change: "+12%",
      trend: "up" as const,
      icon: Users
    },
    {
      label: "Open Shifts",
      value: dashboardStats?.openShifts || "0",
      change: "-3%",
      trend: "down" as const,
      icon: Calendar
    },
    {
      label: "Urgent Needs",
      value: dashboardStats?.urgentShifts || "0",
      change: "+5%",
      trend: "up" as const,
      icon: AlertTriangle
    },
    {
      label: "Monthly Revenue",
      value: `$${(dashboardStats?.monthlyRevenue || 0).toLocaleString()}`,
      change: "+8%",
      trend: "up" as const,
      icon: DollarSign
    }
  ];

  // Enhanced table columns for mobile
  const shiftColumns = [
    {
      key: 'title' as const,
      title: 'Shift',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-sm">{value}</p>
          <p className="text-xs text-gray-500">{row.facility}</p>
        </div>
      )
    },
    {
      key: 'specialty' as const,
      title: 'Type',
      render: (value: string) => (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      )
    },
    {
      key: 'status' as const,
      title: 'Status',
      render: (value: string) => (
        <Badge 
          variant={value === 'open' ? 'destructive' : 'default'}
          className="text-xs"
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'hourlyRate' as const,
      title: 'Rate',
      render: (value: number) => `$${value}/hr`
    }
  ];

  // Mobile-friendly actions
  const quickActions = [
    {
      label: "Add Shift",
      onClick: () => window.location.href = "/enhanced-calendar",
      variant: "default" as const,
      icon: Plus
    },
    {
      label: "View Staff",
      onClick: () => window.location.href = "/staff-directory", 
      variant: "outline" as const,
      icon: Users
    },
    {
      label: "Facilities",
      onClick: () => window.location.href = "/enhanced-facilities",
      variant: "outline" as const,
      icon: Building2
    },
    {
      label: "Refresh",
      onClick: () => window.location.reload(),
      variant: "ghost" as const,
      icon: RefreshCw
    }
  ];

  return (
    <MobileContainer className={mobileSpacing.section}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className={cn("font-bold text-gray-900 mb-2", mobileBreakpoints.heading)}>
          Facility Dashboard
        </h1>
        <p className={cn("text-gray-600", mobileBreakpoints.body)}>
          Real-time overview of your healthcare facility operations
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="mb-8">
        <DataWrapper
          isLoading={statsLoading}
          isError={statsError}
          isEmpty={!dashboardStats}
        >
          <MobileStatsGrid stats={stats} columns={2} />
        </DataWrapper>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <MobileActionButtons 
            actions={quickActions}
            orientation="horizontal"
          />
        </CardContent>
      </Card>

      {/* Recent Shifts Table */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <DataWrapper
            isLoading={shiftsLoading}
            isError={false}
            isEmpty={!recentShifts?.length}
          >
            <EnhancedDataTable
              data={recentShifts || []}
              columns={shiftColumns}
              searchable={true}
              pageSize={5}
              className="border-0"
              emptyStateTitle="No recent shifts"
              emptyStateDescription="Create your first shift to get started"
            />
          </DataWrapper>
        </CardContent>
      </Card>

      {/* Facility Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Facilities ({facilities?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataWrapper
            isLoading={facilitiesLoading}
            isError={false}
            isEmpty={!facilities?.length}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {facilities?.slice(0, 4).map((facility: any) => (
                <div 
                  key={facility.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/facilities/${facility.id}`}
                >
                  <h4 className="font-medium text-gray-900">{facility.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{facility.type}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-xs">
                      {facility.bedCount || 0} beds
                    </Badge>
                    <Badge 
                      variant={facility.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {facility.status || 'active'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            {facilities && facilities.length > 4 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = "/enhanced-facilities"}
                >
                  View All Facilities ({facilities.length})
                </Button>
              </div>
            )}
          </DataWrapper>
        </CardContent>
      </Card>
    </MobileContainer>
  );
}