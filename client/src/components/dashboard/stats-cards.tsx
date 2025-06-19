import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Calendar, Shield, Clock } from 'lucide-react';

interface StatsData {
  activeStaff: number;
  openShifts: number;
  complianceRate: number;
  monthlyHours: number;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gray-200 w-12 h-12"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Unable to load statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Active Staff Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeStaff}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Shifts Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open Shifts</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.openShifts}
              </p>
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                5 urgent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Rate */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Compliance Rate
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.complianceRate}%
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                All critical items
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Hours */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.monthlyHours.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                823 OT hours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
