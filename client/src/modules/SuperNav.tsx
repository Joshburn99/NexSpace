import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Grid, 
  ChevronDown, 
  Search,
  Home,
  Shield,
  Building2,
  Calendar,
  BarChart3,
  CreditCard,
  Users
} from "lucide-react";
import { routes, getRoutesByGroup, getAllGroups, getGroupLabel, RouteGroup } from "@/routes/registry";

interface SuperNavProps {
  className?: string;
}

export function SuperNav({ className }: SuperNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<RouteGroup | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [, setLocation] = useLocation();
  
  // Get current user from auth hook
  const { user } = useAuth();

  // Only show for superusers - handle different role formats
  const userRole = user?.role;
  if (!userRole) {
    console.log("[SuperNav] No user role found");
    return null;
  }
  
  const normalizedRole = userRole.toLowerCase().replace(/\s+/g, '_');
  const isSuperuser = normalizedRole === "super_admin" || 
                      normalizedRole === "admin" ||
                      userRole === "Super Admin";
  
  console.log("[SuperNav] User role:", userRole, "Normalized:", normalizedRole, "Is Superuser:", isSuperuser);
  
  if (!isSuperuser) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  // Filter routes based on search query
  const filteredRoutes = searchQuery
    ? routes.filter(route => 
        route.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : routes;

  // Group filtered routes
  const groupedRoutes = getAllGroups().reduce((acc, group) => {
    const groupRoutes = filteredRoutes.filter(route => route.group === group);
    if (groupRoutes.length > 0) {
      acc[group] = groupRoutes;
    }
    return acc;
  }, {} as Record<RouteGroup, typeof routes>);

  const getGroupIcon = (group: RouteGroup) => {
    switch (group) {
      case "OVERVIEW":
        return Home;
      case "ADMIN":
        return Shield;
      case "FACILITY":
        return Building2;
      case "SCHEDULING":
        return Calendar;
      case "ANALYTICS":
        return BarChart3;
      case "BILLING":
        return CreditCard;
      case "WORKER":
        return Users;
      default:
        return Grid;
    }
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsOpen(false);
    setSearchQuery("");
    setActiveGroup(null);
  };

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8, // 8px gap below button
      left: Math.max(10, rect.left - 400 + rect.width / 2) // Center under button but keep on screen
    };
  };

  const dropdownPosition = isOpen ? getDropdownPosition() : { top: 0, left: 0 };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md",
          "bg-blue-600 text-white hover:bg-blue-700",
          "transition-colors duration-200",
          className
        )}
        aria-expanded={isOpen}
        aria-controls="super-nav-dropdown"
        aria-label="All Pages Navigation"
      >
        <Grid className="h-4 w-4" />
        <span className="hidden sm:inline">All Pages</span>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          id="super-nav-dropdown"
          className="fixed z-[100] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: "800px",
            maxHeight: "calc(100vh - 100px)"
          }}
        >
          {/* Search Bar */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex h-[500px]">
            {/* Groups List */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Categories
                </h3>
                <nav className="space-y-1">
                  {Object.keys(groupedRoutes).map((group) => {
                    const Icon = getGroupIcon(group as RouteGroup);
                    const isActive = activeGroup === group;
                    const routeCount = groupedRoutes[group as RouteGroup].length;

                    return (
                      <button
                        key={group}
                        onClick={() => setActiveGroup(group as RouteGroup)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                          isActive
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-700 hover:bg-white hover:text-gray-900"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{getGroupLabel(group as RouteGroup)}</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                          {routeCount}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Routes List */}
            <div className="flex-1 overflow-y-auto">
              {activeGroup ? (
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {getGroupLabel(activeGroup)}
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {groupedRoutes[activeGroup]?.map((route) => (
                      <button
                        key={route.path}
                        onClick={() => handleNavigation(route.path)}
                        className="text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                              {route.label}
                            </div>
                            {route.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {route.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1 font-mono">
                              {route.path}
                            </div>
                          </div>
                          {route.required && route.required.length > 0 && (
                            <span className="ml-2 text-xs text-gray-400" title="Requires permissions">
                              🔒
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchQuery ? (
                // Show all filtered results when searching
                <div className="p-4">
                  <h2 className="text-sm text-gray-500 mb-3">
                    {filteredRoutes.length} results found
                  </h2>
                  <div className="space-y-1">
                    {filteredRoutes.map((route) => (
                      <button
                        key={route.path}
                        onClick={() => handleNavigation(route.path)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                              {route.label}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {getGroupLabel(route.group)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 font-mono">
                            {route.path}
                          </span>
                        </div>
                        {route.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {route.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Default view
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Grid className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Select a category to view pages</p>
                    <p className="text-xs mt-2">or search for a specific page</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{routes.length} total pages</span>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}