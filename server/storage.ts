import { 
  users, facilities, jobs, jobApplications, shifts, timeClockEntries, 
  invoices, workLogs, credentials, messages, auditLogs, permissions, rolePermissions,
  type User, type InsertUser, type Facility, type InsertFacility,
  type Job, type InsertJob, type JobApplication, type InsertJobApplication,
  type Shift, type InsertShift, type Invoice, type InsertInvoice,
  type WorkLog, type InsertWorkLog, type Credential, type InsertCredential,
  type Message, type InsertMessage, type AuditLog, UserRole
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, count, sql } from "drizzle-orm";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

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
  getAllFacilities(): Promise<Facility[]>;

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
  updateApplicationStatus(id: number, status: string, reviewerId?: number): Promise<JobApplication | undefined>;

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
  updateInvoiceStatus(id: number, status: string, approvedById?: number): Promise<Invoice | undefined>;
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
  updateCredentialStatus(id: number, status: string, verifierId?: number): Promise<Credential | undefined>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  getUserMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Audit log methods
  createAuditLog(userId: number, action: string, resource: string, resourceId?: number, oldValues?: any, newValues?: any, ipAddress?: string, userAgent?: string): Promise<AuditLog>;
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
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
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
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, role), eq(users.isActive, true)));
  }

  async getUsersByFacility(facilityId: number): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.facilityId, facilityId), eq(users.isActive, true)));
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

  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).where(eq(facilities.isActive, true));
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
    return await db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.createdAt));
  }

  async getJobsByFacility(facilityId: number): Promise<Job[]> {
    return await db.select().from(jobs).where(and(eq(jobs.facilityId, facilityId), eq(jobs.isActive, true))).orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set({ ...updates, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
    return job || undefined;
  }

  // Job application methods
  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db.insert(jobApplications).values(insertApplication).returning();
    return application;
  }

  async getJobApplications(jobId: number): Promise<JobApplication[]> {
    return await db.select().from(jobApplications).where(eq(jobApplications.jobId, jobId)).orderBy(desc(jobApplications.appliedAt));
  }

  async getUserApplications(userId: number): Promise<JobApplication[]> {
    return await db.select().from(jobApplications).where(eq(jobApplications.applicantId, userId)).orderBy(desc(jobApplications.appliedAt));
  }

  async updateApplicationStatus(id: number, status: string, reviewerId?: number): Promise<JobApplication | undefined> {
    const updates: any = { status, reviewedAt: new Date() };
    if (reviewerId) updates.reviewedById = reviewerId;
    
    const [application] = await db.update(jobApplications).set(updates).where(eq(jobApplications.id, id)).returning();
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
    return await db.select().from(shifts)
      .where(and(
        eq(shifts.facilityId, facilityId),
        gte(shifts.startTime, startDate),
        lte(shifts.endTime, endDate)
      ))
      .orderBy(asc(shifts.startTime));
  }

  async getTodaysShifts(facilityId: number): Promise<Shift[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return await this.getShiftsByDateRange(facilityId, startOfDay, endOfDay);
  }

  async getOpenShifts(facilityId?: number): Promise<Shift[]> {
    const whereConditions = [eq(shifts.status, 'open')];
    if (facilityId) {
      whereConditions.push(eq(shifts.facilityId, facilityId));
    }
    
    return await db.select().from(shifts)
      .where(and(...whereConditions))
      .orderBy(asc(shifts.startTime));
  }

  async assignStaffToShift(shiftId: number, staffIds: number[]): Promise<Shift | undefined> {
    const [shift] = await db.update(shifts)
      .set({ 
        assignedStaffIds: staffIds, 
        status: staffIds.length > 0 ? 'filled' : 'open' 
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
    return await db.select().from(invoices).where(eq(invoices.contractorId, contractorId)).orderBy(desc(invoices.submittedAt));
  }

  async getInvoicesByFacility(facilityId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.facilityId, facilityId)).orderBy(desc(invoices.submittedAt));
  }

  async updateInvoiceStatus(id: number, status: string, approvedById?: number): Promise<Invoice | undefined> {
    const updates: any = { status };
    if (status === 'approved' && approvedById) {
      updates.approvedAt = new Date();
      updates.approvedById = approvedById;
    } else if (status === 'paid') {
      updates.paidAt = new Date();
    }
    
    const [invoice] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async getPendingInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.status, 'pending')).orderBy(desc(invoices.submittedAt));
  }

  // Work log methods
  async createWorkLog(insertWorkLog: InsertWorkLog): Promise<WorkLog> {
    const [workLog] = await db.insert(workLogs).values(insertWorkLog).returning();
    return workLog;
  }

  async getWorkLogsByUser(userId: number): Promise<WorkLog[]> {
    return await db.select().from(workLogs).where(eq(workLogs.userId, userId)).orderBy(desc(workLogs.submittedAt));
  }

  async getWorkLogsByShift(shiftId: number): Promise<WorkLog[]> {
    return await db.select().from(workLogs).where(eq(workLogs.shiftId, shiftId)).orderBy(desc(workLogs.submittedAt));
  }

  async updateWorkLogStatus(id: number, status: string, reviewerId: number): Promise<WorkLog | undefined> {
    const [workLog] = await db.update(workLogs)
      .set({ status, reviewedById: reviewerId, reviewedAt: new Date() })
      .where(eq(workLogs.id, id))
      .returning();
    return workLog || undefined;
  }

  async getPendingWorkLogs(): Promise<WorkLog[]> {
    return await db.select().from(workLogs).where(eq(workLogs.status, 'pending')).orderBy(desc(workLogs.submittedAt));
  }

  // Credential methods
  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    const [credential] = await db.insert(credentials).values(insertCredential).returning();
    return credential;
  }

  async getUserCredentials(userId: number): Promise<Credential[]> {
    return await db.select().from(credentials).where(eq(credentials.userId, userId)).orderBy(desc(credentials.issueDate));
  }

  async getExpiringCredentials(days: number): Promise<Credential[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await db.select().from(credentials)
      .where(and(
        eq(credentials.status, 'active'),
        lte(credentials.expirationDate, futureDate)
      ))
      .orderBy(asc(credentials.expirationDate));
  }

  async updateCredentialStatus(id: number, status: string, verifierId?: number): Promise<Credential | undefined> {
    const updates: any = { status };
    if (verifierId) {
      updates.verifiedAt = new Date();
      updates.verifiedById = verifierId;
    }
    
    const [credential] = await db.update(credentials).set(updates).where(eq(credentials.id, id)).returning();
    return credential || undefined;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.recipientId, userId))
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(id: number): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
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
    const [auditLog] = await db.insert(auditLogs).values({
      userId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    }).returning();
    return auditLog;
  }

  async getAuditLogs(userId?: number, resource?: string): Promise<AuditLog[]> {
    const whereConditions = [];
    if (userId) whereConditions.push(eq(auditLogs.userId, userId));
    if (resource) whereConditions.push(eq(auditLogs.resource, resource));
    
    return await db.select().from(auditLogs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(auditLogs.createdAt));
  }

  // Permission methods
  async getUserPermissions(role: string): Promise<string[]> {
    const rolePermissionsList = await db.select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.role, role));
    
    return rolePermissionsList.map(p => p.name);
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
    const [activeStaffResult] = await db.select({ count: count() })
      .from(users)
      .where(and(eq(users.facilityId, facilityId), eq(users.isActive, true)));

    // Open shifts count
    const [openShiftsResult] = await db.select({ count: count() })
      .from(shifts)
      .where(and(eq(shifts.facilityId, facilityId), eq(shifts.status, 'open')));

    // Calculate compliance rate (simplified - based on active credentials vs expired)
    const [totalCredentials] = await db.select({ count: count() })
      .from(credentials)
      .innerJoin(users, eq(credentials.userId, users.id))
      .where(eq(users.facilityId, facilityId));

    const [activeCredentials] = await db.select({ count: count() })
      .from(credentials)
      .innerJoin(users, eq(credentials.userId, users.id))
      .where(and(eq(users.facilityId, facilityId), eq(credentials.status, 'active')));

    const complianceRate = totalCredentials.count > 0 ? 
      (activeCredentials.count / totalCredentials.count) * 100 : 100;

    // Monthly hours (current month)
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [monthlyHoursResult] = await db.select({ 
      totalHours: sql<number>`COALESCE(SUM(${timeClockEntries.totalHours}), 0)`
    })
      .from(timeClockEntries)
      .innerJoin(users, eq(timeClockEntries.userId, users.id))
      .where(and(
        eq(users.facilityId, facilityId),
        gte(timeClockEntries.clockIn, firstOfMonth)
      ));

    return {
      activeStaff: activeStaffResult.count,
      openShifts: openShiftsResult.count,
      complianceRate: Math.round(complianceRate * 10) / 10,
      monthlyHours: Number(monthlyHoursResult.totalHours) || 0
    };
  }

  async getRecentActivity(facilityId: number, limit: number = 10): Promise<AuditLog[]> {
    const result = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt
    })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.facilityId, facilityId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    
    return result;
  }
}

export const storage = new DatabaseStorage();
