import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type MetricCategory = "staffing" | "scheduling" | "compliance" | "financial" | "quality" | "operational";
export type MetricPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface Insight {
  id: number;
  key: string;
  name: string;
  value: number;
  unit: string;
  category: MetricCategory;
  period: MetricPeriod;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
  target?: number;
  benchmark?: number;
  lastUpdated: string;
  description?: string;
}

export interface KPIMetric {
  id: number;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: MetricCategory;
  status: "excellent" | "good" | "warning" | "critical";
  trend: "improving" | "declining" | "stable";
  changePercent: number;
  lastPeriod: number;
  benchmarkValue?: number;
  description: string;
}

export interface TrendData {
  period: string;
  value: number;
  target?: number;
}

export interface InsightAlert {
  id: number;
  metricKey: string;
  type: "threshold_exceeded" | "target_missed" | "trend_concern" | "data_anomaly";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  actionRequired: boolean;
  createdAt: string;
  resolvedAt?: string;
}

interface InsightsContextType {
  insights: Insight[];
  kpiMetrics: KPIMetric[];
  alerts: InsightAlert[];
  isLoading: boolean;
  getInsightsByCategory: (category: MetricCategory) => Insight[];
  getInsightsByPeriod: (period: MetricPeriod) => Insight[];
  getKPIStatus: () => { excellent: number; good: number; warning: number; critical: number };
  getTrendData: (metricKey: string, periods?: number) => TrendData[];
  updateInsight: (key: string, value: number) => void;
  getComplianceScore: () => number;
  getStaffingEfficiency: () => number;
  getFinancialHealth: () => number;
}

const InsightsContext = createContext<InsightsContextType | null>(null);

