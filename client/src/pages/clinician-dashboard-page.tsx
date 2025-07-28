import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TimeOffSection } from "@/components/TimeOffSection";
import { WorkHistorySection } from "@/components/WorkHistorySection";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { ShiftList } from "@/components/ShiftList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Calendar, Clock, FileText, Users, Search, 
  LogIn, LogOut, DollarSign, TrendingUp, 
  AlertCircle, CheckCircle, Star, Sparkles,
  ClipboardList, Target, UserPlus
} from "lucide-react";
import { useTimeClocks } from "@/contexts/TimeClockContext";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface ClinicianDashboardPageProps {
  hideTimeOff?: boolean;
  additionalContent?: React.ReactNode;
}

export default function ClinicianDashboardPage({
  hideTimeOff = false,
  additionalContent,
}: ClinicianDashboardPageProps = {}) {
  const { user } = useAuth();
  const { currentIn, clockIn, clockOut } = useTimeClocks();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickClockOut, setShowQuickClockOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Check if user is new (first login)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_${user?.id}`);
    if (user && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Fetch real-time dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/employee/dashboard'],
    enabled: !!user,
  });

  // Fetch upcoming shifts
  const { data: upcomingShifts } = useQuery({
    queryKey: ['/api/shifts/my-upcoming'],
    enabled: !!user,
  });

  // Fetch available shifts count
  const { data: availableShifts } = useQuery({
    queryKey: ['/api/shifts/available-count'],
    enabled: !!user,
  });

  const handleQuickClockIn = async () => {
    try {
      await clockIn();
    } catch (error) {
      console.error("Clock in failed:", error);
    }
  };

  const handleQuickClockOut = () => {
    setShowQuickClockOut(true);
  };

  const confirmQuickClockOut = async () => {
    try {
      await clockOut();
      setShowQuickClockOut(false);
    } catch (error) {
      console.error("Clock out failed:", error);
    }
  };

  const handleShiftSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/shifts?search=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation('/shifts');
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(`onboarding_${user?.id}`, 'true');
    setShowOnboarding(false);
  };

  const onboardingSteps = [
    {
      title: "Welcome to NexSpace!",
      description: "We're excited to have you join our healthcare community. Let's get you started with a quick tour.",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Find & Request Shifts",
      description: "Use the search bar to find shifts that match your schedule. Click on any shift to view details and request it.",
      icon: <Search className="w-12 h-12 text-green-500" />
    },
    {
      title: "Clock In & Out",
      description: "Use the quick clock buttons on your dashboard or the time clock page to track your hours accurately.",
      icon: <Clock className="w-12 h-12 text-purple-500" />
    },
    {
      title: "Track Your Progress",
      description: "View your work history, earnings, and compliance status all in one place. Keep your credentials up to date!",
      icon: <TrendingUp className="w-12 h-12 text-orange-500" />
    }
  ];

  if (!user) return <div>Loading...</div>;

  const nextShift = upcomingShifts?.[0];
  const weekHours = dashboardData?.weekHours || 0;
  const availableCount = availableShifts?.count || 0;
  const earnings = dashboardData?.monthlyEarnings || 0;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentIn ? "You're currently clocked in" : "Ready for your next shift?"}
              </p>
            </div>
            
            {/* Quick Clock In/Out */}
            <div className="flex gap-3">
              {currentIn ? (
                <Button 
                  onClick={handleQuickClockOut}
                  variant="destructive"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Clock Out
                </Button>
              ) : (
                <Button 
                  onClick={handleQuickClockIn}
                  size="lg"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="w-4 h-4" />
                  Clock In
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Shift Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search for shifts by department, specialty, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleShiftSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleShiftSearch}>
                Search Shifts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats with Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/shifts')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Shift</p>
                  <p className="text-lg font-semibold">
                    {nextShift ? (
                      <>
                        {format(new Date(nextShift.date), 'MMM d')} at {nextShift.startTime}
                      </>
                    ) : (
                      "No upcoming shifts"
                    )}
                  </p>
                  {nextShift && (
                    <p className="text-xs text-gray-500">{nextShift.department}</p>
                  )}
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/timesheets')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-lg font-semibold">{weekHours} hours</p>
                  <p className="text-xs text-gray-500">View timesheet</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/shifts')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Shifts</p>
                  <p className="text-lg font-semibold">{availableCount} available</p>
                  <Badge variant="secondary" className="mt-1">View all</Badge>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-lg font-semibold">${earnings.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Earnings</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => setLocation('/shifts')} className="justify-start">
                <Search className="w-4 h-4 mr-2" />
                Find Shifts
              </Button>
              <Button variant="outline" onClick={() => setLocation('/time-clock')} className="justify-start">
                <Clock className="w-4 h-4 mr-2" />
                Time Clock
              </Button>
              <Button variant="outline" onClick={() => setLocation('/timesheets')} className="justify-start">
                <ClipboardList className="w-4 h-4 mr-2" />
                Timesheets
              </Button>
              <Button variant="outline" onClick={() => setLocation('/profile')} className="justify-start">
                <UserPlus className="w-4 h-4 mr-2" />
                My Profile
              </Button>
            </div>
          </CardContent>
        </Card>

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

      {/* Quick Clock Out Dialog */}
      <Dialog open={showQuickClockOut} onOpenChange={setShowQuickClockOut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Clock Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to clock out now? Your hours will be automatically calculated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowQuickClockOut(false)}>
              Cancel
            </Button>
            <Button onClick={confirmQuickClockOut} variant="destructive">
              Clock Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-4">
            {onboardingSteps[onboardingStep].icon}
            <DialogHeader>
              <DialogTitle className="text-xl">
                {onboardingSteps[onboardingStep].title}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {onboardingSteps[onboardingStep].description}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <div className="flex gap-1">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === onboardingStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-3">
              {onboardingStep > 0 && (
                <Button variant="outline" onClick={() => setOnboardingStep(onboardingStep - 1)}>
                  Back
                </Button>
              )}
              {onboardingStep < onboardingSteps.length - 1 ? (
                <Button onClick={() => setOnboardingStep(onboardingStep + 1)}>
                  Next
                </Button>
              ) : (
                <Button onClick={completeOnboarding}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
