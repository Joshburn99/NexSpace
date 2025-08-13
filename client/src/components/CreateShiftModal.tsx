import { useState } from "react";
import { useShifts } from "@/contexts/ShiftContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, X } from "lucide-react";

interface CreateShiftModalProps {
  date: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateShiftModal({ date, isOpen, onClose }: CreateShiftModalProps) {
  const { addShift } = useShifts();
  const [formData, setFormData] = useState({
    title: "",
    facilityName: "",
    department: "",
    specialty: "",
    startTime: "07:00",
    endTime: "19:00",
    rate: 45,
    premiumMultiplier: 1.0,
    urgency: "medium" as const,
    description: "",
    requiredStaff: 1,
    specialRequirements: [] as string[],
  });
  const [newRequirement, setNewRequirement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      await addShift({
        ...formData,
        facilityId: 1, // Default facility ID
        date,
        status: "open",
        assignedStaffIds: [],
        createdById: 1, // Current user ID
        // Add compatibility fields
        hourlyRate: formData.rate, // Duplicate as hourlyRate for compatibility
        requirements: formData.specialRequirements, // Duplicate as requirements for compatibility
      });

      // Reset form
      setFormData({
        title: "",
        facilityName: "",
        department: "",
        specialty: "",
        startTime: "07:00",
        endTime: "19:00",
        rate: 45,
        premiumMultiplier: 1.0,
        urgency: "medium",
        description: "",
        requiredStaff: 1,
        specialRequirements: [],
      });

      onClose();
    } catch (error) {

    } finally {
      setIsSubmitting(false);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim() && !formData.specialRequirements.includes(newRequirement.trim())) {
      setFormData((prev) => ({
        ...prev,
        specialRequirements: [...prev.specialRequirements, newRequirement.trim()],
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (requirement: string) => {
    setFormData((prev) => ({
      ...prev,
      specialRequirements: prev.specialRequirements.filter((req) => req !== requirement),
    }));
  };

  const handleClose = () => {
    setFormData({
      title: "",
      facilityName: "",
      department: "",
      specialty: "",
      startTime: "07:00",
      endTime: "19:00",
      rate: 45,
      premiumMultiplier: 1.0,
      urgency: "medium",
      description: "",
      requiredStaff: 1,
      specialRequirements: [],
    });
    onClose();
  };

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Shift
          </DialogTitle>
          <DialogDescription>
            Create a new open shift for {new Date(date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Shift Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., ICU Night Shift - RN"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityName">Facility Name</Label>
              <Input
                id="facilityName"
                value={formData.facilityName}
                onChange={(e) => setFormData((prev) => ({ ...prev, facilityName: e.target.value }))}
                placeholder="e.g., Portland General Hospital"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICU">ICU</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Med/Surg">Med/Surg</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="L&D">L&D</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                  <SelectItem value="Oncology">Oncology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Registered Nurse">Registered Nurse</SelectItem>
                  <SelectItem value="Licensed Practical Nurse">Licensed Practical Nurse</SelectItem>
                  <SelectItem value="Certified Nursing Assistant">
                    Certified Nursing Assistant
                  </SelectItem>
                  <SelectItem value="Nurse Practitioner">Nurse Practitioner</SelectItem>
                  <SelectItem value="Physician Assistant">Physician Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time and Compensation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Rate ($/hour)</Label>
              <Input
                id="rate"
                type="number"
                min="20"
                max="100"
                step="0.25"
                value={formData.rate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="premiumMultiplier">Premium</Label>
              <Select
                value={formData.premiumMultiplier.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, premiumMultiplier: parseFloat(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.premiumMultiplier === 1.0
                      ? "1.0x (Standard)"
                      : `${formData.premiumMultiplier}x (+${Math.round((formData.premiumMultiplier - 1) * 100)}%)`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0x (Standard)</SelectItem>
                  <SelectItem value="1.1">1.1x (+10%)</SelectItem>
                  <SelectItem value="1.15">1.15x (+15%)</SelectItem>
                  <SelectItem value="1.25">1.25x (+25%)</SelectItem>
                  <SelectItem value="1.35">1.35x (+35%)</SelectItem>
                  <SelectItem value="1.5">1.5x (+50%)</SelectItem>
                  <SelectItem value="1.7">1.7x (+70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, urgency: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredStaff">Required Staff</Label>
              <Input
                id="requiredStaff"
                type="number"
                min="1"
                max="10"
                value={formData.requiredStaff}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, requiredStaff: parseInt(e.target.value) }))
                }
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about the shift requirements..."
              rows={3}
            />
          </div>

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label>Special Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="e.g., BLS, ACLS, Critical Care Experience"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" onClick={addRequirement} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.specialRequirements.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialRequirements.map((req, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {req}
                    <button
                      type="button"
                      onClick={() => removeRequirement(req)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.facilityName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Creating..." : "Create Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
