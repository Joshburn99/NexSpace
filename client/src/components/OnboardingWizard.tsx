import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, User, Building, UserPlus, Calendar, X, ChevronRight, Check } from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingData {
  // Step 1: Profile
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  title?: string;

  // Step 2: Facility/Team
  facilityId?: number;
  facilityName?: string;
  teamName?: string;

  // Step 3: Invite Staff
  invites?: Array<{
    email: string;
    role: string;
    name: string;
  }>;

  // Step 4: First Shift
  shiftTitle?: string;
  shiftDate?: string;
  shiftTime?: string;
}

const steps = [
  { id: 1, title: "Complete Your Profile", icon: User },
  { id: 2, title: "Set Up Facility/Team", icon: Building },
  { id: 3, title: "Invite Staff", icon: UserPlus },
  { id: 4, title: "Schedule First Shift", icon: Calendar },
];

// Form schemas for each step
const profileSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s()-]+$/.test(val), {
      message: "Please enter a valid phone number",
    })
    .refine((val) => !val || val.replace(/\D/g, '').length >= 10, {
      message: "Phone number must have at least 10 digits",
    }),
  department: z.string()
    .optional()
    .refine((val) => !val || val.length <= 100, {
      message: "Department must be less than 100 characters",
    }),
  title: z.string()
    .optional()
    .refine((val) => !val || val.length <= 100, {
      message: "Title must be less than 100 characters",
    }),
});

const facilitySchema = z
  .object({
    facilityId: z.number().optional(),
    facilityName: z.string().optional(),
    teamName: z.string().optional(),
    isCreatingNew: z.boolean().optional(),
  })
  .refine((data) => {
    // If creating new, facility name is required
    if (data.isCreatingNew) {
      return data.facilityName && data.facilityName.trim().length > 0;
    }
    // If joining existing, facility ID is required
    return data.facilityId !== undefined && data.facilityId !== null;
  }, {
    message: "Please select a facility or provide a facility name",
  });

const inviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z.string().min(1, "Role is required"),
        name: z.string().min(1, "Name is required"),
      })
    )
    .optional(),
});

const shiftSchema = z.object({
  shiftTitle: z.string()
    .min(1, "Shift title is required")
    .max(100, "Shift title must be less than 100 characters"),
  shiftDate: z.string()
    .min(1, "Date is required")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, "Please select a future date"),
  shiftTime: z.string()
    .min(1, "Start time is required")
    .refine((time) => {
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    }, "Please enter a valid time format (HH:MM)"),
});

