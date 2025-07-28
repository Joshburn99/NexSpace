import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';

export function TopBar() {
  const { user, impersonatedUser, quitImpersonation, originalUser } = useAuth();
  const currentUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser && !!originalUser;
  const isContractor = currentUser?.role === 'contractor';
  const isEmployee = currentUser?.role === 'employee';
  
  console.log('TopBar render:', { 
    user, 
    impersonatedUser, 
    originalUser, 
    isImpersonating,
    currentUser 
  });

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isContractor ? 'Contractor Dashboard' : 
             isEmployee ? 'Employee Dashboard' : 
             'NexSpace'}
          </h1>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center space-x-4">
        {isImpersonating && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <User className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Viewing as {currentUser?.firstName} {currentUser?.lastName}
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
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs">
                {currentUser?.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}