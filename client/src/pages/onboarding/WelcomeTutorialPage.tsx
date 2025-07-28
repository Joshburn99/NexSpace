import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar,
  MessageSquare,
  Clock,
  DollarSign,
  Award,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  BookOpen,
  Target,
  Sparkles,
  Bell,
  Map,
  FileText
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  completed: boolean;
  points: number;
}

export default function WelcomeTutorialPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTour, setShowTour] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      id: "view-shifts",
      title: "Browse Available Shifts",
      description: "Explore open shifts that match your specialty and preferences",
      icon: <Calendar className="h-5 w-5" />,
      action: "Let's find your first shift",
      completed: false,
      points: 10
    },
    {
      id: "request-shift",
      title: "Request Your First Shift",
      description: "Submit a shift request with just one click",
      icon: <Target className="h-5 w-5" />,
      action: "Try requesting a shift",
      completed: false,
      points: 20
    },
    {
      id: "complete-profile",
      title: "Complete Your Profile",
      description: "Add your photo and bio to stand out to facilities",
      icon: <Users className="h-5 w-5" />,
      action: "Enhance your profile",
      completed: false,
      points: 15
    },
    {
      id: "setup-notifications",
      title: "Set Up Notifications",
      description: "Get instant alerts for shifts matching your criteria",
      icon: <Bell className="h-5 w-5" />,
      action: "Configure alerts",
      completed: false,
      points: 10
    },
    {
      id: "explore-messages",
      title: "Check Your Messages",
      description: "See how to communicate with facilities and colleagues",
      icon: <MessageSquare className="h-5 w-5" />,
      action: "Open message center",
      completed: false,
      points: 10
    }
  ];

  const totalPoints = tutorialSteps.reduce((acc, step) => acc + step.points, 0);
  const earnedPoints = tutorialSteps
    .filter(step => completedSteps.includes(step.id))
    .reduce((acc, step) => acc + step.points, 0);

  const progressPercentage = (earnedPoints / totalPoints) * 100;

  const handleStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <Sparkles className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to NexSpace, Sarah! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Your documents are verified and you're ready to start working
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Shifts</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Hourly Rate</p>
                  <p className="text-2xl font-bold">$45</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nearby Facilities</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Map className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Profile Score</p>
                  <p className="text-2xl font-bold">85%</p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Progress */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Onboarding Journey</CardTitle>
                <CardDescription>
                  Complete these steps to unlock all platform features
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{earnedPoints}/{totalPoints}</p>
                <p className="text-sm text-gray-600">points earned</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3 mb-6" />
            
            <div className="space-y-4">
              {tutorialSteps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = index === currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all
                      ${isCompleted ? "bg-green-50 border-green-200" : 
                        isCurrent ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        isCompleted ? "bg-green-100 text-green-700" :
                        isCurrent ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        +{step.points} pts
                      </Badge>
                      {!isCompleted && (
                        <Button
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          onClick={() => {
                            setCurrentStep(index);
                            // In real app, this would navigate to the actual feature
                            handleStepComplete(step.id);
                          }}
                        >
                          {step.action}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completion Reward */}
            {progressPercentage === 100 && (
              <Alert className="mt-6 bg-green-50 border-green-200">
                <Award className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Congratulations!</strong> You've completed onboarding and earned a 
                  <span className="font-bold"> $50 bonus</span> that will be added to your first paycheck!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Watch Platform Tour</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    3-minute video walkthrough of key features
                  </p>
                  <Button variant="link" className="p-0 h-auto">
                    Start watching →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Read Getting Started Guide</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Everything you need to know about working with NexSpace
                  </p>
                  <Button variant="link" className="p-0 h-auto">
                    Open guide →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pro Tips */}
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-white">💡 Pro Tips for Success</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Respond to shift requests within 2 hours for higher acceptance rates
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Keep your credentials updated to avoid missing opportunities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Build relationships with facilities for more consistent work
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button size="lg" variant="outline">
            I'll explore on my own
          </Button>
          <Button size="lg" className="gap-2">
            Find my first shift
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}