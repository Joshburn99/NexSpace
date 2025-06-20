import React, { useState, useEffect } from 'react';
import { useTimeClocks } from '@/contexts/TimeClockContext';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, DollarSign, Calendar, Edit, FileSignature } from "lucide-react";

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export default function TimeClockPage() {
  const { currentIn, logs, clockIn, clockOut } = useTimeClocks();
  const { user: currentUser } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [clockOutData, setClockOutData] = useState({
    clockInTime: '',
    clockOutTime: '',
    breakDuration: 0,
    notes: '',
    supervisorSignature: '',
    supervisorName: ''
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentIn) {
      const start = new Date(currentIn).getTime();
      timer = setInterval(() => setElapsed(Date.now() - start), 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [currentIn]);

  const handleClockOut = () => {
    if (!currentIn) return;
    
    // Initialize clock out dialog with current times
    const now = new Date();
    const clockInDate = new Date(currentIn);
    
    setClockOutData({
      clockInTime: clockInDate.toISOString().slice(0, 16), // Format for datetime-local input
      clockOutTime: now.toISOString().slice(0, 16),
      breakDuration: 0,
      notes: '',
      supervisorSignature: '',
      supervisorName: ''
    });
    
    setShowClockOutDialog(true);
  };

  const handleSubmitClockOut = () => {
    if (!clockOutData.clockInTime || !clockOutData.clockOutTime) return;
    
    // Submit the work log with all the enhanced data
    clockOut({
      clockInTime: clockOutData.clockInTime,
      clockOutTime: clockOutData.clockOutTime,
      breakDuration: clockOutData.breakDuration,
      notes: clockOutData.notes,
      supervisorName: clockOutData.supervisorName,
      supervisorSignature: clockOutData.supervisorSignature
    });
    
    setShowClockOutDialog(false);
  };

  const formatTimeForInput = (dateString: string) => {
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const calculateAdjustedEarnings = () => {
    if (!clockOutData.clockInTime || !clockOutData.clockOutTime) return 0;
    
    const start = new Date(clockOutData.clockInTime).getTime();
    const end = new Date(clockOutData.clockOutTime).getTime();
    const totalHours = (end - start) / (1000 * 60 * 60);
    const workHours = totalHours - (clockOutData.breakDuration / 60);
    
    return workHours * currentRate;
  };

  const currentRate = (currentUser as any)?.rate ?? 25;
  const currentEarnings = (elapsed / 3600000) * currentRate;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Clock</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your work hours and earnings
        </p>
      </div>

      {/* Clock In/Out Section */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            {currentIn ? 'Currently Working' : 'Ready to Clock In'}
          </CardTitle>
          <CardDescription>
            {currentIn ? `Started at ${new Date(currentIn).toLocaleTimeString()}` : 'Click to start your shift'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentIn ? (
            <Button 
              onClick={clockIn} 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Clock className="w-5 h-5 mr-2" />
              Clock In
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">Time Elapsed</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDuration(elapsed)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">Current Earnings</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      ${currentEarnings.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Button 
                onClick={handleClockOut} 
                size="lg" 
                variant="destructive" 
                className="w-full"
              >
                Clock Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent {(currentUser as any)?.role === 'contractor' ? 'Invoices' : 'Work Logs'}
          </CardTitle>
          <CardDescription>
            Your recent work history and earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.filter(l => l.userId === currentUser?.id.toString()).length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No work logs yet. Clock in to start tracking your time!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs
                .filter(l => l.userId === currentUser?.id.toString())
                .map(log => (
                  <Card key={log.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Clock In</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(log.clockIn).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Clock Out</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(log.clockOut).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Duration</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDuration(
                              new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()
                            )}
                          </p>
                          {log.breakDuration > 0 && (
                            <p className="text-xs text-gray-500">
                              Break: {log.breakDuration} min
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Earnings</p>
                          <p className="text-lg font-bold text-green-600">
                            ${log.earnings.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Rate: ${log.rate}/hr
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clock Out Review Dialog */}
      <Dialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Review & Submit Timesheet
            </DialogTitle>
            <DialogDescription>
              Review your work session details before submitting. You can adjust times and add notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Time Adjustments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clockInTime" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Clock In Time
                </Label>
                <Input
                  id="clockInTime"
                  type="datetime-local"
                  value={clockOutData.clockInTime}
                  onChange={(e) => setClockOutData(prev => ({
                    ...prev,
                    clockInTime: e.target.value
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clockOutTime" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Clock Out Time
                </Label>
                <Input
                  id="clockOutTime"
                  type="datetime-local"
                  value={clockOutData.clockOutTime}
                  onChange={(e) => setClockOutData(prev => ({
                    ...prev,
                    clockOutTime: e.target.value
                  }))}
                />
              </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
              <Input
                id="breakDuration"
                type="number"
                min="0"
                max="480"
                value={clockOutData.breakDuration}
                onChange={(e) => setClockOutData(prev => ({
                  ...prev,
                  breakDuration: parseInt(e.target.value) || 0
                }))}
                placeholder="Enter break time in minutes"
              />
            </div>

            {/* Earnings Preview */}
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Adjusted Earnings:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${calculateAdjustedEarnings().toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={clockOutData.notes}
                onChange={(e) => setClockOutData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Add any notes about your shift, tasks completed, or issues encountered..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Supervisor Signature Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                <Label className="text-base font-medium">Supervisor Approval (Optional)</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supervisorName">Supervisor Name</Label>
                  <Input
                    id="supervisorName"
                    value={clockOutData.supervisorName}
                    onChange={(e) => setClockOutData(prev => ({
                      ...prev,
                      supervisorName: e.target.value
                    }))}
                    placeholder="Enter supervisor's full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supervisorSignature">Digital Signature</Label>
                  <Input
                    id="supervisorSignature"
                    value={clockOutData.supervisorSignature}
                    onChange={(e) => setClockOutData(prev => ({
                      ...prev,
                      supervisorSignature: e.target.value
                    }))}
                    placeholder="Supervisor types their name to sign"
                  />
                </div>
              </div>
              
              {clockOutData.supervisorName && clockOutData.supervisorSignature && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ✓ Approved by: {clockOutData.supervisorName}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Signature: {clockOutData.supervisorSignature}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSubmitClockOut}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!clockOutData.clockInTime || !clockOutData.clockOutTime}
              >
                Submit Timesheet
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowClockOutDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}