// Sample insights data for 100-bed facility
const sampleInsights: Insight[] = [
  // Staffing Metrics
  {
    id: 1,
    key: "total_staff_count",
    name: "Total Staff Count",
    value: 87,
    unit: "employees",
    category: "staffing",
    period: "monthly",
    trend: "up",
    trendPercentage: 5.2,
    target: 90,
    benchmark: 85,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Total number of active employees"
  },
  {
    id: 2,
    key: "staff_utilization_rate",
    name: "Staff Utilization Rate",
    value: 87.5,
    unit: "%",
    category: "staffing",
    period: "weekly",
    trend: "stable",
    trendPercentage: 0.8,
    target: 85,
    benchmark: 82,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of scheduled hours actually worked"
  },
  {
    id: 3,
    key: "overtime_hours",
    name: "Overtime Hours",
    value: 342,
    unit: "hours",
    category: "staffing",
    period: "weekly",
    trend: "down",
    trendPercentage: -12.3,
    target: 300,
    benchmark: 280,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Total overtime hours worked this week"
  },
  {
    id: 4,
    key: "turnover_rate",
    name: "Staff Turnover Rate",
    value: 12.4,
    unit: "%",
    category: "staffing",
    period: "monthly",
    trend: "down",
    trendPercentage: -8.7,
    target: 15,
    benchmark: 18,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Monthly staff turnover percentage"
  },

  // Scheduling Metrics
  {
    id: 5,
    key: "shift_fill_rate",
    name: "Shift Fill Rate",
    value: 94.2,
    unit: "%",
    category: "scheduling",
    period: "weekly",
    trend: "up",
    trendPercentage: 3.1,
    target: 95,
    benchmark: 92,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of shifts successfully filled"
  },
  {
    id: 6,
    key: "last_minute_coverage",
    name: "Last Minute Coverage",
    value: 23,
    unit: "shifts",
    category: "scheduling",
    period: "weekly",
    trend: "down",
    trendPercentage: -18.5,
    target: 20,
    benchmark: 25,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Shifts filled within 24 hours of start time"
  },
  {
    id: 7,
    key: "schedule_adherence",
    name: "Schedule Adherence",
    value: 96.3,
    unit: "%",
    category: "scheduling",
    period: "weekly",
    trend: "stable",
    trendPercentage: 1.2,
    target: 95,
    benchmark: 93,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of scheduled shifts worked as planned"
  },

  // Compliance Metrics
  {
    id: 8,
    key: "credential_compliance_rate",
    name: "Credential Compliance",
    value: 91.8,
    unit: "%",
    category: "compliance",
    period: "monthly",
    trend: "up",
    trendPercentage: 2.4,
    target: 95,
    benchmark: 90,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of staff with current credentials"
  },
  {
    id: 9,
    key: "training_completion_rate",
    name: "Training Completion",
    value: 88.7,
    unit: "%",
    category: "compliance",
    period: "quarterly",
    trend: "up",
    trendPercentage: 4.2,
    target: 90,
    benchmark: 85,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of required training completed"
  },
  {
    id: 10,
    key: "audit_score",
    name: "Latest Audit Score",
    value: 94.5,
    unit: "points",
    category: "compliance",
    period: "quarterly",
    trend: "up",
    trendPercentage: 1.8,
    target: 95,
    benchmark: 92,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Most recent regulatory audit score"
  },

  // Financial Metrics
  {
    id: 11,
    key: "monthly_revenue",
    name: "Monthly Revenue",
    value: 245678.90,
    unit: "$",
    category: "financial",
    period: "monthly",
    trend: "up",
    trendPercentage: 8.3,
    target: 250000,
    benchmark: 235000,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Total revenue for current month"
  },
  {
    id: 12,
    key: "labor_cost_percentage",
    name: "Labor Cost %",
    value: 62.4,
    unit: "%",
    category: "financial",
    period: "monthly",
    trend: "down",
    trendPercentage: -2.1,
    target: 65,
    benchmark: 68,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Labor costs as percentage of revenue"
  },
  {
    id: 13,
    key: "profit_margin",
    name: "Profit Margin",
    value: 5.8,
    unit: "%",
    category: "financial",
    period: "monthly",
    trend: "up",
    trendPercentage: 12.7,
    target: 6,
    benchmark: 5,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Net profit margin percentage"
  },

  // Quality Metrics
  {
    id: 14,
    key: "patient_satisfaction",
    name: "Patient Satisfaction",
    value: 4.6,
    unit: "/5",
    category: "quality",
    period: "monthly",
    trend: "up",
    trendPercentage: 4.5,
    target: 4.5,
    benchmark: 4.2,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Average patient satisfaction rating"
  },
  {
    id: 15,
    key: "staff_satisfaction",
    name: "Staff Satisfaction",
    value: 4.3,
    unit: "/5",
    category: "quality",
    period: "quarterly",
    trend: "stable",
    trendPercentage: 0.9,
    target: 4.2,
    benchmark: 4.0,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Average staff satisfaction rating"
  },
  {
    id: 16,
    key: "incident_rate",
    name: "Incident Rate",
    value: 0.8,
    unit: "per 1000 days",
    category: "quality",
    period: "monthly",
    trend: "down",
    trendPercentage: -15.8,
    target: 1.0,
    benchmark: 1.2,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Safety incidents per 1000 patient days"
  },

  // Operational Metrics
  {
    id: 17,
    key: "bed_occupancy_rate",
    name: "Bed Occupancy Rate",
    value: 92.3,
    unit: "%",
    category: "operational",
    period: "daily",
    trend: "stable",
    trendPercentage: 0.5,
    target: 90,
    benchmark: 88,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of beds currently occupied"
  },
  {
    id: 18,
    key: "average_length_of_stay",
    name: "Avg Length of Stay",
    value: 28.4,
    unit: "days",
    category: "operational",
    period: "monthly",
    trend: "down",
    trendPercentage: -3.2,
    target: 30,
    benchmark: 32,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Average patient length of stay"
  },
  {
    id: 19,
    key: "readmission_rate",
    name: "30-Day Readmission Rate",
    value: 8.7,
    unit: "%",
    category: "operational",
    period: "monthly",
    trend: "down",
    trendPercentage: -12.1,
    target: 10,
    benchmark: 12,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of patients readmitted within 30 days"
  },
  {
    id: 20,
    key: "no_show_rate",
    name: "No Show Rate",
    value: 5.2,
    unit: "%",
    category: "staffing",
    period: "weekly",
    trend: "up",
    trendPercentage: 8.3,
    target: 4,
    benchmark: 6,
    lastUpdated: "2025-06-19T09:00:00Z",
    description: "Percentage of shifts with no-shows"
  }
];

// Generate KPI metrics from insights
const generateKPIMetrics = (insights: Insight[]): KPIMetric[] => {
  return insights.slice(0, 12).map(insight => {
    let status: "excellent" | "good" | "warning" | "critical" = "good";
    
    if (insight.target) {
      const performance = insight.value / insight.target;
      if (performance >= 1.05) status = "excellent";
      else if (performance >= 0.95) status = "good";
      else if (performance >= 0.85) status = "warning";
      else status = "critical";
    }

    const trend = insight.trendPercentage > 5 ? "improving" : 
                 insight.trendPercentage < -5 ? "declining" : "stable";

    return {
      id: insight.id,
      name: insight.name,
      current: insight.value,
      target: insight.target || insight.value * 1.1,
      unit: insight.unit,
      category: insight.category,
      status,
      trend,
      changePercent: insight.trendPercentage,
      lastPeriod: insight.value / (1 + insight.trendPercentage / 100),
      benchmarkValue: insight.benchmark,
      description: insight.description || ""
    };
  });
};

