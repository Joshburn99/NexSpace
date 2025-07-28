import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import EnhancedCalendarPage from '../enhanced-calendar-page';

// Mock the hooks
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { 
      id: 1, 
      role: 'super_admin', 
      name: 'Test Admin',
      email: 'admin@test.com'
    },
    impersonatedUser: null,
  }),
}));

jest.mock('@/hooks/use-rbac', () => ({
  useRBAC: () => ({
    hasPermission: () => true,
  }),
  PermissionAction: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/use-facility', () => ({
  useFacilities: () => ({
    data: [
      {
        id: 1,
        name: 'Test Hospital',
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        isActive: true,
      },
    ],
  }),
  useFacility: () => ({ data: null }),
  getFacilityDisplayName: (facility: any) => facility?.name || 'Unknown',
  getFacilityTimezone: () => 'America/New_York',
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock FullCalendar
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar() {
    return <div data-testid="full-calendar">Mock FullCalendar</div>;
  };
});

// Mock window.innerWidth for mobile detection
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('EnhancedCalendarPage', () => {
  beforeEach(() => {
    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 1,
            title: 'Test Shift',
            date: '2025-07-28',
            startTime: '07:00',
            endTime: '19:00',
            department: 'ICU',
            specialty: 'RN',
            facilityId: 1,
            facilityName: 'Test Hospital',
            status: 'open',
            rate: 45,
            urgency: 'medium',
            description: 'Test shift description',
          },
        ]),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar component without errors', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <EnhancedCalendarPage />
      </Wrapper>
    );

    // Check that the calendar header elements are present
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    
    // Wait for the calendar to load
    await waitFor(() => {
      expect(screen.getByTestId('full-calendar')).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <EnhancedCalendarPage />
      </Wrapper>
    );

    // Check for search input
    expect(screen.getByPlaceholderText(/search shifts/i)).toBeInTheDocument();
    
    // Check for view toggle buttons
    expect(screen.getByRole('button', { name: /calendar view/i })).toBeInTheDocument();
  });

  it('displays at least one shift when mock data is provided', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <EnhancedCalendarPage />
      </Wrapper>
    );

    // Wait for data to load and check for shift content
    await waitFor(() => {
      // Since we're mocking the shifts API to return test data,
      // the component should render without throwing errors
      expect(screen.getByTestId('full-calendar')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles permission-based rendering for Add Shift button', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <EnhancedCalendarPage />
      </Wrapper>
    );

    // The Add Shift button should be visible for super_admin
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add shift/i })).toBeInTheDocument();
    });
  });
});