import React, { useState } from "react";
import { Calendar, Clock, Users, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SchedulingTemplatesPage() {
  const [templates] = useState([
    {
      id: 1,
      name: "ICU Day Shift",
      department: "ICU",
      specialty: "Registered Nurse",
      minStaff: 2,
      maxStaff: 4,
      shiftType: "day",
      startTime: "07:00",
      endTime: "19:00",
      isActive: true,
    },
    {
      id: 2,
      name: "Emergency Night",
      department: "Emergency",
      specialty: "Registered Nurse",
      minStaff: 3,
      maxStaff: 5,
      shiftType: "night",
      startTime: "19:00",
      endTime: "07:00",
      isActive: true,
    },
    {
      id: 3,
      name: "OR Morning",
      department: "Operating Room",
      specialty: "Surgical Technologist",
      minStaff: 1,
      maxStaff: 2,
      shiftType: "day",
      startTime: "06:00",
      endTime: "14:00",
      isActive: false,
    },
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shift Templates</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage reusable shift templates for consistent scheduling
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Template Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold">{new Set(templates.map(t => t.department)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Staff Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.department}</TableCell>
                  <TableCell>{template.specialty}</TableCell>
                  <TableCell>
                    {template.startTime} - {template.endTime}
                  </TableCell>
                  <TableCell>
                    {template.minStaff} - {template.maxStaff} staff
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
// This component has been deprecated. Please use ShiftTemplatesPage instead.
// All scheduling template functionality is now handled by the new unified template system.

export function SchedulingConfigPage() {
  return (
    <div className="p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Page Moved</h1>
        <p className="text-muted-foreground mb-4">
          This page has been moved to the new Shift Templates section.
        </p>
        <p className="text-sm text-muted-foreground">
          Please use the "Shift Templates" option in the sidebar navigation.
        </p>
      </div>
    </div>
  );
}