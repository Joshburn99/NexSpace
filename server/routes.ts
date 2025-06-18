import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertJobSchema, insertJobApplicationSchema, insertShiftSchema,
  insertInvoiceSchema, insertWorkLogSchema, insertCredentialSchema,
  insertMessageSchema, insertPayrollProviderSchema, insertPayrollConfigurationSchema,
  insertPayrollEmployeeSchema, insertTimesheetSchema, insertTimesheetEntrySchema,
  insertPaymentSchema, UserRole, shifts
} from "@shared/schema";
import { db } from "./db";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check permissions
  const requirePermission = (permission: string) => {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const hasPermission = await storage.hasPermission(req.user.role, permission);
      if (!hasPermission && req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };
  };

  // Audit logging middleware
  const auditLog = (action: string, resource: string) => {
    return async (req: any, res: any, next: any) => {
      const originalSend = res.json;
      res.json = function(data: any) {
        // Log successful operations
        if (res.statusCode < 400 && req.user) {
          storage.createAuditLog(
            req.user.id,
            action,
            resource,
            data?.id,
            undefined,
            data,
            req.ip,
            req.get('User-Agent')
          );
        }
        return originalSend.call(this, data);
      };
      next();
    };
  };

  // Dashboard API
  app.get("/api/dashboard/stats", requireAuth, async (req: any, res) => {
    try {
      const facilityId = req.user.facilityId;
      if (!facilityId) {
        return res.status(400).json({ message: "User not assigned to a facility" });
      }

      const stats = await storage.getFacilityStats(facilityId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-activity", requireAuth, async (req: any, res) => {
    try {
      const facilityId = req.user.facilityId;
      if (!facilityId) {
        return res.status(400).json({ message: "User not assigned to a facility" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(facilityId, limit);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Jobs API
  app.get("/api/jobs", requireAuth, async (req: any, res) => {
    try {
      const jobs = req.user.facilityId 
        ? await storage.getJobsByFacility(req.user.facilityId)
        : await storage.getActiveJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", requireAuth, requirePermission("jobs.create"), auditLog("CREATE", "job"), async (req: any, res) => {
    try {
      const jobData = insertJobSchema.parse({
        ...req.body,
        facilityId: req.user.facilityId,
        postedById: req.user.id
      });
      
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid job data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create job" });
      }
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.getJob(parseInt(req.params.id));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // Job Applications API
  app.post("/api/jobs/:id/apply", requireAuth, auditLog("CREATE", "job_application"), async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const applicationData = insertJobApplicationSchema.parse({
        ...req.body,
        jobId,
        applicantId: req.user.id
      });
      
      const application = await storage.createJobApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid application data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to submit application" });
      }
    }
  });

  app.get("/api/jobs/:id/applications", requireAuth, requirePermission("jobs.manage"), async (req, res) => {
    try {
      const applications = await storage.getJobApplications(parseInt(req.params.id));
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.patch("/api/applications/:id", requireAuth, requirePermission("jobs.manage"), auditLog("UPDATE", "job_application"), async (req: any, res) => {
    try {
      const { status } = req.body;
      const application = await storage.updateApplicationStatus(
        parseInt(req.params.id),
        status,
        req.user.id
      );
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Shifts API
  app.get("/api/shifts", requireAuth, async (req: any, res) => {
    try {
      const { start, end } = req.query;
      const facilityId = req.user.facilityId;
      
      if (!facilityId) {
        return res.status(400).json({ message: "User not assigned to a facility" });
      }

      let shifts;
      if (start && end) {
        shifts = await storage.getShiftsByDateRange(
          facilityId,
          new Date(start as string),
          new Date(end as string)
        );
      } else {
        shifts = await storage.getTodaysShifts(facilityId);
      }
      
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.get("/api/shifts/open", requireAuth, async (req: any, res) => {
    try {
      const facilityId = req.user.role === UserRole.SUPER_ADMIN ? undefined : req.user.facilityId;
      const shifts = await storage.getOpenShifts(facilityId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch open shifts" });
    }
  });

  app.post("/api/shifts", requireAuth, requirePermission("shifts.create"), auditLog("CREATE", "shift"), async (req: any, res) => {
    try {
      const shiftData = insertShiftSchema.parse({
        ...req.body,
        facilityId: req.user.facilityId,
        createdById: req.user.id
      });
      
      const shift = await storage.createShift(shiftData);
      res.status(201).json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid shift data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create shift" });
      }
    }
  });

  // Invoices API
  app.get("/api/invoices", requireAuth, async (req: any, res) => {
    try {
      let invoices;
      if (req.user.role === UserRole.CONTRACTOR_1099) {
        invoices = await storage.getInvoicesByContractor(req.user.id);
      } else if (req.user.facilityId) {
        invoices = await storage.getInvoicesByFacility(req.user.facilityId);
      } else {
        invoices = await storage.getPendingInvoices();
      }
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, auditLog("CREATE", "invoice"), async (req: any, res) => {
    try {
      if (req.user.role !== UserRole.CONTRACTOR_1099) {
        return res.status(403).json({ message: "Only contractors can submit invoices" });
      }

      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        contractorId: req.user.id
      });
      
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create invoice" });
      }
    }
  });

  app.patch("/api/invoices/:id", requireAuth, requirePermission("invoices.approve"), auditLog("UPDATE", "invoice"), async (req: any, res) => {
    try {
      const { status } = req.body;
      const invoice = await storage.updateInvoiceStatus(
        parseInt(req.params.id),
        status,
        req.user.id
      );
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Work Logs API
  app.get("/api/work-logs", requireAuth, async (req: any, res) => {
    try {
      const { userId, shiftId } = req.query;
      let workLogs;
      
      if (shiftId) {
        workLogs = await storage.getWorkLogsByShift(parseInt(shiftId as string));
      } else if (userId || req.user.role === UserRole.CONTRACTOR_1099 || req.user.role === UserRole.INTERNAL_EMPLOYEE) {
        const targetUserId = userId ? parseInt(userId as string) : req.user.id;
        workLogs = await storage.getWorkLogsByUser(targetUserId);
      } else {
        workLogs = await storage.getPendingWorkLogs();
      }
      
      res.json(workLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work logs" });
    }
  });

  app.post("/api/work-logs", requireAuth, auditLog("CREATE", "work_log"), async (req: any, res) => {
    try {
      const workLogData = insertWorkLogSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const workLog = await storage.createWorkLog(workLogData);
      res.status(201).json(workLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid work log data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create work log" });
      }
    }
  });

  // Credentials API
  app.get("/api/credentials", requireAuth, async (req: any, res) => {
    try {
      const { userId, expiring } = req.query;
      let credentials;
      
      if (expiring) {
        const days = parseInt(expiring as string) || 30;
        credentials = await storage.getExpiringCredentials(days);
      } else {
        const targetUserId = userId ? parseInt(userId as string) : req.user.id;
        credentials = await storage.getUserCredentials(targetUserId);
      }
      
      res.json(credentials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post("/api/credentials", requireAuth, auditLog("CREATE", "credential"), async (req: any, res) => {
    try {
      const credentialData = insertCredentialSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const credential = await storage.createCredential(credentialData);
      res.status(201).json(credential);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid credential data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create credential" });
      }
    }
  });

  // Messages API
  app.get("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const { conversationId } = req.query;
      let messages;
      
      if (conversationId) {
        messages = await storage.getConversationMessages(conversationId as string);
      } else {
        messages = await storage.getUserMessages(req.user.id);
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, auditLog("CREATE", "message"), async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // User management API (for admins)
  app.get("/api/users", requireAuth, requirePermission("users.view"), async (req, res) => {
    try {
      const { role, facilityId } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else if (facilityId) {
        users = await storage.getUsersByFacility(parseInt(facilityId as string));
      } else {
        users = await storage.getUsersByRole(UserRole.INTERNAL_EMPLOYEE);
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user information
  app.patch("/api/user/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      // Only allow role updates for Client Administrators or if updating own profile
      if (req.user.role !== UserRole.CLIENT_ADMINISTRATOR && req.user.id !== userId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Validate role if provided
      if (role && !Object.values(UserRole).includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUser(userId, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If updating own profile, update session
      if (req.user.id === userId) {
        req.user = updatedUser;
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Dashboard API endpoints
  app.get("/api/timeoff/balance", requireAuth, async (req: any, res) => {
    try {
      // Mock PTO balance data - in real implementation, this would come from HR system
      const balance = {
        available: 30,
        used: 50,
        pending: 8
      };
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PTO balance" });
    }
  });

  app.get("/api/timeoff/requests", requireAuth, async (req: any, res) => {
    try {
      // Mock PTO requests data
      const requests = [
        {
          id: 1,
          startDate: "2025-07-01",
          endDate: "2025-07-03",
          hours: 24,
          status: "pending",
          reason: "Vacation"
        },
        {
          id: 2,
          startDate: "2025-06-15",
          endDate: "2025-06-15",
          hours: 8,
          status: "approved",
          reason: "Personal"
        }
      ];
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });

  app.get("/api/history", requireAuth, async (req: any, res) => {
    try {
      const userId = req.query.userId || req.user.id;
      // Mock work history data
      const history = [
        {
          id: 1,
          date: "2025-04-03",
          shiftType: "Day Shift",
          hours: 8,
          facilityName: "General Hospital",
          department: "ICU",
          status: "completed",
          rate: 45,
          totalPay: 360
        },
        {
          id: 2,
          date: "2025-03-22",
          shiftType: "Evening Shift",
          hours: 6,
          facilityName: "City Clinic",
          department: "Med-Surg",
          status: "completed",
          rate: 32,
          totalPay: 192
        },
        {
          id: 3,
          date: "2025-03-15",
          shiftType: "Night Shift",
          hours: 8,
          facilityName: "City Clinic",
          department: "Emergency",
          status: "completed",
          rate: 38,
          totalPay: 304
        }
      ];
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work history" });
    }
  });

  // Time Off API
  app.get("/api/timeoff/balance", requireAuth, async (req: any, res) => {
    try {
      const balance = {
        available: 30,
        used: 50,
        pending: 8
      };
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PTO balance" });
    }
  });

  app.get("/api/timeoff/requests", requireAuth, async (req: any, res) => {
    try {
      const requests = [
        {
          id: 1,
          startDate: "2025-07-01",
          endDate: "2025-07-03",
          hours: 24,
          status: "pending",
          reason: "Vacation"
        },
        {
          id: 2,
          startDate: "2025-06-15",
          endDate: "2025-06-16",
          hours: 16,
          status: "approved",
          reason: "Personal"
        }
      ];
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PTO requests" });
    }
  });



  app.get("/api/resources", requireAuth, async (req: any, res) => {
    try {
      const resources = [
        {
          id: 1,
          title: "Employee Handbook",
          type: "pdf",
          category: "General",
          downloadUrl: "/resources/handbook.pdf",
          size: "2.4 MB",
          description: "Complete employee handbook and policies"
        },
        {
          id: 2,
          title: "Safety Training Video",
          type: "video",
          category: "Training",
          downloadUrl: "/resources/safety-training.mp4",
          duration: "15:30",
          description: "Workplace safety procedures and protocols"
        },
        {
          id: 3,
          title: "Benefits Overview",
          type: "document",
          category: "Benefits",
          downloadUrl: "/resources/benefits.docx",
          size: "1.2 MB",
          description: "Overview of employee benefits and enrollment"
        }
      ];
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Database seeding API (for development)
  app.post("/api/seed-shifts", async (req, res) => {
    try {
      // Clear existing shifts
      await db.delete(shifts);
      
      // Create shifts data directly
      const currentFacility = await storage.getAllFacilities();
      const facilityId = currentFacility[0]?.id || 1;
      
      const shiftsData = [
        // Today's shifts with various statuses
        {
          facilityId,
          department: 'ICU',
          startTime: new Date('2025-06-18T07:00:00Z'),
          endTime: new Date('2025-06-18T19:00:00Z'),
          requiredStaff: 2,
          shiftType: 'day',
          status: 'filled',
          specialRequirements: ['RN', 'BLS', 'Critical Care'],
          createdById: 1,
          assignedStaffIds: [3, 4]
        },
        {
          facilityId,
          department: 'ICU',
          startTime: new Date('2025-06-18T19:00:00Z'),
          endTime: new Date('2025-06-19T07:00:00Z'),
          requiredStaff: 1,
          shiftType: 'night',
          status: 'open',
          specialRequirements: ['RN', 'BLS'],
          createdById: 1,
          assignedStaffIds: []
        },
        {
          facilityId,
          department: 'Med-Surg',
          startTime: new Date('2025-06-18T07:00:00Z'),
          endTime: new Date('2025-06-18T15:00:00Z'),
          requiredStaff: 2,
          shiftType: 'day',
          status: 'open',
          specialRequirements: ['LPN', 'Med Administration'],
          createdById: 1,
          assignedStaffIds: [6]
        },
        {
          facilityId,
          department: 'Memory Care',
          startTime: new Date('2025-06-18T15:00:00Z'),
          endTime: new Date('2025-06-18T23:00:00Z'),
          requiredStaff: 3,
          shiftType: 'evening',
          status: 'open',
          specialRequirements: ['CNA', 'Dementia Care'],
          createdById: 1,
          assignedStaffIds: []
        },
        {
          facilityId,
          department: 'Rehabilitation',
          startTime: new Date('2025-06-18T09:00:00Z'),
          endTime: new Date('2025-06-18T17:00:00Z'),
          requiredStaff: 1,
          shiftType: 'day',
          status: 'filled',
          specialRequirements: ['PT', 'State License'],
          createdById: 1,
          assignedStaffIds: [10]
        },
        // Tomorrow's shifts
        {
          facilityId,
          department: 'ICU',
          startTime: new Date('2025-06-19T07:00:00Z'),
          endTime: new Date('2025-06-19T19:00:00Z'),
          requiredStaff: 2,
          shiftType: 'day',
          status: 'open',
          specialRequirements: ['RN', 'Critical Care'],
          createdById: 1,
          assignedStaffIds: [3]
        },
        {
          facilityId,
          department: 'Med-Surg',
          startTime: new Date('2025-06-19T15:00:00Z'),
          endTime: new Date('2025-06-19T23:00:00Z'),
          requiredStaff: 2,
          shiftType: 'evening',
          status: 'filled',
          specialRequirements: ['LPN'],
          createdById: 1,
          assignedStaffIds: [6, 7]
        },
        // Weekend shifts
        {
          facilityId,
          department: 'Memory Care',
          startTime: new Date('2025-06-21T07:00:00Z'),
          endTime: new Date('2025-06-21T19:00:00Z'),
          requiredStaff: 4,
          shiftType: 'weekend',
          status: 'open',
          specialRequirements: ['CNA', 'Weekend Rate'],
          createdById: 1,
          assignedStaffIds: [8, 9]
        }
      ];
      
      const createdShifts = await db.insert(shifts).values(shiftsData).returning();
      res.json({ message: "Shifts seeded successfully", count: shiftsData.length });
    } catch (error) {
      console.error('Seeding error:', error);
      res.status(500).json({ message: "Failed to seed shifts", error: (error as Error).message });
    }
  });

  // Facilities API
  app.get("/api/facilities", requireAuth, requirePermission("facilities.view"), async (req, res) => {
    try {
      const facilities = await storage.getAllFacilities();
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Super Admin impersonation
  app.post("/api/admin/impersonate/:userId", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ message: "Super Admin access required" });
      }

      const targetUser = await storage.getUser(parseInt(req.params.userId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the impersonation
      await storage.createAuditLog(
        req.user.id,
        "IMPERSONATE",
        "user",
        targetUser.id,
        undefined,
        { impersonatedUser: targetUser.id },
        req.ip,
        req.get('User-Agent')
      );

      // Set session to impersonated user
      req.login(targetUser, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to impersonate user" });
        }
        res.json({ message: "Impersonation successful", user: targetUser });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to impersonate user" });
    }
  });

  // ===================
  // PAYROLL SYSTEM API
  // ===================

  // Payroll Providers
  app.get("/api/payroll/providers", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const providers = await storage.getPayrollProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll providers" });
    }
  });

  app.post("/api/payroll/providers", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "payroll_provider"), async (req, res) => {
    try {
      const validated = insertPayrollProviderSchema.parse(req.body);
      const provider = await storage.createPayrollProvider(validated);
      res.status(201).json(provider);
    } catch (error) {
      res.status(400).json({ message: "Invalid provider data", error });
    }
  });

  // Payroll Configuration
  app.get("/api/payroll/config/:facilityId", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const config = await storage.getPayrollConfiguration(facilityId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll configuration" });
    }
  });

  app.post("/api/payroll/config", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "payroll_config"), async (req, res) => {
    try {
      const validated = insertPayrollConfigurationSchema.parse(req.body);
      const config = await storage.createPayrollConfiguration(validated);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: "Invalid configuration data", error });
    }
  });

  app.put("/api/payroll/config/:id", requireAuth, requirePermission("payroll.manage"), auditLog("UPDATE", "payroll_config"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertPayrollConfigurationSchema.partial().parse(req.body);
      const config = await storage.updatePayrollConfiguration(id, validated);
      res.json(config);
    } catch (error) {
      res.status(400).json({ message: "Failed to update configuration", error });
    }
  });

  // Payroll Employees
  app.get("/api/payroll/employees/:facilityId", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const employees = await storage.getPayrollEmployeesByFacility(facilityId);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll employees" });
    }
  });

  app.post("/api/payroll/employees", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "payroll_employee"), async (req, res) => {
    try {
      const validated = insertPayrollEmployeeSchema.parse(req.body);
      const employee = await storage.createPayrollEmployee(validated);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: "Invalid employee data", error });
    }
  });

  app.put("/api/payroll/employees/:id", requireAuth, requirePermission("payroll.manage"), auditLog("UPDATE", "payroll_employee"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertPayrollEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updatePayrollEmployee(id, validated);
      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee", error });
    }
  });

  // Timesheets
  app.get("/api/timesheets/:facilityId", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const { startDate, endDate, userId } = req.query;

      let timesheets;
      if (userId) {
        timesheets = await storage.getTimesheetsByUser(parseInt(userId as string), facilityId);
      } else if (startDate && endDate) {
        timesheets = await storage.getTimesheetsByPayPeriod(facilityId, new Date(startDate as string), new Date(endDate as string));
      } else {
        timesheets = await storage.getPendingTimesheets(facilityId);
      }
      
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.post("/api/timesheets", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "timesheet"), async (req, res) => {
    try {
      const validated = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(validated);
      res.status(201).json(timesheet);
    } catch (error) {
      res.status(400).json({ message: "Invalid timesheet data", error });
    }
  });

  app.put("/api/timesheets/:id/status", requireAuth, requirePermission("payroll.approve"), auditLog("UPDATE", "timesheet"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const timesheet = await storage.updateTimesheetStatus(id, status, req.user.id);
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to update timesheet status", error });
    }
  });

  // Timesheet Entries
  app.get("/api/timesheets/:id/entries", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const entries = await storage.getTimesheetEntries(timesheetId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheet entries" });
    }
  });

  app.post("/api/timesheets/:id/entries", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "timesheet_entry"), async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const validated = insertTimesheetEntrySchema.parse({ ...req.body, timesheetId });
      const entry = await storage.createTimesheetEntry(validated);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid entry data", error });
    }
  });

  // Payments
  app.get("/api/payments/:facilityId", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const { userId, timesheetId } = req.query;

      let payments;
      if (userId) {
        payments = await storage.getPaymentsByUser(parseInt(userId as string));
      } else if (timesheetId) {
        payments = await storage.getPaymentsByTimesheet(parseInt(timesheetId as string));
      } else {
        payments = await storage.getPendingPayments(facilityId);
      }
      
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requireAuth, requirePermission("payroll.manage"), auditLog("CREATE", "payment"), async (req, res) => {
    try {
      const validated = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment data", error });
    }
  });

  app.put("/api/payments/:id/status", requireAuth, requirePermission("payroll.manage"), auditLog("UPDATE", "payment"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const payment = await storage.updatePaymentStatus(id, status);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: "Failed to update payment status", error });
    }
  });

  // Automated Payroll Processing
  app.post("/api/payroll/process", requireAuth, requirePermission("payroll.process"), auditLog("PROCESS", "payroll"), async (req, res) => {
    try {
      const { facilityId, payPeriodStart, payPeriodEnd } = req.body;
      const result = await storage.processPayroll(
        facilityId,
        new Date(payPeriodStart),
        new Date(payPeriodEnd)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to process payroll", error });
    }
  });

  // Payroll Provider Sync
  app.post("/api/payroll/sync", requireAuth, requirePermission("payroll.sync"), auditLog("SYNC", "payroll"), async (req, res) => {
    try {
      const { facilityId, syncType } = req.body;
      const syncLog = await storage.syncWithPayrollProvider(facilityId, syncType);
      res.json(syncLog);
    } catch (error) {
      res.status(500).json({ message: "Failed to sync with payroll provider", error });
    }
  });

  // Payroll Sync Logs
  app.get("/api/payroll/sync-logs/:facilityId", requireAuth, requirePermission("payroll.view"), async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const { providerId } = req.query;
      const logs = await storage.getPayrollSyncLogs(facilityId, providerId ? parseInt(providerId as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sync logs" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle different message types
        switch (message.type) {
          case 'chat':
            // Broadcast chat message to conversation participants
            const chatMessage = await storage.createMessage({
              senderId: message.senderId,
              recipientId: message.recipientId,
              conversationId: message.conversationId,
              content: message.content,
              messageType: 'text',
              shiftId: message.shiftId
            });

            // Broadcast to all connected clients in the conversation
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'chat',
                  message: chatMessage
                }));
              }
            });
            break;

          case 'shift_update':
            // Broadcast shift updates to facility staff
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'shift_update',
                  shift: message.shift
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
