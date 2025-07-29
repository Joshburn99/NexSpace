import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Filter, 
  Plus, 
  Download,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  specialty: string;
  status: 'open' | 'filled' | 'partially_filled';
  urgency: 'low' | 'medium' | 'high';
  requiredWorkers: number;
  assignedWorkers: number;
  rate: number;
}

export function FacilityShifts() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: async () => {
      const response = await fetch('/api/shifts', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
  });

  const departments = ['all', 'Emergency', 'ICU', 'Surgery', 'Medical-Surgical', 'Pediatrics'];
  const statuses = ['all', 'open', 'filled', 'partially_filled'];

  const filteredShifts = shifts?.filter((shift: Shift) => {
    if (selectedDepartment !== 'all' && shift.department !== selectedDepartment) return false;
    if (selectedStatus !== 'all' && shift.status !== selectedStatus) return false;
    if (searchQuery && !shift.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const calendarEvents = filteredShifts?.map((shift: Shift) => ({
    id: shift.id,
    title: `${shift.title} (${shift.assignedWorkers || 0}/${shift.requiredWorkers})`,
    start: `${shift.date}T${shift.startTime}`,
    end: `${shift.date}T${shift.endTime}`,
    backgroundColor: 
      shift.status === 'filled' ? '#10b981' : 
      shift.status === 'partially_filled' ? '#f59e0b' : 
      '#ef4444',
    borderColor: 'transparent',
    extendedProps: shift,
  }));

  const stats = {
    total: shifts?.length || 0,
    open: shifts?.filter((s: Shift) => s.status === 'open').length || 0,
    filled: shifts?.filter((s: Shift) => s.status === 'filled').length || 0,
    partiallyFilled: shifts?.filter((s: Shift) => s.status === 'partially_filled').length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-muted-foreground">Schedule and manage facility shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partially Filled</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.partiallyFilled}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filled</p>
                <p className="text-2xl font-bold text-green-600">{stats.filled}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : 
                     status === 'partially_filled' ? 'Partially Filled' :
                     status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search shifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <div className="ml-auto">
              <Button
                variant={view === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('calendar')}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('list')}
                className="ml-2"
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar/List View */}
      {view === 'calendar' ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                events={calendarEvents}
                height="auto"
                eventClick={(info) => {
                  console.log('Shift clicked:', info.event.extendedProps);
                }}
                dateClick={(info) => {
                  console.log('Date clicked:', info.dateStr);
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredShifts?.map((shift: Shift) => (
                <div key={shift.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        shift.status === 'filled' ? "bg-green-500" :
                        shift.status === 'partially_filled' ? "bg-yellow-500" :
                        "bg-red-500"
                      )} />
                      <div>
                        <h4 className="font-medium">{shift.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {shift.date} • {shift.startTime} - {shift.endTime} • {shift.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={shift.urgency === 'high' ? 'destructive' : 'secondary'}>
                        {shift.urgency}
                      </Badge>
                      <Badge variant="outline">
                        {shift.assignedWorkers || 0}/{shift.requiredWorkers} workers
                      </Badge>
                      <span className="font-medium">${shift.rate}/hr</span>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}