import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function CalendarSyncSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch calendar sync status
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ['/api/calendar-sync/status'],
    queryFn: async () => {
      const response = await fetch('/api/calendar-sync/status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch sync status');
      return response.json();
    }
  });

  // Enable iCal feed mutation
  const enableICalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/calendar-sync/ical/enable', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-sync/status'] });
      toast({
        title: 'Calendar feed enabled',
        description: 'Your calendar feed URL has been generated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to enable calendar feed.',
        variant: 'destructive',
      });
    }
  });

  // Disable iCal feed mutation
  const disableICalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/calendar-sync/ical/disable', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-sync/status'] });
      toast({
        title: 'Calendar feed disabled',
        description: 'Your calendar feed has been disabled.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to disable calendar feed.',
        variant: 'destructive',
      });
    }
  });

  // Connect Google Calendar
  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar-sync/google/auth', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to get auth URL');
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start Google Calendar authentication.',
        variant: 'destructive',
      });
    }
  });

  // Sync to Google Calendar
  const syncGoogleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/calendar-sync/google/sync', 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: 'Sync complete',
        description: 'Your shifts have been synced to Google Calendar.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to sync with Google Calendar.',
        variant: 'destructive',
      });
    }
  });

  // Disconnect Google Calendar
  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/calendar-sync/google/disconnect', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-sync/status'] });
      toast({
        title: 'Disconnected',
        description: 'Google Calendar has been disconnected.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Calendar.',
        variant: 'destructive',
      });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Calendar feed URL copied to clipboard.',
    });
  };

  if (isLoading) {
    return <div>Loading calendar sync settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Sync
          </CardTitle>
          <CardDescription>
            Sync your NexSpace schedule with external calendar applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* iCal Feed Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ical-feed">iCal Feed</Label>
                <p className="text-sm text-muted-foreground">
                  Subscribe to your schedule in any calendar app that supports iCal
                </p>
              </div>
              <Switch
                id="ical-feed"
                checked={syncStatus?.icalFeed?.enabled || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enableICalMutation.mutate();
                  } else {
                    disableICalMutation.mutate();
                  }
                }}
                disabled={enableICalMutation.isPending || disableICalMutation.isPending}
              />
            </div>

            {syncStatus?.icalFeed?.enabled && syncStatus?.icalFeed?.url && (
              <div className="space-y-2">
                <Label>Feed URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={syncStatus.icalFeed.url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(syncStatus.icalFeed.url)}
                  >
                    {copiedUrl ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this URL and add it to your calendar app (Google Calendar, Apple Calendar, Outlook, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Google Calendar Section */}
          <div className="border-t pt-6">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label>Google Calendar</Label>
                <p className="text-sm text-muted-foreground">
                  Connect your Google account for automatic two-way sync
                </p>
              </div>

              {!syncStatus?.googleCalendar?.connected ? (
                <Button
                  onClick={() => connectGoogleMutation.mutate()}
                  disabled={connectGoogleMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Google Calendar
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => syncGoogleMutation.mutate()}
                    disabled={syncGoogleMutation.isPending}
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                  <Button
                    onClick={() => disconnectGoogleMutation.mutate()}
                    disabled={disconnectGoogleMutation.isPending}
                    variant="destructive"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium mb-2">How to use:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>iCal Feed:</strong> Copy the URL and add it to your calendar app's subscription feature</li>
              <li>• <strong>Google Calendar:</strong> Connect your account for automatic sync of all shifts</li>
              <li>• Changes in NexSpace will automatically appear in your external calendar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}