import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Calendar,
  Users,
  MessageSquare,
  Clock,
  AlertCircle,
  X,
  UserPlus,
  FileText,
  Send,
  ClipboardList,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: () => void;
  permissions?: string[];
  roles?: string[];
}

export function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide FAB when scrolling down, show when scrolling up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Define quick actions based on user role
  const quickActions: QuickAction[] = [
    {
      id: "create-shift",
      label: "Create Shift",
      icon: <Calendar className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100 hover:bg-blue-200",
      action: () => {
        setLocation("/scheduling/shifts?action=create");
        setIsOpen(false);
      },
      permissions: ["create_shifts"],
      roles: ["super_admin", "facility_admin", "scheduler"],
    },
    {
      id: "urgent-shift",
      label: "Urgent Shift",
      icon: <AlertCircle className="h-5 w-5" />,
      color: "text-red-600",
      bgColor: "bg-red-100 hover:bg-red-200",
      action: () => {
        setLocation("/scheduling/shifts?action=create-urgent");
        setIsOpen(false);
      },
      permissions: ["create_shifts"],
      roles: ["super_admin", "facility_admin", "scheduler"],
    },
    {
      id: "assign-staff",
      label: "Quick Assign",
      icon: <UserPlus className="h-5 w-5" />,
      color: "text-green-600",
      bgColor: "bg-green-100 hover:bg-green-200",
      action: () => {
        setLocation("/scheduling/assignments");
        setIsOpen(false);
      },
      permissions: ["edit_shifts"],
      roles: ["super_admin", "facility_admin", "scheduler"],
    },
    {
      id: "team-message",
      label: "Team Message",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100 hover:bg-purple-200",
      action: () => {
        setLocation("/messaging?action=compose");
        setIsOpen(false);
      },
      roles: ["super_admin", "facility_admin", "scheduler", "employee", "contractor"],
    },
    {
      id: "time-clock",
      label: "Time Clock",
      icon: <Clock className="h-5 w-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100 hover:bg-orange-200",
      action: () => {
        setLocation("/time-clock");
        setIsOpen(false);
      },
      roles: ["employee", "contractor"],
    },
    {
      id: "today-schedule",
      label: "Today's Schedule",
      icon: <ClipboardList className="h-5 w-5" />,
      color: "text-teal-600",
      bgColor: "bg-teal-100 hover:bg-teal-200",
      action: () => {
        const today = new Date().toISOString().split('T')[0];
        setLocation(`/scheduling/calendar?date=${today}`);
        setIsOpen(false);
      },
      roles: ["super_admin", "facility_admin", "scheduler", "employee", "contractor"],
    },
    {
      id: "submit-timeoff",
      label: "Request Time Off",
      icon: <FileText className="h-5 w-5" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 hover:bg-indigo-200",
      action: () => {
        setLocation("/time-off?action=request");
        setIsOpen(false);
      },
      roles: ["employee", "contractor"],
    },
    {
      id: "broadcast",
      label: "Send Broadcast",
      icon: <Send className="h-5 w-5" />,
      color: "text-pink-600",
      bgColor: "bg-pink-100 hover:bg-pink-200",
      action: () => {
        setLocation("/messaging?action=broadcast");
        setIsOpen(false);
      },
      permissions: ["send_broadcasts"],
      roles: ["super_admin", "facility_admin"],
    },
    {
      id: "shift-report",
      label: "Shift Report",
      icon: <Activity className="h-5 w-5" />,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 hover:bg-cyan-200",
      action: () => {
        setLocation("/reports/shifts");
        setIsOpen(false);
      },
      permissions: ["view_reports"],
      roles: ["super_admin", "facility_admin", "scheduler"],
    },
  ];

  // Filter actions based on user role and permissions
  const availableActions = quickActions.filter((action) => {
    // Check role
    if (action.roles && !action.roles.includes(user?.role || "")) {
      return false;
    }

    // Check permissions if specified
    if (action.permissions) {
      // Skip permission check for now as user object doesn't have permissions property
      // TODO: Add permissions to user object or fetch from context
      return true;
    }

    return true;
  });

  // Don't render if user doesn't have any available actions
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Quick Action Menu Container */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-transform duration-300",
          !isVisible && "translate-y-32"
        )}
      >
        {/* Action Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 mb-2"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-3 min-w-[240px] max-h-[400px] overflow-y-auto">
                <div className="flex items-center justify-between mb-3 pb-2 border-b dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Quick Actions
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {availableActions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={action.action}
                      className={cn(
                        "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                        action.bgColor,
                        "dark:bg-opacity-20 dark:hover:bg-opacity-30"
                      )}
                    >
                      <div className={cn("flex-shrink-0", action.color)}>
                        {action.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-left">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative w-14 h-14 rounded-full shadow-lg transition-all duration-300",
            "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
            "flex items-center justify-center text-white",
            "focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800",
            isOpen && "rotate-45"
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-6 w-6" />
          </motion.div>
          
          {/* Pulse animation for attention */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
          )}
        </motion.button>

        {/* Tooltip on hover (desktop only) */}
        {!isOpen && (
          <div className="hidden md:block absolute bottom-0 right-16 mb-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            >
              Quick Actions
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}