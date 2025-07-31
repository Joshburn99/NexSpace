import { storage } from "./storage";
import {
  InsertCredential,
  InsertWorkLog,
  InsertInvoice,
  InsertPayment,
  InsertTimesheet,
  InsertTimesheetEntry,
  InsertShift,
  InsertGeneratedShift,
  InsertAuditLog,
} from "../shared/schema";

// Sample data generation for comprehensive testing
export async function generateComprehensiveSampleData() {

  try {
    // 1. Generate completed shifts (historical data)
    await generateCompletedShifts();

    // 2. Generate credential validation history
    await generateCredentialHistory();

    // 3. Generate professional invoices
    await generateProfessionalInvoices();

    // 4. Generate timesheet records
    await generateTimesheetRecords();

    // 5. Generate work logs
    await generateWorkLogs();

    // 6. Generate audit logs
    await generateAuditLogs();

  } catch (error) {

  }
}

async function generateCompletedShifts() {

  const completedShifts: InsertGeneratedShift[] = [
    {
      id: "completed-1",
      templateId: 1,
      title: "ICU Day Shift - Completed",
      date: "2025-07-07",
      startTime: "07:00",
      endTime: "19:00",
      facility: "General Hospital",
      facilityId: 1,
      department: "ICU",
      specialty: "RN",
      rate: 45.0,
      urgency: "medium",
      description: "Completed 12-hour ICU day shift",
      requiredWorkers: 3,
      status: "completed",
      assignedWorkers: [1, 2, 3],
      createdAt: new Date("2025-07-06T10:00:00Z"),
      updatedAt: new Date("2025-07-07T19:30:00Z"),
    },
    {
      id: "completed-2",
      templateId: 2,
      title: "Emergency Night Shift - Completed",
      date: "2025-07-06",
      startTime: "19:00",
      endTime: "07:00",
      facility: "General Hospital",
      facilityId: 1,
      department: "Emergency",
      specialty: "RN",
      rate: 52.0,
      urgency: "high",
      description: "Completed overnight emergency coverage",
      requiredWorkers: 2,
      status: "completed",
      assignedWorkers: [4, 5],
      createdAt: new Date("2025-07-05T15:00:00Z"),
      updatedAt: new Date("2025-07-07T07:30:00Z"),
    },
    {
      id: "completed-3",
      templateId: 3,
      title: "Surgery Support - Completed",
      date: "2025-07-05",
      startTime: "06:00",
      endTime: "18:00",
      facility: "Care Medical Center",
      facilityId: 3,
      department: "Surgery",
      specialty: "CST",
      rate: 38.0,
      urgency: "medium",
      description: "Completed surgical technology support",
      requiredWorkers: 2,
      status: "completed",
      assignedWorkers: [6, 7],
      createdAt: new Date("2025-07-04T08:00:00Z"),
      updatedAt: new Date("2025-07-05T18:30:00Z"),
    },
  ];

  for (const shift of completedShifts) {
    await storage.createGeneratedShift(shift);
  }
}

async function generateCredentialHistory() {

  const credentials: InsertCredential[] = [
    {
      userId: 1,
      type: "License",
      name: "RN License",
      number: "RN-2024-001",
      issuedBy: "Oregon Board of Nursing",
      issuedDate: new Date("2022-01-15"),
      expiryDate: new Date("2026-01-15"),
      status: "active",
      verifiedBy: 1,
      verifiedAt: new Date("2024-12-01"),
      documentUrl: "/uploads/credentials/rn-license-001.pdf",
    },
    {
      userId: 1,
      type: "Certification",
      name: "BLS Certification",
      number: "BLS-2024-001",
      issuedBy: "American Heart Association",
      issuedDate: new Date("2024-03-01"),
      expiryDate: new Date("2026-03-01"),
      status: "active",
      verifiedBy: 1,
      verifiedAt: new Date("2024-12-01"),
      documentUrl: "/uploads/credentials/bls-cert-001.pdf",
    },
    {
      userId: 2,
      type: "License",
      name: "LPN License",
      number: "LPN-2024-002",
      issuedBy: "Oregon Board of Nursing",
      issuedDate: new Date("2023-06-01"),
      expiryDate: new Date("2025-06-01"),
      status: "expiring_soon",
      verifiedBy: 1,
      verifiedAt: new Date("2024-11-15"),
      documentUrl: "/uploads/credentials/lpn-license-002.pdf",
    },
    {
      userId: 3,
      type: "Certification",
      name: "CNA Certification",
      number: "CNA-2024-003",
      issuedBy: "Oregon Health Authority",
      issuedDate: new Date("2024-01-01"),
      expiryDate: new Date("2026-01-01"),
      status: "active",
      verifiedBy: 1,
      verifiedAt: new Date("2024-12-01"),
      documentUrl: "/uploads/credentials/cna-cert-003.pdf",
    },
  ];

  for (const credential of credentials) {
    await storage.createCredential(credential);
  }
}

