import React, { useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Users,
  Calendar,
  BarChart3,
  FileText,
  Briefcase,
  Settings,
  Shield,
  ChevronRight,
  Grid,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href?: string;
  icon: any;
  items?: { label: string; href: string; description?: string }[];
}

interface CompactNavigationDropdownProps {
  navigationItems: NavigationItem[];
  onClose: () => void;
}

export function CompactNavigationDropdown({ navigationItems, onClose }: CompactNavigationDropdownProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const getSectionIcon = (label: string) => {
    switch (label) {
      case "Dashboard":
        return Home;
      case "Facilities":
        return Building2;
      case "Workforce":
        return Users;
      case "Scheduling":
        return Calendar;
      case "Analytics":
        return BarChart3;
      case "Reports":
        return FileText;
      case "Job Board":
        return Briefcase;
      case "Admin":
        return Shield;
      case "Settings":
        return Settings;
      default:
        return Grid;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute top-16 left-4 right-4 max-w-6xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-12 h-[80vh] max-h-[600px]">
          {/* Main Categories - Left Side */}
          <div className="col-span-3 bg-gray-50 border-r border-gray-200">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = getSectionIcon(item.label);
                  const isActive = activeSection === item.label;
                  const hasSubItems = item.items && item.items.length > 0;

                  if (!hasSubItems) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href || "/"}
                        onClick={onClose}
                      >
                        <a
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            "hover:bg-gray-100 hover:text-gray-900",
                            "text-gray-700"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </a>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveSection(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        "hover:bg-gray-100 hover:text-gray-900",
                        isActive ? "bg-gray-100 text-gray-900" : "text-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isActive && "rotate-90"
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sub Items - Right Side */}
          <div className="col-span-9 bg-white">
            {activeSection ? (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {activeSection}
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {navigationItems
                    .find((item) => item.label === activeSection)
                    ?.items?.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onClose}
                      >
                        <a className="group flex flex-col py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                          <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {subItem.label}
                          </span>
                          {subItem.description && (
                            <span className="text-xs text-gray-500 mt-1">
                              {subItem.description}
                            </span>
                          )}
                        </a>
                      </Link>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Grid className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a category to view options</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}