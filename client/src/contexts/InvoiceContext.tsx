import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type InvoiceStatus = "draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled" | "disputed";
export type InvoiceType = "timesheet" | "contract" | "expense" | "overtime" | "bonus" | "adjustment";
export type PaymentMethod = "direct_deposit" | "check" | "wire_transfer" | "paypal" | "venmo";

export interface Invoice {
  id: number;
  invoiceNumber: string;
  userId: number;
  userName: string;
  userRole: string;
  facilityId: number;
  facilityName: string;
  type: InvoiceType;
  status: InvoiceStatus;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  description: string;
  lineItems: InvoiceLineItem[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  date: string;
  shiftId?: number;
  hours?: number;
  overtimeHours?: number;
  category: "regular" | "overtime" | "holiday" | "weekend" | "night_differential" | "bonus" | "expense";
}

export interface PaymentSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  averagePaymentTime: number;
  paymentRate: number;
}

export interface InvoiceAlert {
  id: number;
  invoiceId: number;
  type: "payment_due" | "overdue" | "payment_received" | "dispute_raised";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  actionRequired: boolean;
  createdAt: string;
  resolvedAt?: string;
}

interface InvoiceContextType {
  invoices: Invoice[];
  alerts: InvoiceAlert[];
  paymentSummary: PaymentSummary;
  isLoading: boolean;
  getInvoicesByStatus: (status: InvoiceStatus) => Invoice[];
  getInvoicesByUser: (userId: number) => Invoice[];
  getInvoicesByDateRange: (startDate: string, endDate: string) => Invoice[];
  getOverdueInvoices: () => Invoice[];
  getPendingInvoices: () => Invoice[];
  createInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">) => void;
  updateInvoiceStatus: (id: number, status: InvoiceStatus, paymentMethod?: PaymentMethod, paymentReference?: string) => void;
  calculateTotals: (lineItems: InvoiceLineItem[]) => { subtotal: number; tax: number; total: number };
  generateInvoiceNumber: () => string;
}

const InvoiceContext = createContext<InvoiceContextType | null>(null);

// Sample invoice line items
const generateLineItems = (userId: number, type: InvoiceType): InvoiceLineItem[] => {
  const baseItems: InvoiceLineItem[] = [];
  
  if (type === "timesheet") {
    // Regular shift hours
    baseItems.push({
      id: 1,
      description: "Regular Hours - Day Shift",
      quantity: 32,
      rate: 28.50,
      amount: 912.00,
      date: "2025-06-15",
      shiftId: 1,
      hours: 32,
      category: "regular"
    });
    
    // Overtime hours
    baseItems.push({
      id: 2,
      description: "Overtime Hours",
      quantity: 6,
      rate: 42.75,
      amount: 256.50,
      date: "2025-06-16",
      shiftId: 2,
      hours: 6,
      overtimeHours: 6,
      category: "overtime"
    });
    
    // Weekend differential
    baseItems.push({
      id: 3,
      description: "Weekend Differential",
      quantity: 16,
      rate: 3.00,
      amount: 48.00,
      date: "2025-06-17",
      shiftId: 3,
      hours: 16,
      category: "weekend"
    });
  } else if (type === "bonus") {
    baseItems.push({
      id: 1,
      description: "Performance Bonus - Q2 2025",
      quantity: 1,
      rate: 500.00,
      amount: 500.00,
      date: "2025-06-19",
      category: "bonus"
    });
  }

  return baseItems;
};

