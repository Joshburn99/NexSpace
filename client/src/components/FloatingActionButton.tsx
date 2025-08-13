import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Users,
  Calendar,
  MessageSquare,
  Clock,
  FileText,
  Send,
  X,
  Zap,
  UserPlus,
  CalendarPlus,
  ClipboardList,
  Bell,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { hasPermission } from '@/lib/permissions';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  permission?: string;
}

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide FAB on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close FAB when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const quickActions: QuickAction[] = [
    {
      id: 'add-shift',
      label: 'Create Shift',
      icon: <CalendarPlus className="w-5 h-5" />,
      onClick: () => {
        setLocation('/shifts?action=create');
        toast({
          title: 'Opening Shift Creator',
          description: 'Create a new shift assignment',
        });
      },
      color: 'bg-blue-500 hover:bg-blue-600',
      permission: 'shifts.create',
    },
    {
      id: 'add-staff',
      label: 'Add Staff',
      icon: <UserPlus className="w-5 h-5" />,
      onClick: () => {
        setLocation('/staff?action=add');
        toast({
          title: 'Opening Staff Manager',
          description: 'Add a new team member',
        });
      },
      color: 'bg-green-500 hover:bg-green-600',
      permission: 'staff.create',
    },
    {
      id: 'quick-message',
      label: 'Team Message',
      icon: <MessageSquare className="w-5 h-5" />,
      onClick: () => {
        setLocation('/messaging?action=compose');
        toast({
          title: 'Opening Messenger',
          description: 'Send a message to your team',
        });
      },
      color: 'bg-purple-500 hover:bg-purple-600',
      permission: 'messaging.send',
    },
    {
      id: 'view-schedule',
      label: 'View Schedule',
      icon: <Calendar className="w-5 h-5" />,
      onClick: () => {
        setLocation('/calendar');
        toast({
          title: 'Opening Calendar',
          description: 'View team schedule',
        });
      },
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 'clock-in',
      label: 'Time Clock',
      icon: <Clock className="w-5 h-5" />,
      onClick: () => {
        setLocation('/time-clock');
        toast({
          title: 'Opening Time Clock',
          description: 'Clock in or out',
        });
      },
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      onClick: () => {
        setLocation('/notifications');
        toast({
          title: 'Opening Notifications',
          description: 'View your notifications',
        });
      },
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  // Filter actions based on user permissions
  const availableActions = quickActions.filter(action => {
    if (!action.permission) return true;
    if (!user) return false;
    return hasPermission(user.role as any, action.permission);
  });

  // Don't render if no actions available
  if (availableActions.length === 0) return null;

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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isVisible ? 1 : 0.8,
          opacity: isVisible ? 1 : 0,
          y: isVisible ? 0 : 100,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        {/* Quick Action Buttons */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 space-y-3"
            >
              {availableActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ scale: 0, opacity: 0, x: 50 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    x: 0,
                  }}
                  exit={{ 
                    scale: 0, 
                    opacity: 0, 
                    x: 50,
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 500,
                    damping: 25,
                  }}
                  className="flex items-center justify-end gap-3"
                >
                  {/* Label */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap"
                  >
                    {action.label}
                  </motion.span>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      action.onClick();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-colors",
                      action.color
                    )}
                  >
                    {action.icon}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300",
            isOpen 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Plus className="w-6 h-6" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full bg-white/30" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Pulse Animation when closed */}
        {!isOpen && (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 w-14 h-14 rounded-full bg-blue-400/30 pointer-events-none"
          />
        )}
      </motion.div>
    </>
  );
}