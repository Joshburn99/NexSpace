import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const UserRole = {
  INTERNAL_EMPLOYEE: 'internal_employee',
  CONTRACTOR_1099: 'contractor_1099',
  FACILITY_MANAGER: 'facility_manager',
  CLIENT_ADMINISTRATOR: 'client_administrator',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  facilityId: integer("facility_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Facilities table
export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull()
});

// Role permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: integer("permission_id").notNull()
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  department: text("department"),
  facilityId: integer("facility_id").notNull(),
  payRateMin: decimal("pay_rate_min", { precision: 10, scale: 2 }),
  payRateMax: decimal("pay_rate_max", { precision: 10, scale: 2 }),
  jobType: text("job_type").notNull(), // full-time, part-time, contract
  requirements: text("requirements").array(),
  isActive: boolean("is_active").default(true),
  postedById: integer("posted_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Job applications table
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  applicantId: integer("applicant_id").notNull(),
  status: text("status").notNull().default('pending'), // pending, reviewed, accepted, rejected
  coverLetter: text("cover_letter"),
  resume: text("resume_url"),
  appliedAt: timestamp("applied_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: integer("reviewed_by_id")
});

// Shifts table
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").notNull(),
  department: text("department").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  requiredStaff: integer("required_staff").default(1),
  assignedStaffIds: integer("assigned_staff_ids").array(),
  status: text("status").notNull().default('open'), // open, filled, cancelled
  shiftType: text("shift_type").notNull(), // day, night, weekend
  specialRequirements: text("special_requirements").array(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Time clock entries
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shiftId: integer("shift_id"),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  location: jsonb("location"), // GPS coordinates
  deviceFingerprint: text("device_fingerprint"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  isApproved: boolean("is_approved").default(false),
  approvedById: integer("approved_by_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  contractorId: integer("contractor_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, paid, rejected
  workPeriodStart: timestamp("work_period_start").notNull(),
  workPeriodEnd: timestamp("work_period_end").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedById: integer("approved_by_id"),
  paidAt: timestamp("paid_at")
});

// Work logs table
export const workLogs = pgTable("work_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shiftId: integer("shift_id"),
  description: text("description").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).notNull(),
  workDate: timestamp("work_date").notNull(),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow()
});

// Credentials table
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  credentialType: text("credential_type").notNull(), // BLS, ACLS, etc.
  credentialNumber: text("credential_number"),
  issuingAuthority: text("issuing_authority"),
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  documentUrl: text("document_url"),
  status: text("status").notNull().default('active'), // active, expired, pending
  verifiedAt: timestamp("verified_at"),
  verifiedById: integer("verified_by_id")
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id"),
  conversationId: text("conversation_id"),
  content: text("content").notNull(),
  messageType: text("message_type").default('text'), // text, system, file
  isRead: boolean("is_read").default(false),
  shiftId: integer("shift_id"), // Optional: tie message to specific shift
  createdAt: timestamp("created_at").defaultNow()
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: integer("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, { fields: [users.facilityId], references: [facilities.id] }),
  postedJobs: many(jobs),
  applications: many(jobApplications),
  shifts: many(shifts),
  timeClockEntries: many(timeClockEntries),
  invoices: many(invoices),
  workLogs: many(workLogs),
  credentials: many(credentials),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  auditLogs: many(auditLogs)
}));

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  users: many(users),
  jobs: many(jobs),
  shifts: many(shifts),
  invoices: many(invoices)
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  facility: one(facilities, { fields: [jobs.facilityId], references: [facilities.id] }),
  postedBy: one(users, { fields: [jobs.postedById], references: [users.id] }),
  applications: many(jobApplications)
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  facility: one(facilities, { fields: [shifts.facilityId], references: [facilities.id] }),
  createdBy: one(users, { fields: [shifts.createdById], references: [users.id] }),
  timeClockEntries: many(timeClockEntries),
  workLogs: many(workLogs),
  messages: many(messages)
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  appliedAt: true,
  reviewedAt: true
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
  paidAt: true
});

export const insertWorkLogSchema = createInsertSchema(workLogs).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  verifiedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogs.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type Credential = typeof credentials.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
