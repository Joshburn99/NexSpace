import React from 'react';
import { DragDropDashboard } from "@/components/dashboard/DragDropDashboard";
import { Toaster } from "@/components/ui/toaster";

// Main dashboard component with drag & drop functionality
export default function FacilityUserDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <DragDropDashboard onLayoutChange={(widgets) => {
        console.log('Dashboard layout changed:', widgets);
      }} />
      <Toaster />
    </div>
  );
}