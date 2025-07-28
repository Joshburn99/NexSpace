import {
  users,
  facilities,
  facilityAddresses,
  facilityContacts,
  facilitySettings,
  facilityRates,
  facilityStaffingTargets,
  facilityDocuments,
  jobs,
  jobApplications,
  shifts,
  shiftAssignments,
  shiftTemplates,
  generatedShifts,
  userSessions,
  timeClockEntries,
  invoices,
  workLogs,
  credentials,
  conversations,
  conversationParticipants,
  messages,
  auditLogs,
  permissions,
  rolePermissions,
  staff,
  staffFacilityAssociations,
  staffCredentials,
  payrollProviders,
  payrollConfigurations,
  payrollEmployees,
  timesheets,
  timesheetEntries,
  payrollSyncLogs,
  payments,
  facilityUsers,
  notifications,
  analyticsEvents,
  type User,
  type InsertUser,
  type Facility,
  type InsertFacility,
  type FacilityAddress,
  type InsertFacilityAddress,
  type FacilityContact,
  type InsertFacilityContact,
  type FacilitySettings,
  type InsertFacilitySettings,
  type FacilityRates,
  type InsertFacilityRates,
  type FacilityStaffingTargets,
  type InsertFacilityStaffingTargets,
  type FacilityDocuments,
  type InsertFacilityDocuments,
  type Job,
  type InsertJob,
  type JobApplication,
  type InsertJobApplication,
  type Shift,
  type InsertShift,
  type ShiftTemplate,
  type InsertShiftTemplate,
  type GeneratedShift,
  type InsertGeneratedShift,
  type UserSession,
  type InsertUserSession,
  type Invoice,
  type InsertInvoice,
  type WorkLog,
  type InsertWorkLog,
  type Credential,
  type InsertCredential,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  type AuditLog,
  type Staff,
  type InsertStaff,
  type StaffFacilityAssociation,
  type InsertStaffFacilityAssociation,
  type StaffCredential,
  type InsertStaffCredential,
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
  type Notification,
  type InsertNotification,
  timeOffTypes,
  timeOffBalances,
  timeOffRequests,
  timeOffPolicies,
  type TimeOffType,
  type InsertTimeOffType,
  type TimeOffBalance,
  type InsertTimeOffBalance,
  type TimeOffRequest,
  type InsertTimeOffRequest,
  type TimeOffPolicy,
  type InsertTimeOffPolicy,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, lt, gt, count, sql, or, ilike } from "drizzle-orm";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import MemoryStore from "memorystore";
import FileStore from "session-file-store";

