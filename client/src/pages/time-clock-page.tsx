import React, { useState, useEffect } from 'react';
import { useTimeClocks } from '@/contexts/TimeClockContext';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Calendar } from "lucide-react";

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
    clockOut(0); // no break
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
    </div>
  );
}