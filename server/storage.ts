import {
  users,
  facilities,
  jobs,
  jobApplications,
  shifts,
  timeClockEntries,
  invoices,
  workLogs,
  credentials,
  messages,
  auditLogs,
  permissions,
  rolePermissions,
  staff,
  payrollProviders,
  payrollConfigurations,
  payrollEmployees,
  timesheets,
  timesheetEntries,
  payrollSyncLogs,
  payments,
  type User,
  type InsertUser,
  type Facility,
  type InsertFacility,
  type Job,
  type InsertJob,
  type JobApplication,
  type InsertJobApplication,
  type Shift,
  type InsertShift,
  type Invoice,
  type InsertInvoice,
  type WorkLog,
  type InsertWorkLog,
  type Credential,
  type InsertCredential,
  type Message,
  type InsertMessage,
  type AuditLog,
  type Staff,
  type InsertStaff,
  UserRole,
  type PayrollProvider,
  type InsertPayrollProvider,
  type PayrollConfiguration,
  type InsertPayrollConfiguration,
  type PayrollEmployee,
  type InsertPayrollEmployee,
  type Timesheet,
  type InsertTimesheet,
  type TimesheetEntry,
  type InsertTimesheetEntry,
  type PayrollSyncLog,
  type InsertPayrollSyncLog,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, count, sql, or, ilike } from "drizzle-orm";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import MemoryStore from "memorystore";

const PostgresSessionStore = connectPg(session);
const MemorySessionStore = MemoryStore(session);

export interface IStorage {
  sessionStore: Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByFacility(facilityId: number): Promise<User[]>;

  // Facility methods
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  updateFacility(id: number, updates: Partial<InsertFacility>): Promise<Facility | undefined>;
  getAllFacilities(): Promise<Facility[]>;
  searchFacilities(query: string): Promise<Facility[]>;
  getFacilitiesByState(state: string): Promise<Facility[]>;
  getFacilityByCMSId(cmsId: string): Promise<Facility | undefined>;
  getFacilitiesWithinRadius(lat: number, lng: number, radiusMiles: number): Promise<Facility[]>;

  // Job methods
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  getActiveJobs(): Promise<Job[]>;
  getJobsByFacility(facilityId: number): Promise<Job[]>;
  updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined>;

  // Job application methods
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  getJobApplications(jobId: number): Promise<JobApplication[]>;
  getUserApplications(userId: number): Promise<JobApplication[]>;
  updateApplicationStatus(
    id: number,
    status: string,
    reviewerId?: number
  ): Promise<JobApplication | undefined>;

  // Shift methods
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  getShiftsByDateRange(facilityId: number, startDate: Date, endDate: Date): Promise<Shift[]>;
  getTodaysShifts(facilityId: number): Promise<Shift[]>;
  getOpenShifts(facilityId?: number): Promise<Shift[]>;
  assignStaffToShift(shiftId: number, staffIds: number[]): Promise<Shift | undefined>;

  // Invoice methods
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoicesByContractor(contractorId: number): Promise<Invoice[]>;
  getInvoicesByFacility(facilityId: number): Promise<Invoice[]>;
  updateInvoiceStatus(
    id: number,
    status: string,
    approvedById?: number
  ): Promise<Invoice | undefined>;
  getPendingInvoices(): Promise<Invoice[]>;

  // Work log methods
  createWorkLog(workLog: InsertWorkLog): Promise<WorkLog>;
  getWorkLogsByUser(userId: number): Promise<WorkLog[]>;
  getWorkLogsByShift(shiftId: number): Promise<WorkLog[]>;
  updateWorkLogStatus(id: number, status: string, reviewerId: number): Promise<WorkLog | undefined>;
  getPendingWorkLogs(): Promise<WorkLog[]>;

