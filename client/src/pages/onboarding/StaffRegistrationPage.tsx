import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ArrowRight, Building, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegistrationData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;

  // Professional Info
  profession: string;
  specialty: string;
  yearsOfExperience: string;
  primaryState: string;
  additionalStates: string[];

  // Work Preferences
  employmentType: string;
  shiftPreference: string[];
  weekendAvailability: boolean;
  travelRadius: string;
}

export default function StaffRegistrationPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    profession: "",
    specialty: "",
    yearsOfExperience: "",
    primaryState: "",
    additionalStates: [],
    employmentType: "",
    shiftPreference: [],
    weekendAvailability: false,
    travelRadius: "",
  });

  const professions = [
    { value: "rn", label: "Registered Nurse (RN)" },
    { value: "lpn", label: "Licensed Practical Nurse (LPN)" },
    { value: "cna", label: "Certified Nursing Assistant (CNA)" },
    { value: "rt", label: "Respiratory Therapist (RT)" },
    { value: "pt", label: "Physical Therapist (PT)" },
    { value: "ot", label: "Occupational Therapist (OT)" },
    { value: "cst", label: "Surgical Technologist (CST)" },
    { value: "rad_tech", label: "Radiology Technician" },
    { value: "pharm_tech", label: "Pharmacy Technician" },
    { value: "lab_tech", label: "Laboratory Technician" },
  ];

  const specialties = {
    rn: [
      "ICU",
      "Emergency",
      "Med-Surg",
      "Pediatrics",
      "Labor & Delivery",
      "OR",
      "Telemetry",
      "Oncology",
    ],
    lpn: ["Long-Term Care", "Home Health", "Clinic", "Pediatrics", "Rehabilitation"],
    cna: ["Hospital", "Nursing Home", "Home Care", "Hospice", "Rehabilitation"],
    default: ["General Practice"],
  };

  const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];

  const getSpecialtiesForProfession = () => {
    return specialties[formData.profession as keyof typeof specialties] || specialties.default;
  };

  const handleNext = () => {
    // Add validation here
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const progressPercentage = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold">Join NexSpace as a Healthcare Professional</h1>
            <span className="text-sm text-gray-600">Step {step} of 3</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Let's start with your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
                <p className="text-xs text-gray-500">We'll use this to send shift notifications</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-gray-500">For urgent shift notifications via SMS</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">At least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your information is secure and will only be shared with facilities you choose to
                  work with.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleNext} className="gap-2">
                  Continue to Professional Info
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Professional Information */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Tell us about your healthcare experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profession">Professional Title *</Label>
                <Select
                  value={formData.profession}
                  onValueChange={(value) =>
                    setFormData({ ...formData, profession: value, specialty: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your profession" />
                  </SelectTrigger>
                  <SelectContent>
                    {professions.map((prof) => (
                      <SelectItem key={prof.value} value={prof.value}>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          {prof.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.profession && (
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty Area *</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSpecialtiesForProfession().map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience *</Label>
                <Select
                  value={formData.yearsOfExperience}
                  onValueChange={(value) => setFormData({ ...formData, yearsOfExperience: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">Less than 1 year</SelectItem>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="5-10">5-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryState">Primary License State *</Label>
                <Select
                  value={formData.primaryState}
                  onValueChange={(value) => setFormData({ ...formData, primaryState: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary license state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {state}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional License States (if any)</Label>
                <div className="text-sm text-gray-500 mb-2">
                  Check all states where you hold active licenses
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {states.map((state) => (
                    <div key={state} className="flex items-center space-x-2">
                      <Checkbox
                        id={state}
                        checked={formData.additionalStates.includes(state)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              additionalStates: [...formData.additionalStates, state],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              additionalStates: formData.additionalStates.filter(
                                (s) => s !== state
                              ),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={state}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {state}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  Continue to Work Preferences
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Work Preferences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Work Preferences</CardTitle>
              <CardDescription>Help us match you with the right opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employmentType">Preferred Employment Type *</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) => setFormData({ ...formData, employmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Full-time Employee
                      </div>
                    </SelectItem>
                    <SelectItem value="part-time">Part-time Employee</SelectItem>
                    <SelectItem value="per-diem">Per Diem / PRN</SelectItem>
                    <SelectItem value="contract">Contract / Travel</SelectItem>
                    <SelectItem value="any">Open to Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shift Preferences *</Label>
                <div className="text-sm text-gray-500 mb-2">Select all that apply</div>
                <div className="space-y-3">
                  {[
                    "Day Shift (7am-3pm)",
                    "Evening Shift (3pm-11pm)",
                    "Night Shift (11pm-7am)",
                    "12-Hour Shifts",
                    "8-Hour Shifts",
                    "Flexible",
                  ].map((shift) => (
                    <div key={shift} className="flex items-center space-x-2">
                      <Checkbox
                        id={shift}
                        checked={formData.shiftPreference.includes(shift)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              shiftPreference: [...formData.shiftPreference, shift],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              shiftPreference: formData.shiftPreference.filter((s) => s !== shift),
                            });
                          }
                        }}
                      />
                      <label htmlFor={shift} className="text-sm font-medium">
                        {shift}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weekends"
                  checked={formData.weekendAvailability}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, weekendAvailability: checked as boolean })
                  }
                />
                <label htmlFor="weekends" className="text-sm font-medium">
                  Available to work weekends
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelRadius">Maximum Travel Distance *</Label>
                <Select
                  value={formData.travelRadius}
                  onValueChange={(value) => setFormData({ ...formData, travelRadius: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select travel distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Within 5 miles</SelectItem>
                    <SelectItem value="10">Within 10 miles</SelectItem>
                    <SelectItem value="25">Within 25 miles</SelectItem>
                    <SelectItem value="50">Within 50 miles</SelectItem>
                    <SelectItem value="100">Within 100 miles</SelectItem>
                    <SelectItem value="any">Willing to relocate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Building className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Based on your preferences, we've found <strong>12 facilities</strong> in your area
                  actively looking for{" "}
                  {formData.profession
                    ? professions.find((p) => p.value === formData.profession)?.label
                    : "healthcare professionals"}
                  .
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button className="gap-2">
                  Complete Registration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