export function OnboardingWizard() {
  const { user, logoutMutation } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isExiting, setIsExiting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check if user needs onboarding
  useEffect(() => {
    if (user?.onboardingCompleted) {
      setIsExiting(true);
    } else if (user?.onboardingStep) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user]);

  // Fetch facilities for step 2
  const { data: facilities } = useQuery({
    queryKey: ["/api/facilities"],
    enabled: currentStep === 2,
  });

  // Update onboarding progress
  const updateProgress = useMutation({
    mutationFn: async (data: { step: number; completed?: boolean }) => {
      const response = await fetch(`/api/users/${user?.id}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update onboarding");
      return response.json();
    },
    onSuccess: (data) => {
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });

  // Skip onboarding
  const handleSkip = () => {
    if (
      window.confirm(
        "Are you sure you want to skip the onboarding? You can always complete it later from your profile settings."
      )
    ) {
      updateProgress.mutate({ step: currentStep, completed: true });
      setIsExiting(true);
    }
  };

  // Exit onboarding
  const handleExit = () => {
    setIsExiting(true);
  };

  // Sign in with existing account
  const handleSignIn = () => {
    // Log out the current session to go back to auth page
    logoutMutation.mutate();
  };

  // Navigate between steps
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
      updateProgress.mutate({ step });
    }
  };

  // Complete onboarding
  const completeOnboarding = () => {
    updateProgress.mutate({ step: 4, completed: true });
    toast({
      title: "Welcome to NexSpace!",
      description: "You've successfully completed the onboarding process.",
    });
    setIsExiting(true);
  };

  if (isExiting || user?.onboardingCompleted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <CardHeader className="relative pb-2 sm:pb-6">
          <div className="absolute right-2 top-2 sm:right-4 sm:top-4 flex gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs sm:text-sm">
              Skip
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExit} className="h-8 w-8 sm:h-9 sm:w-9">
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <CardTitle className="text-lg sm:text-2xl">Welcome to NexSpace!</CardTitle>
          <CardDescription className="text-xs sm:text-sm pr-16 sm:pr-0">
            Let's get you set up in just a few steps.{" "}
            <button
              onClick={handleSignIn}
              className="text-primary hover:underline font-medium block sm:inline mt-1 sm:mt-0"
            >
              Already have an account? Sign in
            </button>
          </CardDescription>

          {/* Progress indicator */}
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            <Progress value={(currentStep / 4) * 100} className="h-1.5 sm:h-2" />
            <div className="flex justify-between px-2 sm:px-0">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`flex flex-col items-center gap-1 p-1 sm:p-2 rounded-lg transition-colors ${
                    step.id === currentStep
                      ? "text-primary"
                      : step.id < currentStep
                        ? "text-green-600"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${
                      step.id === currentStep
                        ? "border-primary bg-primary text-white"
                        : step.id < currentStep
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-muted-foreground"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium hidden sm:block">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(95vh-160px)] sm:max-h-[calc(90vh-200px)] px-4 sm:px-6">
          {currentStep === 1 && (
            <ProfileStep
              onNext={(data) => {
                setOnboardingData({ ...onboardingData, ...data });
                goToStep(2);
              }}
              initialData={onboardingData}
            />
          )}

          {currentStep === 2 && (
            <FacilityStep
              onNext={(data) => {
                setOnboardingData({ ...onboardingData, ...data });
                goToStep(3);
              }}
              onBack={() => goToStep(1)}
              initialData={onboardingData}
              facilities={Array.isArray(facilities) ? facilities : []}
            />
          )}

          {currentStep === 3 && (
            <InviteStep
              onNext={(data) => {
                setOnboardingData({ ...onboardingData, ...data });
                goToStep(4);
              }}
              onBack={() => goToStep(2)}
              initialData={onboardingData}
            />
          )}

          {currentStep === 4 && (
            <ShiftStep
              onComplete={(data) => {
                setOnboardingData({ ...onboardingData, ...data });
                completeOnboarding();
              }}
              onBack={() => goToStep(3)}
              initialData={onboardingData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Step 1: Profile Component
function ProfileStep({
  onNext,
  initialData,
}: {
  onNext: (data: Partial<OnboardingData>) => void;
  initialData: OnboardingData;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData.firstName || user?.firstName || "",
      lastName: initialData.lastName || user?.lastName || "",
      phone: initialData.phone || "",
      department: initialData.department || "",
      title: initialData.title || "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      // Determine which endpoint to use based on user type
      const isFacilityUser = user?.role === "facility_user";
      const endpoint = isFacilityUser 
        ? `/api/facility-users/${user?.facilityId}/profile`
        : `/api/users/${user?.id}/profile`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: (data) => {

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    },
    onError: (error: any) => {

      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {

      await updateProfile.mutateAsync(data);

      onNext(data);
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="firstName" className="text-sm sm:text-base">First Name <span className="text-red-500">*</span></Label>
          <Input id="firstName" {...form.register("firstName")} />
          {form.formState.errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name <span className="text-red-500">*</span></Label>
          <Input id="lastName" {...form.register("lastName")} />
          {form.formState.errors.lastName && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          {...form.register("phone")} 
          placeholder="+1 (555) 123-4567"
          className={form.formState.errors.phone ? "border-red-500" : ""}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="department" className="text-sm sm:text-base">Department</Label>
        <Select
          onValueChange={(value) => form.setValue("department", value)}
          defaultValue={form.getValues("department")}
        >
          <SelectTrigger className={form.formState.errors.department ? "border-red-500" : ""}>
            <SelectValue placeholder="Select your department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nursing">Nursing</SelectItem>
            <SelectItem value="admin">Administration</SelectItem>
            <SelectItem value="hr">Human Resources</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="clinical">Clinical</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="it">Information Technology</SelectItem>
            <SelectItem value="facilities">Facilities Management</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.department && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.department.message}</p>
        )}
      </div>

      {user?.role === "facility_user" && (
        <div>
          <Label htmlFor="title">Job Title</Label>
          <Input 
            id="title" 
            {...form.register("title")} 
            placeholder="e.g., Nursing Director, Operations Manager"
            className={form.formState.errors.title ? "border-red-500" : ""}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={updateProfile.isPending} className="text-xs sm:text-sm">
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Step 2: Facility Component
function FacilityStep({
  onNext,
  onBack,
  initialData,
  facilities,
}: {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  initialData: OnboardingData;
  facilities: any[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // Only superusers can create new facilities
  const canCreateFacility = user?.role === "super_admin";

  const form = useForm({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      facilityId: initialData.facilityId,
      facilityName: initialData.facilityName || "",
      teamName: initialData.teamName || "",
      isCreatingNew: false,
    },
  });

  const createFacility = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create facility");
      return response.json();
    },
    onSuccess: (facility: any) => {
      toast({
        title: "Facility created",
        description: "Your facility has been set up successfully.",
      });
      onNext({ facilityId: facility.id, facilityName: facility.name });
    },
  });

  const onSubmit = async (data: any) => {
    if (isCreatingNew && data.facilityName) {
      await createFacility.mutateAsync({
        name: data.facilityName,
        type: "general",
        address: "TBD",
        teamName: data.teamName,
      });
    } else if (data.facilityId) {
      onNext({ facilityId: data.facilityId });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>How would you like to set up your workspace?</Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={!isCreatingNew}
              onChange={() => {
                setIsCreatingNew(false);
                form.setValue("isCreatingNew", false);
              }}
              className="text-primary"
            />
            <span>Join an existing facility</span>
          </label>
          {canCreateFacility && (
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={isCreatingNew}
                onChange={() => {
                  setIsCreatingNew(true);
                  form.setValue("isCreatingNew", true);
                }}
                className="text-primary"
              />
              <span>Create a new facility</span>
            </label>
          )}
          {!canCreateFacility && facilities.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Please contact a system administrator to create a facility for you.
            </p>
          )}
        </div>
      </div>

      {!isCreatingNew ? (
        <div>
          <Label htmlFor="facility">Select Facility <span className="text-red-500">*</span></Label>
          <Select
            onValueChange={(value) => {
              form.setValue("facilityId", parseInt(value));
              form.clearErrors("root");
            }}
            defaultValue={form.getValues("facilityId")?.toString()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a facility" />
            </SelectTrigger>
            <SelectContent>
              {facilities && facilities.length > 0 ? (
                facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id.toString()}>
                    {facility.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-facilities" disabled>
                  No facilities available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="facilityName">Facility Name <span className="text-red-500">*</span></Label>
            <Input
              id="facilityName"
              {...form.register("facilityName")}
              placeholder="e.g., City General Hospital"
              onChange={(e) => form.clearErrors("root")}
            />
          </div>
          <div>
            <Label htmlFor="teamName">Team Name (Optional)</Label>
            <Input
              id="teamName"
              {...form.register("teamName")}
              placeholder="e.g., Emergency Department"
            />
          </div>
        </>
      )}

      {form.formState.errors.root && (
        <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
      )}

      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack} className="text-xs sm:text-sm">
          Back
        </Button>
        <Button type="submit" disabled={createFacility.isPending} className="text-xs sm:text-sm">
          {createFacility.isPending ? (
            <>
              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Step 3: Invite Staff Component
function InviteStep({
  onNext,
  onBack,
  initialData,
}: {
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  initialData: OnboardingData;
}) {
  const { toast } = useToast();
  const [invites, setInvites] = useState(
    initialData.invites || [{ email: "", role: "", name: "" }]
  );

  const sendInvites = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invites: data }),
      });
      if (!response.ok) throw new Error("Failed to send invites");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitations sent",
        description: "Your team invitations have been sent successfully.",
      });
    },
  });

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "", name: "" }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: string, value: string) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const handleSubmit = async () => {
    const validInvites = invites.filter((invite) => invite.email && invite.role && invite.name);
    
    // Check for duplicate emails
    const emails = validInvites.map(inv => inv.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      toast({
        title: "Duplicate emails",
        description: "Please ensure each email address is unique.",
        variant: "destructive",
      });
      return;
    }

    if (validInvites.length > 0) {
      await sendInvites.mutateAsync(validInvites);
    }

    onNext({ invites: validInvites });
  };

  const handleSkip = () => {
    onNext({ invites: [] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Invite Your Team</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add team members to collaborate with you. You can always invite more people later.
        </p>
      </div>

      {invites.map((invite, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={invite.name}
                  onChange={(e) => updateInvite(index, "name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invite.email}
                  onChange={(e) => updateInvite(index, "email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Role</Label>
                <Select
                  value={invite.role}
                  onValueChange={(value) => updateInvite(index, "role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {invites.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeInvite(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addInvite} className="w-full">
        <UserPlus className="mr-2 h-4 w-4" />
        Add Another Person
      </Button>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip this step
          </Button>
          <Button onClick={handleSubmit} disabled={sendInvites.isPending}>
            {sendInvites.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 4: First Shift Component
function ShiftStep({
  onComplete,
  onBack,
  initialData,
}: {
  onComplete: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  initialData: OnboardingData;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftTitle: initialData.shiftTitle || "",
      shiftDate: initialData.shiftDate || "",
      shiftTime: initialData.shiftTime || "",
    },
  });

  const createShift = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.shiftTitle,
          date: data.shiftDate,
          startTime: data.shiftTime,
          endTime: "17:00", // Default end time
          facilityId: user?.facilityId || 1,
          specialty: "General",
          rate: 50,
          requiredWorkers: 1,
        }),
      });
      if (!response.ok) throw new Error("Failed to create shift");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shift created",
        description: "Your first shift has been scheduled successfully!",
      });
    },
  });

  const onSubmit = async (data: any) => {
    await createShift.mutateAsync(data);
    onComplete(data);
  };

  const handleSkip = () => {
    onComplete({});
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Schedule Your First Shift</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Let's create your first shift to get familiar with the scheduling system.
        </p>
      </div>

      <div>
        <Label htmlFor="shiftTitle">Shift Title</Label>
        <Input
          id="shiftTitle"
          {...form.register("shiftTitle")}
          placeholder="e.g., Morning Nursing Shift"
        />
        {form.formState.errors.shiftTitle && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.shiftTitle.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="shiftDate">Date</Label>
        <Input
          id="shiftDate"
          type="date"
          {...form.register("shiftDate")}
          min={new Date().toISOString().split("T")[0]}
        />
        {form.formState.errors.shiftDate && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.shiftDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="shiftTime">Start Time</Label>
        <Input id="shiftTime" type="time" {...form.register("shiftTime")} />
        {form.formState.errors.shiftTime && (
          <p className="text-sm text-red-500 mt-1">{form.formState.errors.shiftTime.message}</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> After completing onboarding, you'll have access to advanced
          scheduling features including:
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
          <li>Multiple worker assignments</li>
          <li>Shift templates for recurring schedules</li>
          <li>Automated shift notifications</li>
          <li>Advanced filtering and analytics</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip & Finish
          </Button>
          <Button type="submit" disabled={createShift.isPending}>
            {createShift.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Complete Setup
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
