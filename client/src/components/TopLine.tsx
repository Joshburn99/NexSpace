import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, LogOut } from "lucide-react";

export function TopLine() {
  const { user, impersonatedUser, quitImpersonation, originalUser } = useAuth();
  const currentUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser;
  const isContractor = currentUser?.role === "contractor";

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-6 py-3 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isContractor ? "Contractor Dashboard" : "Employee Dashboard"}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Select defaultValue="all-facilities">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select facility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-facilities">All Facilities</SelectItem>
            <SelectItem value="portland-general">Portland General</SelectItem>
            <SelectItem value="mercy-medical">Mercy Medical</SelectItem>
            <SelectItem value="st-mary">St. Mary's</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>

        <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
            3
          </span>
        </button>

        {isImpersonating && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Viewing as {currentUser?.firstName}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={quitImpersonation}
              className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Quit
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <Badge variant="secondary" className="text-xs">
              {currentUser?.role}
            </Badge>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              {currentUser?.firstName?.[0]}
              {currentUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
