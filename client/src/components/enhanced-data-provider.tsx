import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Global data state management
interface GlobalDataState {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime?: Date;
  pendingChanges: number;
}

const DataContext = createContext<{
  globalState: GlobalDataState;
  refreshAll: () => void;
  clearCache: () => void;
} | null>(null);

// Enhanced data provider with offline support and real-time sync
export function EnhancedDataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [globalState, setGlobalState] = useState<GlobalDataState>({
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    pendingChanges: 0,
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setGlobalState(prev => ({ ...prev, isOnline: true }));
      // Retry failed queries when coming back online
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      setGlobalState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  // Background sync for critical data
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (globalState.isOnline && globalState.syncStatus === 'idle') {
        setGlobalState(prev => ({ ...prev, syncStatus: 'syncing' }));
        
        // Invalidate critical queries for background refresh
        queryClient.invalidateQueries({ queryKey: ['/api/facilities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
        queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
        
        setTimeout(() => {
          setGlobalState(prev => ({ 
            ...prev, 
            syncStatus: 'idle',
            lastSyncTime: new Date()
          }));
        }, 2000);
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [globalState.isOnline, globalState.syncStatus, queryClient]);

  const refreshAll = () => {
    queryClient.invalidateQueries();
    toast({
      title: "Data refreshed",
      description: "All data has been refreshed from the server.",
    });
  };

  const clearCache = () => {
    queryClient.clear();
    toast({
      title: "Cache cleared",
      description: "Local data cache has been cleared.",
    });
  };

  return (
    <DataContext.Provider value={{ globalState, refreshAll, clearCache }}>
      {children}
    </DataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within EnhancedDataProvider');
  }
  return context;
}

// Enhanced hooks for common data patterns
export function useApiData<T>(
  endpoint: string,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
    retry?: number | boolean;
  } = {}
) {
  const { globalState } = useGlobalData();
  
  return useQuery<T>({
    queryKey: [endpoint],
    enabled: options.enabled !== false && globalState.isOnline,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options.cacheTime || 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    retry: globalState.isOnline ? (options.retry ?? 2) : false,
    refetchOnReconnect: true,
  });
}

export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    invalidateQueries?: string[];
    optimisticUpdate?: (variables: TVariables) => void;
  } = {}
) {
  const queryClient = useQueryClient();
  const { globalState } = useGlobalData();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables: TVariables) => {
      if (!globalState.isOnline) {
        throw new Error('No internet connection. Changes will be saved when connection is restored.');
      }
      return apiRequest(endpoint, {
        method,
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
      });
    },
    onMutate: (variables) => {
      // Optimistic update
      if (options.optimisticUpdate) {
        options.optimisticUpdate(variables);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(query => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      }
      
      options.onSuccess?.(data, variables);
      
      toast({
        title: "Success",
        description: "Changes saved successfully.",
      });
    },
    onError: (error, variables) => {
      options.onError?.(error, variables);
      
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving changes.",
        variant: "destructive",
      });
    },
  });
}

// Real-time data synchronization hook
export function useRealTimeData<T>(
  endpoint: string,
  eventType?: string,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const { data, ...queryResult } = useApiData<T>(endpoint, { enabled });

  useEffect(() => {
    if (!enabled || !eventType) return;

    // WebSocket connection for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {

      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === eventType) {
            // Invalidate and refetch the query when relevant events occur
            queryClient.invalidateQueries({ queryKey: [endpoint] });
          }
        } catch (error) {

        }
      };
      
      ws.onerror = (error) => {

      };
      
      return () => {
        ws.close();
      };
    } catch (error) {

    }
  }, [endpoint, eventType, enabled, queryClient]);

  return { data, ...queryResult };
}

// Data prefetching utilities
export function usePrefetchData() {
  const queryClient = useQueryClient();

  const prefetchFacilities = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/facilities'],
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  const prefetchStaff = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/staff'],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const prefetchShifts = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/shifts'],
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  return {
    prefetchFacilities,
    prefetchStaff,
    prefetchShifts,
  };
}

// Batch operations hook
export function useBatchOperations() {
  const queryClient = useQueryClient();

  const batchUpdate = async (operations: Array<{
    endpoint: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
  }>) => {
    try {
      const promises = operations.map(op => 
        apiRequest(op.endpoint, {
          method: op.method,
          body: op.data ? JSON.stringify(op.data) : undefined,
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Invalidate all related queries
      queryClient.invalidateQueries();
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      
      if (errorCount === 0) {
        toast({
          title: "Batch operation completed",
          description: `${successCount} operations completed successfully.`,
        });
      } else {
        toast({
          title: "Batch operation completed with errors",
          description: `${successCount} succeeded, ${errorCount} failed.`,
          variant: "destructive",
        });
      }
      
      return results;
    } catch (error) {
      toast({
        title: "Batch operation failed",
        description: "Failed to complete batch operation.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { batchUpdate };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    apiResponseTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
  });

  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          setMetrics(prev => ({
            ...prev,
            renderTime: navEntry.loadEventEnd - navEntry.loadEventStart,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'measure'] });

    return () => observer.disconnect();
  }, []);

  return metrics;
}