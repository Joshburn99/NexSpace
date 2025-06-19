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
  insertPaymentSchema, insertFacilitySchema, UserRole, shifts
} from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { recommendationEngine } from "./recommendation-engine";
import type { RecommendationCriteria } from "./recommendation-engine";

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

  // Data access control middleware
  const enforceDataAccess = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Add user context for data filtering
    req.userContext = {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId
    };
    next();
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

  // User management API with role-based access control
  app.get("/api/users", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      const { role, facilityId } = req.query;
      let users;
      
      // Role-based data access control
      switch (req.user.role) {
        case UserRole.SUPER_ADMIN:
          // Super admin can see all users
          if (role) {
            users = await storage.getUsersByRole(role as string);
          } else if (facilityId) {
            users = await storage.getUsersByFacility(parseInt(facilityId as string));
          } else {
            users = await storage.getUsersByRole("");
          }
          break;
          
        case UserRole.CLIENT_ADMINISTRATOR:
          // Client admin can see all users but no sensitive data
          if (role) {
            users = await storage.getUsersByRole(role as string);
          } else if (facilityId) {
            users = await storage.getUsersByFacility(parseInt(facilityId as string));
          } else {
            users = await storage.getUsersByRole("");
          }
          // Remove sensitive fields
          users = users.map(user => ({
            ...user,
            password: undefined,
            email: user.id === req.user.id ? user.email : undefined
          }));
          break;
          
        case UserRole.FACILITY_MANAGER:
          // Facility manager can only see users in their facility
          if (req.user.facilityId) {
            users = await storage.getUsersByFacility(req.user.facilityId);
            if (role) {
              users = users.filter(user => user.role === role);
            }
            // Remove sensitive fields
            users = users.map(user => ({
              ...user,
              password: undefined,
              email: user.id === req.user.id ? user.email : undefined
            }));
          } else {
            return res.status(403).json({ message: "Access denied: No facility assigned" });
          }
          break;
          
        case UserRole.INTERNAL_EMPLOYEE:
        case UserRole.CONTRACTOR_1099:
          // Employees and contractors can only see basic directory info
          if (req.user.facilityId) {
            users = await storage.getUsersByFacility(req.user.facilityId);
            // Only return basic public info
            users = users.map(user => ({
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              avatar: user.avatar
            }));
          } else {
            return res.status(403).json({ message: "Access denied: No facility assigned" });
          }
          break;
          
        default:
          return res.status(403).json({ message: "Access denied: Invalid role" });
      }
      
      res.json(users || []);
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

  // Dashboard API endpoints with role-based access
  app.get("/api/timeoff/balance", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      // Allow employees, managers, and admins to view PTO data
      if (!req.user.role || ![
        UserRole.INTERNAL_EMPLOYEE, 
        UserRole.CONTRACTOR_1099, 
        UserRole.FACILITY_MANAGER,
        UserRole.CLIENT_ADMINISTRATOR,
        UserRole.SUPER_ADMIN
      ].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }
      
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

  app.get("/api/timeoff/requests", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      // Allow employees, managers, and admins to view PTO requests
      if (!req.user.role || ![
        UserRole.INTERNAL_EMPLOYEE, 
        UserRole.CONTRACTOR_1099, 
        UserRole.FACILITY_MANAGER,
        UserRole.CLIENT_ADMINISTRATOR,
        UserRole.SUPER_ADMIN
      ].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }
      
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

  app.get("/api/history", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      const { userId } = req.query;
      
      // Role-based access control for work history
      switch (req.user.role) {
        case UserRole.SUPER_ADMIN:
        case UserRole.CLIENT_ADMINISTRATOR:
          // Admin can view any user's history if userId provided
          if (userId) {
            const targetUserId = parseInt(userId as string);
            const workLogs = await storage.getWorkLogsByUser(targetUserId);
            return res.json(workLogs);
          }
          break;
          
        case UserRole.FACILITY_MANAGER:
          // Facility manager can view history of users in their facility
          if (userId) {
            const targetUserId = parseInt(userId as string);
            const targetUser = await storage.getUser(targetUserId);
            if (!targetUser || targetUser.facilityId !== req.user.facilityId) {
              return res.status(403).json({ message: "Access denied: User not in your facility" });
            }
            const workLogs = await storage.getWorkLogsByUser(targetUserId);
            return res.json(workLogs);
          }
          break;
          
        case UserRole.INTERNAL_EMPLOYEE:
        case UserRole.CONTRACTOR_1099:
          // Employees can only view their own history
          if (userId && parseInt(userId as string) !== req.user.id) {
            return res.status(403).json({ message: "Access denied: Can only view your own work history" });
          }
          break;
          
        default:
          // For backwards compatibility, allow access but log the unknown role
          console.warn('Unknown user role accessing work history:', req.user.role);
          break;
      }
      
      // Return user's own work history from database
      const workLogs = await storage.getWorkLogsByUser(req.user.id);
      if (workLogs && workLogs.length > 0) {
        res.json(workLogs);
      } else {
        // Return sample data only if no real work logs exist
        const history = [
          {
            id: 1,
            date: "2025-04-03",
            shiftType: "Day Shift",
            hours: 12,
            facilityName: "General Hospital",
            department: "ICU",
            status: "completed",
            rate: 45,
            totalPay: 540
          },
          {
            id: 2,
            date: "2025-04-05",
            shiftType: "Night Shift",
            hours: 12,
            facilityName: "Metro Medical",
            department: "Med-Surg",
            status: "completed",
            rate: 48,
            totalPay: 576
          },
          {
            id: 3,
            date: "2025-04-08",
            shiftType: "Day Shift",
            hours: 8,
            facilityName: "City Clinic",
            department: "Outpatient",
            status: "completed",
            rate: 42,
            totalPay: 336
          }
        ];
        res.json(history);
      }
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

  // Facility management routes
  app.get("/api/facilities", requireAuth, async (req, res) => {
    try {
      const { search, state } = req.query;
      let facilities;
      
      if (search) {
        facilities = await storage.searchFacilities(search as string);
      } else if (state) {
        facilities = await storage.getFacilitiesByState(state as string);
      } else {
        facilities = await storage.getAllFacilities();
      }
      
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  app.get("/api/facilities/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const facility = await storage.getFacility(id);
      
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  app.post("/api/facilities", requireAuth, requirePermission("facilities.create"), auditLog("CREATE", "facility"), async (req: any, res) => {
    try {
      const validatedData = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(validatedData);
      res.status(201).json(facility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(400).json({ message: "Failed to create facility" });
    }
  });

  app.patch("/api/facilities/:id", requireAuth, requirePermission("facilities.update"), auditLog("UPDATE", "facility"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const facility = await storage.updateFacility(id, updates);
      
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      res.json(facility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(400).json({ message: "Failed to update facility" });
    }
  });

  // External data import routes
  app.post("/api/facilities/import/cms", requireAuth, requirePermission("facilities.create"), auditLog("IMPORT", "facility"), async (req, res) => {
    try {
      const { cmsId } = req.body;
      if (!cmsId) {
        return res.status(400).json({ message: "CMS ID is required" });
      }
      
      const { facilityImportService } = await import("./facility-import");
      const facility = await facilityImportService.importFacilityByCMSId(cmsId);
      res.status(201).json(facility);
    } catch (error) {
      console.error("Error importing facility:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to import facility" });
    }
  });

  app.post("/api/facilities/search/external", requireAuth, async (req, res) => {
    try {
      const { name, state, city } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Facility name is required" });
      }
      
      const { facilityImportService } = await import("./facility-import");
      const results = await facilityImportService.searchByNameAndLocation(name, state, city);
      res.json(results);
    } catch (error) {
      console.error("Error searching external facilities:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to search facilities" });
    }
  });

  app.post("/api/facilities/:id/refresh", requireAuth, requirePermission("facilities.update"), auditLog("REFRESH", "facility"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { facilityImportService } = await import("./facility-import");
      const facility = await facilityImportService.refreshFacilityData(id);
      res.json(facility);
    } catch (error) {
      console.error("Error refreshing facility data:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to refresh facility data" });
    }
  });

  // Facility Recommendation API
  app.post("/api/facilities/recommendations", requireAuth, async (req, res) => {
    try {
      const criteria = req.body as RecommendationCriteria;
      
      // Validate required fields
      if (!criteria.location || !criteria.location.lat || !criteria.location.lng) {
        return res.status(400).json({ message: "Location coordinates are required" });
      }

      const recommendations = await recommendationEngine.getRecommendations(criteria);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.post("/api/facilities/recommendations/emergency", requireAuth, async (req, res) => {
    try {
      const { location, facilityType } = req.body;
      
      if (!location || !location.lat || !location.lng) {
        return res.status(400).json({ message: "Location coordinates are required" });
      }

      const recommendations = await recommendationEngine.getEmergencyRecommendations(location, facilityType);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating emergency recommendations:", error);
      res.status(500).json({ message: "Failed to generate emergency recommendations" });
    }
  });

  app.post("/api/facilities/recommendations/specialized", requireAuth, async (req, res) => {
    try {
      const { location, specialty, maxDistance } = req.body;
      
      if (!location || !location.lat || !location.lng) {
        return res.status(400).json({ message: "Location coordinates are required" });
      }

      if (!specialty) {
        return res.status(400).json({ message: "Specialty is required" });
      }

      const recommendations = await recommendationEngine.getSpecializedCareRecommendations(location, specialty, maxDistance);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating specialized care recommendations:", error);
      res.status(500).json({ message: "Failed to generate specialized care recommendations" });
    }
  });

  app.post("/api/facilities/recommendations/insurance", requireAuth, async (req, res) => {
    try {
      const { location, insuranceType, facilityType } = req.body;
      
      if (!location || !location.lat || !location.lng) {
        return res.status(400).json({ message: "Location coordinates are required" });
      }

      if (!insuranceType || !["medicare", "medicaid", "both"].includes(insuranceType)) {
        return res.status(400).json({ message: "Valid insurance type is required (medicare, medicaid, or both)" });
      }

      const recommendations = await recommendationEngine.getInsuranceBasedRecommendations(location, insuranceType, facilityType);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating insurance-based recommendations:", error);
      res.status(500).json({ message: "Failed to generate insurance-based recommendations" });
    }
  });

  // Admin API endpoints
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByRole("");
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/admin/audit-logs", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/admin/database/query", requireAuth, async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "SQL query is required" });
      }

      // Safety checks for dangerous operations
      const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
      const upperQuery = query.toUpperCase();
      const isDangerous = dangerousKeywords.some(keyword => upperQuery.includes(keyword));

      if (isDangerous && req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Dangerous queries require super admin privileges" });
      }

      const result = await db.execute(sql.raw(query));
      res.json(result);
    } catch (error: any) {
      console.error("Database query error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Vendor invoices API
  app.get("/api/vendor-invoices", requireAuth, async (req, res) => {
    try {
      const vendorInvoices = [
        {
          id: 1,
          vendorName: "Premier Staffing Solutions",
          vendorType: "staffing_agency",
          invoiceNumber: "PSS-2025-001",
          amount: 15750.00,
          status: "pending",
          dueDate: "2025-07-15",
          serviceDate: "2025-06-01",
          description: "Nursing staff - June 2025",
          facilityId: 1,
          facilityName: "Chicago General Hospital",
          createdAt: "2025-06-19T00:00:00Z"
        },
        {
          id: 2,
          vendorName: "MedSupply Plus",
          vendorType: "medical_supply",
          invoiceNumber: "MSP-INV-5432",
          amount: 8900.50,
          status: "approved",
          dueDate: "2025-07-10",
          serviceDate: "2025-06-15",
          description: "PPE and medical supplies",
          facilityId: 2,
          facilityName: "Springfield Care Center",
          createdAt: "2025-06-18T00:00:00Z"
        },
        {
          id: 3,
          vendorName: "TechCare IT Services",
          vendorType: "it_services",
          invoiceNumber: "TCIT-2025-0089",
          amount: 12400.00,
          status: "paid",
          dueDate: "2025-06-30",
          serviceDate: "2025-05-20",
          description: "Network infrastructure upgrade",
          facilityId: 1,
          facilityName: "Chicago General Hospital",
          createdAt: "2025-06-01T00:00:00Z"
        },
        {
          id: 4,
          vendorName: "CleanCare Maintenance",
          vendorType: "maintenance",
          invoiceNumber: "CCM-MAY-2025",
          amount: 3200.75,
          status: "overdue",
          dueDate: "2025-06-01",
          serviceDate: "2025-05-15",
          description: "Facility deep cleaning services",
          facilityId: 3,
          facilityName: "Metro Community Clinic",
          createdAt: "2025-05-16T00:00:00Z"
        },
        {
          id: 5,
          vendorName: "EquipRent Medical",
          vendorType: "equipment_rental",
          invoiceNumber: "ERM-2025-Q2-15",
          amount: 7800.00,
          status: "pending",
          dueDate: "2025-07-20",
          serviceDate: "2025-06-01",
          description: "Hospital bed rentals - Q2",
          facilityId: 4,
          facilityName: "Dallas Medical Center",
          createdAt: "2025-06-19T00:00:00Z"
        }
      ];
      res.json(vendorInvoices);
    } catch (error) {
      console.error("Error fetching vendor invoices:", error);
      res.status(500).json({ message: "Failed to fetch vendor invoices" });
    }
  });

  app.post("/api/vendor-invoices", requireAuth, async (req, res) => {
    try {
      // In a real app, this would save to database
      const newInvoice = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      };
      res.json(newInvoice);
    } catch (error) {
      console.error("Error creating vendor invoice:", error);
      res.status(500).json({ message: "Failed to create vendor invoice" });
    }
  });

  app.patch("/api/vendor-invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // In a real app, this would update the database
      res.json({ id, ...req.body });
    } catch (error) {
      console.error("Error updating vendor invoice:", error);
      res.status(500).json({ message: "Failed to update vendor invoice" });
    }
  });

  app.get("/api/vendors", requireAuth, async (req, res) => {
    try {
      const vendors = [
        { id: 1, name: "Premier Staffing Solutions", type: "staffing_agency" },
        { id: 2, name: "MedSupply Plus", type: "medical_supply" },
        { id: 3, name: "TechCare IT Services", type: "it_services" },
        { id: 4, name: "CleanCare Maintenance", type: "maintenance" },
        { id: 5, name: "EquipRent Medical", type: "equipment_rental" }
      ];
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
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