// Sample invoices data for 100-bed facility staff
const sampleInvoices: Invoice[] = [
  // Recent paid invoices
  {
    id: 1,
    invoiceNumber: "INV-2025-001",
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "timesheet",
    status: "paid",
    amount: 1216.50,
    tax: 121.65,
    totalAmount: 1338.15,
    currency: "USD",
    issueDate: "2025-06-01",
    dueDate: "2025-06-15",
    paidDate: "2025-06-12",
    description: "Timesheet for Week of May 26 - June 1, 2025",
    lineItems: generateLineItems(1, "timesheet"),
    paymentMethod: "direct_deposit",
    paymentReference: "DD-20250612-001",
    notes: "Paid via direct deposit",
    createdAt: "2025-06-01T09:00:00Z",
    updatedAt: "2025-06-12T14:30:00Z"
  },
  {
    id: 2,
    invoiceNumber: "INV-2025-002",
    userId: 2,
    userName: "Michael Chen",
    userRole: "CNA",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "timesheet",
    status: "paid",
    amount: 892.00,
    tax: 89.20,
    totalAmount: 981.20,
    currency: "USD",
    issueDate: "2025-06-01",
    dueDate: "2025-06-15",
    paidDate: "2025-06-10",
    description: "Timesheet for Week of May 26 - June 1, 2025",
    lineItems: [
      {
        id: 1,
        description: "Regular Hours - CNA",
        quantity: 40,
        rate: 22.30,
        amount: 892.00,
        date: "2025-06-01",
        hours: 40,
        category: "regular"
      }
    ],
    paymentMethod: "direct_deposit",
    paymentReference: "DD-20250610-002",
    createdAt: "2025-06-01T09:00:00Z",
    updatedAt: "2025-06-10T16:45:00Z"
  },

  // Pending invoices
  {
    id: 3,
    invoiceNumber: "INV-2025-003",
    userId: 3,
    userName: "Emily Rodriguez",
    userRole: "LPN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "timesheet",
    status: "pending",
    amount: 1045.00,
    tax: 104.50,
    totalAmount: 1149.50,
    currency: "USD",
    issueDate: "2025-06-15",
    dueDate: "2025-06-30",
    description: "Timesheet for Week of June 8 - 14, 2025",
    lineItems: [
      {
        id: 1,
        description: "Regular Hours - LPN",
        quantity: 38,
        rate: 25.50,
        amount: 969.00,
        date: "2025-06-15",
        hours: 38,
        category: "regular"
      },
      {
        id: 2,
        description: "Night Differential",
        quantity: 16,
        rate: 4.75,
        amount: 76.00,
        date: "2025-06-15",
        hours: 16,
        category: "night_differential"
      }
    ],
    notes: "Includes night shift differential",
    createdAt: "2025-06-15T10:00:00Z",
    updatedAt: "2025-06-15T10:00:00Z"
  },
  {
    id: 4,
    invoiceNumber: "INV-2025-004",
    userId: 4,
    userName: "David Thompson",
    userRole: "PT",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "contract",
    status: "sent",
    amount: 2400.00,
    tax: 240.00,
    totalAmount: 2640.00,
    currency: "USD",
    issueDate: "2025-06-10",
    dueDate: "2025-06-25",
    description: "Physical Therapy Services - June 2025",
    lineItems: [
      {
        id: 1,
        description: "PT Services - 30 sessions",
        quantity: 30,
        rate: 80.00,
        amount: 2400.00,
        date: "2025-06-10",
        category: "regular"
      }
    ],
    notes: "Monthly contract payment",
    createdAt: "2025-06-10T08:00:00Z",
    updatedAt: "2025-06-10T08:00:00Z"
  },

  // Overdue invoices
  {
    id: 5,
    invoiceNumber: "INV-2025-005",
    userId: 5,
    userName: "Lisa Wang",
    userRole: "OT",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "timesheet",
    status: "overdue",
    amount: 1680.00,
    tax: 168.00,
    totalAmount: 1848.00,
    currency: "USD",
    issueDate: "2025-05-20",
    dueDate: "2025-06-05",
    description: "Occupational Therapy - May 2025",
    lineItems: [
      {
        id: 1,
        description: "OT Services",
        quantity: 28,
        rate: 60.00,
        amount: 1680.00,
        date: "2025-05-20",
        hours: 28,
        category: "regular"
      }
    ],
    notes: "Payment overdue - follow up required",
    createdAt: "2025-05-20T09:00:00Z",
    updatedAt: "2025-06-05T12:00:00Z"
  },

  // Bonus payments
  {
    id: 6,
    invoiceNumber: "INV-2025-006",
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "bonus",
    status: "pending",
    amount: 500.00,
    tax: 50.00,
    totalAmount: 550.00,
    currency: "USD",
    issueDate: "2025-06-18",
    dueDate: "2025-07-02",
    description: "Q2 Performance Bonus",
    lineItems: generateLineItems(1, "bonus"),
    notes: "Quarterly performance bonus",
    createdAt: "2025-06-18T15:00:00Z",
    updatedAt: "2025-06-18T15:00:00Z"
  },

  // Draft invoices
  {
    id: 7,
    invoiceNumber: "INV-2025-007",
    userId: 6,
    userName: "Robert Kim",
    userRole: "RN",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "timesheet",
    status: "draft",
    amount: 1344.00,
    tax: 134.40,
    totalAmount: 1478.40,
    currency: "USD",
    issueDate: "2025-06-19",
    dueDate: "2025-07-03",
    description: "Current Week Timesheet - In Progress",
    lineItems: [
      {
        id: 1,
        description: "Regular Hours - Night Shift",
        quantity: 36,
        rate: 32.00,
        amount: 1152.00,
        date: "2025-06-19",
        hours: 36,
        category: "regular"
      },
      {
        id: 2,
        description: "Night Differential",
        quantity: 36,
        rate: 5.33,
        amount: 192.00,
        date: "2025-06-19",
        hours: 36,
        category: "night_differential"
      }
    ],
    notes: "Draft - week not complete",
    createdAt: "2025-06-19T06:00:00Z",
    updatedAt: "2025-06-19T06:00:00Z"
  },

  // Expense reimbursements
  {
    id: 8,
    invoiceNumber: "INV-2025-008",
    userId: 7,
    userName: "Amanda Foster",
    userRole: "CNA",
    facilityId: 1,
    facilityName: "Sunrise Senior Living",
    type: "expense",
    status: "pending",
    amount: 85.50,
    tax: 0,
    totalAmount: 85.50,
    currency: "USD",
    issueDate: "2025-06-17",
    dueDate: "2025-07-01",
    description: "Training Materials Reimbursement",
    lineItems: [
      {
        id: 1,
        description: "CPR Training Manual",
        quantity: 1,
        rate: 45.50,
        amount: 45.50,
        date: "2025-06-15",
        category: "expense"
      },
      {
        id: 2,
        description: "Certification Fee",
        quantity: 1,
        rate: 40.00,
        amount: 40.00,
        date: "2025-06-16",
        category: "expense"
      }
    ],
    notes: "Receipts attached",
    createdAt: "2025-06-17T11:00:00Z",
    updatedAt: "2025-06-17T11:00:00Z"
  }
];

