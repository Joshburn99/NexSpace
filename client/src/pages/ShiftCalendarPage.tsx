import React from 'react';
import ShiftCalendar from '../components/ShiftCalendar';

const ShiftCalendarPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Healthcare Shift Management</h1>
        <p className="text-muted-foreground">
          Manage multi-worker shift assignments and view real-time staffing levels
        </p>
      </div>
      
      <ShiftCalendar />
    </div>
  );
};

export default ShiftCalendarPage;