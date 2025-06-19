import { useAuth } from '@/hooks/use-auth';

import { TimeOffSection } from '@/components/TimeOffSection';
import { WorkHistorySection } from '@/components/WorkHistorySection';
import { ResourceLibrary } from '@/components/ResourceLibrary';
import { ShiftList } from '@/components/ShiftList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, FileText, Users } from 'lucide-react';

interface ClinicianDashboardPageProps {
  hideTimeOff?: boolean;
  additionalContent?: React.ReactNode;
}

export default function ClinicianDashboardPage({
  hideTimeOff = false,
  additionalContent,
}: ClinicianDashboardPageProps = {}) {
  const { user } = useAuth();

  if (!user) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Next Shift
                  </p>
                  <p className="text-lg font-semibold">Tomorrow 8:00 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-lg font-semibold">32 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Open Shifts
                  </p>
                  <p className="text-lg font-semibold">12 available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Resources</p>
                  <p className="text-lg font-semibold">View Library</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {!hideTimeOff && <TimeOffSection />}
            {additionalContent}
            <WorkHistorySection />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ShiftList status="upcoming" />
            <ShiftList status="open" />
            <ResourceLibrary />
          </div>
        </div>
      </div>
    </div>
  );
}