async function generateProfessionalInvoices() {

  const invoices: InsertInvoice[] = [
    {
      contractorId: 1,
      facilityId: 1,
      invoiceNumber: "INV-2025-001",
      amount: 2340.0,
      description: "Professional nursing services - Week of July 1-7, 2025",
      status: "pending",
      dueDate: new Date("2025-07-21"),
      workPeriodStart: new Date("2025-07-01"),
      workPeriodEnd: new Date("2025-07-07"),
      hoursWorked: 52.0,
      hourlyRate: 45.0,
    },
    {
      contractorId: 2,
      facilityId: 1,
      invoiceNumber: "INV-2025-002",
      amount: 1680.0,
      description: "LPN services - Week of July 1-7, 2025",
      status: "approved",
      dueDate: new Date("2025-07-21"),
      workPeriodStart: new Date("2025-07-01"),
      workPeriodEnd: new Date("2025-07-07"),
      hoursWorked: 40.0,
      hourlyRate: 42.0,
      approvedBy: 1,
      approvedAt: new Date("2025-07-08T14:30:00Z"),
    },
    {
      contractorId: 3,
      facilityId: 3,
      invoiceNumber: "INV-2025-003",
      amount: 1520.0,
      description: "CNA services - Week of July 1-7, 2025",
      status: "paid",
      dueDate: new Date("2025-07-21"),
      workPeriodStart: new Date("2025-07-01"),
      workPeriodEnd: new Date("2025-07-07"),
      hoursWorked: 40.0,
      hourlyRate: 38.0,
      approvedBy: 1,
      approvedAt: new Date("2025-07-08T16:00:00Z"),
      paidAt: new Date("2025-07-09T10:00:00Z"),
    },
  ];

  for (const invoice of invoices) {
    await storage.createInvoice(invoice);
  }
}

async function generateTimesheetRecords() {

  const timesheets: InsertTimesheet[] = [
    {
      userId: 1,
      facilityId: 1,
      weekStarting: new Date("2025-07-01"),
      weekEnding: new Date("2025-07-07"),
      totalHours: 52.0,
      regularHours: 40.0,
      overtimeHours: 12.0,
      status: "approved",
      approvedBy: 1,
      approvedAt: new Date("2025-07-08T09:00:00Z"),
      submittedAt: new Date("2025-07-07T20:00:00Z"),
    },
    {
      userId: 2,
      facilityId: 1,
      weekStarting: new Date("2025-07-01"),
      weekEnding: new Date("2025-07-07"),
      totalHours: 40.0,
      regularHours: 40.0,
      overtimeHours: 0.0,
      status: "pending",
      submittedAt: new Date("2025-07-07T19:30:00Z"),
    },
    {
      userId: 3,
      facilityId: 3,
      weekStarting: new Date("2025-07-01"),
      weekEnding: new Date("2025-07-07"),
      totalHours: 40.0,
      regularHours: 40.0,
      overtimeHours: 0.0,
      status: "approved",
      approvedBy: 1,
      approvedAt: new Date("2025-07-08T10:30:00Z"),
      submittedAt: new Date("2025-07-07T18:00:00Z"),
    },
  ];

  for (const timesheet of timesheets) {
    await storage.createTimesheet(timesheet);
  }
}

async function generateWorkLogs() {

  const workLogs: InsertWorkLog[] = [
    {
      userId: 1,
      shiftId: 1,
      clockIn: new Date("2025-07-07T07:00:00Z"),
      clockOut: new Date("2025-07-07T19:30:00Z"),
      totalHours: 12.5,
      status: "approved",
      notes: "Worked ICU day shift, assisted with 3 patient admissions",
      reviewedBy: 1,
      reviewedAt: new Date("2025-07-08T08:00:00Z"),
    },
    {
      userId: 2,
      shiftId: 1,
      clockIn: new Date("2025-07-07T07:15:00Z"),
      clockOut: new Date("2025-07-07T19:45:00Z"),
      totalHours: 12.5,
      status: "approved",
      notes: "ICU day shift, medication administration and patient care",
      reviewedBy: 1,
      reviewedAt: new Date("2025-07-08T08:15:00Z"),
    },
    {
      userId: 4,
      shiftId: 2,
      clockIn: new Date("2025-07-06T19:00:00Z"),
      clockOut: new Date("2025-07-07T07:30:00Z"),
      totalHours: 12.5,
      status: "approved",
      notes: "Emergency night shift, handled 8 patient cases",
      reviewedBy: 1,
      reviewedAt: new Date("2025-07-07T09:00:00Z"),
    },
  ];

  for (const workLog of workLogs) {
    await storage.createWorkLog(workLog);
  }
}

async function generateAuditLogs() {

  const auditLogs: InsertAuditLog[] = [
    {
      userId: 1,
      action: "shift_assignment",
      resource: "shift",
      resourceId: 1,
      oldValues: { assignedWorkers: [] },
      newValues: { assignedWorkers: [1, 2, 3] },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      userId: 1,
      action: "credential_verification",
      resource: "credential",
      resourceId: 1,
      oldValues: { status: "pending" },
      newValues: { status: "verified" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      userId: 1,
      action: "invoice_approval",
      resource: "invoice",
      resourceId: 2,
      oldValues: { status: "pending" },
      newValues: { status: "approved" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      userId: 1,
      action: "timesheet_approval",
      resource: "timesheet",
      resourceId: 1,
      oldValues: { status: "pending" },
      newValues: { status: "approved" },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  ];

  for (const auditLog of auditLogs) {
    await storage.createAuditLog(
      auditLog.userId,
      auditLog.action,
      auditLog.resource,
      auditLog.resourceId,
      auditLog.oldValues,
      auditLog.newValues,
      auditLog.ipAddress,
      auditLog.userAgent
    );
  }
}