// Generate sample alerts
const generateAlerts = (insights: Insight[]): InsightAlert[] => {
  const alerts: InsightAlert[] = [];

  insights.forEach(insight => {
    if (insight.target && insight.value < insight.target * 0.85) {
      alerts.push({
        id: alerts.length + 1,
        metricKey: insight.key,
        type: "target_missed",
        severity: insight.value < insight.target * 0.7 ? "critical" : "high",
        message: `${insight.name} is significantly below target (${insight.value} vs ${insight.target})`,
        actionRequired: true,
        createdAt: new Date().toISOString()
      });
    }

    if (Math.abs(insight.trendPercentage) > 20) {
      alerts.push({
        id: alerts.length + 1,
        metricKey: insight.key,
        type: "trend_concern",
        severity: insight.trendPercentage < -20 ? "high" : "medium",
        message: `${insight.name} shows significant ${insight.trend} trend (${insight.trendPercentage}%)`,
        actionRequired: insight.trendPercentage < -15,
        createdAt: new Date().toISOString()
      });
    }
  });

  return alerts;
};

export const InsightsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [insights, setInsights] = useState<Insight[]>(sampleInsights);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([]);
  const [alerts, setAlerts] = useState<InsightAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setKpiMetrics(generateKPIMetrics(insights));
    setAlerts(generateAlerts(insights));
  }, [insights]);

  const getInsightsByCategory = (category: MetricCategory): Insight[] => {
    return insights.filter(insight => insight.category === category);
  };

  const getInsightsByPeriod = (period: MetricPeriod): Insight[] => {
    return insights.filter(insight => insight.period === period);
  };

  const getKPIStatus = () => {
    const statusCounts = { excellent: 0, good: 0, warning: 0, critical: 0 };
    kpiMetrics.forEach(metric => {
      statusCounts[metric.status]++;
    });
    return statusCounts;
  };

  const getTrendData = (metricKey: string, periods: number = 12): TrendData[] => {
    // Generate mock trend data for the past periods
    const insight = insights.find(i => i.key === metricKey);
    if (!insight) return [];

    const trendData: TrendData[] = [];
    const currentValue = insight.value;
    const trendRate = insight.trendPercentage / 100;

    for (let i = periods - 1; i >= 0; i--) {
      const periodValue = currentValue / Math.pow(1 + trendRate, i);
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      trendData.push({
        period: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: Math.round(periodValue * 100) / 100,
        target: insight.target
      });
    }

    return trendData;
  };

  const updateInsight = (key: string, value: number) => {
    setInsights(prev => 
      prev.map(insight => 
        insight.key === key 
          ? { 
              ...insight, 
              value, 
              lastUpdated: new Date().toISOString() 
            } 
          : insight
      )
    );
  };

  const getComplianceScore = (): number => {
    const complianceInsights = insights.filter(i => i.category === "compliance");
    if (complianceInsights.length === 0) return 0;
    
    const totalScore = complianceInsights.reduce((sum, insight) => sum + insight.value, 0);
    return totalScore / complianceInsights.length;
  };

  const getStaffingEfficiency = (): number => {
    const staffingInsights = insights.filter(i => i.category === "staffing");
    if (staffingInsights.length === 0) return 0;
    
    const utilizationRate = insights.find(i => i.key === "staff_utilization_rate")?.value || 0;
    const turnoverRate = insights.find(i => i.key === "turnover_rate")?.value || 0;
    
    // Calculate efficiency score (higher utilization, lower turnover = better)
    return Math.max(0, utilizationRate - turnoverRate);
  };

  const getFinancialHealth = (): number => {
    const profitMargin = insights.find(i => i.key === "profit_margin")?.value || 0;
    const laborCostPercentage = insights.find(i => i.key === "labor_cost_percentage")?.value || 0;
    
    // Simple financial health score
    return Math.max(0, profitMargin + (70 - laborCostPercentage));
  };

  const value: InsightsContextType = {
    insights,
    kpiMetrics,
    alerts,
    isLoading,
    getInsightsByCategory,
    getInsightsByPeriod,
    getKPIStatus,
    getTrendData,
    updateInsight,
    getComplianceScore,
    getStaffingEfficiency,
    getFinancialHealth
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = (): InsightsContextType => {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
};