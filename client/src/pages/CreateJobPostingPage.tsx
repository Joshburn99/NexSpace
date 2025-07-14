import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Save, ArrowLeft, Building, Users, DollarSign, FileText } from 'lucide-react';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface JobPostingForm {
  title: string;
  department: string;
  employmentType: string;
  payRateMin: string;
  payRateMax: string;
  experienceRequired: string;
  description: string;
  requirements: string[];
  benefits: string[];
  location: string;
  shift: string;
  priority: string;
}

export default function CreateJobPostingPage() {
  const [, setLocation] = useLocation();
  const { hasPermission } = useFacilityPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<JobPostingForm>({
    title: '',
    department: '',
    employmentType: '',
    payRateMin: '',
    payRateMax: '',
    experienceRequired: '',
    description: '',
    requirements: [],
    benefits: [],
    location: '',
    shift: '',
    priority: 'normal'
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  const createJobPosting = useMutation({
    mutationFn: async (data: JobPostingForm) => {
      return apiRequest('POST', '/api/job-postings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-postings'] });
      toast({
        title: "Success",
        description: "Job posting created successfully",
      });
      setLocation('/job-postings');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job posting",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof JobPostingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.department || !formData.employmentType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createJobPosting.mutate(formData);
  };

  if (!hasPermission('manage_job_openings')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to create job postings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/job-postings')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Postings
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Create Job Posting
          </h1>
          <p className="text-gray-600 mt-2">Post a new job opening for your facility</p>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={createJobPosting.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {createJobPosting.isPending ? 'Creating...' : 'Create Posting'}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="details">Job Details</TabsTrigger>
          <TabsTrigger value="requirements">Requirements & Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Registered Nurse - ICU"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intensive Care">Intensive Care</SelectItem>
                      <SelectItem value="Medical/Surgical">Medical/Surgical</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Operating Room">Operating Room</SelectItem>
                      <SelectItem value="Labor & Delivery">Labor & Delivery</SelectItem>
                      <SelectItem value="Oncology">Oncology</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employmentType">Employment Type *</Label>
                  <Select value={formData.employmentType} onValueChange={(value) => handleInputChange('employmentType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Per Diem">Per Diem</SelectItem>
                      <SelectItem value="Temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="shift">Shift</Label>
                  <Select value={formData.shift} onValueChange={(value) => handleInputChange('shift', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day">Day (7:00 AM - 7:00 PM)</SelectItem>
                      <SelectItem value="Night">Night (7:00 PM - 7:00 AM)</SelectItem>
                      <SelectItem value="Evening">Evening (3:00 PM - 11:00 PM)</SelectItem>
                      <SelectItem value="Rotating">Rotating</SelectItem>
                      <SelectItem value="Flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="payRateMin">Min Pay Rate ($/hour)</Label>
                  <Input
                    id="payRateMin"
                    type="number"
                    value={formData.payRateMin}
                    onChange={(e) => handleInputChange('payRateMin', e.target.value)}
                    placeholder="25"
                  />
                </div>
                <div>
                  <Label htmlFor="payRateMax">Max Pay Rate ($/hour)</Label>
                  <Input
                    id="payRateMax"
                    type="number"
                    value={formData.payRateMax}
                    onChange={(e) => handleInputChange('payRateMax', e.target.value)}
                    placeholder="35"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide a detailed description of the position, responsibilities, and work environment..."
                  className="min-h-32"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., General Hospital, ICU Unit"
                  />
                </div>
                <div>
                  <Label htmlFor="experienceRequired">Experience Required</Label>
                  <Select value={formData.experienceRequired} onValueChange={(value) => handleInputChange('experienceRequired', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entry level">Entry level</SelectItem>
                      <SelectItem value="1+ years">1+ years</SelectItem>
                      <SelectItem value="2+ years">2+ years</SelectItem>
                      <SelectItem value="3+ years">3+ years</SelectItem>
                      <SelectItem value="5+ years">5+ years</SelectItem>
                      <SelectItem value="10+ years">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Add a requirement..."
                    onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                  />
                  <Button onClick={addRequirement} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{req}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeRequirement(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add a benefit..."
                    onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                  />
                  <Button onClick={addBenefit} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{benefit}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeBenefit(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}