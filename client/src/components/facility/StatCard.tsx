import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  color = 'blue',
  className 
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
  };

  const TrendIcon = trend && trend.value > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 pt-1">
                <TrendIcon className={cn(
                  "w-4 h-4",
                  trend.value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  trend.value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-sm text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}