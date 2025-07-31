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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  FileText,
  Users,
  Search,
  LogIn,
  LogOut,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Star,
  Sparkles,
  ClipboardList,
  Target,
  UserPlus,
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
    queryKey: ["/api/employee/dashboard"],
    enabled: !!user,
  });

  // Fetch upcoming shifts
  const { data: upcomingShifts } = useQuery({
    queryKey: ["/api/shifts/my-upcoming"],
    enabled: !!user,
  });

  // Fetch available shifts count
  const { data: availableShifts } = useQuery({
    queryKey: ["/api/shifts/available-count"],
    enabled: !!user,
  });

  const handleQuickClockIn = async () => {
    try {
      await clockIn();
    } catch (error) {

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

    }
  };

  const handleShiftSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/shifts?search=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation("/shifts");
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(`onboarding_${user?.id}`, "true");
    setShowOnboarding(false);
  };

  const onboardingSteps = [
    {
      title: "Welcome to NexSpace!",
      description:
        "We're excited to have you join our healthcare community. Let's get you started with a quick tour.",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />,
    },
    {
      title: "Find & Request Shifts",
      description:
        "Use the search bar to find shifts that match your schedule. Click on any shift to view details and request it.",
      icon: <Search className="w-12 h-12 text-green-500" />,
    },
    {
      title: "Clock In & Out",
      description:
        "Use the quick clock buttons on your dashboard or the time clock page to track your hours accurately.",
      icon: <Clock className="w-12 h-12 text-purple-500" />,
    },
    {
      title: "Track Your Progress",
      description:
        "View your work history, earnings, and compliance status all in one place. Keep your credentials up to date!",
      icon: <TrendingUp className="w-12 h-12 text-orange-500" />,
    },
  ];

  if (!user) return <div>Loading...</div>;

  const nextShift = upcomingShifts?.[0];
  const weekHours = dashboardData?.weekHours || 0;
  const availableCount = availableShifts?.count || 0;
  const earnings = dashboardData?.monthlyEarnings || 0;

  return (
    <div className="w-full">
      <div className="space-y-4 md:space-y-6">
        {/* Welcome Header - Mobile Optimized */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                {currentIn ? "You're currently clocked in" : "Ready for your next shift?"}
              </p>
            </div>

            {/* Quick Clock In/Out - Touch Friendly */}
            <div className="flex gap-3">
              {currentIn ? (
                <Button
                  onClick={handleQuickClockOut}
                  variant="destructive"
                  size="lg"
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Clock Out</span>
                </Button>
              ) : (
                <Button
                  onClick={handleQuickClockIn}
                  size="lg"
                  className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 min-h-[44px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Clock In</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Shift Search - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search shifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleShiftSearch()}
                  className="pl-10 min-h-[44px]"
                />
              </div>
              <Button onClick={handleShiftSearch} className="w-full md:w-auto min-h-[44px]">
                <Search className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Search Shifts</span>
                <span className="md:hidden">Search</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats with Real Data - Mobile Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer touch-manipulation"
            onClick={() => setLocation("/shifts")}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Next Shift</p>
                  <p className="text-sm md:text-lg font-semibold line-clamp-2">
                    {nextShift ? (
                      <>
                        {format(new Date(nextShift.date), "MMM d")}
                        <span className="block text-xs md:text-sm">{nextShift.startTime}</span>
                      </>
                    ) : (
                      "No shifts"
                    )}
                  </p>
                  {nextShift && (
                    <p className="text-xs text-gray-500 truncate">{nextShift.department}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer touch-manipulation"
            onClick={() => setLocation("/timesheets")}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-sm md:text-lg font-semibold">{weekHours} hours</p>
                  <p className="text-xs text-gray-500">View timesheet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer touch-manipulation"
            onClick={() => setLocation("/shifts")}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Open Shifts</p>
                  <p className="text-sm md:text-lg font-semibold">{availableCount} available</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    View all
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow touch-manipulation">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-sm md:text-lg font-semibold">${earnings.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Target className="w-4 h-4 md:w-5 md:h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <Button
                variant="outline"
                onClick={() => setLocation("/shifts")}
                className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 p-3 md:p-2 min-h-[60px] md:min-h-[44px]"
              >
                <Search className="w-5 h-5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Find Shifts</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/time-clock")}
                className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 p-3 md:p-2 min-h-[60px] md:min-h-[44px]"
              >
                <Clock className="w-5 h-5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Time Clock</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/timesheets")}
                className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 p-3 md:p-2 min-h-[60px] md:min-h-[44px]"
              >
                <ClipboardList className="w-5 h-5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Timesheets</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/profile")}
                className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 p-3 md:p-2 min-h-[60px] md:min-h-[44px]"
              >
                <UserPlus className="w-5 h-5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">My Profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid - Mobile Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Mobile: All sections stack, Desktop: Left column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {!hideTimeOff && <TimeOffSection />}
            {additionalContent}

            {/* Show upcoming shifts on mobile in main column */}
            <div className="lg:hidden">
              <ShiftList status="upcoming" />
            </div>

            <WorkHistorySection />

            {/* Show other sections on mobile in main column */}
            <div className="lg:hidden space-y-4">
              <ShiftList status="open" />
              <ResourceLibrary />
            </div>
          </div>

          {/* Right Column - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block space-y-6">
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
              <DialogTitle className="text-xl">{onboardingSteps[onboardingStep].title}</DialogTitle>
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
                    index === onboardingStep ? "bg-blue-600" : "bg-gray-300"
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
                <Button onClick={() => setOnboardingStep(onboardingStep + 1)}>Next</Button>
              ) : (
                <Button onClick={completeOnboarding}>Get Started</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
