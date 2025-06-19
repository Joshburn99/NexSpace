import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  department: z.string().min(1, "Department is required"),
  specialty: z.string().min(1, "Specialty is required"),
  minStaff: z.number().min(1, "Minimum staff must be at least 1"),
  maxStaff: z.number().min(1, "Maximum staff must be at least 1"),
  shiftType: z.enum(["day", "evening", "night"]),
  startTime: z.string(),
  endTime: z.string(),
  isActive: z.boolean().default(true),
});

const requirementSchema = z.object({
  specialty: z.string().min(1, "Specialty is required"),
  department: z.string().min(1, "Department is required"),
  minRequired: z.number().min(1, "Minimum required must be at least 1"),
  maxCapacity: z.number().min(1, "Maximum capacity must be at least 1"),
  requiresCertification: z.boolean().default(false),
  certificationTypes: z.array(z.string()).optional(),
  priorityLevel: z.enum(["low", "medium", "high", "critical"]),
  isActive: z.boolean().default(true),
});

export default function SchedulingConfigPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isRequirementDialogOpen, setIsRequirementDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates and requirements
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/scheduling/templates"],
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["/api/scheduling/requirements"],
  });

  const templateForm = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      department: "",
      specialty: "",
      minStaff: 1,
      maxStaff: 3,
      shiftType: "day",
      startTime: "07:00",
      endTime: "19:00",
      isActive: true,
    },
  });

  const requirementForm = useForm({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      specialty: "",
      department: "",
      minRequired: 1,
      maxCapacity: 5,
      requiresCertification: false,
      certificationTypes: [],
      priorityLevel: "medium",
      isActive: true,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateSchema>) => {
      return apiRequest("/api/scheduling/templates", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/templates"] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      toast({ title: "Template created successfully" });
    },
  });

  const createRequirementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requirementSchema>) => {
      return apiRequest("/api/scheduling/requirements", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/requirements"] });
      setIsRequirementDialogOpen(false);
      requirementForm.reset();
      toast({ title: "Requirement created successfully" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof templateSchema> }) => {
      return apiRequest(`/api/scheduling/templates/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/templates"] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({ title: "Template updated successfully" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/scheduling/templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/templates"] });
      toast({ title: "Template deleted successfully" });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof requirementSchema> }) => {
      return apiRequest(`/api/scheduling/requirements/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/requirements"] });
      setIsRequirementDialogOpen(false);
      setEditingRequirement(null);
      requirementForm.reset();
      toast({ title: "Requirement updated successfully" });
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/scheduling/requirements/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/requirements"] });
      toast({ title: "Requirement deleted successfully" });
    },
  });

  const departments = [
    "ICU",
    "Emergency",
    "Medical-Surgical",
    "Pediatrics",
    "Operating Room",
    "Recovery",
    "Obstetrics",
    "Oncology",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Rehabilitation",
    "Radiology",
    "Laboratory",
  ];

  const specialties = [
    "Registered Nurse",
    "Licensed Practical Nurse",
    "Certified Nursing Assistant",
    "Physical Therapist",
    "Respiratory Therapist",
    "Radiology Technologist",
    "Laboratory Technologist",
    "Surgical Technologist",
    "Pharmacy Technician",
    "Medical Assistant",
    "Occupational Therapist",
    "Speech Therapist",
  ];

  const certificationTypes = [
    "BLS",
    "ACLS",
    "PALS",
    "TNCC",
    "CEN",
    "CCRN",
    "OCN",
    "CNOR",
    "PACU",
    "NREMT",
  ];

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    templateForm.reset(template);
    setIsTemplateDialogOpen(true);
  };

  const handleEditRequirement = (requirement: any) => {
    setEditingRequirement(requirement);
    requirementForm.reset(requirement);
    setIsRequirementDialogOpen(true);
  };

  const handleTemplateSubmit = (data: z.infer<typeof templateSchema>) => {
    if (editingTemplate && editingTemplate.id) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleRequirementSubmit = (data: z.infer<typeof requirementSchema>) => {
    if (editingRequirement && editingRequirement.id) {
      updateRequirementMutation.mutate({ id: editingRequirement.id, data });
    } else {
      createRequirementMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scheduling Configuration</h1>
        <p className="text-muted-foreground">
          Configure shift templates and staffing requirements by specialty
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shift Templates
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staffing Requirements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shift Templates</CardTitle>
                  <CardDescription>
                    Create reusable shift templates for consistent scheduling
                  </CardDescription>
                </div>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit Shift Template" : "Create Shift Template"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form
                        onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={templateForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input placeholder="ICU Day Shift" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept} value={dept}>
                                        {dept}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="specialty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specialty</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select specialty" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {specialties.map((spec) => (
                                      <SelectItem key={spec} value={spec}>
                                        {spec}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="minStaff"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Staff</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="maxStaff"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Staff</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="shiftType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Shift Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="evening">Evening</SelectItem>
                                    <SelectItem value="night">Night</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={templateForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsTemplateDialogOpen(false);
                              setEditingTemplate(null);
                              templateForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              createTemplateMutation.isPending || updateTemplateMutation.isPending
                            }
                          >
                            {createTemplateMutation.isPending || updateTemplateMutation.isPending
                              ? "Saving..."
                              : editingTemplate
                                ? "Update Template"
                                : "Create Template"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No shift templates configured yet. Create your first template to get started.
                  </div>
                ) : (
                  templates.map((template: any) => (
                    <Card key={template.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {template.department} • {template.specialty}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {template.minStaff}-{template.maxStaff} staff
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {template.startTime} - {template.endTime}
                              </span>
                              <Badge variant={template.isActive ? "default" : "secondary"}>
                                {template.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staffing Requirements</CardTitle>
                  <CardDescription>
                    Set minimum staffing requirements by specialty and department
                  </CardDescription>
                </div>
                <Dialog open={isRequirementDialogOpen} onOpenChange={setIsRequirementDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Requirement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRequirement
                          ? "Edit Staffing Requirement"
                          : "Create Staffing Requirement"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...requirementForm}>
                      <form
                        onSubmit={requirementForm.handleSubmit(handleRequirementSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={requirementForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept} value={dept}>
                                        {dept}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={requirementForm.control}
                            name="specialty"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specialty</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select specialty" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {specialties.map((spec) => (
                                      <SelectItem key={spec} value={spec}>
                                        {spec}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={requirementForm.control}
                            name="minRequired"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Required</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={requirementForm.control}
                            name="maxCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Capacity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={requirementForm.control}
                            name="priorityLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={requirementForm.control}
                          name="requiresCertification"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Requires Certification</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Staff must have specific certifications
                                </div>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsRequirementDialogOpen(false);
                              setEditingRequirement(null);
                              requirementForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              createRequirementMutation.isPending ||
                              updateRequirementMutation.isPending
                            }
                          >
                            {createRequirementMutation.isPending ||
                            updateRequirementMutation.isPending
                              ? "Saving..."
                              : editingRequirement
                                ? "Update Requirement"
                                : "Create Requirement"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {requirements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No staffing requirements configured yet. Create your first requirement to get
                    started.
                  </div>
                ) : (
                  requirements.map((req: any) => (
                    <Card
                      key={req.id}
                      className={`border-l-4 ${
                        req.priorityLevel === "critical"
                          ? "border-l-red-500"
                          : req.priorityLevel === "high"
                            ? "border-l-orange-500"
                            : req.priorityLevel === "medium"
                              ? "border-l-yellow-500"
                              : "border-l-green-500"
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{req.department}</h3>
                            <p className="text-sm text-muted-foreground">{req.specialty}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {req.minRequired}-{req.maxCapacity} staff required
                              </span>
                              <Badge
                                variant={
                                  req.priorityLevel === "critical" ? "destructive" : "default"
                                }
                              >
                                {req.priorityLevel}
                              </Badge>
                              {req.requiresCertification && (
                                <Badge variant="outline">Certification Required</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRequirement(req)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteRequirementMutation.mutate(req.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
