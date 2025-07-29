import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ShiftManagementSettingsType {
  autoApproveShifts?: boolean;
  requireManagerApproval?: boolean;
  allowSelfCancellation?: boolean;
  cancellationDeadlineHours?: number;
  defaultShiftDurationHours?: number;
  overtimeThresholdHours?: number;
}

interface ShiftManagementSettingsProps {
  facilityId: number;
  canEdit?: boolean;
}

export function ShiftManagementSettings({ facilityId, canEdit = true }: ShiftManagementSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ShiftManagementSettingsType>({
    autoApproveShifts: false,
    requireManagerApproval: true,
    allowSelfCancellation: true,
    cancellationDeadlineHours: 24,
    defaultShiftDurationHours: 8,
    overtimeThresholdHours: 40,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch facility settings
  const { data: facilityData } = useQuery<{ shiftManagementSettings?: ShiftManagementSettingsType }>({
    queryKey: [`/api/facilities/${facilityId}/settings`],
    enabled: !!facilityId,
  });

  useEffect(() => {
    if (facilityData?.shiftManagementSettings) {
      setSettings(facilityData.shiftManagementSettings);
    }
  }, [facilityData]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ShiftManagementSettingsType) => {
      return apiRequest(`/api/facilities/${facilityId}/settings`, "PATCH", {
        shiftManagementSettings: newSettings,
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Shift management settings have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/facilities/${facilityId}/settings`] });
    },
    onError: (error) => {
      console.error("Failed to save settings:", error);
      toast({
        title: "Save failed",
        description: "Could not save shift management settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: keyof ShiftManagementSettingsType, value: boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Shift Management
        </CardTitle>
        <CardDescription>
          Configure automatic shift approval and management policies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-approve">Auto-approve Shifts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve shift applications
              </p>
            </div>
            <Switch
              id="auto-approve"
              checked={settings.autoApproveShifts || false}
              onCheckedChange={(checked) => handleSettingChange("autoApproveShifts", checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-approval">Require Manager Approval</Label>
              <p className="text-sm text-muted-foreground">
                Require manager approval for shifts
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={settings.requireManagerApproval || false}
              onCheckedChange={(checked) => handleSettingChange("requireManagerApproval", checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="self-cancel">Allow Self-cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Workers can cancel their own shifts
              </p>
            </div>
            <Switch
              id="self-cancel"
              checked={settings.allowSelfCancellation || false}
              onCheckedChange={(checked) => handleSettingChange("allowSelfCancellation", checked)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Numeric Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-deadline">
              Cancellation Deadline (hours)
            </Label>
            <Input
              id="cancellation-deadline"
              type="number"
              min="0"
              max="168"
              value={settings.cancellationDeadlineHours || 24}
              onChange={(e) => handleSettingChange("cancellationDeadlineHours", parseInt(e.target.value) || 24)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-duration">
              Default Shift Duration (hours)
            </Label>
            <Input
              id="default-duration"
              type="number"
              min="1"
              max="24"
              value={settings.defaultShiftDurationHours || 8}
              onChange={(e) => handleSettingChange("defaultShiftDurationHours", parseInt(e.target.value) || 8)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overtime-threshold">
              Overtime Threshold (hours/week)
            </Label>
            <Input
              id="overtime-threshold"
              type="number"
              min="0"
              max="168"
              value={settings.overtimeThresholdHours || 40}
              onChange={(e) => handleSettingChange("overtimeThresholdHours", parseInt(e.target.value) || 40)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Save Button */}
        {canEdit && (
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}