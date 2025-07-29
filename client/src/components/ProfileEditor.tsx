import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

// Validation schema
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

export function ProfileEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isFacilityUser = user?.role === "facility_user";

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      title: "",
    },
  });

  // Fetch existing profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", user?.id, isFacilityUser],
    queryFn: async () => {
      if (!user) return null;
      
      // For facility users, we need to get their ID from the session
      const endpoint = isFacilityUser 
        ? `/api/auth/user` // This will return the full user object with facilityUserId
        : `/api/users/${user.id}`;
      
      const response = await fetch(endpoint, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      
      const data = await response.json();
      
      // If facility user, fetch their profile data
      if (isFacilityUser && data.facilityUserId) {
        const profileResponse = await fetch(`/api/facility-users/${data.facilityUserId}/profile`, {
          credentials: "include",
        });
        
        if (profileResponse.ok) {
          return profileResponse.json();
        }
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Update form when profile data is loaded
  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.firstName || profileData.first_name || "",
        lastName: profileData.lastName || profileData.last_name || "",
        phone: profileData.phone || "",
        department: profileData.department || "",
        title: profileData.title || "",
      });
    }
  }, [profileData, form]);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      // First get the full user data to get facilityUserId if needed
      if (isFacilityUser) {
        const userResponse = await fetch('/api/auth/user', { credentials: 'include' });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.facilityUserId) {
            const endpoint = `/api/facility-users/${userData.facilityUserId}/profile`;
            console.log("[PROFILE EDITOR] Updating facility user profile:", { endpoint, data });
            
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
          }
        }
      }
      
      // Regular user update
      const endpoint = `/api/users/${user?.id}/profile`;
      console.log("[PROFILE EDITOR] Updating user profile:", { endpoint, data });
      
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
      console.log("[PROFILE EDITOR] Profile updated successfully:", data);
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
    },
    onError: (error: any) => {
      console.error("[PROFILE EDITOR] Update failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Only send fields that are relevant to the user type
    const payload = isFacilityUser
      ? data // Facility users can update all fields
      : { firstName: data.firstName, lastName: data.lastName }; // Regular users only name fields
    
    updateProfile.mutate(payload);
  };

  if (isLoadingProfile) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your personal information. Fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input 
                id="firstName" 
                {...form.register("firstName")}
                className={form.formState.errors.firstName ? "border-red-500" : ""}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input 
                id="lastName" 
                {...form.register("lastName")}
                className={form.formState.errors.lastName ? "border-red-500" : ""}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          {isFacilityUser && (
            <>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
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

              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  onValueChange={(value) => form.setValue("department", value)}
                  value={form.watch("department")}
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
            </>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Show validation status */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
              <p className="text-sm text-red-800">
                Please fix the validation errors above before saving.
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}