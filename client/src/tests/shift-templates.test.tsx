// Frontend tests for Shift Templates system
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ShiftTemplatesPage from "../pages/shift-templates-page";

// Mock the auth hook
vi.mock("../hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "testuser",
      role: "superuser",
      firstName: "Test",
      lastName: "User",
    },
  }),
}));

// Mock the facility hooks
vi.mock("../hooks/use-facility", () => ({
  useFacilities: () => ({
    data: [
      {
        id: 1,
        name: "Portland General Hospital",
        city: "Portland",
        state: "OR",
        facilityType: "hospital",
        isActive: true,
      },
      {
        id: 2,
        name: "OHSU Hospital",
        city: "Portland",
        state: "OR",
        facilityType: "hospital",
        isActive: true,
      },
    ],
    isLoading: false,
  }),
  getFacilityDisplayName: (facility: any) => facility.name,
}));

// Mock the toast hook
vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

const mockTemplates = [
  {
    id: 1,
    name: "ICU Day Shift",
    department: "ICU",
    specialty: "Registered Nurse",
    facilityId: 1,
    facilityName: "Portland General Hospital",
    minStaff: 2,
    maxStaff: 4,
    shiftType: "day",
    startTime: "07:00",
    endTime: "19:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    isActive: true,
    hourlyRate: 45.0,
    daysPostedOut: 14,
    notes: "Primary ICU coverage",
    generatedShiftsCount: 24,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-20T00:00:00Z",
  },
  {
    id: 2,
    name: "Emergency Night Coverage",
    department: "Emergency",
    specialty: "Registered Nurse",
    facilityId: 2,
    facilityName: "OHSU Hospital",
    minStaff: 3,
    maxStaff: 5,
    shiftType: "night",
    startTime: "19:00",
    endTime: "07:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
    hourlyRate: 52.0,
    daysPostedOut: 7,
    notes: "Emergency department coverage",
    generatedShiftsCount: 48,
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: "2025-06-20T00:00:00Z",
  },
];

describe("Shift Templates Page", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset fetch mock
    (fetch as any).mockReset();

    // Mock successful API responses
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates,
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  it("renders the shift templates page correctly", async () => {
    renderWithQueryClient(<ShiftTemplatesPage />);

    expect(screen.getByText("Shift Templates")).toBeInTheDocument();
    expect(
      screen.getByText("Create, manage, and schedule recurring shift patterns")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new template/i })).toBeInTheDocument();
  });

  it("displays templates in the table", async () => {
    renderWithQueryClient(<ShiftTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("ICU Day Shift")).toBeInTheDocument();
      expect(screen.getByText("Emergency Night Coverage")).toBeInTheDocument();
    });

    expect(screen.getByText("Portland General Hospital")).toBeInTheDocument();
    expect(screen.getByText("OHSU Hospital")).toBeInTheDocument();
  });

  it("opens create template dialog when New Template button is clicked", async () => {
    renderWithQueryClient(<ShiftTemplatesPage />);

    const newTemplateButton = screen.getByRole("button", { name: /new template/i });
    fireEvent.click(newTemplateButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create Shift Template")).toBeInTheDocument();
    });
  });

  it("filters templates by search term", async () => {
    renderWithQueryClient(<ShiftTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("ICU Day Shift")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search templates/i);
    fireEvent.change(searchInput, { target: { value: "ICU" } });

    await waitFor(() => {
      expect(screen.getByText("ICU Day Shift")).toBeInTheDocument();
      expect(screen.queryByText("Emergency Night Coverage")).not.toBeInTheDocument();
    });
  });

  it("submits create template form with enhanced facility data", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, ...mockTemplates[0], name: "New Test Template" }),
    });

    renderWithQueryClient(<ShiftTemplatesPage />);

    const newTemplateButton = screen.getByRole("button", { name: /new template/i });
    fireEvent.click(newTemplateButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Fill form fields
    const nameInput = screen.getByLabelText(/template name/i);
    fireEvent.change(nameInput, { target: { value: "New Test Template" } });

    const departmentSelect = screen.getByDisplayValue("");
    fireEvent.change(departmentSelect, { target: { value: "ICU" } });

    // Submit form
    const saveButton = screen.getByRole("button", { name: /save template/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/shift-templates",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("New Test Template"),
        })
      );
    });
  });

  it("displays facility information correctly", async () => {
    renderWithQueryClient(<ShiftTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Portland General Hospital")).toBeInTheDocument();
      expect(screen.getByText("OHSU Hospital")).toBeInTheDocument();
    });

    // Check that facility display names are used correctly
    expect(screen.getByText("Portland General Hospital")).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    (fetch as any).mockRejectedValueOnce(new Error("API Error"));

    renderWithQueryClient(<ShiftTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading templates/i)).toBeInTheDocument();
    });
  });
});
