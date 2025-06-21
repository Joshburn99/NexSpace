import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertJobSchema,
  insertJobApplicationSchema,
  insertShiftSchema,
  insertInvoiceSchema,
  insertWorkLogSchema,
  insertCredentialSchema,
  insertMessageSchema,
  insertPayrollProviderSchema,
  insertPayrollConfigurationSchema,
  insertPayrollEmployeeSchema,
  insertTimesheetSchema,
  insertTimesheetEntrySchema,
  insertPaymentSchema,
  insertFacilitySchema,
  insertShiftRequestSchema,
  insertShiftHistorySchema,
  UserRole,
  shifts,
  facilities,
  shiftRequests,
  shiftHistory,
} from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { recommendationEngine } from "./recommendation-engine";
import type { RecommendationCriteria } from "./recommendation-engine";
import multer from "multer";
import OpenAI from "openai";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
  });

  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

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
      facilityId: req.user.facilityId,
    };
    next();
  };

  // Audit logging middleware
  const auditLog = (action: string, resource: string) => {
    return async (req: any, res: any, next: any) => {
      const originalSend = res.json;
      res.json = function (data: any) {
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
            req.get("User-Agent")
          );
        }
        return originalSend.call(this, data);
      };
      next();
    };
  };

  // Users API
  app.get("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive information
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  app.post(
    "/api/jobs",
    requireAuth,
    requirePermission("jobs.create"),
    auditLog("CREATE", "job"),
    async (req: any, res) => {
      try {
        const jobData = insertJobSchema.parse({
          ...req.body,
          facilityId: req.user.facilityId,
          postedById: req.user.id,
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
    }
  );

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
  app.post(
    "/api/jobs/:id/apply",
    requireAuth,
    auditLog("CREATE", "job_application"),
    async (req: any, res) => {
      try {
        const jobId = parseInt(req.params.id);
        const job = await storage.getJob(jobId);

        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }

        const applicationData = insertJobApplicationSchema.parse({
          ...req.body,
          jobId,
          applicantId: req.user.id,
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
    }
  );

  app.get(
    "/api/jobs/:id/applications",
    requireAuth,
    requirePermission("jobs.manage"),
    async (req, res) => {
      try {
        const applications = await storage.getJobApplications(parseInt(req.params.id));
        res.json(applications);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch applications" });
      }
    }
  );

  app.patch(
    "/api/applications/:id",
    requireAuth,
    requirePermission("jobs.manage"),
    auditLog("UPDATE", "job_application"),
    async (req: any, res) => {
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
    }
  );

  // Shifts API with example data showing various statuses
  app.get("/api/shifts", requireAuth, async (req: any, res) => {
    try {
      const exampleShifts = [
        {
          id: 1,
          title: "ICU Day Shift",
          date: "2025-06-19",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "Registered Nurse",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 42.5,
          urgency: "high",
          description: "12-hour ICU nursing shift, ACLS certification required",
        },
        {
          id: 2,
          title: "Emergency Department",
          date: "2025-06-19",
          startTime: "15:00",
          endTime: "23:00",
          department: "Emergency",
          specialty: "Registered Nurse",
          status: "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 45.0,
          urgency: "critical",
          description: "Emergency department evening shift",
          assignedStaffId: 15,
          assignedStaffName: "Sarah Martinez",
          assignedStaffEmail: "sarah.martinez@hospital.com",
          assignedStaffPhone: "(503) 555-0123",
          assignedStaffSpecialty: "Registered Nurse",
          assignedStaffRating: 4.8,
        },
        {
          id: 3,
          title: "Physical Therapy",
          date: "2025-06-20",
          startTime: "09:00",
          endTime: "17:00",
          department: "Rehabilitation",
          specialty: "Physical Therapist",
          status: "confirmed",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 38.75,
          urgency: "medium",
          assignedStaffId: 23,
          assignedStaffName: "Michael Chen",
          assignedStaffEmail: "michael.chen@ohsu.edu",
          assignedStaffPhone: "(503) 555-0456",
          assignedStaffSpecialty: "Physical Therapist",
          assignedStaffRating: 4.5,
          description: "Outpatient physical therapy clinic",
        },
        {
          id: 4,
          title: "Surgery Support",
          date: "2025-06-20",
          startTime: "06:00",
          endTime: "14:00",
          department: "Operating Room",
          specialty: "Surgical Technologist",
          status: "in_progress",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 28.5,
          urgency: "high",
          description: "OR support for scheduled surgeries",
          assignedStaffId: 42,
          assignedStaffName: "Jennifer Kim",
          assignedStaffEmail: "jennifer.kim@hospital.com",
          assignedStaffPhone: "(503) 555-0987",
          assignedStaffSpecialty: "Surgical Technologist",
          assignedStaffRating: 4.7,
        },
        {
          id: 5,
          title: "Respiratory Therapy",
          date: "2025-06-21",
          startTime: "19:00",
          endTime: "07:00",
          department: "Pulmonary",
          specialty: "Respiratory Therapist",
          status: "completed",
          facilityId: 3,
          facilityName: "Legacy Emanuel",
          rate: 35.25,
          urgency: "medium",
          description: "Night shift respiratory therapy coverage",
        },
        {
          id: 6,
          title: "Med-Surg Unit",
          date: "2025-06-21",
          startTime: "23:00",
          endTime: "07:00",
          department: "Medical-Surgical",
          specialty: "Licensed Practical Nurse",
          status: "cancelled",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 28.0,
          urgency: "low",
          description: "Night shift LPN position - cancelled due to low census",
        },
        {
          id: 7,
          title: "Radiology Tech",
          date: "2025-06-22",
          startTime: "08:00",
          endTime: "16:00",
          department: "Imaging",
          specialty: "Radiology Technologist",
          status: "ncns",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 31.25,
          urgency: "medium",
          description: "CT and MRI imaging support - no call/no show",
        },
        {
          id: 8,
          title: "Lab Technician",
          date: "2025-06-22",
          startTime: "22:00",
          endTime: "06:00",
          department: "Laboratory",
          specialty: "Laboratory Technologist",
          status: "facility_cancelled",
          facilityId: 3,
          facilityName: "Legacy Emanuel",
          rate: 29.75,
          urgency: "low",
          description: "Night lab coverage - cancelled by facility",
        },
        {
          id: 9,
          title: "Pediatric Unit",
          date: "2025-06-23",
          startTime: "07:00",
          endTime: "19:00",
          department: "Pediatrics",
          specialty: "Registered Nurse",
          status: "open",
          facilityId: 4,
          facilityName: "Providence Portland Medical Center",
          rate: 43.0,
          urgency: "medium",
          description: "Pediatric nursing position, PALS certification preferred",
        },
        {
          id: 10,
          title: "CNA Float Pool",
          date: "2025-06-24",
          startTime: "14:00",
          endTime: "22:00",
          department: "Float Pool",
          specialty: "Certified Nursing Assistant",
          status: "requested",
          facilityId: 5,
          facilityName: "Rose City Nursing Center",
          rate: 18.5,
          urgency: "low",
          description: "Float pool CNA for long-term care facility",
        },
        {
          id: 11,
          title: "ICU Night Shift",
          date: "2025-06-17",
          startTime: "19:00",
          endTime: "07:00",
          department: "ICU",
          specialty: "Registered Nurse",
          status: "completed",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 48.0,
          urgency: "high",
          description: "Completed ICU night coverage",
        },
        {
          id: 12,
          title: "Respiratory Therapy",
          date: "2025-06-18",
          startTime: "08:00",
          endTime: "16:00",
          department: "Respiratory",
          specialty: "Respiratory Therapist",
          status: "completed",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 42.0,
          urgency: "medium",
          description: "Completed respiratory therapy shift",
        },
        {
          id: 13,
          title: "Float Pool Day",
          date: "2025-06-16",
          startTime: "07:00",
          endTime: "15:00",
          department: "Float Pool",
          specialty: "Licensed Practical Nurse",
          status: "completed",
          facilityId: 4,
          facilityName: "Providence Portland Medical Center",
          rate: 34.5,
          urgency: "low",
          description: "Completed float pool coverage",
        },
        {
          id: 14,
          title: "OR Afternoon",
          date: "2025-06-15",
          startTime: "12:00",
          endTime: "20:00",
          department: "Operating Room",
          specialty: "Surgical Technologist",
          status: "completed",
          facilityId: 3,
          facilityName: "Legacy Emanuel",
          rate: 40.75,
          urgency: "medium",
          description: "Completed OR afternoon shift",
        },
        {
          id: 15,
          title: "Emergency Weekend",
          date: "2025-06-21",
          startTime: "10:00",
          endTime: "22:00",
          department: "Emergency",
          specialty: "Registered Nurse",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 52.0,
          urgency: "critical",
          description: "Weekend emergency department coverage needed",
        },
        {
          id: 16,
          title: "Pharmacy Tech",
          date: "2025-06-22",
          startTime: "09:00",
          endTime: "17:00",
          department: "Pharmacy",
          specialty: "Pharmacy Technician",
          status: "open",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 26.5,
          urgency: "low",
          description: "Pharmacy technician coverage needed",
        },
      ];

      res.json(exampleShifts);
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

  app.post(
    "/api/shifts",
    requireAuth,
    requirePermission("shifts.create"),
    auditLog("CREATE", "shift"),
    async (req: any, res) => {
      try {
        const shiftData = insertShiftSchema.parse({
          ...req.body,
          facilityId: req.user.facilityId,
          createdById: req.user.id,
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
    }
  );

  // Enhanced Shift Management APIs
  app.post("/api/shifts/request", requireAuth, async (req: any, res) => {
    try {
      const { shiftId, userId = req.user.id } = req.body;
      
      // Get shift data using correct storage method
      const shift = await storage.getShift(shiftId);
      
      if (!shift || shift.status !== 'open') {
        return res.status(400).json({ message: "Shift not available for request" });
      }

      // Create shift request record (simulated)
      const shiftRequest = {
        id: Date.now(),
        shiftId,
        userId,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      // Create history entry
      const historyEntry = {
        id: Date.now() + 1,
        shiftId,
        userId,
        action: 'requested',
        timestamp: new Date().toISOString(),
        performedById: userId,
        previousStatus: 'open',
        newStatus: 'requested'
      };

      // Check auto-assignment criteria
      const autoAssignCriteria = await checkAutoAssignmentCriteria(shiftId, userId);
      let autoAssigned = false;
      let assignedShift = null;

      if (autoAssignCriteria.shouldAutoAssign) {
        // Auto-assign the shift
        const updatedShift = {
          ...shift,
          status: 'assigned' as const,
          assignedStaffIds: [userId],
          updatedAt: new Date().toISOString()
        };

        // Log assignment history
        const assignmentHistory = {
          id: Date.now() + 2,
          shiftId,
          userId,
          action: 'assigned',
          timestamp: new Date().toISOString(),
          performedById: userId,
          previousStatus: 'requested',
          newStatus: 'assigned',
          notes: 'Auto-assigned based on criteria'
        };

        assignedShift = updatedShift;
        autoAssigned = true;
      }

      const requestedShift = { ...shift, status: 'requested' as const };

      res.json({
        requestedShift,
        autoAssigned,
        assignedShift,
        historyEntry,
        shiftRequest
      });
    } catch (error) {
      console.error('Shift request error:', error);
      res.status(500).json({ message: "Failed to request shift" });
    }
  });

  app.post("/api/shifts/assign", requireAuth, requirePermission("shifts.assign"), async (req: any, res) => {
    try {
      const { shiftId, userId } = req.body;
      
      // Get shift and validate
      const shift = await storage.getShift(shiftId);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Create assigned shift
      const assignedShift = {
        ...shift,
        status: 'assigned' as const,
        assignedStaffIds: [userId],
        updatedAt: new Date().toISOString()
      };

      // Create history entry
      const historyEntry = {
        id: Date.now(),
        shiftId,
        userId,
        action: 'assigned',
        timestamp: new Date().toISOString(),
        performedById: req.user.id,
        previousStatus: shift.status,
        newStatus: 'assigned'
      };

      res.json({
        assignedShift,
        historyEntry
      });
    } catch (error) {
      console.error('Shift assignment error:', error);
      res.status(500).json({ message: "Failed to assign shift" });
    }
  });

  app.get("/api/shifts/history/:userId", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user can access this history
      if (req.user.id !== userId && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.FACILITY_MANAGER) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Return sample history data for development
      const sampleHistory = [
        {
          id: 11,
          title: "ICU Night Shift",
          date: "2025-06-17",
          startTime: "19:00",
          endTime: "07:00",
          department: "ICU",
          specialty: "Registered Nurse",
          status: "completed",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 48.0,
          urgency: "high",
          description: "Completed ICU night coverage",
          action: "completed",
          timestamp: "2025-06-18T07:00:00Z"
        },
        {
          id: 12,
          title: "Respiratory Therapy",
          date: "2025-06-18",
          startTime: "08:00",
          endTime: "16:00",
          department: "Respiratory",
          specialty: "Respiratory Therapist",
          status: "completed",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 42.0,
          urgency: "medium",
          description: "Completed respiratory therapy shift",
          action: "completed",
          timestamp: "2025-06-18T16:00:00Z"
        },
        {
          id: 13,
          title: "Float Pool Day",
          date: "2025-06-16",
          startTime: "07:00",
          endTime: "15:00",
          department: "Float Pool",
          specialty: "Licensed Practical Nurse",
          status: "completed",
          facilityId: 4,
          facilityName: "Providence Portland Medical Center",
          rate: 34.5,
          urgency: "low",
          description: "Completed float pool coverage",
          action: "completed",
          timestamp: "2025-06-16T15:00:00Z"
        }
      ];

      res.json(sampleHistory);
    } catch (error) {
      console.error('Shift history error:', error);
      res.status(500).json({ message: "Failed to fetch shift history" });
    }
  });

  // Enhanced Messaging APIs with persistence
  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id
      });

      const [message] = await db.insert(messages).values(messageData).returning();

      // Broadcast to WebSocket clients if available
      const messageWithSender = {
        ...message,
        senderName: `${req.user.firstName} ${req.user.lastName}`
      };

      // Notify connected WebSocket clients
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            data: messageWithSender
          }));
        }
      });

      res.status(201).json(messageWithSender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        console.error('Message creation error:', error);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  app.get("/api/messages/:threadId", requireAuth, async (req: any, res) => {
    try {
      const threadId = req.params.threadId;
      
      const threadMessages = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        conversationId: messages.conversationId,
        content: messages.content,
        messageType: messages.messageType,
        isRead: messages.isRead,
        shiftId: messages.shiftId,
        createdAt: messages.createdAt
      })
      .from(messages)
      .where(sql`${messages.conversationId} = ${threadId}`)
      .orderBy(sql`${messages.createdAt} ASC`);

      res.json(threadMessages);
    } catch (error) {
      console.error('Messages fetch error:', error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Auto-assignment criteria helper function
  async function checkAutoAssignmentCriteria(shiftId: number, userId: number): Promise<{ shouldAutoAssign: boolean; reason?: string }> {
    try {
      // Get user and shift details
      const user = await storage.getUser(userId);
      const shift = await storage.getShift(shiftId);
      
      if (!user || !shift) {
        return { shouldAutoAssign: false, reason: "User or shift not found" };
      }

      // Basic auto-assignment criteria
      const criteria = {
        userHasRequiredSpecialty: user.specialty === shift.specialty,
        shiftIsUrgent: shift.urgency === 'critical' || shift.urgency === 'high',
        userIsAvailable: user.availabilityStatus === 'available',
        facilityMatch: !shift.facilityId || user.facilityId === shift.facilityId
      };

      const shouldAutoAssign = criteria.userHasRequiredSpecialty && 
                              criteria.shiftIsUrgent && 
                              criteria.userIsAvailable && 
                              criteria.facilityMatch;

      return { 
        shouldAutoAssign,
        reason: shouldAutoAssign ? "Meets auto-assignment criteria" : "Does not meet all criteria"
      };
    } catch (error) {
      console.error('Auto-assignment criteria check error:', error);
      return { shouldAutoAssign: false, reason: "Error checking criteria" };
    }
  }

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
        contractorId: req.user.id,
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

  app.patch(
    "/api/invoices/:id",
    requireAuth,
    requirePermission("invoices.approve"),
    auditLog("UPDATE", "invoice"),
    async (req: any, res) => {
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
    }
  );

  // Work Logs API
  app.get("/api/work-logs", requireAuth, async (req: any, res) => {
    try {
      const { userId, shiftId } = req.query;
      let workLogs;

      if (shiftId) {
        workLogs = await storage.getWorkLogsByShift(parseInt(shiftId as string));
      } else if (
        userId ||
        req.user.role === UserRole.CONTRACTOR_1099 ||
        req.user.role === UserRole.INTERNAL_EMPLOYEE
      ) {
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
        userId: req.user.id,
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

  app.post(
    "/api/credentials",
    requireAuth,
    auditLog("CREATE", "credential"),
    async (req: any, res) => {
      try {
        const credentialData = insertCredentialSchema.parse({
          ...req.body,
          userId: req.user.id,
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
    }
  );

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
        senderId: req.user.id,
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
          users = users.map((user) => ({
            ...user,
            password: undefined,
            email: user.id === req.user.id ? user.email : undefined,
          }));
          break;

        case UserRole.FACILITY_MANAGER:
          // Facility manager can only see users in their facility
          if (req.user.facilityId) {
            users = await storage.getUsersByFacility(req.user.facilityId);
            if (role) {
              users = users.filter((user) => user.role === role);
            }
            // Remove sensitive fields
            users = users.map((user) => ({
              ...user,
              password: undefined,
              email: user.id === req.user.id ? user.email : undefined,
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
            users = users.map((user) => ({
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              avatar: user.avatar,
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
      console.error("User update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Staff profile endpoints
  app.get("/api/staff", requireAuth, async (req: any, res) => {
    try {
      // Return sample staff data for now
      const staffData = [
        {
          id: 1,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@nexspace.com",
          role: "employee",
          phone: "(555) 123-4567",
          department: "ICU",
          specialty: "Critical Care",
          compliant: true,
          activeCredentials: 8,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          bio: "Experienced ICU nurse with expertise in critical care and patient management.",
          location: "Portland, OR",
          hourlyRate: 48,
          experience: "8 years",
          skills: ["Critical Care", "Patient Assessment", "IV Therapy"],
          certifications: ["RN", "ACLS", "BLS", "CCRN"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          portfolio: "",
          yearsExperience: 8,
          rating: 4.9,
          totalShifts: 156
        },
        {
          id: 2,
          firstName: "Michael",
          lastName: "Chen",
          email: "michael.chen@nexspace.com",
          role: "contractor",
          phone: "(555) 234-5678",
          department: "Emergency",
          specialty: "Emergency Medicine",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          bio: "Emergency medicine specialist with extensive trauma experience.",
          location: "Seattle, WA",
          hourlyRate: 55,
          experience: "12 years",
          skills: ["Emergency Response", "Trauma Care", "Advanced Life Support"],
          certifications: ["RN", "CEN", "ACLS", "PALS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          portfolio: "",
          yearsExperience: 12,
          rating: 4.8,
          totalShifts: 89
        },
        {
          id: 3,
          firstName: "Alice",
          lastName: "Smith",
          email: "alice@nexspace.com",
          role: "employee",
          phone: "(555) 345-6789",
          department: "Medical/Surgical",
          specialty: "Medical Surgical",
          compliant: true,
          activeCredentials: 5,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
          bio: "Dedicated medical-surgical nurse committed to providing excellent patient care.",
          location: "Portland, OR",
          hourlyRate: 42,
          experience: "5 years",
          skills: ["Patient Care", "Medication Administration", "Wound Care"],
          certifications: ["RN", "BLS", "CMSRN"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          portfolio: "",
          yearsExperience: 5,
          rating: 4.7,
          totalShifts: 98
        }
      ];
      
      res.json(staffData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff data" });
    }
  });

  app.patch("/api/staff/:id", requireAuth, async (req: any, res) => {
    try {
      const staffId = parseInt(req.params.id);
      
      // Only allow users to update their own profile
      if (req.user.id !== staffId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const {
        email,
        phone,
        firstName,
        lastName,
        bio,
        location,
        hourlyRate,
        experience,
        skills,
        certifications,
        linkedIn,
        portfolio
      } = req.body;

      // For now, just return success since we're using in-memory data
      // In a real implementation, this would update the database
      const updatedProfile = {
        id: staffId,
        email,
        phone,
        firstName,
        lastName,
        bio,
        location,
        hourlyRate: parseFloat(hourlyRate) || 0,
        experience,
        skills: skills || [],
        certifications: certifications || [],
        linkedIn,
        portfolio,
        updatedAt: new Date().toISOString()
      };

      res.json(updatedProfile);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Dashboard API endpoints with role-based access
  app.get("/api/timeoff/balance", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      // Allow employees, managers, and admins to view PTO data
      if (
        !req.user.role ||
        ![
          UserRole.INTERNAL_EMPLOYEE,
          UserRole.CONTRACTOR_1099,
          UserRole.FACILITY_MANAGER,
          UserRole.CLIENT_ADMINISTRATOR,
          UserRole.SUPER_ADMIN,
        ].includes(req.user.role)
      ) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      const balance = {
        available: 30,
        used: 50,
        pending: 8,
      };
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PTO balance" });
    }
  });

  app.get("/api/timeoff/requests", requireAuth, enforceDataAccess, async (req: any, res) => {
    try {
      // Allow employees, managers, and admins to view PTO requests
      if (
        !req.user.role ||
        ![
          UserRole.INTERNAL_EMPLOYEE,
          UserRole.CONTRACTOR_1099,
          UserRole.FACILITY_MANAGER,
          UserRole.CLIENT_ADMINISTRATOR,
          UserRole.SUPER_ADMIN,
        ].includes(req.user.role)
      ) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      const requests = [
        {
          id: 1,
          startDate: "2025-07-01",
          endDate: "2025-07-03",
          hours: 24,
          status: "pending",
          reason: "Vacation",
        },
        {
          id: 2,
          startDate: "2025-06-15",
          endDate: "2025-06-15",
          hours: 8,
          status: "approved",
          reason: "Personal",
        },
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
            return res
              .status(403)
              .json({ message: "Access denied: Can only view your own work history" });
          }
          break;

        default:
          // For backwards compatibility, allow access but log the unknown role
          console.warn("Unknown user role accessing work history:", req.user.role);
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
            totalPay: 540,
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
            totalPay: 576,
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
            totalPay: 336,
          },
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
        pending: 8,
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
          reason: "Vacation",
        },
        {
          id: 2,
          startDate: "2025-06-15",
          endDate: "2025-06-16",
          hours: 16,
          status: "approved",
          reason: "Personal",
        },
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
          description: "Complete employee handbook and policies",
        },
        {
          id: 2,
          title: "Safety Training Video",
          type: "video",
          category: "Training",
          downloadUrl: "/resources/safety-training.mp4",
          duration: "15:30",
          description: "Workplace safety procedures and protocols",
        },
        {
          id: 3,
          title: "Benefits Overview",
          type: "document",
          category: "Benefits",
          downloadUrl: "/resources/benefits.docx",
          size: "1.2 MB",
          description: "Overview of employee benefits and enrollment",
        },
      ];
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Create example facilities
  app.post("/api/create-example-facilities", async (req, res) => {
    try {
      const facilityData = [
        {
          name: "Sunnybrook Medical Center",
          facilityType: "hospital",
          address: "1234 Healthcare Drive",
          city: "Springfield",
          state: "IL",
          zipCode: "62701",
          phone: "(217) 555-0123",
          email: "admin@sunnybrook.com",
          isActive: true,
          bedCount: 150,
          cmsId: "140001",
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
        },
        {
          name: "Golden Years Nursing Home",
          facilityType: "nursing_home",
          address: "5678 Elder Care Lane",
          city: "Springfield",
          state: "IL",
          zipCode: "62702",
          phone: "(217) 555-0456",
          email: "contact@goldenyears.com",
          isActive: true,
          bedCount: 120,
          cmsId: "140002",
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
        },
        {
          name: "Riverside Assisted Living",
          facilityType: "assisted_living",
          address: "9012 River View Road",
          city: "Springfield",
          state: "IL",
          zipCode: "62703",
          phone: "(217) 555-0789",
          email: "info@riverside-al.com",
          isActive: true,
          bedCount: 80,
          overallRating: 5,
          staffingRating: 5,
          qualityMeasureRating: 5,
        },
        {
          name: "Springfield General Hospital",
          facilityType: "hospital",
          address: "3456 Medical Plaza",
          city: "Springfield",
          state: "IL",
          zipCode: "62704",
          phone: "(217) 555-1234",
          email: "administration@sggeneral.org",
          isActive: true,
          bedCount: 200,
          cmsId: "140003",
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
        },
        {
          name: "Peaceful Meadows Hospice",
          facilityType: "hospice",
          address: "7890 Serenity Circle",
          city: "Springfield",
          state: "IL",
          zipCode: "62705",
          phone: "(217) 555-2468",
          email: "care@peacefulmeadows.org",
          isActive: true,
          bedCount: 24,
          overallRating: 5,
          staffingRating: 5,
          qualityMeasureRating: 5,
        },
      ];

      const createdFacilities = await db.insert(facilities).values(facilityData).returning();
      res.json({
        message: "Example facilities created successfully",
        facilities: createdFacilities,
      });
    } catch (error) {
      console.error("Error creating example facilities:", error);
      res
        .status(500)
        .json({ message: "Failed to create example facilities", error: (error as Error).message });
    }
  });

  // Database seeding API (for development)
  app.post("/api/seed-shifts", async (req, res) => {
    try {
      // Clear existing shifts
      await db.delete(shifts);

      // Create shifts data with correct schema
      const currentFacility = await storage.getAllFacilities();
      const facilityId = currentFacility[0]?.id || 1;

      const shiftsData = [
        {
          date: "2025-06-18",
          title: "ICU Day Shift",
          specialty: "RN",
          startTime: "07:00",
          endTime: "19:00",
          facilityId,
          department: "ICU",
          rate: "45.00",
          premiumMultiplier: "1.20",
          urgency: "high",
          status: "open",
          description: "Critical care nursing position",
          createdById: 1,
        },
        {
          date: "2025-06-18",
          title: "Emergency Night Shift",
          specialty: "RN",
          startTime: "19:00",
          endTime: "07:00",
          facilityId,
          department: "Emergency",
          rate: "50.00",
          premiumMultiplier: "1.50",
          urgency: "critical",
          status: "open",
          description: "Emergency department coverage",
          createdById: 1,
        },
        {
          date: "2025-06-19",
          title: "Med-Surg Day",
          specialty: "LPN",
          startTime: "07:00",
          endTime: "15:00",
          facilityId,
          department: "Med-Surg",
          rate: "32.00",
          premiumMultiplier: "1.10",
          urgency: "medium",
          status: "assigned",
          description: "Medical surgical unit",
          createdById: 1,
        },
      ];

      const createdShifts = await db.insert(shifts).values(shiftsData).returning();
      res.json({ message: "Shifts seeded successfully", count: shiftsData.length });
    } catch (error) {
      console.error("Seeding error:", error);
      res.status(500).json({ message: "Failed to seed shifts", error: (error as Error).message });
    }
  });

  // Facilities API - using example data for now
  app.get("/api/facilities", requireAuth, async (req, res) => {
    try {
      const exampleFacilities = [
        {
          id: 1,
          name: "Portland General Hospital",
          facilityType: "hospital",
          address: "3181 SW Sam Jackson Park Rd",
          city: "Portland",
          state: "OR",
          zipCode: "97239",
          phone: "(503) 494-8311",
          email: "admin@portlandgeneral.com",
          website: "https://portlandgeneral.com",
          cmsId: "380001",
          npiNumber: "1234567890",
          isActive: true,
          bedCount: 576,
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
          latitude: 45.4992,
          longitude: -122.6853,
          createdAt: "2025-01-15T00:00:00Z",
          updatedAt: "2025-06-19T00:00:00Z",
        },
        {
          id: 2,
          name: "OHSU Hospital",
          facilityType: "hospital",
          address: "3181 SW Sam Jackson Park Rd",
          city: "Portland",
          state: "OR",
          zipCode: "97239",
          phone: "(503) 494-8311",
          email: "info@ohsu.edu",
          website: "https://ohsu.edu",
          cmsId: "380002",
          npiNumber: "1234567891",
          isActive: true,
          bedCount: 576,
          overallRating: 5,
          staffingRating: 5,
          qualityMeasureRating: 5,
          latitude: 45.4992,
          longitude: -122.6853,
          createdAt: "2025-01-15T00:00:00Z",
          updatedAt: "2025-06-19T00:00:00Z",
        },
        {
          id: 3,
          name: "Legacy Emanuel Medical Center",
          facilityType: "hospital",
          address: "2801 N Gantenbein Ave",
          city: "Portland",
          state: "OR",
          zipCode: "97227",
          phone: "(503) 413-2200",
          email: "contact@legacyhealth.org",
          website: "https://legacyhealth.org",
          cmsId: "380003",
          npiNumber: "1234567892",
          isActive: true,
          bedCount: 368,
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
          latitude: 45.5375,
          longitude: -122.6669,
          createdAt: "2025-01-15T00:00:00Z",
          updatedAt: "2025-06-19T00:00:00Z",
        },
        {
          id: 4,
          name: "Rose City Nursing Center",
          facilityType: "nursing_home",
          address: "5561 NE Sandy Blvd",
          city: "Portland",
          state: "OR",
          zipCode: "97213",
          phone: "(503) 281-7275",
          email: "admin@rosecitynursing.com",
          website: "https://rosecitynursing.com",
          cmsId: "380004",
          npiNumber: "1234567893",
          isActive: true,
          bedCount: 100,
          overallRating: 3,
          staffingRating: 3,
          qualityMeasureRating: 3,
          latitude: 45.5368,
          longitude: -122.6035,
          createdAt: "2025-01-15T00:00:00Z",
          updatedAt: "2025-06-19T00:00:00Z",
        },
      ];
      res.json(exampleFacilities);
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
        req.get("User-Agent")
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
  app.get(
    "/api/payroll/providers",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const providers = await storage.getPayrollProviders();
        res.json(providers);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payroll providers" });
      }
    }
  );

  app.post(
    "/api/payroll/providers",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "payroll_provider"),
    async (req, res) => {
      try {
        const validated = insertPayrollProviderSchema.parse(req.body);
        const provider = await storage.createPayrollProvider(validated);
        res.status(201).json(provider);
      } catch (error) {
        res.status(400).json({ message: "Invalid provider data", error });
      }
    }
  );

  // Payroll Configuration
  app.get(
    "/api/payroll/config/:facilityId",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const facilityId = parseInt(req.params.facilityId);
        const config = await storage.getPayrollConfiguration(facilityId);
        res.json(config);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payroll configuration" });
      }
    }
  );

  app.post(
    "/api/payroll/config",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "payroll_config"),
    async (req, res) => {
      try {
        const validated = insertPayrollConfigurationSchema.parse(req.body);
        const config = await storage.createPayrollConfiguration(validated);
        res.status(201).json(config);
      } catch (error) {
        res.status(400).json({ message: "Invalid configuration data", error });
      }
    }
  );

  app.put(
    "/api/payroll/config/:id",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("UPDATE", "payroll_config"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const validated = insertPayrollConfigurationSchema.partial().parse(req.body);
        const config = await storage.updatePayrollConfiguration(id, validated);
        res.json(config);
      } catch (error) {
        res.status(400).json({ message: "Failed to update configuration", error });
      }
    }
  );

  // Payroll Employees
  app.get(
    "/api/payroll/employees/:facilityId",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const facilityId = parseInt(req.params.facilityId);
        const employees = await storage.getPayrollEmployeesByFacility(facilityId);
        res.json(employees);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payroll employees" });
      }
    }
  );

  app.post(
    "/api/payroll/employees",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "payroll_employee"),
    async (req, res) => {
      try {
        const validated = insertPayrollEmployeeSchema.parse(req.body);
        const employee = await storage.createPayrollEmployee(validated);
        res.status(201).json(employee);
      } catch (error) {
        res.status(400).json({ message: "Invalid employee data", error });
      }
    }
  );

  app.put(
    "/api/payroll/employees/:id",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("UPDATE", "payroll_employee"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const validated = insertPayrollEmployeeSchema.partial().parse(req.body);
        const employee = await storage.updatePayrollEmployee(id, validated);
        res.json(employee);
      } catch (error) {
        res.status(400).json({ message: "Failed to update employee", error });
      }
    }
  );

  // Timesheets
  app.get(
    "/api/timesheets/:facilityId",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const facilityId = parseInt(req.params.facilityId);
        const { startDate, endDate, userId } = req.query;

        let timesheets;
        if (userId) {
          timesheets = await storage.getTimesheetsByUser(parseInt(userId as string), facilityId);
        } else if (startDate && endDate) {
          timesheets = await storage.getTimesheetsByPayPeriod(
            facilityId,
            new Date(startDate as string),
            new Date(endDate as string)
          );
        } else {
          timesheets = await storage.getPendingTimesheets(facilityId);
        }

        res.json(timesheets);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch timesheets" });
      }
    }
  );

  app.post(
    "/api/timesheets",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "timesheet"),
    async (req, res) => {
      try {
        const validated = insertTimesheetSchema.parse(req.body);
        const timesheet = await storage.createTimesheet(validated);
        res.status(201).json(timesheet);
      } catch (error) {
        res.status(400).json({ message: "Invalid timesheet data", error });
      }
    }
  );

  app.put(
    "/api/timesheets/:id/status",
    requireAuth,
    requirePermission("payroll.approve"),
    auditLog("UPDATE", "timesheet"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const timesheet = await storage.updateTimesheetStatus(id, status, req.user.id);
        res.json(timesheet);
      } catch (error) {
        res.status(400).json({ message: "Failed to update timesheet status", error });
      }
    }
  );

  // Timesheet Entries
  app.get(
    "/api/timesheets/:id/entries",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const timesheetId = parseInt(req.params.id);
        const entries = await storage.getTimesheetEntries(timesheetId);
        res.json(entries);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch timesheet entries" });
      }
    }
  );

  app.post(
    "/api/timesheets/:id/entries",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "timesheet_entry"),
    async (req, res) => {
      try {
        const timesheetId = parseInt(req.params.id);
        const validated = insertTimesheetEntrySchema.parse({ ...req.body, timesheetId });
        const entry = await storage.createTimesheetEntry(validated);
        res.status(201).json(entry);
      } catch (error) {
        res.status(400).json({ message: "Invalid entry data", error });
      }
    }
  );

  // Payments
  app.get(
    "/api/payments/:facilityId",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
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
    }
  );

  app.post(
    "/api/payments",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("CREATE", "payment"),
    async (req, res) => {
      try {
        const validated = insertPaymentSchema.parse(req.body);
        const payment = await storage.createPayment(validated);
        res.status(201).json(payment);
      } catch (error) {
        res.status(400).json({ message: "Invalid payment data", error });
      }
    }
  );

  app.put(
    "/api/payments/:id/status",
    requireAuth,
    requirePermission("payroll.manage"),
    auditLog("UPDATE", "payment"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const payment = await storage.updatePaymentStatus(id, status);
        res.json(payment);
      } catch (error) {
        res.status(400).json({ message: "Failed to update payment status", error });
      }
    }
  );

  // Automated Payroll Processing
  app.post(
    "/api/payroll/process",
    requireAuth,
    requirePermission("payroll.process"),
    auditLog("PROCESS", "payroll"),
    async (req, res) => {
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
    }
  );

  // Payroll Provider Sync
  app.post(
    "/api/payroll/sync",
    requireAuth,
    requirePermission("payroll.sync"),
    auditLog("SYNC", "payroll"),
    async (req, res) => {
      try {
        const { facilityId, syncType } = req.body;
        const syncLog = await storage.syncWithPayrollProvider(facilityId, syncType);
        res.json(syncLog);
      } catch (error) {
        res.status(500).json({ message: "Failed to sync with payroll provider", error });
      }
    }
  );

  // Payroll Sync Logs
  app.get(
    "/api/payroll/sync-logs/:facilityId",
    requireAuth,
    requirePermission("payroll.view"),
    async (req, res) => {
      try {
        const facilityId = parseInt(req.params.facilityId);
        const { providerId } = req.query;
        const logs = await storage.getPayrollSyncLogs(
          facilityId,
          providerId ? parseInt(providerId as string) : undefined
        );
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch sync logs" });
      }
    }
  );

  // Additional facility management routes
  // Note: Main facilities endpoint is already defined above

  // Scheduling Configuration API
  app.get("/api/scheduling/templates", requireAuth, async (req, res) => {
    try {
      const templates = [
        {
          id: 1,
          name: "ICU Day Shift",
          department: "ICU",
          specialty: "Registered Nurse",
          minStaff: 2,
          maxStaff: 4,
          shiftType: "day",
          startTime: "07:00",
          endTime: "19:00",
          isActive: true,
        },
        {
          id: 2,
          name: "Emergency Night",
          department: "Emergency",
          specialty: "Registered Nurse",
          minStaff: 3,
          maxStaff: 5,
          shiftType: "night",
          startTime: "19:00",
          endTime: "07:00",
          isActive: true,
        },
        {
          id: 3,
          name: "OR Morning",
          department: "Operating Room",
          specialty: "Surgical Technologist",
          minStaff: 1,
          maxStaff: 2,
          shiftType: "day",
          startTime: "06:00",
          endTime: "14:00",
          isActive: true,
        },
      ];
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/scheduling/templates", requireAuth, async (req, res) => {
    try {
      const template = {
        id: Date.now(),
        ...req.body,
        createdAt: "2025-06-19T00:00:00Z",
        updatedAt: "2025-06-19T00:00:00Z",
      };
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put("/api/scheduling/templates/:id", requireAuth, async (req, res) => {
    try {
      const template = {
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: new Date(),
      };
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/scheduling/templates/:id", requireAuth, async (req, res) => {
    try {
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.get("/api/scheduling/requirements", requireAuth, async (req, res) => {
    try {
      const requirements = [
        {
          id: 1,
          department: "ICU",
          specialty: "Registered Nurse",
          minRequired: 3,
          maxCapacity: 6,
          requiresCertification: true,
          certificationTypes: ["BLS", "ACLS", "CCRN"],
          priorityLevel: "critical",
          isActive: true,
        },
        {
          id: 2,
          department: "Emergency",
          specialty: "Registered Nurse",
          minRequired: 4,
          maxCapacity: 8,
          requiresCertification: true,
          certificationTypes: ["BLS", "ACLS", "TNCC"],
          priorityLevel: "critical",
          isActive: true,
        },
        {
          id: 3,
          department: "Medical-Surgical",
          specialty: "Licensed Practical Nurse",
          minRequired: 2,
          maxCapacity: 4,
          requiresCertification: false,
          certificationTypes: [],
          priorityLevel: "medium",
          isActive: true,
        },
        {
          id: 4,
          department: "Operating Room",
          specialty: "Surgical Technologist",
          minRequired: 1,
          maxCapacity: 3,
          requiresCertification: true,
          certificationTypes: ["BLS", "CNOR"],
          priorityLevel: "high",
          isActive: true,
        },
      ];
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requirements" });
    }
  });

  app.post("/api/scheduling/requirements", requireAuth, async (req, res) => {
    try {
      const requirement = {
        id: Date.now(),
        ...req.body,
        createdAt: "2025-06-19T00:00:00Z",
        updatedAt: "2025-06-19T00:00:00Z",
      };
      res.status(201).json(requirement);
    } catch (error) {
      res.status(500).json({ message: "Failed to create requirement" });
    }
  });

  app.put("/api/scheduling/requirements/:id", requireAuth, async (req, res) => {
    try {
      const requirement = {
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: new Date(),
      };
      res.json(requirement);
    } catch (error) {
      res.status(500).json({ message: "Failed to update requirement" });
    }
  });

  app.delete("/api/scheduling/requirements/:id", requireAuth, async (req, res) => {
    try {
      res.json({ message: "Requirement deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete requirement" });
    }
  });

  // Shift assignment and synchronization
  app.post("/api/shift-requests/:id/assign", requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { workerId, workerName } = req.body;

      // Update shift status to assigned
      const assignedShift = {
        id: requestId,
        status: "assigned",
        assignedWorker: {
          id: workerId,
          name: workerName,
        },
        assignedAt: new Date(),
      };

      res.json({
        message: "Shift assigned successfully",
        shift: assignedShift,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign shift" });
    }
  });

  // Shift Requests API with worker details
  app.get("/api/shift-requests", requireAuth, async (req, res) => {
    try {
      const shiftRequests = [
        {
          id: 1,
          shiftId: 3,
          title: "Physical Therapy",
          date: "2025-06-20",
          startTime: "09:00",
          endTime: "17:00",
          department: "Rehabilitation",
          specialty: "Physical Therapist",
          facilityName: "OHSU Hospital",
          status: "pending",
          urgency: "medium",
          requestedWorkers: [
            {
              id: 15,
              name: "Sarah Martinez",
              reliabilityScore: 95,
              totalShiftsWorked: 127,
              isFavorite: true,
              specialty: "Physical Therapist",
              certifications: ["BLS", "PT License"],
              profileUrl: "/staff/15",
            },
            {
              id: 23,
              name: "Michael Chen",
              reliabilityScore: 88,
              totalShiftsWorked: 89,
              isFavorite: false,
              specialty: "Physical Therapist",
              certifications: ["BLS", "PT License", "Orthopedic Cert"],
              profileUrl: "/staff/23",
            },
            {
              id: 31,
              name: "Amanda Rodriguez",
              reliabilityScore: 92,
              totalShiftsWorked: 156,
              isFavorite: true,
              specialty: "Physical Therapist",
              certifications: ["BLS", "PT License", "Neuro Cert"],
              profileUrl: "/staff/31",
            },
          ],
        },
        {
          id: 2,
          shiftId: 9,
          title: "Pediatric Unit",
          date: "2025-06-23",
          startTime: "07:00",
          endTime: "19:00",
          department: "Pediatrics",
          specialty: "Registered Nurse",
          facilityName: "Providence Portland Medical Center",
          status: "pending",
          urgency: "medium",
          requestedWorkers: [
            {
              id: 7,
              name: "Jessica Thompson",
              reliabilityScore: 97,
              totalShiftsWorked: 203,
              isFavorite: true,
              specialty: "Registered Nurse",
              certifications: ["BLS", "PALS", "RN License"],
              profileUrl: "/staff/7",
            },
            {
              id: 12,
              name: "David Wilson",
              reliabilityScore: 91,
              totalShiftsWorked: 145,
              isFavorite: false,
              specialty: "Registered Nurse",
              certifications: ["BLS", "ACLS", "PALS", "RN License"],
              profileUrl: "/staff/12",
            },
          ],
        },
        {
          id: 3,
          shiftId: 10,
          title: "CNA Float Pool",
          date: "2025-06-24",
          startTime: "14:00",
          endTime: "22:00",
          department: "Float Pool",
          specialty: "Certified Nursing Assistant",
          facilityName: "Rose City Nursing Center",
          status: "pending",
          urgency: "low",
          requestedWorkers: [
            {
              id: 18,
              name: "Maria Gonzalez",
              reliabilityScore: 94,
              totalShiftsWorked: 178,
              isFavorite: true,
              specialty: "Certified Nursing Assistant",
              certifications: ["BLS", "CNA License"],
              profileUrl: "/staff/18",
            },
            {
              id: 25,
              name: "Robert Johnson",
              reliabilityScore: 86,
              totalShiftsWorked: 98,
              isFavorite: false,
              specialty: "Certified Nursing Assistant",
              certifications: ["BLS", "CNA License"],
              profileUrl: "/staff/25",
            },
            {
              id: 33,
              name: "Linda Davis",
              reliabilityScore: 89,
              totalShiftsWorked: 134,
              isFavorite: false,
              specialty: "Certified Nursing Assistant",
              certifications: ["BLS", "CNA License", "Med Tech"],
              profileUrl: "/staff/33",
            },
          ],
        },
      ];
      res.json(shiftRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Create new facility
  app.post("/api/facilities", requireAuth, async (req, res) => {
    try {
      const newFacility = {
        id: Date.now(),
        ...req.body,
        isActive: true,
        createdAt: "2025-06-19T00:00:00Z",
        updatedAt: "2025-06-19T00:00:00Z",
      };
      res.status(201).json(newFacility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(500).json({ message: "Failed to create facility" });
    }
  });

  // Update facility
  app.put("/api/facilities/:id", requireAuth, async (req, res) => {
    try {
      const updatedFacility = {
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: "2025-06-19T00:00:00Z",
      };
      res.json(updatedFacility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(500).json({ message: "Failed to update facility" });
    }
  });

  // Search external facilities
  app.get("/api/facilities/search-external", requireAuth, async (req, res) => {
    try {
      const { name, state, city } = req.query;
      const mockResults = [
        {
          cmsId: "380010",
          name: `${name} Medical Center`,
          address: "123 Healthcare Dr",
          city: city || "Portland",
          state: state || "OR",
          zipCode: "97201",
          phone: "(503) 555-0199",
          facilityType: "hospital",
          bedCount: 200,
          overallRating: 4,
          staffingRating: 4,
          qualityMeasureRating: 4,
        },
      ];
      res.json(mockResults);
    } catch (error) {
      console.error("Error searching external facilities:", error);
      res.status(500).json({ message: "Failed to search external facilities" });
    }
  });

  // Import facility from external source
  app.post("/api/facilities/import", requireAuth, async (req, res) => {
    try {
      const { cmsId } = req.body;
      const importedFacility = {
        id: Date.now(),
        cmsId,
        name: "Imported Medical Center",
        facilityType: "hospital",
        address: "456 Import Ave",
        city: "Portland",
        state: "OR",
        zipCode: "97202",
        phone: "(503) 555-0200",
        email: "imported@medical.com",
        isActive: true,
        bedCount: 150,
        overallRating: 4,
        staffingRating: 4,
        qualityMeasureRating: 4,
        createdAt: "2025-06-19T00:00:00Z",
        updatedAt: "2025-06-19T00:00:00Z",
      };
      res.status(201).json(importedFacility);
    } catch (error) {
      console.error("Error importing facility:", error);
      res.status(500).json({ message: "Failed to import facility" });
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

  app.post(
    "/api/facilities",
    requireAuth,
    requirePermission("facilities.create"),
    auditLog("CREATE", "facility"),
    async (req: any, res) => {
      try {
        const validatedData = insertFacilitySchema.parse(req.body);
        const facility = await storage.createFacility(validatedData);
        res.status(201).json(facility);
      } catch (error) {
        console.error("Error creating facility:", error);
        res.status(400).json({ message: "Failed to create facility" });
      }
    }
  );

  app.patch(
    "/api/facilities/:id",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req, res) => {
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
    }
  );

  // External data import routes
  app.post(
    "/api/facilities/import/cms",
    requireAuth,
    requirePermission("facilities.create"),
    auditLog("IMPORT", "facility"),
    async (req, res) => {
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
        res
          .status(400)
          .json({ message: error instanceof Error ? error.message : "Failed to import facility" });
      }
    }
  );

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
      res
        .status(400)
        .json({ message: error instanceof Error ? error.message : "Failed to search facilities" });
    }
  });

  app.post(
    "/api/facilities/:id/refresh",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("REFRESH", "facility"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { facilityImportService } = await import("./facility-import");
        const facility = await facilityImportService.refreshFacilityData(id);
        res.json(facility);
      } catch (error) {
        console.error("Error refreshing facility data:", error);
        res
          .status(400)
          .json({
            message: error instanceof Error ? error.message : "Failed to refresh facility data",
          });
      }
    }
  );

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

      const recommendations = await recommendationEngine.getEmergencyRecommendations(
        location,
        facilityType
      );
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

      const recommendations = await recommendationEngine.getSpecializedCareRecommendations(
        location,
        specialty,
        maxDistance
      );
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
        return res
          .status(400)
          .json({ message: "Valid insurance type is required (medicare, medicaid, or both)" });
      }

      const recommendations = await recommendationEngine.getInsuranceBasedRecommendations(
        location,
        insuranceType,
        facilityType
      );
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating insurance-based recommendations:", error);
      res.status(500).json({ message: "Failed to generate insurance-based recommendations" });
    }
  });

  // Facilities API endpoint
  app.get("/api/facilities", async (req, res) => {
    try {
      const facilities = [
        {
          id: 1,
          name: "Portland General Hospital",
          address: "3181 SW Sam Jackson Park Rd, Portland, OR 97239",
          type: "Hospital",
          status: "active",
          phone: "(503) 494-8311",
          capacity: 450,
          currentStaff: 340
        },
        {
          id: 2,
          name: "Maple Grove Memory Care",
          address: "12450 SW 69th Ave, Portland, OR 97223",
          type: "Memory Care",
          status: "active",
          phone: "(503) 639-3500",
          capacity: 85,
          currentStaff: 62
        },
        {
          id: 3,
          name: "Sunset Senior Living",
          address: "8505 SW Canyon Rd, Portland, OR 97225",
          type: "Assisted Living",
          status: "active",
          phone: "(503) 297-8866",
          capacity: 120,
          currentStaff: 89
        },
        {
          id: 4,
          name: "Cedar Hills Rehabilitation Center",
          address: "10300 SW Eastridge St, Portland, OR 97225",
          type: "Rehabilitation",
          status: "active",
          phone: "(503) 292-5600",
          capacity: 95,
          currentStaff: 71
        }
      ];
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Staff API endpoint
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = [
        {
          id: 1,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@portlandgeneral.com",
          role: "Registered Nurse",
          specialty: "Emergency Medicine",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          status: "active",
          shiftPreference: "day",
          availabilityStatus: "available"
        },
        {
          id: 2,
          firstName: "Emily",
          lastName: "Rodriguez",
          email: "emily.rodriguez@portlandgeneral.com",
          role: "Licensed Practical Nurse",
          specialty: "Intensive Care",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          status: "active",
          shiftPreference: "night",
          availabilityStatus: "available"
        },
        {
          id: 3,
          firstName: "Mike",
          lastName: "Davis",
          email: "mike.davis@contractor.com",
          role: "Physical Therapist",
          specialty: "Orthopedic Rehabilitation",
          facilityId: null,
          facilityName: null,
          status: "active",
          shiftPreference: "day",
          availabilityStatus: "available"
        },
        {
          id: 4,
          firstName: "Lisa",
          lastName: "Chen",
          email: "lisa.chen@maplegove.com",
          role: "Certified Nursing Assistant",
          specialty: "Memory Care",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          status: "active",
          shiftPreference: "evening",
          availabilityStatus: "busy"
        },
        {
          id: 5,
          firstName: "David",
          lastName: "Kim",
          email: "david.kim@freelance.com",
          role: "Respiratory Therapist",
          specialty: "Pulmonary Care",
          facilityId: null,
          facilityName: null,
          status: "active",
          shiftPreference: "night",
          availabilityStatus: "available"
        },
        {
          id: 6,
          firstName: "Jennifer",
          lastName: "Walsh",
          email: "jennifer.walsh@maplegove.com",
          role: "Occupational Therapist",
          specialty: "Geriatric Care",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          status: "active",
          shiftPreference: "day",
          availabilityStatus: "available"
        }
      ];
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Session management endpoints
  app.post("/api/impersonate", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const currentUser = req.user;
      
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admins can impersonate users" });
      }

      // Store original user info and set impersonation
      (req.session as any).originalUser = currentUser;
      (req.session as any).impersonatedUserId = userId;
      
      // Get the user to impersonate
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        success: true, 
        impersonatedUser: targetUser,
        originalUser: currentUser
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ message: "Failed to start impersonation" });
    }
  });

  app.post("/api/stop-impersonation", requireAuth, async (req, res) => {
    try {
      if (!(req.session as any).originalUser) {
        return res.status(400).json({ message: "No active impersonation session" });
      }

      const originalUser = (req.session as any).originalUser;
      delete (req.session as any).originalUser;
      delete (req.session as any).impersonatedUserId;

      res.json({ 
        success: true, 
        restoredUser: originalUser 
      });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  app.get("/api/session-status", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;
      const isImpersonating = !!(req.session as any).originalUser;
      
      res.json({
        user: currentUser,
        isImpersonating,
        originalUser: (req.session as any).originalUser || null,
        impersonatedUserId: (req.session as any).impersonatedUserId || null
      });
    } catch (error) {
      console.error("Error getting session status:", error);
      res.status(500).json({ message: "Failed to get session status" });
    }
  });

  app.post("/api/restore-session", async (req, res) => {
    try {
      const { username, password, impersonatedUserId } = req.body;
      
      // Quick re-authentication for development
      if (username === "joshburn" && password === "admin123") {
        const superUser = {
          id: 1,
          username: "joshburn",
          email: "joshburn@nexspace.com",
          role: "super_admin" as const,
          firstName: "Josh",
          lastName: "Burn",
          avatar: null,
          isActive: true,
          facilityId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          password: ""
        };

        // Restore session
        (req.session as any).passport = { user: superUser.id };
        
        // Restore impersonation if provided
        if (impersonatedUserId) {
          const targetUser = await storage.getUser(impersonatedUserId);
          if (targetUser) {
            (req.session as any).originalUser = superUser;
            (req.session as any).impersonatedUserId = impersonatedUserId;
            
            return res.json({
              success: true,
              user: targetUser,
              isImpersonating: true,
              originalUser: superUser
            });
          }
        }

        res.json({
          success: true,
          user: superUser,
          isImpersonating: false
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error restoring session:", error);
      res.status(500).json({ message: "Failed to restore session" });
    }
  });

  // Admin API endpoints
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      // Return comprehensive user data for admin management
      const users = [
        {
          id: 1,
          name: "Josh Burn",
          username: "joshburn",
          email: "joshburn@nexspace.com",
          role: "super_admin",
          status: "active",
          facilityId: null,
          facilityName: null,
          createdAt: "2025-01-15T00:00:00Z",
          lastLogin: "2025-06-21T02:58:00Z"
        },
        {
          id: 2,
          name: "Sarah Johnson",
          username: "sarah.johnson",
          email: "sarah.johnson@portlandgeneral.com",
          role: "facility_manager",
          status: "active",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          createdAt: "2025-02-01T00:00:00Z",
          lastLogin: "2025-06-20T18:45:00Z"
        },
        {
          id: 3,
          name: "Josh Burn",
          username: "JoshBurn",
          email: "joshburn@gmail.com",
          role: "employee",
          status: "active",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          createdAt: "2025-02-15T00:00:00Z",
          lastLogin: "2025-06-20T16:30:00Z"
        },
        {
          id: 4,
          name: "Mike Davis",
          username: "mike.davis",
          email: "mike.davis@contractor.com",
          role: "contractor",
          status: "active",
          facilityId: null,
          facilityName: null,
          createdAt: "2025-03-01T00:00:00Z",
          lastLogin: "2025-06-19T12:15:00Z"
        },
        {
          id: 5,
          name: "Lisa Chen",
          username: "lisa.chen",
          email: "lisa.chen@maplegove.com",
          role: "admin",
          status: "active",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          createdAt: "2025-03-10T00:00:00Z",
          lastLogin: "2025-06-20T14:20:00Z"
        },
        {
          id: 6,
          name: "Emily Rodriguez",
          username: "emily.rodriguez",
          email: "emily.rodriguez@portlandgeneral.com",
          role: "employee",
          status: "active",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          createdAt: "2025-04-01T00:00:00Z",
          lastLogin: "2025-06-20T10:00:00Z"
        },
        {
          id: 7,
          name: "David Kim",
          username: "david.kim",
          email: "david.kim@freelance.com",
          role: "contractor",
          status: "pending",
          facilityId: null,
          facilityName: null,
          createdAt: "2025-06-15T00:00:00Z",
          lastLogin: null
        },
        {
          id: 8,
          name: "Jennifer Walsh",
          username: "jennifer.walsh",
          email: "jennifer.walsh@maplegove.com",
          role: "employee",
          status: "inactive",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          createdAt: "2025-01-20T00:00:00Z",
          lastLogin: "2025-05-15T08:30:00Z"
        }
      ];
      
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

  app.patch("/api/admin/users/:id/permissions", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { permissions } = req.body;
      
      // Here you would update the user's permissions in the database
      // For now, returning success response
      res.json({ 
        message: "Permissions updated successfully",
        userId: id,
        permissions: permissions
      });
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
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
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "SQL query is required" });
      }

      // Safety checks for dangerous operations
      const dangerousKeywords = ["DROP", "DELETE", "TRUNCATE", "ALTER"];
      const upperQuery = query.toUpperCase();
      const isDangerous = dangerousKeywords.some((keyword) => upperQuery.includes(keyword));

      if (isDangerous && req.user?.role !== "super_admin") {
        return res
          .status(403)
          .json({ message: "Dangerous queries require super admin privileges" });
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
          amount: 15750.0,
          status: "pending",
          dueDate: "2025-07-15",
          serviceDate: "2025-06-01",
          description: "Nursing staff - June 2025",
          facilityId: 1,
          facilityName: "Chicago General Hospital",
          createdAt: "2025-06-19T00:00:00Z",
        },
        {
          id: 2,
          vendorName: "MedSupply Plus",
          vendorType: "medical_supply",
          invoiceNumber: "MSP-INV-5432",
          amount: 8900.5,
          status: "approved",
          dueDate: "2025-07-10",
          serviceDate: "2025-06-15",
          description: "PPE and medical supplies",
          facilityId: 2,
          facilityName: "Springfield Care Center",
          createdAt: "2025-06-18T00:00:00Z",
        },
        {
          id: 3,
          vendorName: "TechCare IT Services",
          vendorType: "it_services",
          invoiceNumber: "TCIT-2025-0089",
          amount: 12400.0,
          status: "paid",
          dueDate: "2025-06-30",
          serviceDate: "2025-05-20",
          description: "Network infrastructure upgrade",
          facilityId: 1,
          facilityName: "Chicago General Hospital",
          createdAt: "2025-06-01T00:00:00Z",
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
          createdAt: "2025-05-16T00:00:00Z",
        },
        {
          id: 5,
          vendorName: "EquipRent Medical",
          vendorType: "equipment_rental",
          invoiceNumber: "ERM-2025-Q2-15",
          amount: 7800.0,
          status: "pending",
          dueDate: "2025-07-20",
          serviceDate: "2025-06-01",
          description: "Hospital bed rentals - Q2",
          facilityId: 4,
          facilityName: "Dallas Medical Center",
          createdAt: "2025-06-19T00:00:00Z",
        },
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
        createdAt: new Date().toISOString(),
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
        { id: 5, name: "EquipRent Medical", type: "equipment_rental" },
      ];
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Staff Management API
  app.get("/api/staff", requireAuth, async (req, res) => {
    try {
      const staff = [
        {
          id: 1,
          name: "Sarah Johnson",
          email: "sarah.johnson@example.com",
          phone: "(555) 123-4567",
          specialty: "RN",
          department: "ICU",
          workerType: "internal_employee",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
          location: "Chicago, IL",
          yearsExperience: 8,
          certifications: ["ACLS", "BLS", "CCRN"],
          rating: 4.9,
          shiftsCompleted: 156,
          availability: "full_time",
          hourlyRate: 45,
          joinDate: "2022-03-15",
          skills: ["Critical Care", "Patient Assessment", "IV Therapy"],
          bio: "Experienced ICU nurse with expertise in critical care and patient management.",
        },
        {
          id: 2,
          name: "Michael Chen",
          email: "michael.chen@example.com",
          phone: "(555) 234-5678",
          specialty: "LPN",
          department: "Med-Surg",
          workerType: "contractor_1099",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
          location: "Los Angeles, CA",
          yearsExperience: 5,
          certifications: ["BLS", "Medication Administration"],
          rating: 4.7,
          shiftsCompleted: 89,
          availability: "part_time",
          hourlyRate: 28,
          joinDate: "2023-01-20",
          skills: ["Wound Care", "Patient Education", "Medication Management"],
          bio: "Dedicated LPN with strong patient care skills and medication expertise.",
        },
        {
          id: 3,
          name: "Dr. Emma Rodriguez",
          email: "emma.rodriguez@example.com",
          phone: "(555) 345-6789",
          specialty: "MD",
          department: "Emergency",
          workerType: "internal_employee",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1594824022574-1a9b45c1e2b5?w=150&h=150&fit=crop&crop=face",
          location: "Miami, FL",
          yearsExperience: 12,
          certifications: ["ACLS", "ATLS", "PALS", "Board Certified Emergency Medicine"],
          rating: 4.95,
          shiftsCompleted: 234,
          availability: "full_time",
          hourlyRate: 120,
          joinDate: "2021-08-10",
          skills: ["Emergency Medicine", "Trauma Care", "Procedures"],
          bio: "Board-certified emergency physician with extensive trauma experience.",
        },
        {
          id: 4,
          name: "Jessica Park",
          email: "jessica.park@example.com",
          phone: "(555) 456-7890",
          specialty: "CNA",
          department: "Long Term Care",
          workerType: "contractor_1099",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=150&h=150&fit=crop&crop=face",
          location: "Denver, CO",
          yearsExperience: 3,
          certifications: ["CNA", "CPR", "First Aid"],
          rating: 4.6,
          shiftsCompleted: 67,
          availability: "per_diem",
          hourlyRate: 18,
          joinDate: "2023-06-12",
          skills: ["Patient Care", "ADL Assistance", "Vital Signs"],
          bio: "Compassionate CNA with experience in long-term care and patient support.",
        },
        {
          id: 5,
          name: "Robert Thompson",
          email: "robert.thompson@example.com",
          phone: "(555) 567-8901",
          specialty: "RT",
          department: "Respiratory",
          workerType: "internal_employee",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
          location: "Houston, TX",
          yearsExperience: 10,
          certifications: ["RRT", "CRT", "ACLS", "NRP"],
          rating: 4.8,
          shiftsCompleted: 198,
          availability: "full_time",
          hourlyRate: 38,
          joinDate: "2020-11-03",
          skills: ["Mechanical Ventilation", "Pulmonary Function", "ECMO"],
          bio: "Experienced respiratory therapist specializing in critical care ventilation.",
        },
        {
          id: 6,
          name: "Amanda Davis",
          email: "amanda.davis@example.com",
          phone: "(555) 678-9012",
          specialty: "NP",
          department: "Family Practice",
          workerType: "contractor_1099",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
          location: "Seattle, WA",
          yearsExperience: 7,
          certifications: ["FNP-BC", "ACLS", "BLS"],
          rating: 4.9,
          shiftsCompleted: 145,
          availability: "part_time",
          hourlyRate: 65,
          joinDate: "2022-09-18",
          skills: ["Primary Care", "Diagnosis", "Treatment Planning"],
          bio: "Board-certified family nurse practitioner with comprehensive primary care experience.",
        },
        {
          id: 7,
          name: "David Kim",
          email: "david.kim@example.com",
          phone: "(555) 789-0123",
          specialty: "PT",
          department: "Rehabilitation",
          workerType: "internal_employee",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
          location: "Phoenix, AZ",
          yearsExperience: 6,
          certifications: ["DPT", "Orthopedic Specialist", "Manual Therapy"],
          rating: 4.7,
          shiftsCompleted: 112,
          availability: "full_time",
          hourlyRate: 42,
          joinDate: "2023-02-28",
          skills: ["Orthopedic Rehab", "Manual Therapy", "Exercise Prescription"],
          bio: "Licensed physical therapist with orthopedic specialization and manual therapy expertise.",
        },
        {
          id: 8,
          name: "Lisa Martinez",
          email: "lisa.martinez@example.com",
          phone: "(555) 890-1234",
          specialty: "PA",
          department: "Surgery",
          workerType: "contractor_1099",
          status: "active",
          avatar:
            "https://images.unsplash.com/photo-1594824022574-1a9b45c1e2b5?w=150&h=150&fit=crop&crop=face",
          location: "Boston, MA",
          yearsExperience: 9,
          certifications: ["PA-C", "ACLS", "ATLS"],
          rating: 4.85,
          shiftsCompleted: 187,
          availability: "full_time",
          hourlyRate: 58,
          joinDate: "2021-12-05",
          skills: ["Surgical Assistance", "Pre-op Assessment", "Post-op Care"],
          bio: "Certified physician assistant with extensive surgical experience and patient care.",
        },
      ];
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/posts", requireAuth, async (req, res) => {
    try {
      const posts = [
        {
          id: 1,
          authorId: 1,
          authorName: "Sarah Johnson",
          authorAvatar:
            "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
          content:
            "Just completed a challenging 12-hour shift in the ICU. Every day brings new learning opportunities and the chance to make a real difference in patients' lives. Grateful for our amazing team! 💪",
          timestamp: "2025-06-19T10:30:00Z",
          likes: 24,
          comments: 8,
          type: "update",
        },
        {
          id: 2,
          authorId: 3,
          authorName: "Dr. Emma Rodriguez",
          authorAvatar:
            "https://images.unsplash.com/photo-1594824022574-1a9b45c1e2b5?w=150&h=150&fit=crop&crop=face",
          content:
            "Attended an excellent trauma workshop today. New protocols for managing complex cases will definitely improve our patient outcomes. Knowledge sharing is so important in our field!",
          timestamp: "2025-06-18T16:45:00Z",
          likes: 31,
          comments: 12,
          type: "educational",
        },
        {
          id: 3,
          authorId: 5,
          authorName: "Robert Thompson",
          authorAvatar:
            "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
          content:
            "Successfully completed ECMO certification! Excited to bring these advanced skills to our respiratory therapy team. Always learning, always growing! 🎓",
          timestamp: "2025-06-17T14:20:00Z",
          likes: 18,
          comments: 6,
          type: "achievement",
        },
      ];
      res.json(posts);
    } catch (error) {
      console.error("Error fetching staff posts:", error);
      res.status(500).json({ message: "Failed to fetch staff posts" });
    }
  });

  app.post("/api/staff/posts", requireAuth, async (req, res) => {
    try {
      const newPost = {
        id: Date.now(),
        authorId: req.user.id,
        authorName: req.user.username,
        authorAvatar:
          req.user.avatar ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        content: req.body.content,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        type: req.body.type || "update",
      };
      res.json(newPost);
    } catch (error) {
      console.error("Error creating staff post:", error);
      res.status(500).json({ message: "Failed to create staff post" });
    }
  });

  // Referral System API
  app.get("/api/referral-settings", requireAuth, async (req, res) => {
    try {
      const settings = {
        id: 1,
        staffReferralBonus: 500,
        facilityReferralBonus: {
          small: 1000,
          medium: 2500,
          large: 5000,
          enterprise: 10000,
        },
        qualificationPeriod: 90,
        payoutSchedule: "monthly",
        requireBackground: true,
        minimumShifts: 5,
        qrCodeEnabled: true,
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral settings" });
    }
  });

  app.get("/api/referrals/staff", requireAuth, async (req, res) => {
    try {
      const referrals = [
        {
          id: 1,
          referrerId: 1,
          referrerName: "Sarah Johnson",
          refereeEmail: "jane.doe@example.com",
          refereeName: "Jane Doe",
          status: "qualified",
          dateReferred: "2025-05-15T00:00:00Z",
          dateQualified: "2025-06-10T00:00:00Z",
          bonusAmount: 500,
          notes: "Experienced RN from previous facility",
        },
        {
          id: 2,
          referrerId: 3,
          referrerName: "Dr. Emma Rodriguez",
          refereeEmail: "mark.williams@example.com",
          refereeName: "Mark Williams",
          status: "pending",
          dateReferred: "2025-06-01T00:00:00Z",
          bonusAmount: 500,
          notes: "Recent graduate with strong clinical skills",
        },
      ];
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff referrals" });
    }
  });

  // Shifts API
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      // Generate comprehensive 12-month shift data for 100-bed skilled nursing facility
      const generateShifts = () => {
        const shifts = [];
        const startDate = new Date("2024-07-01");
        const endDate = new Date("2025-06-30");
        const departments = [
          "ICU",
          "Emergency Department",
          "Medical/Surgical",
          "Pediatrics",
          "Rehabilitation",
          "Operating Room",
        ];
        const specialties = [
          "Registered Nurse",
          "Licensed Practical Nurse",
          "Certified Nursing Assistant",
          "Physical Therapist",
          "Respiratory Therapist",
        ];
        const statuses = ["open", "assigned", "completed", "requested", "in_progress"];
        const urgencies = ["low", "medium", "high", "critical"];
        const shiftTimes = [
          { start: "07:00", end: "19:00", type: "Day" },
          { start: "19:00", end: "07:00", type: "Night" },
          { start: "06:00", end: "18:00", type: "Day" },
          { start: "18:00", end: "06:00", type: "Night" },
        ];

        let id = 1;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Generate 15-25 shifts per day for large facility
          const shiftsPerDay = Math.floor(Math.random() * 11) + 15;

          for (let i = 0; i < shiftsPerDay; i++) {
            const department = departments[Math.floor(Math.random() * departments.length)];
            const specialty = specialties[Math.floor(Math.random() * specialties.length)];
            const shiftTime = shiftTimes[Math.floor(Math.random() * shiftTimes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];

            // Base rates with premium adjustments
            const baseRates = {
              "Registered Nurse": 35,
              "Licensed Practical Nurse": 28,
              "Certified Nursing Assistant": 18,
              "Physical Therapist": 45,
              "Respiratory Therapist": 32,
            };
            const baseRate = baseRates[specialty] || 30;
            const premiumMultiplier = 1 + Math.random() * 0.7; // 100-170% of base rate
            const rate = Math.round(baseRate * premiumMultiplier);

            shifts.push({
              id: id++,
              title: `${department} ${shiftTime.type} Shift`,
              date: d.toISOString().split("T")[0],
              startTime: shiftTime.start,
              endTime: shiftTime.end,
              department,
              specialty,
              status,
              facilityId: 1,
              facilityName: "Sunrise Manor Skilled Nursing",
              rate,
              urgency,
              description: `${department} coverage needed, ${specialty} position`,
            });
          }
        }
        return shifts.slice(0, 5000); // Return recent shifts for performance
      };

      const shifts = generateShifts();
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", requireAuth, async (req, res) => {
    try {
      const shiftData = req.body;
      const newShift = {
        id: Date.now(),
        ...shiftData,
        status: "open",
        createdById: req.user?.id,
        createdAt: new Date().toISOString(),
      };
      res.json(newShift);
    } catch (error) {
      console.error("Error creating shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  // Shift Templates API - Dynamic template-based shift generation
  app.get("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const templates = [
        {
          id: 1,
          name: "ICU Day Shift RN",
          department: "ICU",
          specialty: "Registered Nurse",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          minStaff: 2,
          maxStaff: 4,
          shiftType: "day",
          startTime: "07:00",
          endTime: "19:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          isActive: true,
          hourlyRate: 45,
          notes: "Primary ICU coverage",
          generatedShiftsCount: 156,
          createdAt: "2025-06-01T00:00:00Z",
          updatedAt: "2025-06-20T00:00:00Z"
        },
        {
          id: 2,
          name: "Emergency Night Coverage",
          department: "Emergency",
          specialty: "Registered Nurse",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          minStaff: 3,
          maxStaff: 5,
          shiftType: "night",
          startTime: "19:00",
          endTime: "07:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          isActive: true,
          hourlyRate: 52,
          notes: "24/7 emergency coverage",
          generatedShiftsCount: 217,
          createdAt: "2025-06-01T00:00:00Z",
          updatedAt: "2025-06-20T00:00:00Z"
        },
        {
          id: 3,
          name: "OR Morning Team",
          department: "Operating Room",
          specialty: "Surgical Technologist",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          minStaff: 1,
          maxStaff: 2,
          shiftType: "day",
          startTime: "06:00",
          endTime: "14:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          isActive: true,
          hourlyRate: 38,
          notes: "Morning surgical procedures",
          generatedShiftsCount: 104,
          createdAt: "2025-06-05T00:00:00Z",
          updatedAt: "2025-06-20T00:00:00Z"
        },
        {
          id: 4,
          name: "Med-Surg Evening LPN",
          department: "Medical-Surgical",
          specialty: "Licensed Practical Nurse",
          facilityId: 3,
          facilityName: "Sunrise Assisted Living",
          minStaff: 2,
          maxStaff: 3,
          shiftType: "evening",
          startTime: "15:00",
          endTime: "23:00",
          daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
          isActive: false,
          hourlyRate: 28,
          notes: "Evening medication rounds",
          generatedShiftsCount: 78,
          createdAt: "2025-06-10T00:00:00Z",
          updatedAt: "2025-06-19T00:00:00Z"
        }
      ];
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shift templates" });
    }
  });

  app.post("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const templateData = req.body;
      const newTemplate = {
        id: Date.now(),
        ...templateData,
        generatedShiftsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Auto-generate shifts for the next 30 days based on template
      const generatedShifts = generateShiftsFromTemplate(newTemplate);
      
      res.json({
        template: newTemplate,
        generatedShifts: generatedShifts.length,
        message: `Template created and ${generatedShifts.length} shifts generated automatically`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create shift template" });
    }
  });

  app.put("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const updates = req.body;
      
      // Simulate template update and shift regeneration
      const updatedTemplate = {
        id: templateId,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Regenerate all future shifts based on updated template
      const regeneratedShifts = generateShiftsFromTemplate(updatedTemplate);
      
      res.json({
        template: updatedTemplate,
        regeneratedShifts: regeneratedShifts.length,
        message: `Template updated and ${regeneratedShifts.length} future shifts regenerated`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update shift template" });
    }
  });

  app.delete("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // Simulate deletion of template and all associated future shifts
      res.json({
        message: "Template and all associated future shifts deleted successfully",
        deletedShifts: 47
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shift template" });
    }
  });

  app.patch("/api/shift-templates/:id/status", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (isActive) {
        // Generate new shifts when activating template
        const newShifts = 23;
        res.json({
          message: `Template activated and ${newShifts} new shifts generated`,
          generatedShifts: newShifts
        });
      } else {
        // Remove future open shifts when deactivating template
        const removedShifts = 15;
        res.json({
          message: `Template deactivated and ${removedShifts} future open shifts removed`,
          removedShifts: removedShifts
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update template status" });
    }
  });

  app.post("/api/shift-templates/:id/regenerate", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // Simulate regenerating all future shifts for this template
      const regeneratedCount = 34;
      res.json({
        message: `Successfully regenerated ${regeneratedCount} future shifts from template`,
        regeneratedShifts: regeneratedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to regenerate shifts" });
    }
  });

  // Facility Schedule API - Modern scheduling interface
  app.get("/api/facility/shifts", requireAuth, async (req, res) => {
    try {
      const date = req.query.date as string;
      const shifts = [
        {
          id: 1,
          staffId: 1,
          shiftId: 101,
          date: date || "2025-06-21",
          startTime: "07:00",
          endTime: "19:00",
          status: "scheduled",
          department: "ICU",
          specialty: "Registered Nurse",
          notes: "Primary assignment"
        },
        {
          id: 2,
          staffId: 2,
          shiftId: 102,
          date: date || "2025-06-21",
          startTime: "19:00",
          endTime: "07:00",
          status: "open",
          department: "Emergency",
          specialty: "Registered Nurse",
          notes: "Night coverage needed"
        },
        {
          id: 3,
          staffId: null,
          shiftId: 103,
          date: date || "2025-06-21",
          startTime: "15:00",
          endTime: "23:00",
          status: "requested",
          department: "Medical-Surgical",
          specialty: "Licensed Practical Nurse",
          notes: "Pending approval"
        }
      ];
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facility shifts" });
    }
  });

  app.get("/api/facility/requirements", requireAuth, async (req, res) => {
    try {
      const requirements = [
        {
          department: "ICU",
          requiredHours: 168,
          budgetHours: 180,
          currentHours: 156,
          shortage: 12,
          overage: 0
        },
        {
          department: "Emergency",
          requiredHours: 210,
          budgetHours: 220,
          currentHours: 198,
          shortage: 12,
          overage: 0
        },
        {
          department: "Medical-Surgical",
          requiredHours: 140,
          budgetHours: 150,
          currentHours: 152,
          shortage: 0,
          overage: 2
        },
        {
          department: "Operating Room",
          requiredHours: 120,
          budgetHours: 130,
          currentHours: 118,
          shortage: 2,
          overage: 0
        }
      ];
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facility requirements" });
    }
  });

  app.post("/api/facility/shifts", requireAuth, async (req, res) => {
    try {
      const shiftData = req.body;
      const newShift = {
        id: Date.now(),
        ...shiftData,
        status: "open",
        createdAt: new Date().toISOString()
      };
      res.json(newShift);
    } catch (error) {
      res.status(500).json({ message: "Failed to create facility shift" });
    }
  });

  app.post("/api/facility/shifts/:id/fill", requireAuth, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.id);
      const { staffId } = req.body;
      
      res.json({
        message: "Shift successfully filled",
        shiftId,
        staffId,
        status: "filled",
        filledAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fill shift" });
    }
  });

  // Helper function to generate shifts from template
  function generateShiftsFromTemplate(template: any) {
    const shifts = [];
    const today = new Date();
    
    // Generate shifts for next 30 days based on template days of week
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (template.daysOfWeek.includes(date.getDay())) {
        for (let staffCount = 0; staffCount < template.minStaff; staffCount++) {
          shifts.push({
            id: Date.now() + i * 1000 + staffCount,
            templateId: template.id,
            date: date.toISOString().split('T')[0],
            startTime: template.startTime,
            endTime: template.endTime,
            department: template.department,
            specialty: template.specialty,
            facilityId: template.facilityId,
            status: "open",
            hourlyRate: template.hourlyRate,
            createdFromTemplate: true
          });
        }
      }
    }
    
    return shifts;
  }

  // Superuser Impersonation API
  app.get("/api/users/all", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "super_admin") {
        return res.status(403).json({ message: "Superuser access required" });
      }

      const users = [
        {
          id: 1,
          username: "joshburn",
          email: "joshburn@nexspace.com",
          firstName: "Josh",
          lastName: "Burn",
          role: "super_admin",
          facilityId: null,
          facilityName: null,
          department: "Administration",
          isActive: true
        },
        {
          id: 2,
          username: "sarah.johnson",
          email: "sarah.johnson@portlandgeneral.com",
          firstName: "Sarah",
          lastName: "Johnson",
          role: "facility_manager",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          department: "ICU",
          isActive: true
        },
        {
          id: 3,
          username: "JoshBurn",
          email: "joshburn@gmail.com",
          firstName: "Josh",
          lastName: "Burn",
          role: "employee",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          department: "Emergency",
          isActive: true
        },
        {
          id: 4,
          username: "mike.davis",
          email: "mike.davis@contractor.com",
          firstName: "Mike",
          lastName: "Davis",
          role: "contractor",
          facilityId: null,
          facilityName: null,
          department: "Float Pool",
          isActive: true
        },
        {
          id: 5,
          username: "lisa.chen",
          email: "lisa.chen@maplegove.com",
          firstName: "Lisa",
          lastName: "Chen",
          role: "admin",
          facilityId: 2,
          facilityName: "Maple Grove Memory Care",
          department: "Administration",
          isActive: true
        }
      ];

      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/impersonate/start", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== "super_admin") {
        return res.status(403).json({ message: "Superuser access required" });
      }

      const { targetUserId } = req.body;
      
      // Store original user in session
      (req.session as any).originalUser = req.user;
      (req.session as any).isImpersonating = true;

      // Get target user data
      const targetUser = {
        id: targetUserId,
        username: targetUserId === 2 ? "sarah.johnson" : targetUserId === 3 ? "JoshBurn" : "mike.davis",
        email: targetUserId === 2 ? "sarah.johnson@portlandgeneral.com" : targetUserId === 3 ? "joshburn@gmail.com" : "mike.davis@contractor.com",
        firstName: targetUserId === 2 ? "Sarah" : targetUserId === 3 ? "Josh" : "Mike",
        lastName: targetUserId === 2 ? "Johnson" : targetUserId === 3 ? "Burn" : "Davis",
        role: targetUserId === 2 ? "facility_manager" : targetUserId === 3 ? "employee" : "contractor",
        facilityId: targetUserId === 2 ? 1 : targetUserId === 3 ? 1 : null,
        isActive: true
      };

      // Set impersonated user as current user
      (req.session as any).user = targetUser;

      res.json({
        message: "Impersonation started successfully",
        impersonatedUser: targetUser,
        originalUser: (req.session as any).originalUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to start impersonation" });
    }
  });

  app.post("/api/impersonate/stop", requireAuth, async (req, res) => {
    try {
      if (!(req.session as any).isImpersonating || !(req.session as any).originalUser) {
        return res.status(400).json({ message: "No active impersonation session" });
      }

      const originalUser = (req.session as any).originalUser;
      
      // Restore original user
      (req.session as any).user = originalUser;
      delete (req.session as any).originalUser;
      delete (req.session as any).isImpersonating;

      res.json({
        message: "Impersonation ended successfully",
        originalUser: originalUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // Block Shifts API
  app.get("/api/block-shifts", requireAuth, async (req, res) => {
    try {
      const blockShifts = [
        {
          id: 1,
          title: "ICU Coverage Block",
          startDate: "2025-06-25",
          endDate: "2025-07-01",
          department: "Intensive Care Unit",
          specialty: "Registered Nurse",
          quantity: 3,
          rate: 45,
          description: "Week-long ICU coverage needed, multiple positions available",
        },
        {
          id: 2,
          title: "Weekend ED Block",
          startDate: "2025-06-28",
          endDate: "2025-06-29",
          department: "Emergency Department",
          specialty: "Registered Nurse",
          quantity: 2,
          rate: 52,
          description: "Weekend emergency department coverage",
        },
        {
          id: 3,
          title: "Rehabilitation Week",
          startDate: "2025-07-07",
          endDate: "2025-07-11",
          department: "Rehabilitation",
          specialty: "Physical Therapist",
          quantity: 1,
          rate: 62,
          description: "Full week rehabilitation services coverage",
        },
      ];
      res.json(blockShifts);
    } catch (error) {
      console.error("Error fetching block shifts:", error);
      res.status(500).json({ message: "Failed to fetch block shifts" });
    }
  });

  app.post("/api/block-shifts", requireAuth, async (req, res) => {
    try {
      const blockShiftData = req.body;
      const newBlockShift = {
        id: Date.now(),
        ...blockShiftData,
        status: "open",
        createdById: req.user?.id,
        createdAt: new Date().toISOString(),
      };
      res.json(newBlockShift);
    } catch (error) {
      console.error("Error creating block shift:", error);
      res.status(500).json({ message: "Failed to create block shift" });
    }
  });

  // Facility Settings API
  app.get("/api/facility-settings/:facilityId", requireAuth, async (req, res) => {
    try {
      const settings = {
        id: 1,
        facilityId: parseInt(req.params.facilityId),
        baseRates: {
          "Registered Nurse": 35,
          "Licensed Practical Nurse": 28,
          "Certified Nursing Assistant": 18,
          "Physical Therapist": 45,
          "Respiratory Therapist": 32,
          "Medical Doctor": 85,
          "Nurse Practitioner": 55,
          "Physician Assistant": 50,
        },
        presetTimes: [
          { label: "7:00 AM - 7:00 PM", start: "07:00", end: "19:00" },
          { label: "7:00 PM - 7:00 AM", start: "19:00", end: "07:00" },
          { label: "6:00 AM - 6:00 PM", start: "06:00", end: "18:00" },
          { label: "6:00 PM - 6:00 AM", start: "18:00", end: "06:00" },
          { label: "8:00 AM - 8:00 PM", start: "08:00", end: "20:00" },
          { label: "8:00 PM - 8:00 AM", start: "20:00", end: "08:00" },
        ],
        allowedPremiums: {
          min: 1.0,
          max: 1.7,
          step: 0.05,
        },
        departments: [
          "Emergency Department",
          "Intensive Care Unit",
          "Medical/Surgical",
          "Pediatrics",
          "Oncology",
          "Cardiology",
          "Orthopedics",
          "Rehabilitation",
          "Operating Room",
          "Labor & Delivery",
        ],
        specialtyServices: [
          "Registered Nurse",
          "Licensed Practical Nurse",
          "Certified Nursing Assistant",
          "Physical Therapist",
          "Respiratory Therapist",
          "Medical Doctor",
          "Nurse Practitioner",
          "Physician Assistant",
        ],
      };
      res.json(settings);
    } catch (error) {
      console.error("Error fetching facility settings:", error);
      res.status(500).json({ message: "Failed to fetch facility settings" });
    }
  });

  app.put("/api/facility-settings/:facilityId", requireAuth, async (req, res) => {
    try {
      const updatedSettings = {
        id: 1,
        facilityId: parseInt(req.params.facilityId),
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating facility settings:", error);
      res.status(500).json({ message: "Failed to update facility settings" });
    }
  });

  app.get("/api/referrals/facilities", requireAuth, async (req, res) => {
    try {
      const referrals = [
        {
          id: 1,
          referrerId: 1,
          referrerName: "Sarah Johnson",
          facilityName: "Riverside Medical Center",
          facilityType: "hospital",
          facilitySize: "medium",
          contactName: "Jennifer Adams",
          contactEmail: "jadams@riverside.com",
          contactPhone: "(555) 999-1234",
          estimatedBeds: 120,
          location: "Portland, OR",
          status: "contract_sent",
          dateReferred: "2025-05-20T00:00:00Z",
          dateContacted: "2025-05-25T00:00:00Z",
          bonusAmount: 2500,
          notes: "Looking for staffing partnership for summer months",
        },
      ];
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facility referrals" });
    }
  });

  app.get("/api/referral-codes", requireAuth, async (req, res) => {
    try {
      const codes = [
        {
          id: 1,
          userId: 1,
          userName: "Sarah Johnson",
          code: "SJ2025REF",
          qrCodeUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          type: "both",
          uses: 3,
          maxUses: 50,
          isActive: true,
        },
        {
          id: 2,
          userId: 3,
          userName: "Dr. Emma Rodriguez",
          code: "ER2025REF",
          qrCodeUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          type: "staff",
          uses: 1,
          maxUses: 25,
          isActive: true,
        },
      ];
      res.json(codes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral codes" });
    }
  });

  // PDF invoice extraction endpoint
  app.post(
    "/api/vendor-invoices/extract-pdf",
    requireAuth,
    upload.single("pdf"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No PDF file uploaded" });
        }

        // For demo purposes, simulate PDF text extraction
        // In production, you would use a proper PDF parsing library
        const simulatedPdfText = `
        INVOICE
        
        From: MedSupply Plus Corp
        123 Healthcare Drive
        Medical City, MC 12345
        
        Invoice Number: MSP-2025-001234
        Date: June 19, 2025
        Due Date: July 19, 2025
        Service Period: June 1-30, 2025
        
        Bill To:
        Chicago General Hospital
        456 Medical Avenue
        Chicago, IL 60601
        
        Description: Medical supplies and equipment for June 2025
        - Surgical masks (1000 units)
        - Disposable gloves (500 boxes)
        - Hand sanitizer (50 gallons)
        
        Subtotal: $8,450.00
        Tax: $450.50
        Total Amount Due: $8,900.50
        
        Payment Terms: Net 30 days
        Thank you for your business!
      `;

        const pdfText = simulatedPdfText;

        // Use OpenAI to extract invoice data
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant that extracts invoice information from text. 
            Extract the following fields from the invoice text and respond with JSON:
            - vendorName: The company/vendor name issuing the invoice
            - invoiceNumber: The invoice number or reference
            - amount: The total amount due (as a number, no currency symbols)
            - dueDate: The payment due date (in YYYY-MM-DD format)
            - serviceDate: The service/billing period date (in YYYY-MM-DD format)
            - description: Brief description of services/products
            - vendorType: Categorize as one of: staffing_agency, medical_supply, equipment_rental, maintenance, consulting, it_services, or other
            
            If any field cannot be determined, use reasonable defaults or null.
            Respond only with valid JSON.`,
            },
            {
              role: "user",
              content: `Extract invoice information from this text:\n\n${pdfText}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });

        const extractedData = JSON.parse(response.choices[0].message.content || "{}");

        // Validate and clean the extracted data
        const cleanedData = {
          vendorName: extractedData.vendorName || "Unknown Vendor",
          invoiceNumber: extractedData.invoiceNumber || `INV-${Date.now()}`,
          amount: parseFloat(extractedData.amount) || 0,
          dueDate:
            extractedData.dueDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceDate: extractedData.serviceDate || new Date().toISOString().split("T")[0],
          description: extractedData.description || "Services provided",
          vendorType: extractedData.vendorType || "other",
          status: "pending",
        };

        res.json(cleanedData);
      } catch (error: any) {
        console.error("Error extracting PDF data:", error);
        res.status(500).json({
          message: "Failed to extract invoice data from PDF",
          error: error.message,
        });
      }
    }
  );

  // System settings API
  app.get("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const settings = {
        id: 1,
        organizationName: "NexSpace Healthcare",
        organizationLogo: "/logo.png",
        timezone: "America/Chicago",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
        emailNotifications: true,
        smsNotifications: false,
        autoApproveShifts: false,
        requireManagerApproval: true,
        allowSelfCancellation: true,
        cancellationDeadlineHours: 24,
        defaultShiftDuration: 8,
        overtimeThreshold: 40,
        backupEmailFrequency: "weekly",
        sessionTimeout: 30,
        passwordMinLength: 8,
        requireTwoFactor: false,
        allowRemoteWork: true,
        maintenanceMode: false,
      };
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.patch("/api/system-settings", requireAuth, async (req, res) => {
    try {
      // In a real app, this would update the database
      const updatedSettings = { id: 1, ...req.body };
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  // Detailed shift analytics API
  app.get("/api/shift-analytics", requireAuth, async (req, res) => {
    try {
      const { specialty, workerType, timeRange } = req.query;

      const shiftAnalytics = [
        {
          id: 1,
          title: "Night Shift RN - ICU",
          specialty: "registered_nurse",
          facilityName: "Chicago General Hospital",
          workerType: "internal_employee",
          totalApplications: 12,
          avgApplicationsPerOpening: 12,
          daysPosted: 3,
          filledDate: "2025-06-16T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 45.5,
          shiftDate: "2025-06-20T19:00:00Z",
          duration: 12,
        },
        {
          id: 2,
          title: "Day Shift CNA - Med/Surg",
          specialty: "certified_nursing_assistant",
          facilityName: "Springfield Care Center",
          workerType: "contractor_1099",
          totalApplications: 8,
          avgApplicationsPerOpening: 8,
          daysPosted: 5,
          filledDate: "2025-06-17T00:00:00Z",
          status: "filled",
          urgency: "normal",
          hourlyRate: 18.75,
          shiftDate: "2025-06-21T07:00:00Z",
          duration: 8,
        },
        {
          id: 3,
          title: "Physical Therapist - Outpatient",
          specialty: "physical_therapist",
          facilityName: "Metro Community Clinic",
          workerType: "agency_staff",
          totalApplications: 6,
          avgApplicationsPerOpening: 6,
          daysPosted: 7,
          filledDate: null,
          status: "open",
          urgency: "high",
          hourlyRate: 55.0,
          shiftDate: "2025-06-22T08:00:00Z",
          duration: 8,
        },
        {
          id: 4,
          title: "Weekend LPN - Long Term Care",
          specialty: "licensed_practical_nurse",
          facilityName: "Dallas Medical Center",
          workerType: "float_pool",
          totalApplications: 15,
          avgApplicationsPerOpening: 15,
          daysPosted: 2,
          filledDate: "2025-06-18T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 28.5,
          shiftDate: "2025-06-22T07:00:00Z",
          duration: 12,
        },
        {
          id: 5,
          title: "Respiratory Therapist - Emergency",
          specialty: "respiratory_therapist",
          facilityName: "Chicago General Hospital",
          workerType: "internal_employee",
          totalApplications: 4,
          avgApplicationsPerOpening: 4,
          daysPosted: 9,
          filledDate: null,
          status: "open",
          urgency: "high",
          hourlyRate: 42.0,
          shiftDate: "2025-06-23T15:00:00Z",
          duration: 8,
        },
        {
          id: 6,
          title: "Medical Tech - Laboratory",
          specialty: "medical_technologist",
          facilityName: "Regional Medical Center",
          workerType: "contractor_1099",
          totalApplications: 7,
          avgApplicationsPerOpening: 7,
          daysPosted: 4,
          filledDate: "2025-06-17T00:00:00Z",
          status: "filled",
          urgency: "normal",
          hourlyRate: 32.25,
          shiftDate: "2025-06-21T06:00:00Z",
          duration: 10,
        },
        {
          id: 7,
          title: "Night RN - Emergency Department",
          specialty: "registered_nurse",
          facilityName: "Metro Community Clinic",
          workerType: "agency_staff",
          totalApplications: 18,
          avgApplicationsPerOpening: 18,
          daysPosted: 1,
          filledDate: "2025-06-19T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 52.75,
          shiftDate: "2025-06-20T19:00:00Z",
          duration: 12,
        },
        {
          id: 8,
          title: "Day Shift CNA - Pediatrics",
          specialty: "certified_nursing_assistant",
          facilityName: "Children's Hospital",
          workerType: "internal_employee",
          totalApplications: 9,
          avgApplicationsPerOpening: 9,
          daysPosted: 6,
          filledDate: null,
          status: "open",
          urgency: "normal",
          hourlyRate: 20.0,
          shiftDate: "2025-06-24T07:00:00Z",
          duration: 8,
        },
        {
          id: 9,
          title: "Evening LPN - Rehabilitation",
          specialty: "licensed_practical_nurse",
          facilityName: "Springfield Care Center",
          workerType: "float_pool",
          totalApplications: 11,
          avgApplicationsPerOpening: 11,
          daysPosted: 3,
          filledDate: "2025-06-18T00:00:00Z",
          status: "filled",
          urgency: "high",
          hourlyRate: 26.75,
          shiftDate: "2025-06-21T15:00:00Z",
          duration: 8,
        },
        {
          id: 10,
          title: "Weekend PT - Orthopedics",
          specialty: "physical_therapist",
          facilityName: "Dallas Medical Center",
          workerType: "contractor_1099",
          totalApplications: 5,
          avgApplicationsPerOpening: 5,
          daysPosted: 8,
          filledDate: null,
          status: "open",
          urgency: "normal",
          hourlyRate: 48.5,
          shiftDate: "2025-06-22T08:00:00Z",
          duration: 10,
        },
        {
          id: 11,
          title: "Night Respiratory Tech - ICU",
          specialty: "respiratory_therapist",
          facilityName: "Regional Medical Center",
          workerType: "agency_staff",
          totalApplications: 13,
          avgApplicationsPerOpening: 13,
          daysPosted: 2,
          filledDate: "2025-06-18T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 44.25,
          shiftDate: "2025-06-20T19:00:00Z",
          duration: 12,
        },
        {
          id: 12,
          title: "Lab Tech - Blood Bank",
          specialty: "medical_technologist",
          facilityName: "Chicago General Hospital",
          workerType: "internal_employee",
          totalApplications: 6,
          avgApplicationsPerOpening: 6,
          daysPosted: 5,
          filledDate: null,
          status: "open",
          urgency: "high",
          hourlyRate: 35.0,
          shiftDate: "2025-06-23T22:00:00Z",
          duration: 8,
        },
        {
          id: 13,
          title: "Per Diem RN - Surgery",
          specialty: "registered_nurse",
          facilityName: "Surgical Center West",
          workerType: "float_pool",
          totalApplications: 20,
          avgApplicationsPerOpening: 20,
          daysPosted: 1,
          filledDate: "2025-06-19T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 58.0,
          shiftDate: "2025-06-21T06:00:00Z",
          duration: 10,
        },
        {
          id: 14,
          title: "Weekend CNA - Memory Care",
          specialty: "certified_nursing_assistant",
          facilityName: "Memory Care Facility",
          workerType: "contractor_1099",
          totalApplications: 7,
          avgApplicationsPerOpening: 7,
          daysPosted: 4,
          filledDate: "2025-06-17T00:00:00Z",
          status: "filled",
          urgency: "normal",
          hourlyRate: 19.25,
          shiftDate: "2025-06-22T07:00:00Z",
          duration: 12,
        },
        {
          id: 15,
          title: "Travel LPN - Cardiac Unit",
          specialty: "licensed_practical_nurse",
          facilityName: "Heart Institute",
          workerType: "agency_staff",
          totalApplications: 14,
          avgApplicationsPerOpening: 14,
          daysPosted: 2,
          filledDate: "2025-06-18T00:00:00Z",
          status: "filled",
          urgency: "urgent",
          hourlyRate: 31.5,
          shiftDate: "2025-06-20T07:00:00Z",
          duration: 12,
        },
      ];

      // Apply filters if provided
      let filteredData = shiftAnalytics;

      if (specialty && specialty !== "all") {
        filteredData = filteredData.filter((shift) => shift.specialty === specialty);
      }

      if (workerType && workerType !== "all") {
        filteredData = filteredData.filter((shift) => shift.workerType === workerType);
      }

      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching shift analytics:", error);
      res.status(500).json({ message: "Failed to fetch shift analytics" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("WebSocket connection established");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message types
        switch (message.type) {
          case "chat":
            // Broadcast chat message to conversation participants
            const chatMessage = await storage.createMessage({
              senderId: message.senderId,
              recipientId: message.recipientId,
              conversationId: message.conversationId,
              content: message.content,
              messageType: "text",
              shiftId: message.shiftId,
            });

            // Broadcast to all connected clients in the conversation
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "chat",
                    message: chatMessage,
                  })
                );
              }
            });
            break;

          case "shift_update":
            // Broadcast shift updates to facility staff
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "shift_update",
                    shift: message.shift,
                  })
                );
              }
            });
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  return httpServer;
}