const PostgresSessionStore = connectPg(session);
const MemorySessionStore = MemoryStore(session);
const FileSessionStore = FileStore(session);

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
  updateUserOnboarding(id: number, data: { onboardingStep: number; onboardingCompleted: boolean }): Promise<User | undefined>;
  updateUserProfile(id: number, data: { firstName?: string; lastName?: string; phone?: string; department?: string; bio?: string }): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;

  // Facility methods - Core facility table
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  updateFacility(id: number, updates: Partial<InsertFacility>): Promise<Facility | undefined>;
  getAllFacilities(): Promise<Facility[]>;
  searchFacilities(query: string): Promise<Facility[]>;
  getFacilitiesByState(state: string): Promise<Facility[]>;
  getFacilityByCMSId(cmsId: string): Promise<Facility | undefined>;
  getFacilitiesWithinRadius(lat: number, lng: number, radiusMiles: number): Promise<Facility[]>;
  
  // Facility Address methods
  getFacilityAddress(facilityId: number): Promise<FacilityAddress | undefined>;
  createFacilityAddress(address: InsertFacilityAddress): Promise<FacilityAddress>;
  updateFacilityAddress(facilityId: number, updates: Partial<InsertFacilityAddress>): Promise<FacilityAddress | undefined>;
  
  // Facility Contact methods
  getFacilityContacts(facilityId: number): Promise<FacilityContact[]>;
  createFacilityContact(contact: InsertFacilityContact): Promise<FacilityContact>;
  updateFacilityContact(id: number, updates: Partial<InsertFacilityContact>): Promise<FacilityContact | undefined>;
  deleteFacilityContact(id: number): Promise<boolean>;
  
  // Facility Settings methods
  getFacilitySettings(facilityId: number): Promise<FacilitySettings | undefined>;
  createFacilitySettings(settings: InsertFacilitySettings): Promise<FacilitySettings>;
  updateFacilitySettings(facilityId: number, updates: Partial<InsertFacilitySettings>): Promise<FacilitySettings | undefined>;
  
  // Facility Rates methods
  getFacilityRates(facilityId: number): Promise<FacilityRates[]>;
  createFacilityRate(rate: InsertFacilityRates): Promise<FacilityRates>;
  updateFacilityRate(id: number, updates: Partial<InsertFacilityRates>): Promise<FacilityRates | undefined>;
  getActiveFacilityRates(facilityId: number, specialty?: string): Promise<FacilityRates[]>;
  
  // Facility Staffing Targets methods
  getFacilityStaffingTargets(facilityId: number): Promise<FacilityStaffingTargets[]>;
  createFacilityStaffingTarget(target: InsertFacilityStaffingTargets): Promise<FacilityStaffingTargets>;
  updateFacilityStaffingTarget(id: number, updates: Partial<InsertFacilityStaffingTargets>): Promise<FacilityStaffingTargets | undefined>;
  
  // Facility Documents methods
  getFacilityDocuments(facilityId: number): Promise<FacilityDocuments[]>;
  createFacilityDocument(document: InsertFacilityDocuments): Promise<FacilityDocuments>;
  updateFacilityDocument(id: number, updates: Partial<InsertFacilityDocuments>): Promise<FacilityDocuments | undefined>;
  deleteFacilityDocument(id: number): Promise<boolean>;

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

  // Conversation methods
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  updateConversationLastMessage(conversationId: number): Promise<void>;
  
  // Conversation participant methods
  addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]>;
  updateParticipantReadStatus(conversationId: number, userId: number): Promise<void>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: number): Promise<Message[]>;
  getConversationMessages(conversationId: number, limit?: number, offset?: number): Promise<Message[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  searchMessages(userId: number, query: string): Promise<Message[]>;

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
  getFacilityUserRoleTemplate(role: string): Promise<any | undefined>;

  // Facility User methods
  getAllFacilityUsers(): Promise<FacilityUser[]>;
  updateFacilityUserRole(id: number, role: string): Promise<FacilityUser | undefined>;

  // Dashboard analytics - Enhanced
  getDashboardStats(facilityIds?: number[]): Promise<{
    activeStaff: number;
    openShifts: number;
    complianceRate: number;
    monthlyHours: number;
    totalFacilities: number;
    urgentShifts: number;
    expiringCredentials: number;
    outstandingInvoices: number;
    monthlyRevenue: number;
    recentActivity: any[];
    priorityTasks: any[];
  }>;
  getFacilityStats(facilityId: number): Promise<{
    activeStaff: number;
    openShifts: number;
    complianceRate: number;
    monthlyHours: number;
  }>;
  getRecentActivity(facilityId: number, limit?: number): Promise<AuditLog[]>;
  
  // Dashboard customization
  getUserDashboardWidgets(userId: number): Promise<any>;
  saveDashboardWidgets(userId: number, widgets: any): Promise<void>;

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

  // Shift assignment methods
  getShiftAssignments(shiftId: string): Promise<Array<{ workerId: number; assignedAt: string; status: string }>>;
  addShiftAssignment(assignment: { shiftId: string; workerId: number; assignedById: number; status: string }): Promise<void>;
  updateShiftAssignmentStatus(shiftId: string, workerId: number, status: string): Promise<void>;

  // Shift template methods - replaces in-memory template storage
  createShiftTemplate(template: InsertShiftTemplate): Promise<ShiftTemplate>;
  getShiftTemplates(facilityId?: number): Promise<ShiftTemplate[]>;
  updateShiftTemplate(id: number, updates: Partial<InsertShiftTemplate>): Promise<ShiftTemplate | undefined>;
  deleteShiftTemplate(id: number): Promise<boolean>;

  // Generated shift methods - replaces global templateGeneratedShifts
  createGeneratedShift(shift: InsertGeneratedShift): Promise<GeneratedShift>;
  getGeneratedShifts(dateRange?: { start: string; end: string }): Promise<GeneratedShift[]>;
  updateGeneratedShift(id: string, updates: Partial<InsertGeneratedShift>): Promise<GeneratedShift | undefined>;
  deleteGeneratedShift(id: string): Promise<boolean>;

  // Session methods - replaces file-based sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionId: string): Promise<UserSession | undefined>;
  updateUserSession(sessionId: string, updates: Partial<InsertUserSession>): Promise<UserSession | undefined>;
  deleteUserSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<number>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number | null, facilityUserId: number | null, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number | null, facilityUserId: number | null): Promise<number>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number | null, facilityUserId: number | null): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  deleteAllNotifications(userId: number | null, facilityUserId: number | null): Promise<void>;

  // Time-off methods
  getTimeOffTypes(isActive?: boolean): Promise<TimeOffType[]>;
  createTimeOffType(type: InsertTimeOffType): Promise<TimeOffType>;
  updateTimeOffType(id: number, updates: Partial<InsertTimeOffType>): Promise<TimeOffType | undefined>;
  
  getTimeOffBalances(userId: number, year?: number): Promise<TimeOffBalance[]>;
  getTimeOffBalance(userId: number, timeOffTypeId: number, year: number): Promise<TimeOffBalance | undefined>;
  createTimeOffBalance(balance: InsertTimeOffBalance): Promise<TimeOffBalance>;
  updateTimeOffBalance(id: number, updates: Partial<InsertTimeOffBalance>): Promise<TimeOffBalance | undefined>;
  
  getTimeOffRequests(filters?: {
    userId?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    facilityId?: number;
  }): Promise<TimeOffRequest[]>;
  getTimeOffRequest(id: number): Promise<TimeOffRequest | undefined>;
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  updateTimeOffRequest(id: number, updates: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined>;
  reviewTimeOffRequest(id: number, status: string, reviewedBy: number, reviewNotes?: string): Promise<TimeOffRequest | undefined>;
  
  getTimeOffPolicies(facilityId?: number): Promise<TimeOffPolicy[]>;
  createTimeOffPolicy(policy: InsertTimeOffPolicy): Promise<TimeOffPolicy>;
  updateTimeOffPolicy(id: number, updates: Partial<InsertTimeOffPolicy>): Promise<TimeOffPolicy | undefined>;
  
  checkShiftCoverage(userId: number, startDate: Date, endDate: Date): Promise<Shift[]>;
  calculateTimeOffAccrual(userId: number, timeOffTypeId: number, year: number): Promise<number>;
  
  // Staff methods
  getAllStaff(): Promise<Staff[]>;
  getStaffMember(id: number): Promise<Staff | undefined>;
  getStaffByEmail(email: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: number, updates: Partial<InsertStaff>): Promise<Staff | undefined>;
  
  // Staff-facility association methods
  getStaffByFacility(facilityId: number): Promise<Staff[]>;
  addStaffFacilityAssociation(association: InsertStaffFacilityAssociation): Promise<StaffFacilityAssociation>;
  removeStaffFacilityAssociation(staffId: number, facilityId: number): Promise<void>;
  getStaffFacilityAssociations(staffId: number): Promise<StaffFacilityAssociation[]>;
  
  // Staff credential methods
  addStaffCredential(credential: InsertStaffCredential): Promise<StaffCredential>;
  getStaffCredentials(staffId: number): Promise<Credential[]>;
  
  // Analytics event tracking methods
  trackEvent(event: InsertAnalyticsEvent): Promise<void>;
  getAnalyticsEvents(filters?: {
    userId?: number;
    facilityId?: number;
    eventCategory?: string;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AnalyticsEvent[]>;
  getEventStats(filters?: {
    eventCategory?: string;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{ date: string; count: number; category?: string }[]>;
  getRecentAnalyticsEvents(limit: number, offset: number, category?: string): Promise<AnalyticsEvent[]>;
  getAnalyticsEventCounts(): Promise<{ [category: string]: number }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    // Use file-based session store for persistence during development
    if (process.env.NODE_ENV === 'development') {
      console.log('Using file-based session store for development persistence');
      this.sessionStore = new FileSessionStore({
        path: './sessions',
        secret: process.env.SESSION_SECRET || 'nexspace-dev-secret',
        ttl: 86400 * 7, // 7 days for dev
        retries: 0,
        logFn: () => {}, // Suppress file store logs
      });
    } else {
      // Use memory store for production to avoid file system issues
      console.log('Using memory session store for production');
      this.sessionStore = new MemorySessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    console.log(`[STORAGE] getUser called with id: ${id}`);
    
    try {
      // First try to find in users table
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user) {
        console.log(`[STORAGE] Found user in users table:`, user);
        return user;
      }
      
      // If not found, try facility_users table
      console.log(`[STORAGE] User not found in users table, checking facility_users table`);
      const [facilityUser] = await db.select().from(facilityUsers).where(eq(facilityUsers.id, id));
      if (facilityUser) {
        console.log(`[STORAGE] Found facility user:`, facilityUser);
        
        // Convert facility user to user format for compatibility
        const convertedUser = {
          id: facilityUser.id,
          username: facilityUser.email, // Use email as username for compatibility
          email: facilityUser.email,
          firstName: facilityUser.firstName,
          lastName: facilityUser.lastName,
          role: facilityUser.role,
          isActive: facilityUser.isActive,
          facilityId: facilityUser.facilityId,
          avatar: facilityUser.avatar,
          createdAt: facilityUser.createdAt,
          updatedAt: facilityUser.updatedAt,
          password: '', // Not needed for facility users
          userType: 'facility_user',
          permissions: facilityUser.permissions
        } as any;
        
        console.log(`[STORAGE] Converted facility user to user format:`, convertedUser);
        return convertedUser;
      }
      
      console.log(`[STORAGE] User not found in either table`);
      return undefined;
    } catch (error) {
      console.error(`[STORAGE] Error in getUser:`, error);
      throw error;
    }
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

  async updateUserOnboarding(id: number, data: { onboardingStep: number; onboardingCompleted: boolean }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        onboardingStep: data.onboardingStep,
        onboardingCompleted: data.onboardingCompleted,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserProfile(id: number, data: { firstName?: string; lastName?: string; phone?: string; department?: string; bio?: string }): Promise<User | undefined> {
    const updates: any = { updatedAt: new Date() };
    if (data.firstName !== undefined) updates.firstName = data.firstName;
    if (data.lastName !== undefined) updates.lastName = data.lastName;
    // Note: phone, department, and bio fields would need to be added to the users table schema
    
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
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
    // Remove fields that don't exist in the database
    const { updatedAt, ...validUpdates } = updates as any;
    
    const [facility] = await db
      .update(facilities)
      .set(validUpdates)
      .where(eq(facilities.id, id))
      .returning();
    return facility || undefined;
  }

  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).where(eq(facilities.isActive, true));
  }

  async searchFacilities(query: string): Promise<Facility[]> {
    const result = await db
      .select({
        facility: facilities,
      })
      .from(facilities)
      .leftJoin(facilityAddresses, eq(facilities.id, facilityAddresses.facilityId))
      .where(
        and(
          eq(facilities.isActive, true),
          or(
            ilike(facilities.name, `%${query}%`),
            ilike(facilityAddresses.city, `%${query}%`),
            ilike(facilityAddresses.state, `%${query}%`),
            eq(facilities.cmsId, query)
          )
        )
      );
    
    return result.map(r => r.facility);
  }

  async getFacilitiesByState(state: string): Promise<Facility[]> {
    const result = await db
      .select({
        facility: facilities,
      })
      .from(facilities)
      .innerJoin(facilityAddresses, eq(facilities.id, facilityAddresses.facilityId))
      .where(and(
        eq(facilities.isActive, true), 
        eq(facilityAddresses.state, state)
      ));
    
    return result.map(r => r.facility);
  }

  async getFacilityByCMSId(cmsId: string): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.cmsId, cmsId));
    return facility || undefined;
  }

  async getFacilitiesWithinRadius(lat: number, lng: number, radiusMiles: number): Promise<Facility[]> {
    // Using the Haversine formula for distance calculation
    const result = await db
      .select({
        facility: facilities,
        distance: sql<number>`
          (3959 * acos(
            cos(radians(${lat})) * 
            cos(radians(${facilityAddresses.latitude})) * 
            cos(radians(${facilityAddresses.longitude}) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(${facilityAddresses.latitude}))
          ))
        `,
      })
      .from(facilities)
      .innerJoin(facilityAddresses, eq(facilities.id, facilityAddresses.facilityId))
      .where(and(
        eq(facilities.isActive, true),
        sql`
          (3959 * acos(
            cos(radians(${lat})) * 
            cos(radians(${facilityAddresses.latitude})) * 
            cos(radians(${facilityAddresses.longitude}) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(${facilityAddresses.latitude}))
          )) <= ${radiusMiles}
        `
      ))
      .orderBy(sql`distance`);
    
    return result.map(r => r.facility);
  }

  // Facility Address methods
  async getFacilityAddress(facilityId: number): Promise<FacilityAddress | undefined> {
    const [address] = await db
      .select()
      .from(facilityAddresses)
      .where(eq(facilityAddresses.facilityId, facilityId));
    return address || undefined;
  }

  async createFacilityAddress(address: InsertFacilityAddress): Promise<FacilityAddress> {
    const [newAddress] = await db.insert(facilityAddresses).values(address).returning();
    return newAddress;
  }

  async updateFacilityAddress(facilityId: number, updates: Partial<InsertFacilityAddress>): Promise<FacilityAddress | undefined> {
    const [updatedAddress] = await db
      .update(facilityAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilityAddresses.facilityId, facilityId))
      .returning();
    return updatedAddress || undefined;
  }

  // Facility Contact methods
  async getFacilityContacts(facilityId: number): Promise<FacilityContact[]> {
    return await db
      .select()
      .from(facilityContacts)
      .where(eq(facilityContacts.facilityId, facilityId))
      .orderBy(desc(facilityContacts.isPrimary), asc(facilityContacts.contactType));
  }

  async createFacilityContact(contact: InsertFacilityContact): Promise<FacilityContact> {
    const [newContact] = await db.insert(facilityContacts).values(contact).returning();
    return newContact;
  }

  async updateFacilityContact(id: number, updates: Partial<InsertFacilityContact>): Promise<FacilityContact | undefined> {
    const [updatedContact] = await db
      .update(facilityContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilityContacts.id, id))
      .returning();
    return updatedContact || undefined;
  }

  async deleteFacilityContact(id: number): Promise<boolean> {
    const result = await db.delete(facilityContacts).where(eq(facilityContacts.id, id));
    return result.count > 0;
  }

  // Facility Settings methods
  async getFacilitySettings(facilityId: number): Promise<FacilitySettings | undefined> {
    const [settings] = await db
      .select()
      .from(facilitySettings)
      .where(eq(facilitySettings.facilityId, facilityId));
    return settings || undefined;
  }

  async createFacilitySettings(settings: InsertFacilitySettings): Promise<FacilitySettings> {
    const [newSettings] = await db.insert(facilitySettings).values(settings).returning();
    return newSettings;
  }

  async updateFacilitySettings(facilityId: number, updates: Partial<InsertFacilitySettings>): Promise<FacilitySettings | undefined> {
    const [updatedSettings] = await db
      .update(facilitySettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilitySettings.facilityId, facilityId))
      .returning();
    return updatedSettings || undefined;
  }

  // Facility Rates methods
  async getFacilityRates(facilityId: number): Promise<FacilityRates[]> {
    return await db
      .select()
      .from(facilityRates)
      .where(eq(facilityRates.facilityId, facilityId))
      .orderBy(desc(facilityRates.effectiveDate), asc(facilityRates.specialty));
  }

  async createFacilityRate(rate: InsertFacilityRates): Promise<FacilityRates> {
    const [newRate] = await db.insert(facilityRates).values(rate).returning();
    return newRate;
  }

  async updateFacilityRate(id: number, updates: Partial<InsertFacilityRates>): Promise<FacilityRates | undefined> {
    const [updatedRate] = await db
      .update(facilityRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilityRates.id, id))
      .returning();
    return updatedRate || undefined;
  }

  async getActiveFacilityRates(facilityId: number, specialty?: string): Promise<FacilityRates[]> {
    const now = new Date();
    let query = db
      .select()
      .from(facilityRates)
      .where(and(
        eq(facilityRates.facilityId, facilityId),
        lte(facilityRates.effectiveDate, now),
        or(
          gt(facilityRates.endDate, now),
          sql`${facilityRates.endDate} IS NULL`
        )
      ));
    
    if (specialty) {
      query = query.where(eq(facilityRates.specialty, specialty));
    }
    
    return await query.orderBy(desc(facilityRates.effectiveDate));
  }

  // Facility Staffing Targets methods
  async getFacilityStaffingTargets(facilityId: number): Promise<FacilityStaffingTargets[]> {
    return await db
      .select()
      .from(facilityStaffingTargets)
      .where(eq(facilityStaffingTargets.facilityId, facilityId))
      .orderBy(asc(facilityStaffingTargets.department));
  }

  async createFacilityStaffingTarget(target: InsertFacilityStaffingTargets): Promise<FacilityStaffingTargets> {
    const [newTarget] = await db.insert(facilityStaffingTargets).values(target).returning();
    return newTarget;
  }

  async updateFacilityStaffingTarget(id: number, updates: Partial<InsertFacilityStaffingTargets>): Promise<FacilityStaffingTargets | undefined> {
    const [updatedTarget] = await db
      .update(facilityStaffingTargets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilityStaffingTargets.id, id))
      .returning();
    return updatedTarget || undefined;
  }

  // Facility Documents methods
  async getFacilityDocuments(facilityId: number): Promise<FacilityDocuments[]> {
    return await db
      .select()
      .from(facilityDocuments)
      .where(eq(facilityDocuments.facilityId, facilityId))
      .orderBy(desc(facilityDocuments.uploadDate), asc(facilityDocuments.documentType));
  }

  async createFacilityDocument(document: InsertFacilityDocuments): Promise<FacilityDocuments> {
    const [newDoc] = await db.insert(facilityDocuments).values(document).returning();
    return newDoc;
  }

  async updateFacilityDocument(id: number, updates: Partial<InsertFacilityDocuments>): Promise<FacilityDocuments | undefined> {
    const [updatedDoc] = await db
      .update(facilityDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilityDocuments.id, id))
      .returning();
    return updatedDoc || undefined;
  }

  async deleteFacilityDocument(id: number): Promise<boolean> {
    const result = await db.delete(facilityDocuments).where(eq(facilityDocuments.id, id));
    return result.count > 0;
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

  async getStaffByEmail(email: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.email, email));
    return staffMember || undefined;
  }

  // Staff-facility association methods
  async getStaffByFacility(facilityId: number): Promise<Staff[]> {
    const staffMembers = await db
      .select({
        staff: staff,
      })
      .from(staff)
      .innerJoin(staffFacilityAssociations, eq(staff.id, staffFacilityAssociations.staffId))
      .where(
        and(
          eq(staffFacilityAssociations.facilityId, facilityId),
          eq(staffFacilityAssociations.status, 'active'),
          eq(staff.isActive, true)
        )
      );
    return staffMembers.map(row => row.staff);
  }

  async addStaffFacilityAssociation(association: InsertStaffFacilityAssociation): Promise<StaffFacilityAssociation> {
    const [newAssociation] = await db.insert(staffFacilityAssociations).values(association).returning();
    return newAssociation;
  }

  async removeStaffFacilityAssociation(staffId: number, facilityId: number): Promise<void> {
    await db
      .update(staffFacilityAssociations)
      .set({ status: 'inactive', endDate: new Date() })
      .where(
        and(
          eq(staffFacilityAssociations.staffId, staffId),
          eq(staffFacilityAssociations.facilityId, facilityId)
        )
      );
  }

  async getStaffFacilityAssociations(staffId: number): Promise<StaffFacilityAssociation[]> {
    return await db
      .select()
      .from(staffFacilityAssociations)
      .where(
        and(
          eq(staffFacilityAssociations.staffId, staffId),
          eq(staffFacilityAssociations.status, 'active')
        )
      );
  }

  // Staff credential methods
  async addStaffCredential(credential: InsertStaffCredential): Promise<StaffCredential> {
    const [newCredential] = await db.insert(staffCredentials).values(credential).returning();
    return newCredential;
  }

  async getStaffCredentials(staffId: number): Promise<Credential[]> {
    const staffCreds = await db
      .select({
        credential: credentials,
      })
      .from(credentials)
      .innerJoin(staffCredentials, eq(credentials.id, staffCredentials.credentialId))
      .where(eq(staffCredentials.staffId, staffId));
    return staffCreds.map(row => row.credential);
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

  async getGeneratedShift(id: string): Promise<any | undefined> {
    try {
      const [shift] = await db.select().from(generatedShifts).where(eq(generatedShifts.id, id));
      return shift || undefined;
    } catch (error) {
      console.error(`[STORAGE] Error getting generated shift ${id}:`, error);
      return undefined;
    }
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
  // Conversation methods
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [result] = await db.insert(conversations).values(conversation).returning();
    return result;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [result] = await db.select().from(conversations).where(eq(conversations.id, id));
    return result;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    const results = await db
      .select({
        conversation: conversations,
        unreadCount: conversationParticipants.unreadCount,
      })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
    
    return results.map(r => ({
      ...r.conversation,
      unreadCount: r.unreadCount || 0
    }));
  }

  async updateConversationLastMessage(conversationId: number): Promise<void> {
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  // Conversation participant methods
  async addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [result] = await db.insert(conversationParticipants).values(participant).returning();
    return result;
  }

  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }

  async updateParticipantReadStatus(conversationId: number, userId: number): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ 
        lastReadAt: new Date(),
        unreadCount: 0 
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    
    // Update conversation last message time
    await this.updateConversationLastMessage(message.conversationId);
    
    // Increment unread count for all participants except sender
    await db
      .update(conversationParticipants)
      .set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` })
      .where(
        and(
          eq(conversationParticipants.conversationId, message.conversationId),
          sql`${conversationParticipants.userId} != ${message.senderId}`
        )
      );
    
    return message;
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    // Get messages from conversations where user is a participant
    const participantConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    if (participantConversations.length === 0) return [];
    
    const conversationIds = participantConversations.map(p => p.conversationId);
    
    return await db
      .select()
      .from(messages)
      .where(sql`${messages.conversationId} = ANY(${conversationIds})`)
      .orderBy(desc(messages.createdAt))
      .limit(100);
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ totalUnread: sql<number>`COALESCE(SUM(${conversationParticipants.unreadCount}), 0)` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    return result.totalUnread || 0;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    await this.updateParticipantReadStatus(conversationId, userId);
  }

  async searchMessages(userId: number, query: string): Promise<Message[]> {
    const participantConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    if (participantConversations.length === 0) return [];
    
    const conversationIds = participantConversations.map(p => p.conversationId);
    
    return await db
      .select()
      .from(messages)
      .where(
        and(
          sql`${messages.conversationId} = ANY(${conversationIds})`,
          ilike(messages.content, `%${query}%`)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);
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

  async getFacilityUserRoleTemplate(role: string): Promise<any | undefined> {
    const { facilityUserRoleTemplates } = await import("@shared/schema");
    const [template] = await db
      .select()
      .from(facilityUserRoleTemplates)
      .where(
        and(
          eq(facilityUserRoleTemplates.role, role),
          eq(facilityUserRoleTemplates.isActive, true)
        )
      );
    return template || undefined;
  }

  async getFacilityUserByEmail(email: string): Promise<any | undefined> {
    const { facilityUsers } = await import("@shared/schema");
    const [facilityUser] = await db
      .select()
      .from(facilityUsers)
      .where(eq(facilityUsers.email, email));
    return facilityUser || undefined;
  }

  async getAllFacilityUsers(): Promise<any[]> {
    const { facilityUsers } = await import("@shared/schema");
    return await db
      .select()
      .from(facilityUsers)
      .orderBy(facilityUsers.email);
  }

  async updateFacilityUserRole(id: number, role: string): Promise<any | undefined> {
    const { facilityUsers } = await import("@shared/schema");
    const [facilityUser] = await db
      .update(facilityUsers)
      .set({ role, updatedAt: new Date() })
      .where(eq(facilityUsers.id, id))
      .returning();
    return facilityUser || undefined;
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

  // Enhanced dashboard analytics with facility filtering
  async getDashboardStats(facilityIds?: number[]): Promise<{
    activeStaff: number;
    openShifts: number;
    filledShifts: number;
    complianceRate: number;
    monthlyHours: number;
    totalFacilities: number;
    urgentShifts: number;
    expiringCredentials: number;
    outstandingInvoices: number;
    monthlyRevenue: number;
    floatPoolCount: number;
    upcomingTimeOff: number;
    billingTotal: number;
    recentActivity: any[];
    priorityTasks: any[];
  }> {
    // Build facility filter condition
    const facilityCondition = facilityIds?.length 
      ? or(...facilityIds.map(id => eq(facilities.id, id)))
      : undefined;

    // Active staff count from staff table with facility association filtering
    let activeStaffQuery = db
      .select({ count: count() })
      .from(staff)
      .where(eq(staff.isActive, true));
    
    if (facilityIds?.length) {
      // Filter staff by associated facilities
      activeStaffQuery = activeStaffQuery.where(
        sql`${staff.associatedFacilities} && ${facilityIds}`
      );
    }
    
    const [activeStaffResult] = await activeStaffQuery;

    // Open shifts count
    let openShiftsQuery = db
      .select({ count: count() })
      .from(shifts)
      .where(eq(shifts.status, "open"));
    
    if (facilityIds?.length) {
      openShiftsQuery = openShiftsQuery.where(
        or(...facilityIds.map(id => eq(shifts.facilityId, id)))
      );
    }
    
    const [openShiftsResult] = await openShiftsQuery;

    // Filled shifts count
    let filledShiftsQuery = db
      .select({ count: count() })
      .from(shifts)
      .where(eq(shifts.status, "filled"));
    
    if (facilityIds?.length) {
      filledShiftsQuery = filledShiftsQuery.where(
        or(...facilityIds.map(id => eq(shifts.facilityId, id)))
      );
    }
    
    const [filledShiftsResult] = await filledShiftsQuery;

    // Float pool count (available staff not on active shift)
    let floatPoolQuery = db
      .select({ count: count() })
      .from(staff)
      .where(
        and(
          eq(staff.isActive, true),
          eq(staff.employmentType, "full_time")
        )
      );
    
    if (facilityIds?.length) {
      floatPoolQuery = floatPoolQuery.where(
        sql`${staff.associatedFacilities} && ${facilityIds}`
      );
    }
    
    const [floatPoolResult] = await floatPoolQuery;

    // Upcoming time off (next 7 days) - placeholder for now
    // TODO: Implement when timeOffRequests table is added
    const upcomingTimeOffResult = { count: 0 };

    // Billing total (current period unpaid invoices)
    let billingTotalQuery = db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
      })
      .from(invoices)
      .where(
        or(
          eq(invoices.status, "pending"),
          eq(invoices.status, "overdue")
        )
      );
    
    if (facilityIds?.length) {
      billingTotalQuery = billingTotalQuery.where(
        or(...facilityIds.map(id => eq(invoices.facilityId, id)))
      );
    }
    
    const [billingTotalResult] = await billingTotalQuery;

    // Urgent shifts (those posted in last 24 hours or marked urgent)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let urgentShiftsQuery = db
      .select({ count: count() })
      .from(shifts)
      .where(
        and(
          eq(shifts.status, "open"),
          or(
            gte(shifts.createdAt, yesterday),
            eq(shifts.urgency, "urgent")
          )
        )
      );
    
    if (facilityIds?.length) {
      urgentShiftsQuery = urgentShiftsQuery.where(
        or(...facilityIds.map(id => eq(shifts.facilityId, id)))
      );
    }
    
    const [urgentShiftsResult] = await urgentShiftsQuery;

    // Expiring credentials (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const [expiringCredentialsResult] = await db
      .select({ count: count() })
      .from(credentials)
      .where(
        and(
          eq(credentials.status, "active"),
          lte(credentials.expirationDate, thirtyDaysFromNow)
        )
      );

    // Outstanding invoices
    const [outstandingInvoicesResult] = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.status, "pending"));

    // Monthly revenue calculation
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [monthlyRevenueResult] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, firstOfMonth)
        )
      );

    // Monthly hours calculation
    const [monthlyHoursResult] = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(${timeClockEntries.totalHours}), 0)`,
      })
      .from(timeClockEntries)
      .where(gte(timeClockEntries.clockIn, firstOfMonth));

    // Compliance rate calculation
    const [totalCredentials] = await db
      .select({ count: count() })
      .from(credentials);

    const [activeCredentials] = await db
      .select({ count: count() })
      .from(credentials)
      .where(eq(credentials.status, "active"));

    const complianceRate = totalCredentials.count > 0 
      ? (activeCredentials.count / totalCredentials.count) * 100 
      : 100;

    // Recent activity
    const recentActivity = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        createdAt: auditLogs.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    // Priority tasks
    const priorityTasks = [
      ...(urgentShiftsResult.count > 0 ? [{
        id: 'urgent-shifts',
        title: `${urgentShiftsResult.count} Urgent Shifts Need Attention`,
        type: 'urgent',
        count: urgentShiftsResult.count
      }] : []),
      ...(expiringCredentialsResult.count > 0 ? [{
        id: 'expiring-credentials',
        title: `${expiringCredentialsResult.count} Credentials Expiring Soon`,
        type: 'warning',
        count: expiringCredentialsResult.count
      }] : []),
      ...(outstandingInvoicesResult.count > 0 ? [{
        id: 'outstanding-invoices',
        title: `${outstandingInvoicesResult.count} Invoices Pending Review`,
        type: 'info',
        count: outstandingInvoicesResult.count
      }] : [])
    ];

    // Total facilities count
    let facilitiesQuery = db.select({ count: count() }).from(facilities);
    if (facilityIds?.length) {
      facilitiesQuery = facilitiesQuery.where(
        or(...facilityIds.map(id => eq(facilities.id, id)))
      );
    }
    const [totalFacilitiesResult] = await facilitiesQuery;

    return {
      activeStaff: activeStaffResult.count,
      openShifts: openShiftsResult.count,
      filledShifts: filledShiftsResult.count,
      complianceRate: Math.round(complianceRate * 10) / 10,
      monthlyHours: Number(monthlyHoursResult.totalHours) || 0,
      totalFacilities: totalFacilitiesResult.count,
      urgentShifts: urgentShiftsResult.count,
      expiringCredentials: expiringCredentialsResult.count,
      outstandingInvoices: outstandingInvoicesResult.count,
      monthlyRevenue: Number(monthlyRevenueResult.totalRevenue) || 0,
      floatPoolCount: floatPoolResult.count,
      upcomingTimeOff: upcomingTimeOffResult.count,
      billingTotal: Number(billingTotalResult.totalAmount) || 0,
      recentActivity,
      priorityTasks
    };
  }

  // Dashboard customization methods
  async getUserDashboardWidgets(userId: number): Promise<any> {
    try {
      // Try to get existing user configuration from users table
      const user = await this.db
        .select({ dashboardPreferences: schema.users.dashboardPreferences })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (user.length > 0 && user[0].dashboardPreferences) {
        console.log(`[STORAGE] Found existing dashboard config for user ${userId}`);
        return user[0].dashboardPreferences;
      }

      // Return default widget configuration if none exists
      const defaultWidgets = [
        // Core Stats Widgets
        { id: 'active-staff', title: 'Active Staff', visible: true, category: 'stats' },
        { id: 'open-shifts', title: 'Open Shifts', visible: true, category: 'stats' },
        { id: 'compliance-rate', title: 'Compliance Rate', visible: true, category: 'stats' },
        { id: 'monthly-revenue', title: 'Monthly Revenue', visible: false, category: 'stats' },
        { id: 'monthly-hours', title: 'Monthly Hours', visible: false, category: 'stats' },
        { id: 'total-facilities', title: 'Total Facilities', visible: false, category: 'stats' },
        { id: 'outstanding-invoices', title: 'Outstanding Invoices', visible: false, category: 'stats' },
        { id: 'urgent-shifts', title: 'Urgent Shifts', visible: false, category: 'stats' },
        { id: 'expiring-credentials', title: 'Expiring Credentials', visible: false, category: 'stats' },
        
        // Activity & Communication Widgets
        { id: 'priority-tasks', title: 'Priority Tasks', visible: true, category: 'activity' },
        { id: 'recent-activity', title: 'Recent Activity', visible: true, category: 'activity' },
        { id: 'notifications', title: 'Notifications', visible: false, category: 'activity' },
        { id: 'message-center', title: 'Message Center', visible: false, category: 'activity' },
        
        // Analytics & Reporting Widgets
        { id: 'performance-trends', title: 'Performance Trends', visible: false, category: 'analytics' },
        { id: 'capacity-planning', title: 'Capacity Planning', visible: false, category: 'analytics' },
        { id: 'financial-summary', title: 'Financial Summary', visible: false, category: 'analytics' },
        { id: 'schedule-overview', title: 'Schedule Overview', visible: false, category: 'analytics' },
        
        // Operations Widgets
        { id: 'facility-map', title: 'Facility Map', visible: false, category: 'operations' },
        { id: 'quick-actions', title: 'Quick Actions', visible: false, category: 'operations' },
        { id: 'staff-availability', title: 'Staff Availability', visible: false, category: 'operations' },
        { id: 'shift-coverage', title: 'Shift Coverage', visible: false, category: 'operations' }
      ];

      console.log(`[STORAGE] Returning default dashboard config for user ${userId} - ${defaultWidgets.length} total widgets`);
      return {
        layout: 'grid',
        widgets: defaultWidgets
      };
    } catch (error) {
      console.error(`[STORAGE] Error getting dashboard widgets for user ${userId}:`, error);
      throw error;
    }
  }

  async saveDashboardWidgets(userId: number, widgets: any): Promise<void> {
    try {
      console.log(`[STORAGE] Saving dashboard widgets for user ${userId}:`, {
        widgetCount: widgets?.length || 0,
        visibleWidgets: widgets?.filter((w: any) => w.visible)?.length || 0
      });

      const widgetConfiguration = {
        layout: 'grid',
        widgets: widgets
      };

      // Update user's dashboard preferences
      await this.db
        .update(schema.users)
        .set({
          dashboardPreferences: widgetConfiguration,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, userId));
      
      console.log(`[STORAGE] Updated dashboard preferences for user ${userId}`);
    } catch (error) {
      console.error(`[STORAGE] Error saving dashboard widgets for user ${userId}:`, error);
      throw error;
    }
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

  // Shift assignment methods
  async getShiftAssignments(shiftId: string): Promise<Array<{ workerId: number; assignedAt: string; status: string }>> {
    try {
      console.log(`[DEBUG] Querying assignments for shift ${shiftId}`);
      
      const assignments = await db.select({
        workerId: shiftAssignments.workerId,
        assignedAt: shiftAssignments.assignedAt,
        status: shiftAssignments.status,
      })
      .from(shiftAssignments)
      .where(and(
        eq(shiftAssignments.shiftId, shiftId),
        eq(shiftAssignments.status, 'assigned')
      ));
      
      console.log(`[DEBUG] Found ${assignments.length} assignments for shift ${shiftId}:`, assignments);
      
      return assignments.map(a => ({
        workerId: a.workerId,
        assignedAt: a.assignedAt?.toISOString() || new Date().toISOString(),
        status: a.status
      }));
    } catch (error: any) {
      console.error("Error in getShiftAssignments:", error);
      return [];
    }
  }

  async addShiftAssignment(assignment: { shiftId: string; workerId: number; assignedById: number; status: string }): Promise<void> {
    try {
      await db.insert(shiftAssignments).values({
        shiftId: assignment.shiftId,
        workerId: assignment.workerId,
        assignedById: assignment.assignedById,
        status: assignment.status,
        assignedAt: new Date(),
      });
    } catch (error: any) {
      console.error("Error in addShiftAssignment:", error);
      throw error;
    }
  }

  async updateShiftAssignmentStatus(shiftId: string, workerId: number, status: string): Promise<void> {
    try {
      await db.update(shiftAssignments)
        .set({ status })
        .where(and(
          eq(shiftAssignments.shiftId, shiftId),
          eq(shiftAssignments.workerId, workerId)
        ));
    } catch (error: any) {
      console.error("Error in updateShiftAssignmentStatus:", error);
      throw error;
    }
  }

  // Shift template methods - replaces in-memory template storage
  async createShiftTemplate(template: InsertShiftTemplate): Promise<ShiftTemplate> {
    const [result] = await db.insert(shiftTemplates).values(template).returning();
    return result;
  }

  async getShiftTemplates(facilityId?: number): Promise<ShiftTemplate[]> {
    if (facilityId) {
      return await db.select().from(shiftTemplates)
        .where(and(eq(shiftTemplates.facilityId, facilityId), eq(shiftTemplates.isActive, true)));
    }
    return await db.select().from(shiftTemplates).where(eq(shiftTemplates.isActive, true));
  }

  async updateShiftTemplate(id: number, updates: Partial<InsertShiftTemplate>): Promise<ShiftTemplate | undefined> {
    const [result] = await db
      .update(shiftTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shiftTemplates.id, id))
      .returning();
    return result;
  }

  async deleteShiftTemplate(id: number): Promise<boolean> {
    const result = await db
      .update(shiftTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shiftTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Generated shift methods - replaces global templateGeneratedShifts
  async createGeneratedShift(shift: InsertGeneratedShift): Promise<GeneratedShift> {
    const [result] = await db.insert(generatedShifts).values(shift).returning();
    return result;
  }

  async getGeneratedShifts(dateRange?: { start: string; end: string }): Promise<GeneratedShift[]> {
    if (dateRange) {
      return await db.select().from(generatedShifts)
        .where(and(
          gte(generatedShifts.date, dateRange.start),
          lte(generatedShifts.date, dateRange.end)
        ))
        .orderBy(generatedShifts.date, generatedShifts.startTime);
    }
    
    return await db.select().from(generatedShifts)
      .orderBy(generatedShifts.date, generatedShifts.startTime);
  }

  async updateGeneratedShift(id: string, updates: Partial<InsertGeneratedShift>): Promise<GeneratedShift | undefined> {
    const [result] = await db
      .update(generatedShifts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(generatedShifts.id, id))
      .returning();
    return result;
  }

  async deleteGeneratedShift(id: string): Promise<boolean> {
    const result = await db.delete(generatedShifts).where(eq(generatedShifts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Session methods - replaces file-based sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [result] = await db.insert(userSessions).values(session).returning();
    return result;
  }

  async getUserSession(sessionId: string): Promise<UserSession | undefined> {
    const [result] = await db.select().from(userSessions)
      .where(and(eq(userSessions.id, sessionId), gt(userSessions.expiresAt, new Date())));
    return result;
  }

  async updateUserSession(sessionId: string, updates: Partial<InsertUserSession>): Promise<UserSession | undefined> {
    const [result] = await db
      .update(userSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSessions.id, sessionId))
      .returning();
    return result;
  }

  async deleteUserSession(sessionId: string): Promise<boolean> {
    const result = await db.delete(userSessions).where(eq(userSessions.id, sessionId));
    return (result.rowCount ?? 0) > 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
    return result.rowCount ?? 0;
  }

  // Notification methods implementation
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: number | null, facilityUserId: number | null, limit: number = 50): Promise<Notification[]> {
    const conditions = [];
    if (userId !== null) conditions.push(eq(notifications.userId, userId));
    if (facilityUserId !== null) conditions.push(eq(notifications.facilityUserId, facilityUserId));
    
    const query = db.select().from(notifications);
    if (conditions.length > 0) {
      query.where(or(...conditions));
    }
    
    return await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: number | null, facilityUserId: number | null): Promise<number> {
    const conditions = [eq(notifications.isRead, false)];
    if (userId !== null) conditions.push(eq(notifications.userId, userId));
    if (facilityUserId !== null) conditions.push(eq(notifications.facilityUserId, facilityUserId));
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number | null, facilityUserId: number | null): Promise<void> {
    const conditions = [eq(notifications.isRead, false)];
    if (userId !== null) conditions.push(eq(notifications.userId, userId));
    if (facilityUserId !== null) conditions.push(eq(notifications.facilityUserId, facilityUserId));
    
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(...conditions));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteAllNotifications(userId: number | null, facilityUserId: number | null): Promise<void> {
    const conditions = [];
    if (userId !== null) conditions.push(eq(notifications.userId, userId));
    if (facilityUserId !== null) conditions.push(eq(notifications.facilityUserId, facilityUserId));
    
    if (conditions.length > 0) {
      await db.delete(notifications).where(or(...conditions));
    }
  }

  // Time-off methods implementation
  async getTimeOffTypes(isActive?: boolean): Promise<TimeOffType[]> {
    const query = db.select().from(timeOffTypes);
    if (isActive !== undefined) {
      query.where(eq(timeOffTypes.isActive, isActive));
    }
    return await query.orderBy(timeOffTypes.displayName);
  }

  async createTimeOffType(type: InsertTimeOffType): Promise<TimeOffType> {
    const [newType] = await db.insert(timeOffTypes).values(type).returning();
    return newType;
  }

  async updateTimeOffType(id: number, updates: Partial<InsertTimeOffType>): Promise<TimeOffType | undefined> {
    const [updated] = await db
      .update(timeOffTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeOffTypes.id, id))
      .returning();
    return updated;
  }

  async getTimeOffBalances(userId: number, year?: number): Promise<TimeOffBalance[]> {
    const query = db.select().from(timeOffBalances).where(eq(timeOffBalances.userId, userId));
    if (year) {
      query.where(and(eq(timeOffBalances.userId, userId), eq(timeOffBalances.year, year)));
    }
    return await query.orderBy(timeOffBalances.timeOffTypeId);
  }

  async getTimeOffBalance(userId: number, timeOffTypeId: number, year: number): Promise<TimeOffBalance | undefined> {
    const [balance] = await db
      .select()
      .from(timeOffBalances)
      .where(
        and(
          eq(timeOffBalances.userId, userId),
          eq(timeOffBalances.timeOffTypeId, timeOffTypeId),
          eq(timeOffBalances.year, year)
        )
      );
    return balance;
  }

  async createTimeOffBalance(balance: InsertTimeOffBalance): Promise<TimeOffBalance> {
    const [newBalance] = await db.insert(timeOffBalances).values(balance).returning();
    return newBalance;
  }

  async updateTimeOffBalance(id: number, updates: Partial<InsertTimeOffBalance>): Promise<TimeOffBalance | undefined> {
    const [updated] = await db
      .update(timeOffBalances)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeOffBalances.id, id))
      .returning();
    return updated;
  }

  async getTimeOffRequests(filters?: {
    userId?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    facilityId?: number;
  }): Promise<TimeOffRequest[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(timeOffRequests.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(timeOffRequests.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(timeOffRequests.startDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(timeOffRequests.endDate, filters.endDate));
    }

    const query = db.select().from(timeOffRequests);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(timeOffRequests.createdAt));
  }

  async getTimeOffRequest(id: number): Promise<TimeOffRequest | undefined> {
    const [request] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id));
    return request;
  }

  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const [newRequest] = await db.insert(timeOffRequests).values(request).returning();
    return newRequest;
  }

  async updateTimeOffRequest(id: number, updates: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest | undefined> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  async reviewTimeOffRequest(id: number, status: string, reviewedBy: number, reviewNotes?: string): Promise<TimeOffRequest | undefined> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date()
      })
      .where(eq(timeOffRequests.id, id))
      .returning();
      
    // If approved, update the balance
    if (updated && status === 'approved') {
      const balance = await this.getTimeOffBalance(
        updated.userId,
        updated.timeOffTypeId,
        new Date(updated.startDate).getFullYear()
      );
      
      if (balance) {
        await this.updateTimeOffBalance(balance.id, {
          used: (parseFloat(balance.used) + parseFloat(updated.totalHours.toString())).toString(),
          pending: (parseFloat(balance.pending) - parseFloat(updated.totalHours.toString())).toString(),
          available: (parseFloat(balance.available) - parseFloat(updated.totalHours.toString())).toString()
        });
      }
    }
    
    return updated;
  }

  async getTimeOffPolicies(facilityId?: number): Promise<TimeOffPolicy[]> {
    const query = db.select().from(timeOffPolicies);
    if (facilityId) {
      query.where(eq(timeOffPolicies.facilityId, facilityId));
    }
    return await query.orderBy(timeOffPolicies.name);
  }

  async createTimeOffPolicy(policy: InsertTimeOffPolicy): Promise<TimeOffPolicy> {
    const [newPolicy] = await db.insert(timeOffPolicies).values(policy).returning();
    return newPolicy;
  }

  async updateTimeOffPolicy(id: number, updates: Partial<InsertTimeOffPolicy>): Promise<TimeOffPolicy | undefined> {
    const [updated] = await db
      .update(timeOffPolicies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeOffPolicies.id, id))
      .returning();
    return updated;
  }

  async checkShiftCoverage(userId: number, startDate: Date, endDate: Date): Promise<Shift[]> {
    // Find shifts assigned to this user during the requested time off period
    const userShifts = await db
      .select()
      .from(shifts)
      .where(
        and(
          sql`${shifts.assignedStaffIds}::jsonb @> ${JSON.stringify([userId])}::jsonb`,
          gte(shifts.date, startDate.toISOString()),
          lte(shifts.date, endDate.toISOString())
        )
      );
    return userShifts;
  }

  async calculateTimeOffAccrual(userId: number, timeOffTypeId: number, year: number): Promise<number> {
    // Get the user's facility and policy
    const user = await this.getUser(userId);
    if (!user || !user.facilityId) return 0;
    
    const policies = await this.getTimeOffPolicies(user.facilityId);
    const policy = policies.find(p => p.isActive);
    
    if (!policy) return 0;
    
    // Simple accrual calculation - can be expanded based on policy settings
    if (policy.accrualMethod === 'annual') {
      return parseFloat(policy.yearlyAllocation?.toString() || '0');
    } else if (policy.accrualMethod === 'monthly') {
      const monthsWorked = new Date().getMonth() + 1; // Current month
      const monthlyRate = parseFloat(policy.accrualRate?.toString() || '0');
      return monthlyRate * monthsWorked;
    }
    
    return 0;
  }
  
  // Analytics event tracking implementation
  async trackEvent(event: InsertAnalyticsEvent): Promise<void> {
    try {
      // Use setImmediate to make this non-blocking
      setImmediate(async () => {
        try {
          await db.insert(analyticsEvents).values(event);
        } catch (error) {
          console.error('Failed to track analytics event:', error);
          // Don't throw - we don't want analytics failures to break the app
        }
      });
    } catch (error) {
      console.error('Failed to queue analytics event:', error);
    }
  }
  
  async getAnalyticsEvents(filters?: {
    userId?: number;
    facilityId?: number;
    eventCategory?: string;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AnalyticsEvent[]> {
    let query = db.select().from(analyticsEvents);
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(analyticsEvents.userId, filters.userId));
    }
    if (filters?.facilityId) {
      conditions.push(eq(analyticsEvents.facilityId, filters.facilityId));
    }
    if (filters?.eventCategory) {
      conditions.push(eq(analyticsEvents.eventCategory, filters.eventCategory));
    }
    if (filters?.eventName) {
      conditions.push(eq(analyticsEvents.eventName, filters.eventName));
    }
    if (filters?.startDate) {
      conditions.push(gte(analyticsEvents.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(analyticsEvents.timestamp, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(analyticsEvents.timestamp));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }
  
  async getRecentAnalyticsEvents(limit: number, offset: number, category?: string): Promise<AnalyticsEvent[]> {
    let query = db.select().from(analyticsEvents);
    
    if (category) {
      query = query.where(eq(analyticsEvents.eventCategory, category));
    }
    
    const events = await query
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(limit)
      .offset(offset);
      
    return events;
  }
  
  async getAnalyticsEventCounts(): Promise<{ [category: string]: number }> {
    const results = await db
      .select({
        category: analyticsEvents.eventCategory,
        count: sql<number>`count(*)::int`
      })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.eventCategory);
      
    const counts: { [category: string]: number } = {};
    results.forEach(result => {
      if (result.category) {
        counts[result.category] = result.count;
      }
    });
    
    return counts;
  }
  
  async getEventStats(filters?: {
    eventCategory?: string;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{ date: string; count: number; category?: string }[]> {
    const groupBy = filters?.groupBy || 'day';
    let dateFormat: string;
    
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }
    
    const conditions = [];
    if (filters?.eventCategory) {
      conditions.push(eq(analyticsEvents.eventCategory, filters.eventCategory));
    }
    if (filters?.startDate) {
      conditions.push(gte(analyticsEvents.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(analyticsEvents.timestamp, filters.endDate));
    }
    
    const results = await db
      .select({
        date: sql<string>`TO_CHAR(${analyticsEvents.timestamp}, ${dateFormat})`,
        count: count(),
        category: analyticsEvents.eventCategory,
      })
      .from(analyticsEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        sql`TO_CHAR(${analyticsEvents.timestamp}, ${dateFormat})`,
        analyticsEvents.eventCategory
      )
      .orderBy(sql`TO_CHAR(${analyticsEvents.timestamp}, ${dateFormat})`);
    
    return results;
  }
}

export const storage = new DatabaseStorage();
