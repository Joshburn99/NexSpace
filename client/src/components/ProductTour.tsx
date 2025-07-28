import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Welcome to NexSpace!</h3>
        <p>Let's take a quick tour of the platform's key features. You can skip this tour at any time by clicking the Skip button.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[href="/dashboard"], [href="/"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Dashboard</h3>
        <p>Your dashboard provides a real-time overview of staff, shifts, compliance, and key metrics. All information updates automatically.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/calendar"], [href*="/schedule"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Scheduling Calendar</h3>
        <p>View and manage all shifts in one place. Click on any date to create new shifts, and drag shifts to reschedule them.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/messaging"], [href*="/messages"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Messaging Center</h3>
        <p>Send and receive messages with your team. Real-time notifications keep you connected with staff and facility managers.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/staff"], [href*="/workforce"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Staff Management</h3>
        <p>Manage your workforce, view credentials, track compliance, and handle staff assignments all in one place.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/facility"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Facility Management</h3>
        <p>Configure facility settings, manage users, set up automation rules, and track facility-specific metrics.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/analytics"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
        <p>Access comprehensive analytics on shifts, overtime, compliance, and more. Export reports for deeper analysis.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/shift-templates"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Shift Templates</h3>
        <p>Create recurring shift patterns to automate scheduling. Set up templates once and generate shifts automatically.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[href*="/billing"], [href*="/invoices"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Billing & Invoices</h3>
        <p>Manage billing rates, review invoices, and track payments. Automated calculations ensure accuracy.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.user-menu, [aria-label*="User menu"]',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">User Profile</h3>
        <p>Access your profile settings, preferences, and logout options from the user menu.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Tour Complete!</h3>
        <p>You've completed the tour! You can always restart it by clicking the Help button. Explore NexSpace and discover more features!</p>
      </div>
    ),
    placement: 'center',
  },
];

export function ProductTour() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  
  // Check if user has completed the tour before
  useEffect(() => {
    if (user) {
      const tourCompleted = localStorage.getItem(`nexspace_tour_completed_${user.id}`);
      const isNewUser = !tourCompleted && !user.onboardingCompleted;
      
      // Show tour for new users after a short delay
      if (isNewUser) {
        setTimeout(() => {
          setRun(true);
        }, 1500);
      }
    }
  }, [user]);

  // Listen for custom event to start tour
  useEffect(() => {
    const handleStartTour = () => {
      setRun(true);
      setStepIndex(0);
    };

    window.addEventListener('startProductTour', handleStartTour);
    return () => {
      window.removeEventListener('startProductTour', handleStartTour);
    };
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      // Mark tour as completed
      if (user) {
        localStorage.setItem(`nexspace_tour_completed_${user.id}`, 'true');
      }
      setRun(false);
      setStepIndex(0);
    } else if (type === 'step:after') {
      // Handle navigation for certain steps
      const step = tourSteps[index];
      
      // Navigate to appropriate page if needed
      if (typeof step.target === 'string') {
        if (step.target.includes('calendar') && !location.includes('calendar')) {
          setLocation('/calendar');
        } else if (step.target.includes('messaging') && !location.includes('messaging')) {
          setLocation('/messaging');
        } else if (step.target.includes('staff') && !location.includes('staff')) {
          setLocation('/staff');
        } else if (step.target.includes('analytics') && !location.includes('analytics')) {
          setLocation('/analytics');
        }
      }
      
      setStepIndex(index + 1);
    }
  };

  const startTour = () => {
    setRun(true);
    setStepIndex(0);
  };

  return (
    <>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        run={run}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={stepIndex}
        steps={tourSteps}
        styles={{
          options: {
            primaryColor: '#3b82f6',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '0.5rem',
            padding: '1rem',
          },
          buttonNext: {
            backgroundColor: '#3b82f6',
            borderRadius: '0.375rem',
            color: '#ffffff',
            padding: '0.5rem 1rem',
          },
          buttonBack: {
            color: '#6b7280',
            marginRight: '0.5rem',
          },
          buttonSkip: {
            color: '#6b7280',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
      

    </>
  );
}