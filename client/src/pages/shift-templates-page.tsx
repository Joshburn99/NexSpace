import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Search,
  Filter,
  Building,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Template schema
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  department: z.string().min(1, "Department is required"),
  specialty: z.string().min(1, "Specialty is required"),
  facilityId: z.number().min(1, "Facility is required"),
  facilityName: z.string().optional(),
  buildingId: z.string().optional(),
  buildingName: z.string().optional(),
  minStaff: z.number().min(1, "Staff required must be at least 1"),
  maxStaff: z.number().min(1, "Maximum staff must be at least 1"),
  shiftType: z.string(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  daysOfWeek: z.array(z.number()).min(1, "Select at least one day"),
  isActive: z.boolean().default(true),
  hourlyRate: z.number().min(0, "Hourly rate must be positive").optional(),
  daysPostedOut: z.number().min(1, "Days posted out must be at least 1").max(90, "Days posted out cannot exceed 90").default(7),
  notes: z.string().optional(),
}).refine((data) => data.maxStaff >= data.minStaff, {
  message: "Maximum staff must be greater than or equal to minimum staff",
  path: ["maxStaff"],
});

interface ShiftTemplate {
  id: number;
  name: string;
  department: string;
  specialty: string;
  facilityId: number;
  facilityName: string;
  buildingId?: string;
  buildingName?: string;
  minStaff: number;
  maxStaff: number;
  shiftType: "day" | "evening" | "night";
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  hourlyRate?: number;
  daysPostedOut: number;
  notes?: string;
  generatedShiftsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Facility {
  id: number;
  name: string;
  address: string;
  type: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SPECIALTIES = [
  "Registered Nurse",
  "Licensed Practical Nurse", 
  "Certified Nursing Assistant",
  "Physical Therapist",
  "Respiratory Therapist",
  "Medical Technologist",
  "Pharmacist",
  "Social Worker"
];

const DEPARTMENTS = [
  "ICU",
  "Emergency",
  "Medical-Surgical",
  "Operating Room",
  "Labor & Delivery",
  "Pediatrics",
  "Radiology",
  "Laboratory"
];

export default function ShiftTemplatesPage() {
  const { user } = useAuth();
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ShiftTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedFacility, setSelectedFacility] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/shift-templates"],
  });

  // Fetch facilities for template assignment
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  // Template form
  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      department: "",
      specialty: "",
      facilityId: 0,
      facilityName: "",
      buildingId: "",
      buildingName: "",
      minStaff: 1,
      maxStaff: 1,
      shiftType: "day",
      startTime: "07:00",
      endTime: "19:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      isActive: true,
      hourlyRate: 0,
      daysPostedOut: 7,
      notes: "",
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: z.infer<typeof templateSchema>) => {
      const response = await apiRequest("POST", "/api/shift-templates", templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      setEditingTemplate(null);
      toast({
        title: "Template Created",
        description: "Shift template created and shifts generated automatically.",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & z.infer<typeof templateSchema>) => {
      console.log('=== UPDATE MUTATION DEBUG ===');
      console.log('Template ID:', id);
      console.log('Update data being sent:', JSON.stringify(data, null, 2));

      const response = await apiRequest("PUT", `/api/shift-templates/${id}`, data);
      const result = await response.json();
      console.log('Update response:', result);
      return result;
    },
    onSuccess: (updatedTemplate) => {
      console.log('=== UPDATE SUCCESS ===');
      console.log('Updated template received:', updatedTemplate);

      // Force refresh of data to ensure UI shows latest changes
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });

      // Close dialog and reset form
      setIsTemplateDialogOpen(false);
      templateForm.reset({
        name: "",
        department: "",
        specialty: "",
        facilityId: 0,
        facilityName: "",
        buildingId: "",
        buildingName: "",
        minStaff: 1,
        maxStaff: 1,
        shiftType: "day",
        startTime: "07:00",
        endTime: "19:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
        hourlyRate: 0,
        daysPostedOut: 7,
        notes: "",
      });
      setEditingTemplate(null);

      toast({
        title: "Template Updated Successfully",
        description: `Updated "${updatedTemplate.name}" - changes will reflect immediately.`,
      });
    },
    onError: (error) => {
      console.error('Update template error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/shift-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setDeleteTemplate(null);
      toast({
        title: "Template Deleted",
        description: "Template and associated future shifts have been removed.",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/shift-templates/${id}/status`, { isActive });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });

      // Force calendar refresh for immediate visual feedback
      queryClient.refetchQueries({ queryKey: ["/api/shifts"] });

      toast({
        title: "Template Updated",
        description: variables.isActive 
          ? "Template activated - new shifts will be generated" 
          : "Template deactivated - existing shifts preserved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive",
      });
    },
  });

  const regenerateShiftsMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("POST", `/api/shift-templates/${templateId}/regenerate`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });

      // Force immediate refetch of calendar data
      const shiftsQuery = queryClient.getQueryData(["/api/shifts"]);
      if (shiftsQuery) {
        queryClient.refetchQueries({ queryKey: ["/api/shifts"] });
      }

      toast({
        title: "Shifts Regenerated",
        description: "Template shifts have been regenerated and calendar updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to regenerate shifts",
        variant: "destructive",
      });
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = searchTerm === "" || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.facilityName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === "all" || template.department === selectedDepartment;
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && template.isActive) ||
      (selectedStatus === "inactive" && !template.isActive);
    const matchesFacility = selectedFacility === "all" || template.facilityId.toString() === selectedFacility;

    return matchesSearch && matchesDepartment && matchesStatus && matchesFacility;
  });

  const handleEditTemplate = (template: ShiftTemplate) => {
    console.log('=== EDITING TEMPLATE DEBUG ===');
    console.log('Template data received:', JSON.stringify(template, null, 2));

    // Set editing state first
    setEditingTemplate(template);

    // Prepare the form data with proper mapping from database fields
    const formData = {
      name: template.name || "",
      department: template.department || "",
      specialty: template.specialty || "",
      facilityId: template.facilityId || template.facility_id || 0,
      facilityName: template.facilityName || template.facility_name || "",
      buildingId: template.buildingId || template.building_id || "",
      buildingName: template.buildingName || template.building_name || "",
      minStaff: Number(template.minStaff || template.min_staff) || 1,
      maxStaff: Number(template.maxStaff || template.max_staff) || 1,
      shiftType: template.shiftType || template.shift_type || "day",
      startTime: template.startTime || template.start_time || "07:00",
      endTime: template.endTime || template.end_time || "19:00",
      daysOfWeek: Array.isArray(template.daysOfWeek) ? template.daysOfWeek : 
                 Array.isArray(template.days_of_week) ? template.days_of_week : [1, 2, 3, 4, 5],
      isActive: template.isActive !== undefined ? template.isActive : 
               template.is_active !== undefined ? template.is_active : true,
      hourlyRate: Number(template.hourlyRate || template.hourly_rate) || 0,
      daysPostedOut: Number(template.daysPostedOut || template.days_posted_out) || 7,
      notes: template.notes || "",
    };

    console.log('Processed form data:', JSON.stringify(formData, null, 2));

    // Reset form with the template data
    templateForm.reset(formData);

    // Open dialog first
    setIsTemplateDialogOpen(true);

    // Force immediate form update with validation after dialog opens
    setTimeout(() => {
      // Reset completely then set all values
      templateForm.reset(formData);

      Object.entries(formData).forEach(([key, value]) => {
        templateForm.setValue(key as any, value, { 
          shouldValidate: false, 
          shouldTouch: true,
          shouldDirty: true 
        });
      });

      // Force re-render of all form controls
      templateForm.trigger();

      console.log('Final form values:', templateForm.getValues());
      console.log('Form watch values:', {
        name: templateForm.watch("name"),
        department: templateForm.watch("department"), 
        specialty: templateForm.watch("specialty"),
        facilityId: templateForm.watch("facilityId"),
        shiftType: templateForm.watch("shiftType"),
        minStaff: templateForm.watch("minStaff")
      });
    }, 300);

    // Dialog is opened above in the timeout
  };

  const handleTemplateSubmit = (data: z.infer<typeof templateSchema>) => {
    console.log('=== TEMPLATE SUBMISSION DEBUG ===');
    console.log('Submitted data:', JSON.stringify(data, null, 2));
    console.log('Editing template ID:', editingTemplate?.id);
    console.log('Form errors:', templateForm.formState.errors);
    console.log('Is editing mode:', !!editingTemplate);

    if (editingTemplate) {
      console.log('Calling UPDATE mutation for template ID:', editingTemplate.id);
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      console.log('Calling CREATE mutation');
      createTemplateMutation.mutate(data);
    }
  };

  const getShiftTypeColor = (shiftType: string) => {
    switch (shiftType) {
      case "day": return "bg-green-100 text-green-800";
      case "evening": return "bg-orange-100 text-orange-800";
      case "night": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Shift Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage reusable shift templates that automatically generate facility schedules
          </p>
        </div>
        <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
          setIsTemplateDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
            templateForm.reset({
              name: "",
              department: "",
              specialty: "",
              facilityId: 0,
              facilityName: "",
              buildingId: "",
              buildingName: "",
              minStaff: 1,
              maxStaff: 1,
              shiftType: "day",
              startTime: "07:00",
              endTime: "19:00",
              daysOfWeek: [1, 2, 3, 4, 5],
              isActive: true,
              hourlyRate: 0,
              daysPostedOut: 7,
              notes: "",
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTemplate(null);
              templateForm.reset({
                name: "",
                department: "",
                specialty: "",
                facilityId: 0,
                facilityName: "",
                buildingId: "",
                buildingName: "",
                minStaff: 1,
                maxStaff: 1,
                shiftType: "day",
                startTime: "07:00",
                endTime: "19:00",
                daysOfWeek: [1, 2, 3, 4, 5],
                isActive: true,
                hourlyRate: 0,
                daysPostedOut: 7,
                notes: "",
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Shift Template" : "Create Shift Template"}
              </DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <div className="text-sm text-gray-600 mb-4">
                Editing: {editingTemplate.name}
              </div>
            )}
            <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    placeholder="ICU Day Shift RN"
                    value={templateForm.watch("name") || ""}
                    onChange={(e) => templateForm.setValue("name", e.target.value)}
                  />
                  {templateForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {templateForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Facility</Label>
                  <Select 
                    value={templateForm.watch("facilityId")?.toString() || ""} 
                    onValueChange={(value) => {
                      templateForm.setValue("facilityId", parseInt(value));
                      // Also set facilityName for consistency
                      const selectedFacility = facilities.find(f => f.id === parseInt(value));
                      if (selectedFacility) {
                        templateForm.setValue("facilityName", selectedFacility.name);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id.toString()}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Building/Unit</Label>
                <Select 
                  value={templateForm.watch("buildingId") || ""} 
                  onValueChange={(value) => {
                    templateForm.setValue("buildingId", value);
                    templateForm.setValue("buildingName", value ? `Building ${value}` : "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building or unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Building</SelectItem>
                    <SelectItem value="east">East Wing</SelectItem>
                    <SelectItem value="west">West Wing</SelectItem>
                    <SelectItem value="north">North Tower</SelectItem>
                    <SelectItem value="south">South Tower</SelectItem>
                    <SelectItem value="icu">ICU Unit</SelectItem>
                    <SelectItem value="er">Emergency Unit</SelectItem>
                    <SelectItem value="pediatric">Pediatric Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select 
                    value={templateForm.watch("department") || ""} 
                    onValueChange={(value) => templateForm.setValue("department", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Select 
                    value={templateForm.watch("specialty") || ""} 
                    onValueChange={(value) => templateForm.setValue("specialty", value)}
                  >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((specialty, idx) => (
                    <SelectItem key={`${specialty}-${idx}`} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Shift Type</Label>
                  <Select 
                    value={templateForm.watch("shiftType") || ""} 
                    onValueChange={(value) => templateForm.setValue("shiftType", value as "day" | "evening" | "night")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day Shift</SelectItem>
                      <SelectItem value="evening">Evening Shift</SelectItem>
                      <SelectItem value="night">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={templateForm.watch("startTime") || "07:00"}
                    onChange={(e) => templateForm.setValue("startTime", e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={templateForm.watch("endTime") || "19:00"}
                    onChange={(e) => templateForm.setValue("endTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Staff Required</Label>
                  <Input
                    type="number"
                    min="1"
                    value={templateForm.watch("minStaff")?.toString() || "1"}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      templateForm.setValue("minStaff", value);
                      templateForm.setValue("maxStaff", value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of staff positions needed
                  </p>
                </div>
                <div>
                  <Label>Maximum Staff</Label>
                  <Input
                    type="number"
                    min="1"
                    value={templateForm.watch("maxStaff")?.toString() || "1"}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      templateForm.setValue("maxStaff", value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum staff that can be assigned
                  </p>
                </div>
              </div>

              <div>
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={(templateForm.watch("daysOfWeek") || []).includes(day.value)}
                        onChange={(e) => {
                          const current = templateForm.watch("daysOfWeek") || [];
                          if (e.target.checked) {
                            templateForm.setValue("daysOfWeek", [...current, day.value]);
                          } else {
                            templateForm.setValue("daysOfWeek", current.filter(d => d !== day.value));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm">
                        {day.label.slice(0, 3)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Days Posted Out</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={templateForm.watch("daysPostedOut")?.toString() || "7"}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 7;
                    templateForm.setValue("daysPostedOut", value);
                  }}
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many days in advance shifts are automatically posted
                </p>
              </div>

              {/* Hourly Rate - Only visible to superusers */}
              {user?.role === 'superuser' && (
                <div>
                  <Label>Hourly Rate (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={templateForm.watch("hourlyRate")?.toString() || "0"}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      templateForm.setValue("hourlyRate", value);
                    }}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only visible to superusers
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={templateForm.watch("isActive")}
                  onCheckedChange={(checked) => templateForm.setValue("isActive", checked)}
                />
                <Label>Active Template</Label>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={templateForm.watch("notes") || ""}
                  onChange={(e) => templateForm.setValue("notes", e.target.value)}
                  placeholder="Additional template details..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTemplateDialogOpen(false);
                    setEditingTemplate(null);
                    templateForm.reset({
                      name: "",
                      department: "",
                      specialty: "",
                      facilityId: 0,
                      facilityName: "",
                      buildingId: "",
                      buildingName: "",
                      minStaff: 1,
                      maxStaff: 1,
                      shiftType: "day",
                      startTime: "07:00",
                      endTime: "19:00",
                      daysOfWeek: [1, 2, 3, 4, 5],
                      isActive: true,
                      hourlyRate: 0,
                      daysPostedOut: 7,
                      notes: "",
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending || updateTemplateMutation.isPending ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Templates</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                <SelectTrigger>
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Templates ({filteredTemplates.length})
            </div>
            {filteredTemplates.some(t => t.isActive) && (
              <Badge className="bg-green-100 text-green-800">
                {filteredTemplates.filter(t => t.isActive).length} Active Templates
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Create your first shift template to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Staff Range</TableHead>
                    <TableHead>Generated Shifts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <div>{template.name}</div>
                          {template.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {template.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {template.facilityName}
                        </div>
                      </TableCell>
                      <TableCell>{template.department}</TableCell>
                      <TableCell>{template.specialty}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getShiftTypeColor(template.shiftType)}>
                            {template.shiftType} ({template.startTime} - {template.endTime})
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {template.daysOfWeek.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.slice(0, 3)).join(", ")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.minStaff} - {template.maxStaff} staff
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {template.generatedShiftsCount} shifts
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => regenerateShiftsMutation.mutate(template.id)}
                            disabled={regenerateShiftsMutation.isPending}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={(checked) => 
                              toggleStatusMutation.mutate({ id: template.id, isActive: checked })
                            }
                            disabled={toggleStatusMutation.isPending}
                          />
                          {template.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => regenerateShiftsMutation.mutate(template.id)}
                              disabled={regenerateShiftsMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate Shifts
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteTemplate(template)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Template
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This will remove the template and all associated future shifts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteTemplateMutation.mutate(deleteTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}