  // Credential methods
  createCredential(credential: InsertCredential): Promise<Credential>;
  getUserCredentials(userId: number): Promise<Credential[]>;
  getExpiringCredentials(days: number): Promise<Credential[]>;
  updateCredentialStatus(
    id: number,
    status: string,
    verifierId?: number
  ): Promise<Credential | undefined>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  getUserMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Audit log methods
  createAuditLog(
    userId: number,
    action: string,
    resource: string,
    resourceId?: number,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog>;
  getAuditLogs(userId?: number, resource?: string): Promise<AuditLog[]>;

  // Permission methods
  getUserPermissions(role: string): Promise<string[]>;
  hasPermission(role: string, permission: string): Promise<boolean>;

  // Dashboard analytics
  getFacilityStats(facilityId: number): Promise<{
    activeStaff: number;
    openShifts: number;
    complianceRate: number;
    monthlyHours: number;
  }>;
  getRecentActivity(facilityId: number, limit?: number): Promise<AuditLog[]>;

  // Payroll system methods
  createPayrollProvider(provider: InsertPayrollProvider): Promise<PayrollProvider>;
  getPayrollProviders(): Promise<PayrollProvider[]>;
  updatePayrollProvider(
    id: number,
    updates: Partial<InsertPayrollProvider>
  ): Promise<PayrollProvider | undefined>;

  createPayrollConfiguration(config: InsertPayrollConfiguration): Promise<PayrollConfiguration>;
  getPayrollConfiguration(facilityId: number): Promise<PayrollConfiguration | undefined>;
  updatePayrollConfiguration(
    id: number,
    updates: Partial<InsertPayrollConfiguration>
  ): Promise<PayrollConfiguration | undefined>;

  createPayrollEmployee(employee: InsertPayrollEmployee): Promise<PayrollEmployee>;
  getPayrollEmployee(userId: number, facilityId: number): Promise<PayrollEmployee | undefined>;
  updatePayrollEmployee(
    id: number,
    updates: Partial<InsertPayrollEmployee>
  ): Promise<PayrollEmployee | undefined>;
  getPayrollEmployeesByFacility(facilityId: number): Promise<PayrollEmployee[]>;

  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getTimesheetsByUser(userId: number, facilityId: number): Promise<Timesheet[]>;
  getTimesheetsByPayPeriod(
    facilityId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Timesheet[]>;
  updateTimesheetStatus(
    id: number,
    status: string,
    approvedBy?: number
  ): Promise<Timesheet | undefined>;
  getPendingTimesheets(facilityId: number): Promise<Timesheet[]>;

  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  getTimesheetEntries(timesheetId: number): Promise<TimesheetEntry[]>;
  updateTimesheetEntry(
    id: number,
    updates: Partial<InsertTimesheetEntry>
  ): Promise<TimesheetEntry | undefined>;

  createPayrollSyncLog(log: InsertPayrollSyncLog): Promise<PayrollSyncLog>;
  getPayrollSyncLogs(facilityId: number, providerId?: number): Promise<PayrollSyncLog[]>;

  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByUser(userId: number): Promise<Payment[]>;
  getPaymentsByTimesheet(timesheetId: number): Promise<Payment[]>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;
  getPendingPayments(facilityId: number): Promise<Payment[]>;

  // Automated payroll processing
  processPayroll(
    facilityId: number,
    payPeriodStart: Date,
    payPeriodEnd: Date
  ): Promise<{
    processedTimesheets: number;
    totalPayments: number;
    errors: string[];
  }>;
  syncWithPayrollProvider(facilityId: number, syncType: string): Promise<PayrollSyncLog>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    // Use memory store by default to avoid PostgreSQL control plane issues
    console.log('Using memory session store to avoid database connection issues');
    this.sessionStore = new MemorySessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, role), eq(users.isActive, true)));
  }

  async getUsersByFacility(facilityId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.facilityId, facilityId), eq(users.isActive, true)));
  }

  // Facility methods
  async getFacility(id: number): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility || undefined;
  }

  async createFacility(insertFacility: InsertFacility): Promise<Facility> {
    const [facility] = await db.insert(facilities).values(insertFacility).returning();
    return facility;
  }

  async updateFacility(
    id: number,
    updates: Partial<InsertFacility>
  ): Promise<Facility | undefined> {
    const [facility] = await db
      .update(facilities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilities.id, id))
      .returning();
    return facility || undefined;
  }

  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).where(eq(facilities.isActive, true));
  }

  async searchFacilities(query: string): Promise<Facility[]> {
    return await db
      .select()
      .from(facilities)
      .where(
        and(
          eq(facilities.isActive, true),
          or(
            ilike(facilities.name, `%${query}%`),
            ilike(facilities.city, `%${query}%`),
            ilike(facilities.state, `%${query}%`),
            eq(facilities.cmsId, query)
          )
        )
      );
  }

  async getFacilitiesByState(state: string): Promise<Facility[]> {
    return await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.isActive, true), eq(facilities.state, state)));
  }

  async getFacilityByCMSId(cmsId: string): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.cmsId, cmsId));
    return facility || undefined;
  }

  // Staff methods
  async getAllStaff(): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.isActive, true));
  }

  async getStaffMember(id: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember || undefined;
  }

  async createStaffMember(insertStaff: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(insertStaff).returning();
    return newStaff;
  }

  async updateStaffMember(id: number, updates: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff || undefined;
  }

  // Job methods
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async getActiveJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.createdAt));
  }

  async getJobsByFacility(facilityId: number): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.facilityId, facilityId), eq(jobs.isActive, true)))
      .orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  // Job application methods
  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db.insert(jobApplications).values(insertApplication).returning();
    return application;
  }

  async getJobApplications(jobId: number): Promise<JobApplication[]> {
    return await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.appliedAt));
  }

  async getUserApplications(userId: number): Promise<JobApplication[]> {
    return await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.applicantId, userId))
      .orderBy(desc(jobApplications.appliedAt));
  }

  async updateApplicationStatus(
    id: number,
    status: string,
    reviewerId?: number
  ): Promise<JobApplication | undefined> {
    const updates: any = { status, reviewedAt: new Date() };
    if (reviewerId) updates.reviewedById = reviewerId;

    const [application] = await db
      .update(jobApplications)
      .set(updates)
      .where(eq(jobApplications.id, id))
      .returning();
    return application || undefined;
  }

  // Shift methods
  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(insertShift).returning();
    return shift;
  }

  async getShiftsByDateRange(facilityId: number, startDate: Date, endDate: Date): Promise<Shift[]> {
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.facilityId, facilityId),
          gte(shifts.date, startDateStr),
          lte(shifts.date, endDateStr)
        )
      )
      .orderBy(asc(shifts.date), asc(shifts.startTime));
  }

  async getTodaysShifts(facilityId: number): Promise<Shift[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return await this.getShiftsByDateRange(facilityId, startOfDay, endOfDay);
  }

  async getOpenShifts(facilityId?: number): Promise<Shift[]> {
    const whereConditions = [eq(shifts.status, "open")];
    if (facilityId) {
      whereConditions.push(eq(shifts.facilityId, facilityId));
    }

    return await db
      .select()
      .from(shifts)
      .where(and(...whereConditions))
      .orderBy(asc(shifts.startTime));
  }

  async assignStaffToShift(shiftId: number, staffIds: number[]): Promise<Shift | undefined> {
    const [shift] = await db
      .update(shifts)
      .set({
        assignedStaffIds: staffIds,
        status: staffIds.length > 0 ? "filled" : "open",
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    return shift || undefined;
  }

  // Invoice methods
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async getInvoicesByContractor(contractorId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.contractorId, contractorId))
      .orderBy(desc(invoices.submittedAt));
  }

  async getInvoicesByFacility(facilityId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.facilityId, facilityId))
      .orderBy(desc(invoices.submittedAt));
  }

  async updateInvoiceStatus(
    id: number,
    status: string,
    approvedById?: number
  ): Promise<Invoice | undefined> {
    const updates: any = { status };
    if (status === "approved" && approvedById) {
      updates.approvedAt = new Date();
      updates.approvedById = approvedById;
    } else if (status === "paid") {
      updates.paidAt = new Date();
    }

    const [invoice] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async getPendingInvoices(): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.status, "pending"))
      .orderBy(desc(invoices.submittedAt));
  }

  // Work log methods
  async createWorkLog(insertWorkLog: InsertWorkLog): Promise<WorkLog> {
    const [workLog] = await db.insert(workLogs).values(insertWorkLog).returning();
    return workLog;
  }

  async getWorkLogsByUser(userId: number): Promise<WorkLog[]> {
    return await db
      .select()
      .from(workLogs)
      .where(eq(workLogs.userId, userId))
      .orderBy(desc(workLogs.submittedAt));
  }

  async getWorkLogsByShift(shiftId: number): Promise<WorkLog[]> {
    return await db
      .select()
      .from(workLogs)
      .where(eq(workLogs.shiftId, shiftId))
      .orderBy(desc(workLogs.submittedAt));
  }

  async updateWorkLogStatus(
    id: number,
    status: string,
    reviewerId: number
  ): Promise<WorkLog | undefined> {
    const [workLog] = await db
      .update(workLogs)
      .set({ status, reviewedById: reviewerId, reviewedAt: new Date() })
      .where(eq(workLogs.id, id))
      .returning();
    return workLog || undefined;
  }

  async getPendingWorkLogs(): Promise<WorkLog[]> {
    return await db
      .select()
      .from(workLogs)
      .where(eq(workLogs.status, "pending"))
      .orderBy(desc(workLogs.submittedAt));
  }

  // Credential methods
  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    const [credential] = await db.insert(credentials).values(insertCredential).returning();
    return credential;
  }

  async getUserCredentials(userId: number): Promise<Credential[]> {
    return await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, userId))
      .orderBy(desc(credentials.issueDate));
  }

  async getExpiringCredentials(days: number): Promise<Credential[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.status, "active"), lte(credentials.expirationDate, futureDate)))
      .orderBy(asc(credentials.expirationDate));
  }

  async updateCredentialStatus(
    id: number,
    status: string,
    verifierId?: number
  ): Promise<Credential | undefined> {
    const updates: any = { status };
    if (verifierId) {
      updates.verifiedAt = new Date();
      updates.verifiedById = verifierId;
    }

    const [credential] = await db
      .update(credentials)
      .set(updates)
      .where(eq(credentials.id, id))
      .returning();
    return credential || undefined;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.recipientId, userId))
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(id: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
    return result.count;
  }

  // Audit log methods
  async createAuditLog(
    userId: number,
    action: string,
    resource: string,
    resourceId?: number,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        userId,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      })
      .returning();
    return auditLog;
  }

  async getAuditLogs(userId?: number, resource?: string): Promise<AuditLog[]> {
    const whereConditions = [];
    if (userId) whereConditions.push(eq(auditLogs.userId, userId));
    if (resource) whereConditions.push(eq(auditLogs.resource, resource));

    return await db
      .select()
      .from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(auditLogs.createdAt));
  }

  // Permission methods
  async getUserPermissions(role: string): Promise<string[]> {
    const rolePermissionsList = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.role, role));

    return rolePermissionsList.map((p) => p.name);
  }

  async hasPermission(role: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(role);
    return userPermissions.includes(permission);
  }

  // Dashboard analytics
  async getFacilityStats(facilityId: number): Promise<{
    activeStaff: number;
    openShifts: number;
    complianceRate: number;
    monthlyHours: number;
  }> {
    // Active staff count
    const [activeStaffResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.facilityId, facilityId), eq(users.isActive, true)));

    // Open shifts count
    const [openShiftsResult] = await db
      .select({ count: count() })
      .from(shifts)
      .where(and(eq(shifts.facilityId, facilityId), eq(shifts.status, "open")));

    // Calculate compliance rate (simplified - based on active credentials vs expired)
    const [totalCredentials] = await db
      .select({ count: count() })
      .from(credentials)
      .innerJoin(users, eq(credentials.userId, users.id))
      .where(eq(users.facilityId, facilityId));

    const [activeCredentials] = await db
      .select({ count: count() })
      .from(credentials)
      .innerJoin(users, eq(credentials.userId, users.id))
      .where(and(eq(users.facilityId, facilityId), eq(credentials.status, "active")));

    const complianceRate =
      totalCredentials.count > 0 ? (activeCredentials.count / totalCredentials.count) * 100 : 100;

    // Monthly hours (current month)
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [monthlyHoursResult] = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(${timeClockEntries.totalHours}), 0)`,
      })
      .from(timeClockEntries)
      .innerJoin(users, eq(timeClockEntries.userId, users.id))
      .where(and(eq(users.facilityId, facilityId), gte(timeClockEntries.clockIn, firstOfMonth)));

    return {
      activeStaff: activeStaffResult.count,
      openShifts: openShiftsResult.count,
      complianceRate: Math.round(complianceRate * 10) / 10,
      monthlyHours: Number(monthlyHoursResult.totalHours) || 0,
    };
  }

  async getRecentActivity(facilityId: number, limit: number = 10): Promise<AuditLog[]> {
    const result = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.facilityId, facilityId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return result;
  }

  // Payroll Provider methods
  async createPayrollProvider(insertProvider: InsertPayrollProvider): Promise<PayrollProvider> {
    const [provider] = await db.insert(payrollProviders).values(insertProvider).returning();
    return provider;
  }

  async getPayrollProviders(): Promise<PayrollProvider[]> {
    return await db.select().from(payrollProviders).where(eq(payrollProviders.isActive, true));
  }

  async updatePayrollProvider(
    id: number,
    updates: Partial<InsertPayrollProvider>
  ): Promise<PayrollProvider | undefined> {
    const [provider] = await db
      .update(payrollProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payrollProviders.id, id))
      .returning();
    return provider || undefined;
  }

  // Payroll Configuration methods
  async createPayrollConfiguration(
    insertConfig: InsertPayrollConfiguration
  ): Promise<PayrollConfiguration> {
    const [config] = await db.insert(payrollConfigurations).values(insertConfig).returning();
    return config;
  }

  async getPayrollConfiguration(facilityId: number): Promise<PayrollConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(payrollConfigurations)
      .where(
        and(
          eq(payrollConfigurations.facilityId, facilityId),
          eq(payrollConfigurations.isActive, true)
        )
      );
    return config || undefined;
  }

  async updatePayrollConfiguration(
    id: number,
    updates: Partial<InsertPayrollConfiguration>
  ): Promise<PayrollConfiguration | undefined> {
    const [config] = await db
      .update(payrollConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payrollConfigurations.id, id))
      .returning();
    return config || undefined;
  }

  // Payroll Employee methods
  async createPayrollEmployee(insertEmployee: InsertPayrollEmployee): Promise<PayrollEmployee> {
    const [employee] = await db.insert(payrollEmployees).values(insertEmployee).returning();
    return employee;
  }

  async getPayrollEmployee(
    userId: number,
    facilityId: number
  ): Promise<PayrollEmployee | undefined> {
    const [employee] = await db
      .select()
      .from(payrollEmployees)
      .where(
        and(
          eq(payrollEmployees.userId, userId),
          eq(payrollEmployees.facilityId, facilityId),
          eq(payrollEmployees.isActive, true)
        )
      );
    return employee || undefined;
  }

  async updatePayrollEmployee(
    id: number,
    updates: Partial<InsertPayrollEmployee>
  ): Promise<PayrollEmployee | undefined> {
    const [employee] = await db
      .update(payrollEmployees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payrollEmployees.id, id))
      .returning();
    return employee || undefined;
  }

  async getPayrollEmployeesByFacility(facilityId: number): Promise<PayrollEmployee[]> {
    return await db
      .select()
      .from(payrollEmployees)
      .where(and(eq(payrollEmployees.facilityId, facilityId), eq(payrollEmployees.isActive, true)));
  }

  // Timesheet methods
  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db.insert(timesheets).values(insertTimesheet).returning();
    return timesheet;
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet || undefined;
  }

  async getTimesheetsByUser(userId: number, facilityId: number): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.userId, userId), eq(timesheets.facilityId, facilityId)))
      .orderBy(desc(timesheets.payPeriodStart));
  }

  async getTimesheetsByPayPeriod(
    facilityId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.facilityId, facilityId),
          gte(timesheets.payPeriodStart, startDate),
          lte(timesheets.payPeriodEnd, endDate)
        )
      )
      .orderBy(desc(timesheets.payPeriodStart));
  }

  async updateTimesheetStatus(
    id: number,
    status: string,
    approvedBy?: number
  ): Promise<Timesheet | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (status === "approved" && approvedBy) {
      updates.approvedBy = approvedBy;
      updates.approvedAt = new Date();
    }
    if (status === "processed") {
      updates.processedAt = new Date();
    }

    const [timesheet] = await db
      .update(timesheets)
      .set(updates)
      .where(eq(timesheets.id, id))
      .returning();
    return timesheet || undefined;
  }

  async getPendingTimesheets(facilityId: number): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.facilityId, facilityId),
          sql`${timesheets.status} IN ('submitted', 'approved')`
        )
      )
      .orderBy(asc(timesheets.submittedAt));
  }

  // Timesheet Entry methods
  async createTimesheetEntry(insertEntry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const [entry] = await db.insert(timesheetEntries).values(insertEntry).returning();
    return entry;
  }

  async getTimesheetEntries(timesheetId: number): Promise<TimesheetEntry[]> {
    return await db
      .select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId))
      .orderBy(asc(timesheetEntries.workDate));
  }

  async updateTimesheetEntry(
    id: number,
    updates: Partial<InsertTimesheetEntry>
  ): Promise<TimesheetEntry | undefined> {
    const [entry] = await db
      .update(timesheetEntries)
      .set(updates)
      .where(eq(timesheetEntries.id, id))
      .returning();
    return entry || undefined;
  }

  // Payroll Sync Log methods
  async createPayrollSyncLog(insertLog: InsertPayrollSyncLog): Promise<PayrollSyncLog> {
    const [log] = await db.insert(payrollSyncLogs).values(insertLog).returning();
    return log;
  }

  async getPayrollSyncLogs(facilityId: number, providerId?: number): Promise<PayrollSyncLog[]> {
    const conditions = [eq(payrollSyncLogs.facilityId, facilityId)];
    if (providerId) {
      conditions.push(eq(payrollSyncLogs.providerId, providerId));
    }

    return await db
      .select()
      .from(payrollSyncLogs)
      .where(and(...conditions))
      .orderBy(desc(payrollSyncLogs.startedAt));
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByTimesheet(timesheetId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.timesheetId, timesheetId))
      .orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (status === "completed") {
      updates.paymentDate = new Date();
    }

    const [payment] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return payment || undefined;
  }

  async getPendingPayments(facilityId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.facilityId, facilityId),
          sql`${payments.status} IN ('pending', 'processing')`
        )
      )
      .orderBy(asc(payments.createdAt));
  }

  // Automated payroll processing
  async processPayroll(
    facilityId: number,
    payPeriodStart: Date,
    payPeriodEnd: Date
  ): Promise<{
    processedTimesheets: number;
    totalPayments: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processedTimesheets = 0;
    let totalPayments = 0;

    try {
      // Get approved timesheets for the pay period
      const approvedTimesheets = await db
        .select()
        .from(timesheets)
        .where(
          and(
            eq(timesheets.facilityId, facilityId),
            eq(timesheets.status, "approved"),
            gte(timesheets.payPeriodStart, payPeriodStart),
            lte(timesheets.payPeriodEnd, payPeriodEnd)
          )
        );

      for (const timesheet of approvedTimesheets) {
        try {
          // Get payroll employee info
          const payrollEmployee = await this.getPayrollEmployee(timesheet.userId, facilityId);
          if (!payrollEmployee) {
            errors.push(`No payroll configuration found for user ${timesheet.userId}`);
            continue;
          }

          // Calculate gross pay
          const grossPay = Number(timesheet.grossPay) || 0;

          // Calculate taxes and deductions (simplified calculation)
          const federalTax = grossPay * 0.12; // 12% federal tax
          const stateTax = grossPay * 0.05; // 5% state tax
          const socialSecurity = grossPay * 0.062; // 6.2% social security
          const medicare = grossPay * 0.0145; // 1.45% medicare

          const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
          const netAmount = grossPay - totalDeductions;

          // Create payment record
          const payment = await this.createPayment({
            timesheetId: timesheet.id,
            userId: timesheet.userId,
            facilityId: facilityId,
            payrollProviderId: payrollEmployee.payrollProviderId,
            grossAmount: grossPay.toString(),
            federalTax: federalTax.toString(),
            stateTax: stateTax.toString(),
            socialSecurity: socialSecurity.toString(),
            medicare: medicare.toString(),
            otherDeductions: "0",
            netAmount: netAmount.toString(),
            paymentMethod: "direct_deposit",
            status: "pending",
          });

          // Update timesheet status
          await this.updateTimesheetStatus(timesheet.id, "processed");

          processedTimesheets++;
          totalPayments += netAmount;
        } catch (error) {
          errors.push(`Error processing timesheet ${timesheet.id}: ${error}`);
        }
      }

      // Create sync log
      await this.createPayrollSyncLog({
        facilityId,
        providerId: 1, // Default provider
        syncType: "payment_sync",
        status: errors.length > 0 ? "partial" : "success",
        recordsProcessed: approvedTimesheets.length,
        recordsSucceeded: processedTimesheets,
        recordsFailed: approvedTimesheets.length - processedTimesheets,
        errorDetails: errors.length > 0 ? { errors } : null,
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy: 1, // System user
      });
    } catch (error) {
      errors.push(`System error during payroll processing: ${error}`);
    }

    return {
      processedTimesheets,
      totalPayments,
      errors,
    };
  }

  async syncWithPayrollProvider(facilityId: number, syncType: string): Promise<PayrollSyncLog> {
    const startTime = new Date();

    try {
      // Get payroll configuration
      const config = await this.getPayrollConfiguration(facilityId);
      if (!config) {
        throw new Error("No payroll configuration found for facility");
      }

      // Simulate sync with external payroll provider
      // In real implementation, this would make API calls to providers like ADP, Paychex, etc.

      const syncLog = await this.createPayrollSyncLog({
        facilityId,
        providerId: config.providerId,
        syncType,
        status: "success",
        recordsProcessed: 1,
        recordsSucceeded: 1,
        recordsFailed: 0,
        syncData: { message: "Sync completed successfully" },
        startedAt: startTime,
        completedAt: new Date(),
        createdBy: 1, // System user
      });

      // Update configuration last sync time
      await this.updatePayrollConfiguration(config.id, {
        lastSyncAt: new Date(),
      });

      return syncLog;
    } catch (error) {
      // Create error log
      return await this.createPayrollSyncLog({
        facilityId,
        providerId: 1, // Default provider
        syncType,
        status: "failed",
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 1,
        errorDetails: { error: error instanceof Error ? error.message : String(error) },
        startedAt: startTime,
        completedAt: new Date(),
        createdBy: 1, // System user
      });
    }
  }

  async getFacilitiesWithinRadius(
    lat: number,
    lng: number,
    radiusMiles: number
  ): Promise<Facility[]> {
    try {
      // Simple distance-based filtering for now
      const allFacilities = await this.getAllFacilities();
      return allFacilities.filter((facility) => {
        if (!facility.latitude || !facility.longitude) return false;

        // Simple distance calculation (not precise but functional)
        const latDiff = parseFloat(facility.latitude.toString()) - lat;
        const lngDiff = parseFloat(facility.longitude.toString()) - lng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles conversion

        return distance <= radiusMiles;
      });
    } catch (error: any) {
      console.error("Error in getFacilitiesWithinRadius:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
