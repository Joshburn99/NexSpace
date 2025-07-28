import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  Building2,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavigationProps {
  navigationItems: any[];
  currentUser: any;
  isImpersonating?: boolean;
}

export function EnhancedMobileNavigation({ navigationItems, currentUser, isImpersonating }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const closeNavigation = () => {
    setIsOpen(false);
    setOpenSections([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden p-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
        <SheetHeader className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              NexSpace
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeNavigation}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* User info */}
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
              {currentUser?.firstName?.[0] || currentUser?.username?.[0] || 'U'}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">
                {currentUser?.firstName && currentUser?.lastName 
                  ? `${currentUser.firstName} ${currentUser.lastName}`
                  : currentUser?.username || 'User'
                }
              </p>
              <p className="text-sm text-gray-600 capitalize">
                {currentUser?.role?.replace('_', ' ') || 'User'}
              </p>
            </div>
          </div>

          {/* Impersonation indicator */}
          {isImpersonating && (
            <div className="mt-3 p-2 bg-amber-100 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">
                🎭 Viewing as another user
              </p>
            </div>
          )}
        </SheetHeader>

        <nav className="p-4 space-y-2">
          {navigationItems.map((item, index) => (
            <div key={index}>
              {item.items ? (
                <Collapsible
                  open={openSections.includes(item.label)}
                  onOpenChange={() => toggleSection(item.label)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-12 px-4 text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {openSections.includes(item.label) ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="ml-8 mt-1 space-y-1">
                    {item.items.map((subItem: any, subIndex: number) => (
                      <Link key={subIndex} href={subItem.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-10 px-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          onClick={closeNavigation}
                        >
                          {subItem.label}
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Link href={item.href || '/'}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4 hover:bg-gray-100 transition-colors"
                    onClick={closeNavigation}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Quick actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/help">
              <Button variant="outline" size="sm" className="w-full" onClick={closeNavigation}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="w-full" onClick={closeNavigation}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}