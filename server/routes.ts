import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";

// Remove in-memory storage - using database as single source of truth
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
  users,
  messages,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { recommendationEngine } from "./recommendation-engine";
import type { RecommendationCriteria } from "./recommendation-engine";
import { UnifiedDataService } from "./unified-data-service";
import multer from "multer";
import OpenAI from "openai";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);
  
  // Initialize unified data service
  let unifiedDataService: UnifiedDataService;

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
      // Get template-generated shifts if they exist
      const templateShifts = (global as any).templateGeneratedShifts || [];
      
      const exampleShifts = [
        {
          id: 1,
          title: "ICU Day Shift",
          date: "2025-06-19",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
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
          specialty: "RN",
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
          assignedStaffSpecialty: "RN",
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
          assignedStaffId: 31,
          assignedStaffName: "Amanda Rodriguez",
          assignedStaffEmail: "amanda.rodriguez@legacy.org",
          assignedStaffPhone: "(503) 555-0789",
          assignedStaffSpecialty: "Respiratory Therapist",
          assignedStaffRating: 4.6,
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

      // Combine example shifts with template-generated shifts
      const allShifts = [...exampleShifts, ...templateShifts];
      
      res.json(allShifts);
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

  // Worker-specific open shifts API
  app.get("/api/shifts/worker-open", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Get user's specialty and facility associations
      const userStaff = await unifiedDataService.getStaffWithAssociations();
      const currentUserStaff = userStaff.find(s => s.email === user.email);
      const userSpecialty = currentUserStaff?.specialty || 'RN';
      const userFacilities = currentUserStaff?.associatedFacilities || [1];
      
      // Get template-generated shifts if they exist
      const templateShifts = (global as any).templateGeneratedShifts || [];
      
      const workerShifts = [
        {
          id: 1,
          title: "ICU Day Shift",
          date: "2025-06-19",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 42.5,
          urgency: "high",
          description: "12-hour ICU nursing shift, ACLS certification required",
        },
        {
          id: 6,
          title: "Emergency Night Shift",
          date: "2025-06-20",
          startTime: "19:00",
          endTime: "07:00",
          department: "Emergency",
          specialty: "RN",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 45.0,
          urgency: "critical",
          description: "Overnight emergency department coverage",
        },
        {
          id: 10,
          title: "Physical Therapy",
          date: "2025-06-21",
          startTime: "08:00",
          endTime: "16:00",
          department: "Rehabilitation",
          specialty: "Physical Therapist",
          status: "open",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 38.75,
          urgency: "medium",
          description: "Outpatient physical therapy clinic",
        },
        {
          id: 12,
          title: "Surgical Support",
          date: "2025-06-22",
          startTime: "06:00",
          endTime: "14:00",
          department: "Operating Room",
          specialty: "Surgical Technologist",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 28.5,
          urgency: "high",
          description: "OR support for scheduled surgeries",
        },
        {
          id: 13,
          title: "Respiratory Care",
          date: "2025-06-23",
          startTime: "15:00",
          endTime: "23:00",
          department: "Pulmonary",
          specialty: "Respiratory Therapist",
          status: "open",
          facilityId: 2,
          facilityName: "OHSU Hospital",
          rate: 35.0,
          urgency: "medium",
          description: "Evening respiratory therapy coverage",
        }
      ];

      // Combine worker shifts with template-generated shifts
      const allWorkerShifts = [...workerShifts, ...templateShifts];
      
      // Filter shifts for workers based on multiple criteria
      let filteredShifts = allWorkerShifts.filter(shift => {
        // Only show open shifts that are not assigned and not requested
        if (shift.status !== "open") return false;
        
        // Do not allow past shifts to be requested or posted
        const shiftDate = new Date(shift.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (shiftDate < today) return false;
        
        // Filter by worker specialty - match the user's specialty
        if (userSpecialty && shift.specialty !== userSpecialty) return false;
        
        // Filter by facility associations - only show shifts at facilities worker is associated with
        if (userFacilities.length > 0 && !userFacilities.includes(shift.facilityId)) return false;
        
        return true;
      });
      
      res.json(filteredShifts);
    } catch (error) {
      console.error("Error fetching worker open shifts:", error);
      res.status(500).json({ message: "Failed to fetch open shifts" });
    }
  });

  // Worker's assigned shifts API
  app.get("/api/shifts/my-shifts", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get shifts assigned to this worker - sync with Enhanced Schedule data
      const myShifts = user.id === 3 ? [ // Alice Smith's shifts
        {
          id: 102,
          title: "Emergency Night Shift", 
          date: "2025-06-25",
          startTime: "19:00",
          endTime: "07:00",
          department: "Emergency",
          specialty: "RN",
          status: "requested", // This shows in My Schedule but should also show in My Requests
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 45.0,
          urgency: "critical",
          description: "Overnight emergency department coverage",
          assignedStaffId: user.id,
        }
      ] : [
        {
          id: 101,
          title: "ICU Day Shift",
          date: "2025-06-23",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
          status: "confirmed",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 42.5,
          urgency: "high",
          description: "12-hour ICU nursing shift, ACLS certification required",
          assignedStaffId: user.id,
        }
      ];
      
      // Filter by user's specialty if available
      const filteredShifts = user.specialty 
        ? myShifts.filter(shift => shift.specialty === user.specialty)
        : myShifts;
      
      res.json(filteredShifts);
    } catch (error) {
      console.error("Error fetching my shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
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
          status: 'filled' as const,
          assignedStaffIds: [userId],
          updatedAt: new Date().toISOString()
        };

        // Log assignment history
        const assignmentHistory = {
          id: Date.now() + 2,
          shiftId,
          userId,
          action: 'filled',
          timestamp: new Date().toISOString(),
          performedById: userId,
          previousStatus: 'requested',
          newStatus: 'filled',
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
        status: 'filled' as const,
        assignedStaffIds: [userId],
        updatedAt: new Date().toISOString()
      };

      // Create history entry
      const historyEntry = {
        id: Date.now(),
        shiftId,
        userId,
        action: 'filled',
        timestamp: new Date().toISOString(),
        performedById: req.user.id,
        previousStatus: shift.status,
        newStatus: 'filled'
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
      // Get staff data from unified service (single source of truth)
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();
      
      // Map database staff to frontend format with extended profile information
      const staffData = dbStaffData.map((staff, index) => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role === "internal_employee" ? "employee" : staff.role,
        specialty: staff.specialty,
        associatedFacilities: staff.associatedFacilities || [],
        avatar: staff.avatar,
        // Extended profile data
        phone: index === 0 ? "(555) 123-4567" : index === 1 ? "(555) 234-5678" : "(555) 345-6789",
        department: staff.specialty === "RN" ? "ICU" : staff.specialty === "LPN" ? "Medical/Surgical" : "Emergency",
        compliant: true,
        activeCredentials: 8,
        expiringCredentials: 0,
        profileImage: staff.avatar,
        bio: `Experienced ${staff.specialty} with expertise in patient care.`,
        location: "Portland, OR",
        hourlyRate: staff.specialty === "RN" ? 48 : 42,
        experience: "8 years",
        skills: ["Patient Care", "Medical Procedures", "Documentation"],
        certifications: staff.specialty === "RN" ? ["RN", "ACLS", "BLS"] : ["LPN", "BLS"],
        resumeUrl: "",
        coverLetterUrl: "",
        linkedIn: "",
        linkedinUrl: "",
        portfolio: "",
        portfolioUrl: "",
        yearsExperience: 8,
        rating: 4.8,
        totalShifts: 156,
        workerType: staff.role === "internal_employee" ? "internal_employee" : "contractor_1099",
        status: "active",
        availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        emergencyContact: {
          name: "Emergency Contact",
          phone: "(555) 999-0000",
          relationship: "Spouse"
        },
        workHistory: [{
          facility: "Healthcare Facility",
          position: staff.specialty + " Nurse",
          startDate: "2020-01-01",
          description: "Providing quality patient care"
        }],
        education: [{
          institution: "Nursing School",
          degree: "Bachelor of Science in Nursing",
          graduationYear: 2019,
          gpa: 3.8
        }],
        documents: [{
          type: "License",
          name: staff.specialty + " License",
          uploadDate: "2024-01-01",
          expirationDate: "2026-01-01",
          verified: true
        }],
        socialStats: {
          profileViews: 200,
          shiftsCompleted: 150,
          ratings: 80,
          endorsements: 20
        }
      }));

      // Filter out superusers from staff list for regular views
      const filteredStaffData = dbStaffData.filter(staff => {
        // Exclude superusers (Josh Burnett, Brian Nangle, etc.) from regular staff views
        const superuserEmails = ['joshburn@nexspace.com', 'brian.nangle@nexspace.com'];
        return !superuserEmails.includes(staff.email);
      });

      // For impersonation/admin views, show all users including superusers
      const showAllUsers = req.query.includeAdmins === 'true' || req.user?.role === 'super_admin';
      
      res.json(showAllUsers ? dbStaffData : filteredStaffData);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff data" });
    }
  });

  // Individual staff profile route
  app.get("/api/staff/:id", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();
      const staff = dbStaffData.find(s => s.id === staffId);
      
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const profileData = {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role,
        specialty: staff.specialty,
        associatedFacilities: staff.associatedFacilities || [],
        avatar: staff.avatar,
        phone: "(555) 123-4567",
        department: staff.specialty === "RN" ? "ICU" : "Medical/Surgical",
        compliant: true,
        activeCredentials: 8,
        expiringCredentials: 0,
        profileImage: staff.avatar,
        bio: `Experienced ${staff.specialty} with expertise in patient care.`,
        location: "Portland, OR",
        hourlyRate: staff.specialty === "RN" ? 48 : 42,
        experience: "8 years",
        skills: ["Patient Care", "Medical Procedures", "Documentation"],
        certifications: staff.specialty === "RN" ? ["RN", "ACLS", "BLS"] : ["LPN", "BLS"],
        resumeUrl: "",
        coverLetterUrl: "",
        linkedIn: "",
        linkedinUrl: "",
        portfolio: "",
        portfolioUrl: "",
        yearsExperience: 8,
        rating: 4.8,
        totalShifts: 156,
        workerType: staff.role === "internal_employee" ? "internal_employee" : "contractor_1099",
        status: "active",
        availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        emergencyContact: {
          name: "Emergency Contact",
          phone: "(555) 999-0000",
          relationship: "Spouse"
        },
        workHistory: [{
          facility: "Healthcare Facility",
          position: staff.specialty + " Nurse",
          startDate: "2020-01-01",
          description: "Providing quality patient care"
        }],
        education: [{
          institution: "Nursing School",
          degree: "Bachelor of Science in Nursing",
          graduationYear: 2019,
          gpa: 3.8
        }],
        documents: [{
          type: "License",
          name: staff.specialty + " License",
          uploadDate: "2024-01-01",
          expirationDate: "2026-01-01",
          verified: true
        }],
        socialStats: {
          profileViews: 200,
          shiftsCompleted: 150,
          ratings: 80,
          endorsements: 20
        }
      };

      res.json(profileData);
    } catch (error) {
      console.error("Error fetching staff profile:", error);
      res.status(500).json({ message: "Failed to fetch staff profile" });
    }
  });

  // Staff messaging route
  app.post("/api/staff/:id/message", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Create message using unified service
      const messageData = {
        senderId: (req as any).user.id,
        recipientId: staffId,
        conversationId: `user_${(req as any).user.id}_staff_${staffId}`,
        content,
        messageType: "text",
        isRead: false
      };

      const message = await unifiedDataService.createMessage(messageData);
      
      res.json({ 
        message: "Message sent successfully",
        data: message
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Legacy staff data endpoint (for compatibility)
  app.get("/api/legacy-staff", requireAuth, async (req, res) => {
    try {
      const legacyStaffData = [
        {
          id: 1,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@nexspace.com",
          role: "employee",
          phone: "(555) 123-4567",
          department: "ICU",
          specialty: "RN",
          compliant: true,
          activeCredentials: 8,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          bio: "Experienced ICU nurse with expertise in critical care and patient management.",
          location: "Portland, OR",
          hourlyRate: 48,
          experience: "8 years",
          skills: ["Critical Care", "Patient Assessment", "IV Therapy"],
          certifications: ["RN", "ACLS", "BLS", "CCRN"],
          associatedFacilities: [], // Will be populated from database
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 8,
          rating: 4.9,
          totalShifts: 156,
          workerType: "internal_employee",
          status: "active",
          availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          emergencyContact: {
            name: "John Johnson",
            phone: "(555) 123-9999",
            relationship: "Spouse"
          },
          workHistory: [{
            facility: "Portland General Hospital",
            position: "ICU Nurse",
            startDate: "2017-01-15",
            description: "Providing critical care nursing in intensive care unit"
          }],
          education: [{
            institution: "Oregon Health & Science University",
            degree: "Bachelor of Science in Nursing",
            graduationYear: 2016,
            gpa: 3.8
          }],
          documents: [{
            type: "License",
            name: "RN License",
            uploadDate: "2024-01-15",
            expirationDate: "2026-01-15",
            verified: true
          }],
          socialStats: {
            profileViews: 245,
            shiftsCompleted: 156,
            ratings: 89,
            endorsements: 23
          }
        },
        {
          id: 2,
          firstName: "Michael",
          lastName: "Chen",
          email: "michael.chen@nexspace.com",
          role: "contractor",
          phone: "(555) 234-5678",
          department: "Emergency",
          specialty: "RN",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          bio: "Emergency medicine specialist with extensive trauma experience.",
          location: "Seattle, WA",
          hourlyRate: 55,
          experience: "12 years",
          skills: ["Emergency Response", "Trauma Care", "Advanced Life Support"],
          certifications: ["RN", "CEN", "ACLS", "PALS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 12,
          rating: 4.8,
          totalShifts: 89,
          workerType: "contractor_1099",
          status: "active",
          availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          emergencyContact: {
            name: "Lisa Chen",
            phone: "(555) 234-9999",
            relationship: "Wife"
          },
          workHistory: [{
            facility: "Seattle Emergency Center",
            position: "Emergency Nurse",
            startDate: "2012-03-01",
            description: "Emergency medicine and trauma care specialist"
          }],
          education: [{
            institution: "University of Washington",
            degree: "Bachelor of Science in Nursing",
            graduationYear: 2011,
            gpa: 3.9
          }],
          documents: [{
            type: "License",
            name: "RN License",
            uploadDate: "2024-02-01",
            expirationDate: "2026-02-01",
            verified: true
          }],
          socialStats: {
            profileViews: 189,
            shiftsCompleted: 89,
            ratings: 67,
            endorsements: 18
          },
          associatedFacilities: [] // Will be populated from database
        },
        {
          id: 3,
          firstName: "Alice",
          lastName: "Smith",
          email: "alice@nexspace.com",
          role: "employee",
          phone: "(555) 345-6789",
          department: "Medical/Surgical",
          specialty: "LPN",
          compliant: true,
          activeCredentials: 5,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
          profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
          bio: "Dedicated medical-surgical nurse committed to providing excellent patient care.",
          location: "Portland, OR",
          hourlyRate: 42,
          experience: "5 years",
          skills: ["Patient Care", "Medication Administration", "Wound Care"],
          certifications: ["RN", "BLS", "CMSRN"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 5,
          rating: 4.7,
          totalShifts: 98,
          workerType: "internal_employee",
          status: "active",
          availability: ["Mon", "Wed", "Fri"],
          emergencyContact: {
            name: "Bob Smith",
            phone: "(555) 345-9999",
            relationship: "Husband"
          },
          workHistory: [{
            facility: "Portland Medical Center",
            position: "Med/Surg Nurse",
            startDate: "2019-06-01",
            description: "Medical surgical nursing and patient care"
          }],
          education: [{
            institution: "Portland State University",
            degree: "Bachelor of Science in Nursing",
            graduationYear: 2019,
            gpa: 3.7
          }],
          documents: [{
            type: "License",
            name: "RN License",
            uploadDate: "2024-03-01",
            expirationDate: "2026-03-01",
            verified: true
          }],
          socialStats: {
            profileViews: 156,
            shiftsCompleted: 98,
            ratings: 45,
            endorsements: 12
          }
        },
        {
          id: 42,
          firstName: "Jennifer",
          lastName: "Kim",
          email: "jennifer.kim@hospital.com",
          role: "employee",
          phone: "(503) 555-0987",
          department: "Operating Room",
          specialty: "CST",
          compliant: true,
          activeCredentials: 7,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          bio: "Skilled surgical technologist with expertise in operating room procedures and sterile technique.",
          location: "Portland, OR",
          hourlyRate: 28.5,
          experience: "6 years",
          skills: ["Sterile Technique", "Surgical Instruments", "OR Procedures"],
          certifications: ["CST", "BLS", "ACLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 6,
          rating: 4.7,
          totalShifts: 143,
          workerType: "internal_employee",
          status: "active",
          availability: ["Tue", "Wed", "Thu", "Fri"],
          emergencyContact: {
            name: "David Kim",
            phone: "(503) 555-9999",
            relationship: "Brother"
          },
          workHistory: [{
            facility: "Portland General Hospital",
            position: "Surgical Technologist",
            startDate: "2018-09-15",
            description: "Operating room procedures and sterile technique specialist"
          }],
          education: [{
            institution: "Portland Community College",
            degree: "Associate Degree in Surgical Technology",
            graduationYear: 2018,
            gpa: 3.9
          }],
          documents: [{
            type: "Certification",
            name: "CST Certification",
            uploadDate: "2024-04-01",
            expirationDate: "2026-04-01",
            verified: true
          }],
          socialStats: {
            profileViews: 87,
            shiftsCompleted: 143,
            ratings: 52,
            endorsements: 8
          }
        },
        {
          id: 5,
          firstName: "David",
          lastName: "Rodriguez",
          email: "david.rodriguez@nexspace.com",
          role: "contractor",
          phone: "(555) 456-7890",
          department: "Rehabilitation",
          specialty: "PT",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          bio: "Licensed physical therapist specializing in orthopedic rehabilitation.",
          location: "Portland, OR",
          hourlyRate: 38.0,
          experience: "8 years",
          skills: ["Orthopedic Rehab", "Manual Therapy", "Sports Medicine"],
          certifications: ["DPT", "OCS", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 8,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.6,
          totalShifts: 145,
          onTimePercentage: 96,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T18:00:00Z",
          joinedDate: "2023-03-15",
          profileCompletion: 95,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Physical Therapy License",
            number: "PT-2024-789",
            issuer: "Oregon Board of Physical Therapy",
            issuedDate: "2024-01-01",
            expirationDate: "2026-01-01",
            uploadDate: "2024-01-05",
            verified: true
          }],
          socialStats: {
            profileViews: 167,
            shiftsCompleted: 145,
            ratings: 89,
            endorsements: 23
          }
        },
        {
          id: 6,
          firstName: "Lisa",
          lastName: "Thompson",
          email: "lisa.thompson@nexspace.com",
          role: "employee",
          phone: "(555) 567-8901",
          department: "Respiratory",
          specialty: "RT",
          compliant: true,
          activeCredentials: 7,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          bio: "Respiratory therapist with expertise in critical care ventilation.",
          location: "Seattle, WA",
          hourlyRate: 34.5,
          experience: "7 years",
          skills: ["Mechanical Ventilation", "ECMO", "Pulmonary Function"],
          certifications: ["RRT", "ACLS", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 7,
          preferredShifts: ["Night", "Weekend"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 198,
          onTimePercentage: 98,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T20:00:00Z",
          joinedDate: "2022-08-20",
          profileCompletion: 100,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Registered Respiratory Therapist",
            number: "RRT-2022-456",
            issuer: "NBRC",
            issuedDate: "2022-06-01",
            expirationDate: "2025-06-01",
            uploadDate: "2022-08-01",
            verified: true
          }],
          socialStats: {
            profileViews: 203,
            shiftsCompleted: 198,
            ratings: 156,
            endorsements: 34
          }
        },
        {
          id: 7,
          firstName: "Mark",
          lastName: "Wilson",
          email: "mark.wilson@nexspace.com",
          role: "contractor",
          phone: "(555) 678-9012",
          department: "Laboratory",
          specialty: "MLT",
          compliant: true,
          activeCredentials: 5,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          bio: "Medical laboratory technician with clinical chemistry expertise.",
          location: "Portland, OR",
          hourlyRate: 29.0,
          experience: "5 years",
          skills: ["Clinical Chemistry", "Hematology", "Microbiology"],
          certifications: ["MLT", "ASCP", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 5,
          preferredShifts: ["Day", "Evening"],
          availability: "Part-time",
          rating: 4.4,
          totalShifts: 87,
          onTimePercentage: 94,
          workerType: "contractor_1099",
          isAvailable: false,
          lastActive: "2025-06-19T16:00:00Z",
          joinedDate: "2023-11-10",
          profileCompletion: 88,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Medical Laboratory Technician",
            number: "MLT-2023-789",
            issuer: "ASCP",
            issuedDate: "2023-10-01",
            expirationDate: "2026-10-01",
            uploadDate: "2023-11-01",
            verified: true
          }],
          socialStats: {
            profileViews: 98,
            shiftsCompleted: 87,
            ratings: 67,
            endorsements: 12
          }
        },
        {
          id: 8,
          firstName: "Anna",
          lastName: "Garcia",
          email: "anna.garcia@nexspace.com",
          role: "employee",
          phone: "(555) 789-0123",
          department: "Pharmacy",
          specialty: "PhT",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          bio: "Certified pharmacy technician with sterile compounding experience.",
          location: "Seattle, WA",
          hourlyRate: 26.5,
          experience: "4 years",
          skills: ["Sterile Compounding", "IV Preparation", "Medication Safety"],
          certifications: ["CPhT", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 4,
          preferredShifts: ["Day"],
          availability: "Full-time",
          rating: 4.5,
          totalShifts: 112,
          onTimePercentage: 97,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T17:30:00Z",
          joinedDate: "2024-01-15",
          profileCompletion: 92,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Pharmacy Technician",
            number: "CPhT-2024-123",
            issuer: "PTCB",
            issuedDate: "2024-01-01",
            expirationDate: "2026-01-01",
            uploadDate: "2024-01-10",
            verified: true
          }],
          socialStats: {
            profileViews: 134,
            shiftsCompleted: 112,
            ratings: 89,
            endorsements: 18
          }
        },
        {
          id: 9,
          firstName: "James",
          lastName: "Brown",
          email: "james.brown@nexspace.com",
          role: "contractor",
          phone: "(555) 890-1234",
          department: "Radiology",
          specialty: "RT",
          compliant: true,
          activeCredentials: 8,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          bio: "Radiologic technologist specializing in CT and MRI imaging.",
          location: "Portland, OR",
          hourlyRate: 31.0,
          experience: "9 years",
          skills: ["CT Imaging", "MRI", "X-Ray", "Patient Care"],
          certifications: ["RT(R)", "CT", "MRI", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 9,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.7,
          totalShifts: 167,
          onTimePercentage: 95,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T19:00:00Z",
          joinedDate: "2022-05-10",
          profileCompletion: 97,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Radiologic Technologist",
            number: "RT-2022-567",
            issuer: "ARRT",
            issuedDate: "2022-03-01",
            expirationDate: "2025-03-01",
            uploadDate: "2022-05-01",
            verified: true
          }],
          socialStats: {
            profileViews: 189,
            shiftsCompleted: 167,
            ratings: 134,
            endorsements: 28
          }
        },
        {
          id: 10,
          firstName: "Emma",
          lastName: "Davis",
          email: "emma.davis@nexspace.com",
          role: "employee",
          phone: "(555) 901-2345",
          department: "Occupational Therapy",
          specialty: "OT",
          compliant: true,
          activeCredentials: 7,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          bio: "Occupational therapist with pediatric and geriatric expertise.",
          location: "Seattle, WA",
          hourlyRate: 36.0,
          experience: "6 years",
          skills: ["Pediatric Therapy", "Geriatric Care", "ADL Training"],
          certifications: ["OTR/L", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 6,
          preferredShifts: ["Day"],
          availability: "Full-time",
          rating: 4.9,
          totalShifts: 142,
          onTimePercentage: 99,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T18:30:00Z",
          joinedDate: "2023-02-20",
          profileCompletion: 100,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Occupational Therapist License",
            number: "OT-2023-345",
            issuer: "Oregon Board of Occupational Therapy",
            issuedDate: "2023-01-01",
            expirationDate: "2025-01-01",
            uploadDate: "2023-02-01",
            verified: true
          }],
          socialStats: {
            profileViews: 221,
            shiftsCompleted: 142,
            ratings: 128,
            endorsements: 41
          }
        },
        {
          id: 11,
          firstName: "Robert",
          lastName: "Lee",
          email: "robert.lee@nexspace.com",
          role: "contractor",
          phone: "(555) 012-3456",
          department: "ICU",
          specialty: "CNA",
          compliant: true,
          activeCredentials: 4,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          profileImage: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          bio: "Certified nursing assistant with ICU and critical care experience.",
          location: "Portland, OR",
          hourlyRate: 22.0,
          experience: "3 years",
          skills: ["Patient Care", "Vital Signs", "ICU Support"],
          certifications: ["CNA", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 3,
          preferredShifts: ["Night", "Weekend"],
          availability: "Full-time",
          rating: 4.3,
          totalShifts: 89,
          onTimePercentage: 92,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T21:00:00Z",
          joinedDate: "2023-09-01",
          profileCompletion: 85,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Nursing Assistant",
            number: "CNA-2023-456",
            issuer: "Oregon State Board of Nursing",
            issuedDate: "2023-08-01",
            expirationDate: "2025-08-01",
            uploadDate: "2023-09-01",
            verified: true
          }],
          socialStats: {
            profileViews: 76,
            shiftsCompleted: 89,
            ratings: 71,
            endorsements: 9
          }
        },
        {
          id: 12,
          firstName: "Sofia",
          lastName: "Martinez",
          email: "sofia.martinez@nexspace.com",
          role: "employee",
          phone: "(555) 123-4567",
          department: "Emergency",
          specialty: "LPN",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          bio: "Licensed practical nurse with emergency department expertise.",
          location: "Seattle, WA",
          hourlyRate: 28.5,
          experience: "5 years",
          skills: ["Emergency Care", "Triage", "IV Therapy"],
          certifications: ["LPN", "ACLS", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 5,
          preferredShifts: ["Evening", "Night"],
          availability: "Full-time",
          rating: 4.6,
          totalShifts: 156,
          onTimePercentage: 96,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T22:00:00Z",
          joinedDate: "2022-11-15",
          profileCompletion: 94,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Licensed Practical Nurse",
            number: "LPN-2022-789",
            issuer: "Washington State Nursing Commission",
            issuedDate: "2022-10-01",
            expirationDate: "2024-10-01",
            uploadDate: "2022-11-01",
            verified: true
          }],
          socialStats: {
            profileViews: 145,
            shiftsCompleted: 156,
            ratings: 123,
            endorsements: 26
          }
        },
        {
          id: 13,
          firstName: "Kevin",
          lastName: "Johnson",
          email: "kevin.johnson@nexspace.com",
          role: "contractor",
          phone: "(555) 234-5678",
          department: "Surgery",
          specialty: "CST",
          compliant: true,
          activeCredentials: 7,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
          profileImage: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
          bio: "Certified surgical technologist with orthopedic and general surgery experience.",
          location: "Portland, OR",
          hourlyRate: 30.0,
          experience: "7 years",
          skills: ["Sterile Technique", "Surgical Instruments", "OR Procedures"],
          certifications: ["CST", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 7,
          preferredShifts: ["Day", "Call"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 178,
          onTimePercentage: 98,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T16:45:00Z",
          joinedDate: "2022-03-10",
          profileCompletion: 96,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Surgical Technologist",
            number: "CST-2022-123",
            issuer: "NBSTSA",
            issuedDate: "2022-01-01",
            expirationDate: "2026-01-01",
            uploadDate: "2022-03-01",
            verified: true
          }],
          socialStats: {
            profileViews: 198,
            shiftsCompleted: 178,
            ratings: 156,
            endorsements: 32
          }
        },
        {
          id: 14,
          firstName: "Rachel",
          lastName: "White",
          email: "rachel.white@nexspace.com",
          role: "employee",
          phone: "(555) 345-6789",
          department: "Pediatrics",
          specialty: "RN",
          compliant: true,
          activeCredentials: 8,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          bio: "Pediatric registered nurse with NICU and general pediatrics experience.",
          location: "Seattle, WA",
          hourlyRate: 44.0,
          experience: "10 years",
          skills: ["Pediatric Care", "NICU", "Family Education"],
          certifications: ["RN", "PALS", "NRP", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 10,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.9,
          totalShifts: 234,
          onTimePercentage: 99,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T19:30:00Z",
          joinedDate: "2021-06-01",
          profileCompletion: 100,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Registered Nurse License",
            number: "RN-2021-456",
            issuer: "Washington State Nursing Commission",
            issuedDate: "2021-05-01",
            expirationDate: "2024-05-01",
            uploadDate: "2021-06-01",
            verified: true
          }],
          socialStats: {
            profileViews: 287,
            shiftsCompleted: 234,
            ratings: 198,
            endorsements: 47
          }
        },
        {
          id: 15,
          firstName: "Daniel",
          lastName: "Taylor",
          email: "daniel.taylor@nexspace.com",
          role: "contractor",
          phone: "(555) 456-7890",
          department: "Cardiology",
          specialty: "RN",
          compliant: true,
          activeCredentials: 9,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          bio: "Cardiac care registered nurse with telemetry and cath lab experience.",
          location: "Portland, OR",
          hourlyRate: 46.0,
          experience: "12 years",
          skills: ["Cardiac Care", "Telemetry", "Cath Lab", "IABP"],
          certifications: ["RN", "ACLS", "BLS", "CCRN"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 12,
          preferredShifts: ["Day", "Call"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 289,
          onTimePercentage: 97,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T17:15:00Z",
          joinedDate: "2021-01-20",
          profileCompletion: 98,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Registered Nurse License",
            number: "RN-2021-789",
            issuer: "Oregon State Board of Nursing",
            issuedDate: "2021-01-01",
            expirationDate: "2024-01-01",
            uploadDate: "2021-01-15",
            verified: true
          }],
          socialStats: {
            profileViews: 312,
            shiftsCompleted: 289,
            ratings: 245,
            endorsements: 58
          }
        },
        {
          id: 16,
          firstName: "Ashley",
          lastName: "Anderson",
          email: "ashley.anderson@nexspace.com",
          role: "employee",
          phone: "(555) 567-8901",
          department: "Medical/Surgical",
          specialty: "CNA",
          compliant: true,
          activeCredentials: 5,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          bio: "Medical-surgical certified nursing assistant with wound care expertise.",
          location: "Seattle, WA",
          hourlyRate: 21.5,
          experience: "4 years",
          skills: ["Wound Care", "Patient Mobility", "Vital Signs"],
          certifications: ["CNA", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 4,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.4,
          totalShifts: 124,
          onTimePercentage: 93,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T20:15:00Z",
          joinedDate: "2023-04-10",
          profileCompletion: 89,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Nursing Assistant",
            number: "CNA-2023-789",
            issuer: "Washington State Department of Health",
            issuedDate: "2023-03-01",
            expirationDate: "2025-03-01",
            uploadDate: "2023-04-01",
            verified: true
          }],
          socialStats: {
            profileViews: 98,
            shiftsCompleted: 124,
            ratings: 89,
            endorsements: 15
          }
        },
        {
          id: 17,
          firstName: "Christopher",
          lastName: "Thomas",
          email: "christopher.thomas@nexspace.com",
          role: "contractor",
          phone: "(555) 678-9012",
          department: "Neurology",
          specialty: "RN",
          compliant: true,
          activeCredentials: 7,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          bio: "Neurological registered nurse with stroke and brain injury expertise.",
          location: "Portland, OR",
          hourlyRate: 43.5,
          experience: "9 years",
          skills: ["Neuro Assessment", "Stroke Care", "ICP Monitoring"],
          certifications: ["RN", "CNRN", "ACLS", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 9,
          preferredShifts: ["Day", "Night"],
          availability: "Full-time",
          rating: 4.7,
          totalShifts: 203,
          onTimePercentage: 96,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T18:45:00Z",
          joinedDate: "2022-07-15",
          profileCompletion: 95,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Registered Nurse License",
            number: "RN-2022-234",
            issuer: "Oregon State Board of Nursing",
            issuedDate: "2022-06-01",
            expirationDate: "2025-06-01",
            uploadDate: "2022-07-01",
            verified: true
          }],
          socialStats: {
            profileViews: 176,
            shiftsCompleted: 203,
            ratings: 167,
            endorsements: 29
          }
        },
        {
          id: 18,
          firstName: "Nicole",
          lastName: "Jackson",
          email: "nicole.jackson@nexspace.com",
          role: "employee",
          phone: "(555) 789-0123",
          department: "Oncology",
          specialty: "LPN",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          bio: "Licensed practical nurse specializing in oncology and chemotherapy administration.",
          location: "Seattle, WA",
          hourlyRate: 29.0,
          experience: "6 years",
          skills: ["Chemotherapy", "Patient Education", "Pain Management"],
          certifications: ["LPN", "OCN", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 6,
          preferredShifts: ["Day"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 167,
          onTimePercentage: 98,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T16:30:00Z",
          joinedDate: "2022-09-01",
          profileCompletion: 93,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Licensed Practical Nurse",
            number: "LPN-2022-567",
            issuer: "Washington State Nursing Commission",
            issuedDate: "2022-08-01",
            expirationDate: "2024-08-01",
            uploadDate: "2022-09-01",
            verified: true
          }],
          socialStats: {
            profileViews: 154,
            shiftsCompleted: 167,
            ratings: 134,
            endorsements: 31
          }
        },
        {
          id: 19,
          firstName: "Matthew",
          lastName: "Harris",
          email: "matthew.harris@nexspace.com",
          role: "contractor",
          phone: "(555) 890-1234",
          department: "Dialysis",
          specialty: "PCT",
          compliant: true,
          activeCredentials: 4,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          profileImage: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          bio: "Patient care technician with dialysis and nephrology experience.",
          location: "Portland, OR",
          hourlyRate: 24.0,
          experience: "5 years",
          skills: ["Dialysis", "Vascular Access", "Patient Care"],
          certifications: ["PCT", "CDT", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 5,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.5,
          totalShifts: 134,
          onTimePercentage: 94,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T19:45:00Z",
          joinedDate: "2023-01-20",
          profileCompletion: 87,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Patient Care Technician",
            number: "PCT-2023-123",
            issuer: "Oregon Health Authority",
            issuedDate: "2023-01-01",
            expirationDate: "2025-01-01",
            uploadDate: "2023-01-15",
            verified: true
          }],
          socialStats: {
            profileViews: 109,
            shiftsCompleted: 134,
            ratings: 112,
            endorsements: 18
          }
        },
        {
          id: 20,
          firstName: "Amanda",
          lastName: "Clark",
          email: "amanda.clark@nexspace.com",
          role: "employee",
          phone: "(555) 901-2345",
          department: "Mental Health",
          specialty: "MA",
          compliant: true,
          activeCredentials: 5,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          bio: "Medical assistant with mental health and behavioral health experience.",
          location: "Seattle, WA",
          hourlyRate: 20.5,
          experience: "3 years",
          skills: ["Mental Health Support", "Crisis Intervention", "Documentation"],
          certifications: ["CMA", "CPI", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 3,
          preferredShifts: ["Day", "Evening"],
          availability: "Part-time",
          rating: 4.6,
          totalShifts: 78,
          onTimePercentage: 95,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T17:00:00Z",
          joinedDate: "2024-02-01",
          profileCompletion: 84,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Medical Assistant",
            number: "CMA-2024-456",
            issuer: "AAMA",
            issuedDate: "2024-01-01",
            expirationDate: "2029-01-01",
            uploadDate: "2024-02-01",
            verified: true
          }],
          socialStats: {
            profileViews: 67,
            shiftsCompleted: 78,
            ratings: 56,
            endorsements: 11
          }
        },
        {
          id: 21,
          firstName: "Ryan",
          lastName: "Lewis",
          email: "ryan.lewis@nexspace.com",
          role: "contractor",
          phone: "(555) 012-3456",
          department: "Home Health",
          specialty: "CNA",
          compliant: true,
          activeCredentials: 4,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
          profileImage: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
          bio: "Home health certified nursing assistant with elderly care expertise.",
          location: "Portland, OR",
          hourlyRate: 23.0,
          experience: "6 years",
          skills: ["Home Care", "Elderly Care", "Personal Care"],
          certifications: ["CNA", "HHA", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 6,
          preferredShifts: ["Day", "Weekend"],
          availability: "Full-time",
          rating: 4.7,
          totalShifts: 198,
          onTimePercentage: 97,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T15:30:00Z",
          joinedDate: "2022-12-01",
          profileCompletion: 91,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "certification",
            name: "Certified Nursing Assistant",
            number: "CNA-2022-890",
            issuer: "Oregon State Board of Nursing",
            issuedDate: "2022-11-01",
            expirationDate: "2024-11-01",
            uploadDate: "2022-12-01",
            verified: true
          }],
          socialStats: {
            profileViews: 143,
            shiftsCompleted: 198,
            ratings: 167,
            endorsements: 25
          }
        },
        {
          id: 22,
          firstName: "Stephanie",
          lastName: "Walker",
          email: "stephanie.walker@nexspace.com",
          role: "employee",
          phone: "(555) 123-4567",
          department: "Geriatrics",
          specialty: "LPN",
          compliant: true,
          activeCredentials: 6,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          bio: "Geriatric licensed practical nurse with dementia care specialization.",
          location: "Seattle, WA",
          hourlyRate: 27.5,
          experience: "8 years",
          skills: ["Dementia Care", "Medication Management", "Fall Prevention"],
          certifications: ["LPN", "CDP", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 8,
          preferredShifts: ["Day", "Evening"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 223,
          onTimePercentage: 98,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T16:15:00Z",
          joinedDate: "2021-10-15",
          profileCompletion: 96,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Licensed Practical Nurse",
            number: "LPN-2021-345",
            issuer: "Washington State Nursing Commission",
            issuedDate: "2021-09-01",
            expirationDate: "2023-09-01",
            uploadDate: "2021-10-01",
            verified: true
          }],
          socialStats: {
            profileViews: 201,
            shiftsCompleted: 223,
            ratings: 189,
            endorsements: 38
          }
        },
        {
          id: 23,
          firstName: "Brandon",
          lastName: "Hall",
          email: "brandon.hall@nexspace.com",
          role: "contractor",
          phone: "(555) 234-5678",
          department: "Anesthesia",
          specialty: "CRNA",
          compliant: true,
          activeCredentials: 9,
          expiringCredentials: 0,
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          bio: "Certified registered nurse anesthetist with cardiac and trauma experience.",
          location: "Portland, OR",
          hourlyRate: 85.0,
          experience: "15 years",
          skills: ["Anesthesia", "Pain Management", "Critical Care"],
          certifications: ["CRNA", "ACLS", "BLS", "PALS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 15,
          preferredShifts: ["Day", "Call"],
          availability: "Full-time",
          rating: 4.9,
          totalShifts: 312,
          onTimePercentage: 99,
          workerType: "contractor_1099",
          isAvailable: true,
          lastActive: "2025-06-20T14:00:00Z",
          joinedDate: "2020-08-01",
          profileCompletion: 100,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Certified Registered Nurse Anesthetist",
            number: "CRNA-2020-123",
            issuer: "Oregon State Board of Nursing",
            issuedDate: "2020-07-01",
            expirationDate: "2024-07-01",
            uploadDate: "2020-08-01",
            verified: true
          }],
          socialStats: {
            profileViews: 387,
            shiftsCompleted: 312,
            ratings: 298,
            endorsements: 67
          }
        },
        {
          id: 24,
          firstName: "Catherine",
          lastName: "Young",
          email: "catherine.young@nexspace.com",
          role: "employee",
          phone: "(555) 345-6789",
          department: "Maternity",
          specialty: "RN",
          compliant: true,
          activeCredentials: 8,
          expiringCredentials: 1,
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          bio: "Labor and delivery registered nurse with high-risk pregnancy expertise.",
          location: "Seattle, WA",
          hourlyRate: 41.0,
          experience: "11 years",
          skills: ["Labor & Delivery", "High-Risk Pregnancy", "Lactation Support"],
          certifications: ["RN", "AWHONN", "NRP", "BLS"],
          resumeUrl: "",
          coverLetterUrl: "",
          linkedIn: "",
          linkedinUrl: "",
          portfolio: "",
          portfolioUrl: "",
          yearsExperience: 11,
          preferredShifts: ["Day", "Night"],
          availability: "Full-time",
          rating: 4.8,
          totalShifts: 267,
          onTimePercentage: 98,
          workerType: "internal_employee",
          isAvailable: true,
          lastActive: "2025-06-20T20:30:00Z",
          joinedDate: "2021-03-10",
          profileCompletion: 97,
          backgroundCheckStatus: "approved",
          credentials: [{
            type: "license",
            name: "Registered Nurse License",
            number: "RN-2021-678",
            issuer: "Washington State Nursing Commission",
            issuedDate: "2021-02-01",
            expirationDate: "2024-02-01",
            uploadDate: "2021-03-01",
            verified: true
          }],
          socialStats: {
            profileViews: 245,
            shiftsCompleted: 267,
            ratings: 223,
            endorsements: 49
          },
          associatedFacilities: [1, 2]
        }
      ];
      
      res.json(staffPostsData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff data" });
    }
  });

  // Staff posts API endpoint
  app.get("/api/staff/posts", requireAuth, async (req, res) => {
    try {
      const samplePosts = [
        {
          id: 1,
          authorId: 5,
          authorName: "David Rodriguez",
          type: "achievement",
          content: "Just completed my 100th shift! Grateful for the opportunity to serve patients.",
          timestamp: "2025-06-21T10:00:00Z",
          likes: 12,
          comments: 3,
          attachments: []
        },
        {
          id: 2,
          authorId: 6,
          authorName: "Lisa Thompson",
          type: "update",
          content: "Starting a new certification program in respiratory therapy. Always learning!",
          timestamp: "2025-06-20T15:30:00Z",
          likes: 8,
          comments: 1,
          attachments: []
        }
      ];
      res.json(samplePosts);
    } catch (error) {
      console.error("Error fetching staff posts:", error);
      res.status(500).json({ message: "Failed to fetch staff posts" });
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

  // Enhanced Time Clock API with Comprehensive Validation
  app.get("/api/time-clock", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get recent time clock entries for the user
      const entries = [
        {
          id: 1,
          userId: userId,
          shiftId: 1,
          clockInTime: "2025-06-22T07:00:00Z",
          clockOutTime: "2025-06-22T19:30:00Z",
          hoursWorked: 12.5,
          status: "completed",
          location: "ICU Unit"
        }
      ];
      
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time clock entries" });
    }
  });

  app.get("/api/time-clock/status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user has an active clock-in entry
      const activeEntry = {
        id: null,
        clockInTime: null,
        shiftId: null,
        canClockIn: true,
        canClockOut: false,
        upcomingShift: null
      };
      
      // Get user's shifts for today to validate clock-in eligibility
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = await unifiedDataService.getUserShiftsForDate(userId, today);
      
      if (todayShifts.length > 0) {
        const shift = todayShifts[0];
        const now = new Date();
        const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
        const earliestClockIn = new Date(shiftStart.getTime() - 30 * 60 * 1000); // 30 minutes before
        
        activeEntry.upcomingShift = shift;
        activeEntry.canClockIn = now >= earliestClockIn;
      } else {
        activeEntry.canClockIn = false;
      }
      
      res.json(activeEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clock status" });
    }
  });

  app.post("/api/time-clock/clock-in", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      
      // Validate shift assignment - only allow clock-in if user has an assigned shift today
      const today = now.toISOString().split('T')[0];
      const todayShifts = await unifiedDataService.getUserShiftsForDate(userId, today);
      
      if (todayShifts.length === 0) {
        return res.status(400).json({ 
          message: "No assigned shift found for today. Cannot clock in without a scheduled shift.",
          canClockIn: false
        });
      }
      
      // Check if clock-in is within allowed time window (30 minutes before shift start)
      const shift = todayShifts[0];
      const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
      const earliestClockIn = new Date(shiftStart.getTime() - 30 * 60 * 1000); // 30 minutes before
      
      if (now < earliestClockIn) {
        return res.status(400).json({ 
          message: `Cannot clock in more than 30 minutes before shift start time (${shift.startTime})`,
          canClockIn: false,
          earliestClockIn: earliestClockIn.toISOString()
        });
      }
      
      // Create time clock entry
      const entry = {
        id: Date.now(),
        userId: userId,
        shiftId: shift.id,
        clockInTime: now.toISOString(),
        location: req.body.location || shift.department,
        status: "active"
      };
      
      res.status(201).json({
        ...entry,
        message: "Successfully clocked in",
        shift: shift
      });
    } catch (error) {
      console.error("Clock-in error:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post("/api/time-clock/clock-out", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      
      // For demo purposes, simulate finding an active entry
      // In production, this would query the database
      const mockActiveEntry = {
        id: Date.now() - 3600000, // 1 hour ago
        userId: userId,
        shiftId: 1,
        clockInTime: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
        status: "active"
      };
      
      if (!mockActiveEntry) {
        return res.status(400).json({ 
          message: "No active clock-in found. Must clock in before clocking out.",
          canClockOut: false
        });
      }
      
      // Calculate total hours worked
      const clockInTime = new Date(mockActiveEntry.clockInTime);
      const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      
      // Validate minimum shift duration (at least 1 hour)
      if (hoursWorked < 1) {
        return res.status(400).json({ 
          message: "Cannot clock out within 1 hour of clocking in. Minimum shift duration required.",
          canClockOut: false,
          hoursWorked: Math.round(hoursWorked * 100) / 100
        });
      }
      
      // Update time clock entry with clock-out information
      const completedEntry = {
        ...mockActiveEntry,
        clockOutTime: now.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        location: req.body.location || mockActiveEntry.location,
        status: "completed"
      };
      
      res.json({
        ...completedEntry,
        message: "Successfully clocked out"
      });
    } catch (error) {
      console.error("Clock-out error:", error);
      res.status(500).json({ message: "Failed to clock out" });
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
          status: "filled",
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

      // Update shift status to filled
      const assignedShift = {
        id: requestId,
        status: "filled",
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

  // Worker's shift requests API - returns only requests made by the logged-in worker
  app.get("/api/shift-requests", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Return worker's actual shift requests based on user ID
      const workerShiftRequests = [
        {
          id: 1,
          shiftId: 102,
          title: "Emergency Night Shift",
          date: "2025-06-25",
          startTime: "19:00",
          endTime: "07:00",
          department: "Emergency",
          specialty: "RN",
          facilityName: "Portland General Hospital",
          rate: 45.0,
          status: "requested",
          requestedBy: 3, // Alice Smith's ID
          urgency: "critical",
          description: "Overnight emergency department coverage",
          requestedAt: "2025-06-21T15:30:00Z"
        },
        {
          id: 2,
          shiftId: 105,
          title: "ICU Weekend Shift",
          date: "2025-06-28",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
          facilityName: "Portland General Hospital",
          rate: 42.5,
          status: "pending",
          requestedBy: 3, // Alice Smith's ID
          urgency: "high",
          description: "Weekend ICU coverage",
          requestedAt: "2025-06-20T10:15:00Z"
        }
      ];
      
      // Filter to only show requests by this user
      const userRequests = workerShiftRequests.filter(request => request.requestedBy === user.id);
      
      res.json(userRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Admin shift requests API with worker details for management view
  app.get("/api/admin/shift-requests", requireAuth, async (req, res) => {
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
        },
        {
          id: 42,
          name: "Jennifer Kim",
          username: "jennifer.kim",
          email: "jennifer.kim@hospital.com",
          role: "employee",
          status: "active",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          createdAt: "2025-04-15T00:00:00Z",
          lastLogin: "2025-06-20T15:30:00Z"
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
        {
          id: 9,
          name: "David Rodriguez",
          email: "david.rodriguez@nexspace.com",
          phone: "(555) 456-7890",
          specialty: "PT",
          department: "Rehabilitation",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          location: "Portland, OR",
          yearsExperience: 8,
          certifications: ["DPT", "OCS", "BLS"],
          rating: 4.6,
          shiftsCompleted: 145,
          availability: "full_time",
          hourlyRate: 38,
          joinDate: "2023-03-15",
          skills: ["Orthopedic Rehab", "Manual Therapy", "Sports Medicine"],
          bio: "Licensed physical therapist specializing in orthopedic rehabilitation."
        },
        {
          id: 10,
          name: "Lisa Thompson",
          email: "lisa.thompson@nexspace.com",
          phone: "(555) 567-8901",
          specialty: "RT",
          department: "Respiratory",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          location: "Seattle, WA",
          yearsExperience: 7,
          certifications: ["RRT", "ACLS", "BLS"],
          rating: 4.8,
          shiftsCompleted: 198,
          availability: "full_time",
          hourlyRate: 34.5,
          joinDate: "2022-08-20",
          skills: ["Mechanical Ventilation", "ECMO", "Pulmonary Function"],
          bio: "Respiratory therapist with expertise in critical care ventilation."
        },
        {
          id: 11,
          name: "Mark Wilson",
          email: "mark.wilson@nexspace.com",
          phone: "(555) 678-9012",
          specialty: "MLT",
          department: "Laboratory",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          location: "Portland, OR",
          yearsExperience: 5,
          certifications: ["MLT", "ASCP", "BLS"],
          rating: 4.4,
          shiftsCompleted: 87,
          availability: "part_time",
          hourlyRate: 29,
          joinDate: "2023-11-10",
          skills: ["Clinical Chemistry", "Hematology", "Microbiology"],
          bio: "Medical laboratory technician with clinical chemistry expertise."
        },
        {
          id: 12,
          name: "Anna Garcia",
          email: "anna.garcia@nexspace.com",
          phone: "(555) 789-0123",
          specialty: "PhT",
          department: "Pharmacy",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          location: "Seattle, WA",
          yearsExperience: 4,
          certifications: ["CPhT", "BLS"],
          rating: 4.5,
          shiftsCompleted: 112,
          availability: "full_time",
          hourlyRate: 26.5,
          joinDate: "2024-01-15",
          skills: ["Sterile Compounding", "IV Preparation", "Medication Safety"],
          bio: "Certified pharmacy technician with sterile compounding experience."
        },
        {
          id: 13,
          name: "James Brown",
          email: "james.brown@nexspace.com",
          phone: "(555) 890-1234",
          specialty: "RT",
          department: "Radiology",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          location: "Portland, OR",
          yearsExperience: 9,
          certifications: ["RT(R)", "CT", "MRI", "BLS"],
          rating: 4.7,
          shiftsCompleted: 167,
          availability: "full_time",
          hourlyRate: 31,
          joinDate: "2022-05-10",
          skills: ["CT Imaging", "MRI", "X-Ray", "Patient Care"],
          bio: "Radiologic technologist specializing in CT and MRI imaging."
        },
        {
          id: 14,
          name: "Emma Davis",
          email: "emma.davis@nexspace.com",
          phone: "(555) 901-2345",
          specialty: "OT",
          department: "Occupational Therapy",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          location: "Seattle, WA",
          yearsExperience: 6,
          certifications: ["OTR/L", "BLS"],
          rating: 4.9,
          shiftsCompleted: 142,
          availability: "full_time",
          hourlyRate: 36,
          joinDate: "2023-02-20",
          skills: ["Pediatric Therapy", "Geriatric Care", "ADL Training"],
          bio: "Occupational therapist with pediatric and geriatric expertise."
        },
        {
          id: 15,
          name: "Robert Lee",
          email: "robert.lee@nexspace.com",
          phone: "(555) 012-3456",
          specialty: "CNA",
          department: "ICU",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          location: "Portland, OR",
          yearsExperience: 3,
          certifications: ["CNA", "BLS"],
          rating: 4.3,
          shiftsCompleted: 89,
          availability: "full_time",
          hourlyRate: 22,
          joinDate: "2023-09-01",
          skills: ["Patient Care", "Vital Signs", "ICU Support"],
          bio: "Certified nursing assistant with ICU and critical care experience."
        },
        {
          id: 16,
          name: "Sofia Martinez",
          email: "sofia.martinez@nexspace.com",
          phone: "(555) 123-4567",
          specialty: "LPN",
          department: "Emergency",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          location: "Seattle, WA",
          yearsExperience: 5,
          certifications: ["LPN", "ACLS", "BLS"],
          rating: 4.6,
          shiftsCompleted: 156,
          availability: "full_time",
          hourlyRate: 28.5,
          joinDate: "2022-11-15",
          skills: ["Emergency Care", "Triage", "IV Therapy"],
          bio: "Licensed practical nurse with emergency department expertise."
        },
        {
          id: 17,
          name: "Kevin Johnson",
          email: "kevin.johnson@nexspace.com",
          phone: "(555) 234-5678",
          specialty: "CST",
          department: "Surgery",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150",
          location: "Portland, OR",
          yearsExperience: 7,
          certifications: ["CST", "BLS"],
          rating: 4.8,
          shiftsCompleted: 178,
          availability: "full_time",
          hourlyRate: 30,
          joinDate: "2022-03-10",
          skills: ["Sterile Technique", "Surgical Instruments", "OR Procedures"],
          bio: "Certified surgical technologist with orthopedic and general surgery experience."
        },
        {
          id: 18,
          name: "Rachel White",
          email: "rachel.white@nexspace.com",
          phone: "(555) 345-6789",
          specialty: "RN",
          department: "Pediatrics",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          location: "Seattle, WA",
          yearsExperience: 10,
          certifications: ["RN", "PALS", "NRP", "BLS"],
          rating: 4.9,
          shiftsCompleted: 234,
          availability: "full_time",
          hourlyRate: 44,
          joinDate: "2021-06-01",
          skills: ["Pediatric Care", "NICU", "Family Education"],
          bio: "Pediatric registered nurse with NICU and general pediatrics experience."
        },
        {
          id: 19,
          name: "Daniel Taylor",
          email: "daniel.taylor@nexspace.com",
          phone: "(555) 456-7890",
          specialty: "RN",
          department: "Cardiology",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
          location: "Portland, OR",
          yearsExperience: 12,
          certifications: ["RN", "ACLS", "BLS", "CCRN"],
          rating: 4.8,
          shiftsCompleted: 289,
          availability: "full_time",
          hourlyRate: 46,
          joinDate: "2021-01-20",
          skills: ["Cardiac Care", "Telemetry", "Cath Lab", "IABP"],
          bio: "Cardiac care registered nurse with telemetry and cath lab experience."
        },
        {
          id: 20,
          name: "Ashley Anderson",
          email: "ashley.anderson@nexspace.com",
          phone: "(555) 567-8901",
          specialty: "CNA",
          department: "Medical/Surgical",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
          location: "Seattle, WA",
          yearsExperience: 4,
          certifications: ["CNA", "BLS"],
          rating: 4.4,
          shiftsCompleted: 124,
          availability: "full_time",
          hourlyRate: 21.5,
          joinDate: "2023-04-10",
          skills: ["Wound Care", "Patient Mobility", "Vital Signs"],
          bio: "Medical-surgical certified nursing assistant with wound care expertise."
        },
        {
          id: 21,
          name: "Christopher Thomas",
          email: "christopher.thomas@nexspace.com",
          phone: "(555) 678-9012",
          specialty: "RN",
          department: "Neurology",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          location: "Portland, OR",
          yearsExperience: 9,
          certifications: ["RN", "CNRN", "ACLS", "BLS"],
          rating: 4.7,
          shiftsCompleted: 203,
          availability: "full_time",
          hourlyRate: 43.5,
          joinDate: "2022-07-15",
          skills: ["Neuro Assessment", "Stroke Care", "ICP Monitoring"],
          bio: "Neurological registered nurse with stroke and brain injury expertise."
        },
        {
          id: 22,
          name: "Nicole Jackson",
          email: "nicole.jackson@nexspace.com",
          phone: "(555) 789-0123",
          specialty: "LPN",
          department: "Oncology",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
          location: "Seattle, WA",
          yearsExperience: 6,
          certifications: ["LPN", "OCN", "BLS"],
          rating: 4.8,
          shiftsCompleted: 167,
          availability: "full_time",
          hourlyRate: 29,
          joinDate: "2022-09-01",
          skills: ["Chemotherapy", "Patient Education", "Pain Management"],
          bio: "Licensed practical nurse specializing in oncology and chemotherapy administration."
        },
        {
          id: 23,
          name: "Matthew Harris",
          email: "matthew.harris@nexspace.com",
          phone: "(555) 890-1234",
          specialty: "PCT",
          department: "Dialysis",
          workerType: "contractor_1099",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150",
          location: "Portland, OR",
          yearsExperience: 5,
          certifications: ["PCT", "CDT", "BLS"],
          rating: 4.5,
          shiftsCompleted: 134,
          availability: "full_time",
          hourlyRate: 24,
          joinDate: "2023-01-20",
          skills: ["Dialysis", "Vascular Access", "Patient Care"],
          bio: "Patient care technician with dialysis and nephrology experience."
        },
        {
          id: 24,
          name: "Amanda Clark",
          email: "amanda.clark@nexspace.com",
          phone: "(555) 901-2345",
          specialty: "MA",
          department: "Mental Health",
          workerType: "internal_employee",
          status: "active",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
          location: "Seattle, WA",
          yearsExperience: 3,
          certifications: ["CMA", "CPI", "BLS"],
          rating: 4.6,
          shiftsCompleted: 78,
          availability: "part_time",
          hourlyRate: 20.5,
          joinDate: "2024-02-01",
          skills: ["Mental Health Support", "Crisis Intervention", "Documentation"],
          bio: "Medical assistant with mental health and behavioral health experience."
        }
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

  // Staff Facility Association API - Using Unified Data Service
  app.post("/api/staff/:staffId/facilities", requireAuth, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { facilityId } = req.body;
      
      const staffIdNum = parseInt(staffId);
      const facilityIdNum = parseInt(facilityId);
      
      console.log(`Adding facility ${facilityIdNum} to staff ${staffIdNum}`);
      
      // Get current staff data from database
      const staffData = await unifiedDataService.getStaffWithAssociations();
      const staff = staffData.find(s => s.id === staffIdNum);
      
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      // Add facility if not already associated
      const currentAssociations = staff.associatedFacilities || [];
      let updatedAssociations = [...currentAssociations];
      
      if (!updatedAssociations.includes(facilityIdNum)) {
        updatedAssociations.push(facilityIdNum);
      }
      
      // Update in database using unified service
      const updatedStaff = await unifiedDataService.updateStaffFacilities(staffIdNum, updatedAssociations);
      
      console.log(`Updated associations for staff ${staffIdNum}:`, updatedAssociations);
      
      res.json({ 
        message: "Facility association added successfully",
        staffId: staffIdNum,
        facilityId: facilityIdNum,
        associations: updatedAssociations
      });
    } catch (error) {
      console.error("Error adding facility association:", error);
      res.status(500).json({ message: "Failed to add facility association" });
    }
  });

  app.delete("/api/staff/:staffId/facilities/:facilityId", requireAuth, async (req, res) => {
    try {
      const { staffId, facilityId } = req.params;
      
      const staffIdNum = parseInt(staffId);
      const facilityIdNum = parseInt(facilityId);
      
      console.log(`Removing facility ${facilityIdNum} from staff ${staffIdNum}`);
      
      // Get current staff data from database
      const staffData = await unifiedDataService.getStaffWithAssociations();
      const staff = staffData.find(s => s.id === staffIdNum);
      
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      // Remove facility from associations
      const currentAssociations = staff.associatedFacilities || [];
      const updatedAssociations = currentAssociations.filter(id => id !== facilityIdNum);
      
      // Update in database using unified service
      await unifiedDataService.updateStaffFacilities(staffIdNum, updatedAssociations);
      
      console.log(`Updated associations for staff ${staffIdNum}:`, updatedAssociations);
      
      res.json({ 
        message: "Facility association removed successfully",
        staffId: staffIdNum,
        facilityId: facilityIdNum,
        associations: updatedAssociations
      });
    } catch (error) {
      console.error("Error removing facility association:", error);
      res.status(500).json({ message: "Failed to remove facility association" });
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
        const statuses = ["open", "filled", "completed", "requested", "in_progress"];
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

  // Create shifts from template endpoint
  app.post("/api/shifts/from-template", requireAuth, async (req, res) => {
    try {
      const { templateId, startDate, endDate, daysInAdvance } = req.body;
      
      // Get templates from the same source as the shift-templates API
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
      
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Generate shifts based on template and date range
      const generatedShifts = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        // Check if this day is included in the template
        if (template.daysOfWeek.includes(dayOfWeek)) {
          const shiftDate = date.toISOString().split('T')[0];
          
          // Create shift based on template
          const newShift = {
            id: Math.floor(Date.now() + Math.random() * 1000),
            title: template.name,
            date: shiftDate,
            startTime: template.startTime,
            endTime: template.endTime,
            department: template.department,
            specialty: template.specialty === "Registered Nurse" ? "RN" : 
                      template.specialty === "Licensed Practical Nurse" ? "LPN" :
                      template.specialty === "Certified Nursing Assistant" ? "CNA" :
                      template.specialty === "Surgical Technologist" ? "CST" : template.specialty,
            facilityId: template.facilityId,
            facilityName: template.facilityName,
            buildingId: (template as any).buildingId || "main-building",
            buildingName: (template as any).buildingName || "Main Building",
            location: `${template.facilityName} - ${(template as any).buildingName || "Main Building"}`,
            minStaff: template.minStaff,
            maxStaff: template.maxStaff,
            status: 'open' as const,
            hourlyRate: template.hourlyRate,
            description: template.notes || `${template.department} shift`,
            urgency: 'medium' as const,
            priority: 'standard' as const,
            priorityTiers: (template as any).priorityTiers || {
              employees: true,
              contractors: true,
              outsideAgencies: false
            },
            staffingPriorityOrder: (template as any).staffingPriorityOrder || ["employees", "contractors"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedStaffIds: [],
            applicantIds: [],
            requiredCertifications: [],
            totalHours: 12,
            shiftType: template.shiftType,
            templateId: template.id,
            templateName: template.name
          };
          
          generatedShifts.push(newShift);
        }
      }
      
      // Store the generated shifts in a global array that persists during session
      if (!(global as any).templateGeneratedShifts) {
        (global as any).templateGeneratedShifts = [];
      }
      
      // Add generated shifts to persistent storage
      generatedShifts.forEach(shift => {
        // Check if shift already exists to avoid duplicates
        const exists = (global as any).templateGeneratedShifts.find((s: any) => 
          s.date === shift.date && 
          s.startTime === shift.startTime && 
          s.department === shift.department
        );
        
        if (!exists) {
          (global as any).templateGeneratedShifts.push(shift);
        }
      });
      
      res.json({
        message: `Successfully created ${generatedShifts.length} shifts from template`,
        generatedShifts: generatedShifts.length,
        shifts: generatedShifts,
        template: template.name,
        dateRange: { startDate, endDate },
        daysInAdvance
      });
      
    } catch (error) {
      console.error('Create shifts from template error:', error);
      res.status(500).json({ message: "Failed to create shifts from template" });
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
      let targetUser;
      
      if (targetUserId === 2) {
        targetUser = {
          id: 2,
          username: "sarah.johnson",
          email: "sarah.johnson@portlandgeneral.com",
          firstName: "Sarah",
          lastName: "Johnson",
          role: "facility_manager",
          facilityId: 1,
          isActive: true
        };
      } else if (targetUserId === 3) {
        targetUser = {
          id: 3,
          username: "JoshBurn",
          email: "joshburn@gmail.com",
          firstName: "Josh",
          lastName: "Burn",
          role: "employee",
          facilityId: 1,
          isActive: true
        };
      } else if (targetUserId === 4) {
        targetUser = {
          id: 4,
          username: "mike.davis",
          email: "mike.davis@contractor.com",
          firstName: "Mike",
          lastName: "Davis",
          role: "contractor",
          facilityId: null,
          isActive: true
        };
      } else if (targetUserId === 42) {
        targetUser = {
          id: 42,
          username: "jennifer.kim",
          email: "jennifer.kim@hospital.com",
          firstName: "Jennifer",
          lastName: "Kim",
          role: "employee",
          facilityId: 1,
          isActive: true
        };
      } else {
        return res.status(404).json({ message: "User not found" });
      }

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
  
  // Initialize unified data service with WebSocket support
  unifiedDataService = new UnifiedDataService(wss);

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
