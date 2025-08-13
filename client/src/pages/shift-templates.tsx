import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, Users, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from '@/lib/api';

interface ShiftTemplate {
  id: number;
  facilityId: number;
  facilityName: string;
  roleRequired: string;
  startTime: string;
  endTime: string;
  timezone: string;
  rrule?: string;
  startsOn?: string;
  endsOn?: string;
  isActive: boolean;
  requiredStaff: number;
  department: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const daysOfWeek = [
  { value: 'MO', label: 'Monday' },
  { value: 'TU', label: 'Tuesday' },
  { value: 'WE', label: 'Wednesday' },
  { value: 'TH', label: 'Thursday' },
  { value: 'FR', label: 'Friday' },
  { value: 'SA', label: 'Saturday' },
  { value: 'SU', label: 'Sunday' }
];

const specialties = [
  'Registered Nurse',
  'Licensed Practical Nurse',
  'Certified Nursing Assistant',
  'Physical Therapist',
  'Occupational Therapist',
  'Respiratory Therapist'
];

const departments = [
  'General',
  'Emergency',
  'ICU',
  'Medical-Surgical',
  'Pediatrics',
  'Obstetrics',
  'Rehabilitation'
];

export default function ShiftTemplatesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    facilityId: 1,
    facilityName: '',
    department: 'General',
    specialty: 'Registered Nurse',
    startTime: '07:00',
    endTime: '15:00',
    minStaff: 1,
    maxStaff: 5,
    shiftType: 'regular',
    daysOfWeek: [] as string[],
    isActive: true,
    hourlyRate: 60,
    notes: ''
  });
  const [applyDays, setApplyDays] = useState(21);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch facilities for dropdown
  const { data: facilities = [] } = useQuery({
    queryKey: ['/api/facilities'],
    queryFn: async () => {
      const response = await fetch('/api/facilities', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch facilities');
      return response.json();
    }
  });

  // Fetch shift templates
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/shift-templates'],
    queryFn: async () => {
      const response = await fetch('/api/shift-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('/api/shift-templates', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create template",
        variant: "destructive"
      });
    }
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const response = await apiRequest(`/api/shift-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update template",
        variant: "destructive"
      });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/shift-templates/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-templates'] });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  });

  // Apply templates mutation
  const applyMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await apiRequest('/api/shift-templates/apply', {
        method: 'POST',
        body: JSON.stringify({ days })
      });
      if (!response.ok) throw new Error('Failed to apply templates');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: `${data.created} shifts created, ${data.skipped} skipped`
      });
      setIsApplyModalOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to apply templates",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      facilityId: 1,
      facilityName: '',
      department: 'General',
      specialty: 'Registered Nurse',
      startTime: '07:00',
      endTime: '15:00',
      minStaff: 1,
      maxStaff: 5,
      shiftType: 'regular',
      daysOfWeek: [],
      isActive: true,
      hourlyRate: 60,
      notes: ''
    });
    setSelectedTemplate(null);
  };

  const handleEdit = (template: ShiftTemplate) => {
    setSelectedTemplate(template);
    const daysFromRrule = template.rrule 
      ? template.rrule.split('BYDAY=')[1]?.split(',') || []
      : [];
    
    setFormData({
      name: template.facilityName || '',
      facilityId: template.facilityId,
      facilityName: template.facilityName,
      department: template.department,
      specialty: template.roleRequired,
      startTime: template.startTime,
      endTime: template.endTime,
      minStaff: template.requiredStaff || 1,
      maxStaff: 5,
      shiftType: 'regular',
      daysOfWeek: daysFromRrule,
      isActive: template.isActive,
      hourlyRate: 60,
      notes: template.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveCreate = () => {
    const facility = facilities.find((f: any) => f.id === formData.facilityId);
    createMutation.mutate({
      ...formData,
      facilityName: facility?.name || ''
    });
  };

  const handleSaveEdit = () => {
    if (selectedTemplate) {
      const facility = facilities.find((f: any) => f.id === formData.facilityId);
      updateMutation.mutate({
        id: selectedTemplate.id,
        data: {
          ...formData,
          facilityName: facility?.name || ''
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shift Templates</h1>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsApplyModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Apply Templates
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Alert>
          <AlertDescription>
            No shift templates found. Create your first template to start automating shift creation.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {templates.map((template: ShiftTemplate) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.facilityName}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{template.department}</Badge>
                      <Badge variant="outline">{template.roleRequired}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{template.startTime} - {template.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{template.requiredStaff} staff required</span>
                  </div>
                  <div className="text-gray-500">
                    {template.timezone}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditModalOpen ? 'Edit Shift Template' : 'Create Shift Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="facility">Facility</Label>
                <Select 
                  value={formData.facilityId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, facilityId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility: any) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialty">Role Required</Label>
                <Select 
                  value={formData.specialty}
                  onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map(spec => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="requiredStaff">Required Staff</Label>
                <Input
                  type="number"
                  value={formData.minStaff}
                  onChange={(e) => setFormData({ ...formData, minStaff: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {daysOfWeek.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.daysOfWeek.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ 
                            ...formData, 
                            daysOfWeek: [...formData.daysOfWeek, day.value] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            daysOfWeek: formData.daysOfWeek.filter(d => d !== day.value) 
                          });
                        }
                      }}
                    />
                    <Label className="text-sm font-normal">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or requirements"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <Label className="text-sm font-normal">Template is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={isEditModalOpen ? handleSaveEdit : handleSaveCreate}>
              <Save className="mr-2 h-4 w-4" />
              {isEditModalOpen ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Templates Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Shift Templates</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="days">Generate shifts for next (days)</Label>
            <Input
              type="number"
              value={applyDays}
              onChange={(e) => setApplyDays(parseInt(e.target.value) || 21)}
              min="1"
              max="90"
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              This will create shifts based on all active templates for the next {applyDays} days.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => applyMutation.mutate(applyDays)}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Applying...' : 'Apply Templates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}