// Calculate payment summary
const calculatePaymentSummary = (invoices: Invoice[]): PaymentSummary => {
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === "pending" || inv.status === "sent")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueAmount = invoices
    .filter(inv => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Calculate average payment time
  const paidWithDates = paidInvoices.filter(inv => inv.paidDate);
  const avgPaymentTime = paidWithDates.length > 0 
    ? paidWithDates.reduce((sum, inv) => {
        const issued = new Date(inv.issueDate).getTime();
        const paid = new Date(inv.paidDate!).getTime();
        return sum + (paid - issued) / (1000 * 60 * 60 * 24);
      }, 0) / paidWithDates.length
    : 0;

  const paymentRate = totalInvoices > 0 ? (paidInvoices.length / totalInvoices) * 100 : 0;

  return {
    totalInvoices,
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    averagePaymentTime: Math.round(avgPaymentTime),
    paymentRate: Math.round(paymentRate * 100) / 100
  };
};

// Generate invoice alerts
const generateInvoiceAlerts = (invoices: Invoice[]): InvoiceAlert[] => {
  const alerts: InvoiceAlert[] = [];
  const today = new Date();

  invoices.forEach(invoice => {
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (invoice.status === "overdue") {
      alerts.push({
        id: alerts.length + 1,
        invoiceId: invoice.id,
        type: "overdue",
        severity: "critical",
        message: `Invoice ${invoice.invoiceNumber} is overdue by ${Math.abs(daysUntilDue)} days`,
        actionRequired: true,
        createdAt: new Date().toISOString()
      });
    } else if (invoice.status === "pending" && daysUntilDue <= 3) {
      alerts.push({
        id: alerts.length + 1,
        invoiceId: invoice.id,
        type: "payment_due",
        severity: daysUntilDue <= 1 ? "high" : "medium",
        message: `Invoice ${invoice.invoiceNumber} is due in ${daysUntilDue} days`,
        actionRequired: daysUntilDue <= 1,
        createdAt: new Date().toISOString()
      });
    }
  });

  return alerts;
};

export const InvoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(sampleInvoices);
  const [alerts, setAlerts] = useState<InvoiceAlert[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    averagePaymentTime: 0,
    paymentRate: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPaymentSummary(calculatePaymentSummary(invoices));
    setAlerts(generateInvoiceAlerts(invoices));
  }, [invoices]);

  const getInvoicesByStatus = (status: InvoiceStatus): Invoice[] => {
    return invoices.filter(invoice => invoice.status === status);
  };

  const getInvoicesByUser = (userId: number): Invoice[] => {
    return invoices.filter(invoice => invoice.userId === userId);
  };

  const getInvoicesByDateRange = (startDate: string, endDate: string): Invoice[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return invoices.filter(invoice => {
      const issueDate = new Date(invoice.issueDate);
      return issueDate >= start && issueDate <= end;
    });
  };

  const getOverdueInvoices = (): Invoice[] => {
    return invoices.filter(invoice => invoice.status === "overdue");
  };

  const getPendingInvoices = (): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.status === "pending" || invoice.status === "sent"
    );
  };

  const generateInvoiceNumber = (): string => {
    const year = new Date().getFullYear();
    const nextNumber = Math.max(...invoices.map(inv => 
      parseInt(inv.invoiceNumber.split('-')[2]) || 0
    )) + 1;
    return `INV-${year}-${nextNumber.toString().padStart(3, '0')}`;
  };

  const calculateTotals = (lineItems: InvoiceLineItem[]) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1; // 10% tax rate
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const createInvoice = (invoiceData: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: Math.max(...invoices.map(inv => inv.id), 0) + 1,
      invoiceNumber: generateInvoiceNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setInvoices(prev => [...prev, newInvoice]);
  };

  const updateInvoiceStatus = (
    id: number, 
    status: InvoiceStatus, 
    paymentMethod?: PaymentMethod, 
    paymentReference?: string
  ) => {
    setInvoices(prev => 
      prev.map(invoice => 
        invoice.id === id 
          ? { 
              ...invoice, 
              status,
              paymentMethod,
              paymentReference,
              paidDate: status === "paid" ? new Date().toISOString() : invoice.paidDate,
              updatedAt: new Date().toISOString()
            } 
          : invoice
      )
    );
  };

  const value: InvoiceContextType = {
    invoices,
    alerts,
    paymentSummary,
    isLoading,
    getInvoicesByStatus,
    getInvoicesByUser,
    getInvoicesByDateRange,
    getOverdueInvoices,
    getPendingInvoices,
    createInvoice,
    updateInvoiceStatus,
    calculateTotals,
    generateInvoiceNumber
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoices = (): InvoiceContextType => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
};