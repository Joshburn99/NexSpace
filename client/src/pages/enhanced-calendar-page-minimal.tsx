import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function EnhancedCalendarPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Enhanced Calendar - Under Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The Enhanced Calendar page is currently being optimized and refactored for better performance.
            Please check back later or use the standard calendar view.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}