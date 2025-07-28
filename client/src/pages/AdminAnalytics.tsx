import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, TrendingUp, Users, MessageSquare, ClipboardList, Building2, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface DateRange {
  from: Date;
  to: Date;
}

interface AnalyticsSummary {
  totalUsers: number;
  totalFacilities: number;
  totalShifts: number;
  totalMessages: number;
  activeUsersToday: number;
  shiftsCreatedToday: number;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface CategoryData {
  category: string;
  count: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [facilityId, setFacilityId] = useState<string>("all");

  // Redirect if not admin
  if (user?.role !== 'super_admin') {
    setLocation("/");
    return null;
  }

  // Fetch analytics summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary", dateRange, facilityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
        ...(facilityId !== "all" && { facilityId }),
      });
      const response = await fetch(`/api/analytics/summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch analytics summary");
      return response.json();
    },
  });

  // Fetch user activity over time
  const { data: userActivity } = useQuery<TimeSeriesData[]>({
    queryKey: ["/api/analytics/user-activity", dateRange, facilityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
        ...(facilityId !== "all" && { facilityId }),
      });
      const response = await fetch(`/api/analytics/user-activity?${params}`);
      if (!response.ok) throw new Error("Failed to fetch user activity");
      return response.json();
    },
  });

  // Fetch shift analytics
  const { data: shiftAnalytics } = useQuery<TimeSeriesData[]>({
    queryKey: ["/api/analytics/shifts", dateRange, facilityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
        ...(facilityId !== "all" && { facilityId }),
      });
      const response = await fetch(`/api/analytics/shifts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch shift analytics");
      return response.json();
    },
  });

  // Fetch message analytics
  const { data: messageAnalytics } = useQuery<TimeSeriesData[]>({
    queryKey: ["/api/analytics/messages", dateRange, facilityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
        ...(facilityId !== "all" && { facilityId }),
      });
      const response = await fetch(`/api/analytics/messages?${params}`);
      if (!response.ok) throw new Error("Failed to fetch message analytics");
      return response.json();
    },
  });

  // Fetch event category breakdown
  const { data: categoryBreakdown } = useQuery<CategoryData[]>({
    queryKey: ["/api/analytics/categories", dateRange, facilityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
        ...(facilityId !== "all" && { facilityId }),
      });
      const response = await fetch(`/api/analytics/categories?${params}`);
      if (!response.ok) throw new Error("Failed to fetch category breakdown");
      return response.json();
    },
  });

  // Fetch facilities for filter
  const { data: facilities } = useQuery({
    queryKey: ["/api/facilities"],
  });

  const handleDateRangeChange = (range: any) => {
    if (range?.from && range?.to) {
      setDateRange({
        from: range.from,
        to: range.to
      });
    }
  };

  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform usage and activity metrics
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Date Range Picker */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(7)}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(30)}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(90)}
              >
                Last 90 days
              </Button>
            </div>

            {/* Facility Filter */}
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {Array.isArray(facilities) && facilities.map((facility: any) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalFacilities || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalShifts || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalMessages || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.activeUsersToday || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shifts Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.shiftsCreatedToday || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Activity Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity Over Time</CardTitle>
            <CardDescription>Daily active users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userActivity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Active Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shifts Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Shifts Created</CardTitle>
            <CardDescription>Daily shift creation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shiftAnalytics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" name="Shifts Created" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Messages Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Messages Sent</CardTitle>
            <CardDescription>Daily messaging activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={messageAnalytics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#F59E0B" name="Messages Sent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
            <CardDescription>Breakdown by event type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) =>
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="category"
                >
                  {(categoryBreakdown || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}