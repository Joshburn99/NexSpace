import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MobileContainer, 
  MobileActionButtons,
  MobileTabs,
  mobileSpacing 
} from "@/components/mobile-responsive-layout";
import { EnhancedDataTable } from "@/components/enhanced-data-table";
import { 
  ValidatedInput, 
  FormErrorSummary,
  validationRules 
} from "@/components/enhanced-form-validation";
import { useApiData, useApiMutation } from "@/components/enhanced-data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Users,
  Plus,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  AlertCircle,
} from "lucide-react";

// Enhanced form schema with validation
const staffSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  specialty: z.string().min(1, "Please select a specialty"),
  department: z.string().min(1, "Please select a department"),
  employmentType: z.string().min(1, "Please select employment type"),
  hourlyRate: z.number().min(0, "Rate must be positive"),
});

type StaffFormData = z.infer<typeof staffSchema>;

export default function EnhancedStaffManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Enhanced data fetching with real-time updates
  const { data: staffData = [], isLoading, isError } = useApiData<any[]>(
    '/api/staff',
    { staleTime: 60000 } // 1 minute cache
  );

  // Form setup with validation
  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialty: "",
      department: "",
      employmentType: "",
      hourlyRate: 0,
    }
  });

  // Enhanced mutations with optimistic updates
  const addStaffMutation = useApiMutation<any, StaffFormData>(
    '/api/staff',
    'POST',
    {
      onSuccess: () => {
        setAddDialogOpen(false);
        form.reset();
      },
      invalidateQueries: ['/api/staff'],
    }
  );

  const updateStaffMutation = useApiMutation<any, StaffFormData & { id: string }>(
    '/api/staff',
    'PATCH',
    {
      onSuccess: () => {
        setEditingStaff(null);
      },
      invalidateQueries: ['/api/staff'],
    }
  );

  // Filter staff by tab
  const filteredStaff = staffData.filter((staff) => {
    switch (activeTab) {
      case "nurses":
        return ["RN", "LPN", "CNA"].includes(staff.specialty);
      case "doctors":
        return ["MD", "NP", "PA"].includes(staff.specialty);
      case "support":
        return !["RN", "LPN", "CNA", "MD", "NP", "PA"].includes(staff.specialty);
      default:
        return true;
    }
  });

  // Enhanced table columns with mobile optimization
  const staffColumns = [
    {
      key: 'name' as const,
      title: 'Staff Member',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-sm">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'specialty' as const,
      title: 'Role',
      render: (value: string, row: any) => (
        <div>
          <Badge variant="secondary" className="text-xs mb-1">
            {value}
          </Badge>
          <p className="text-xs text-gray-500">{row.department}</p>
        </div>
      )
    },
    {
      key: 'employmentType' as const,
      title: 'Type',
      render: (value: string) => (
        <Badge 
          variant={value === 'Full-time Employee' ? 'default' : 'outline'}
          className="text-xs"
        >
          {value?.replace('Employee', '') || 'N/A'}
        </Badge>
      )
    },
    {
      key: 'hourlyRate' as const,
      title: 'Rate',
      render: (value: number) => (
        <span className="font-medium">${value || 0}/hr</span>
      )
    },
    {
      key: 'isActive' as const,
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  // Mobile-friendly actions
  const tableActions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (staff: any) => setEditingStaff(staff),
      variant: "ghost" as const,
    }
  ];

  const quickActions = [
    {
      label: "Add Staff Member",
      onClick: () => setAddDialogOpen(true),
      variant: "default" as const,
      icon: Plus
    },
    {
      label: "Import Staff",
      onClick: () => console.log("Import staff"),
      variant: "outline" as const,
      icon: Users
    }
  ];

  // Tab configuration
  const tabs = [
    { id: "all", label: "All Staff", icon: Users },
    { id: "nurses", label: "Nursing", icon: Award },
    { id: "doctors", label: "Physicians", icon: AlertCircle },
    { id: "support", label: "Support", icon: Users },
  ];

  const handleSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      updateStaffMutation.mutate({ ...data, id: editingStaff.id });
    } else {
      addStaffMutation.mutate(data);
    }
  };

  return (
    <MobileContainer className={mobileSpacing.section}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Staff Management
        </h1>
        <p className="text-gray-600">
          Manage your healthcare team and workforce
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <MobileActionButtons actions={quickActions} />
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="mb-6">
        <MobileTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {activeTab === "all" ? "All Staff" : tabs.find(t => t.id === activeTab)?.label} 
            ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <EnhancedDataTable
            data={filteredStaff}
            columns={staffColumns}
            actions={tableActions}
            isLoading={isLoading}
            searchable={true}
            searchPlaceholder="Search staff members..."
            exportable={true}
            pageSize={10}
            emptyStateTitle="No staff members found"
            emptyStateDescription="Add your first staff member to get started"
          />
        </CardContent>
      </Card>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={addDialogOpen || !!editingStaff} onOpenChange={(open) => {
        if (!open) {
          setAddDialogOpen(false);
          setEditingStaff(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
          </DialogHeader>

          <FormProvider {...form}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormErrorSummary />

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    name="firstName"
                    label="First Name"
                    required
                    placeholder="John"
                  />
                  
                  <ValidatedInput
                    name="lastName"
                    label="Last Name"
                    required
                    placeholder="Doe"
                  />
                </div>

                <ValidatedInput
                  name="email"
                  label="Email"
                  type="email"
                  required
                  placeholder="john.doe@hospital.com"
                />

                <ValidatedInput
                  name="phone"
                  label="Phone"
                  required
                  placeholder="(555) 123-4567"
                />

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    name="specialty"
                    label="Specialty"
                    required
                    placeholder="RN"
                  />
                  
                  <ValidatedInput
                    name="department"
                    label="Department"
                    required
                    placeholder="ICU"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    name="employmentType"
                    label="Employment Type"
                    required
                    placeholder="Full-time Employee"
                  />
                  
                  <ValidatedInput
                    name="hourlyRate"
                    label="Hourly Rate"
                    type="number"
                    required
                    placeholder="45.00"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAddDialogOpen(false);
                      setEditingStaff(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={addStaffMutation.isPending || updateStaffMutation.isPending}
                  >
                    {editingStaff ? "Update" : "Add"} Staff
                  </Button>
                </div>
              </form>
            </Form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </MobileContainer>
  );
}