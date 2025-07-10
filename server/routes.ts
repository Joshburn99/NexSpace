import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { createEnhancedFacilitiesRoutes } from "./enhanced-facilities-routes";
import { sql } from "drizzle-orm";


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
  insertShiftTemplateSchema,
  insertGeneratedShiftSchema,
  insertUserSessionSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  insertTeamFacilitySchema,
  insertFacilityUserSchema,
  insertFacilityUserPermissionSchema,
  insertFacilityUserRoleTemplateSchema,
  insertFacilityUserActivityLogSchema,
  insertFacilityUserFacilityAssociationSchema,
  insertFacilityUserTeamSchema,
  UserRole,
  FacilityUserRole,
  FacilityPermission,
  shifts,
  facilities,
  shiftRequests,
  shiftHistory,
  shiftTemplates,
  generatedShifts,
  users,
  messages,
  teams,
  teamMembers,
  teamFacilities,
  facilityUsers,
  facilityUserPermissions,
  facilityUserRoleTemplates,
  facilityUserActivityLog,
  facilityUserFacilityAssociations,
  facilityUserTeamMemberships,
  staff,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { recommendationEngine } from "./recommendation-engine";
import type { RecommendationCriteria } from "./recommendation-engine";
import { UnifiedDataService } from "./unified-data-service";
import multer from "multer";
import OpenAI from "openai";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Initialize unified data service (will be properly initialized with WebSocket later)
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

  // Mount enhanced facility routes
  const enhancedFacilityRoutes = createEnhancedFacilitiesRoutes(requireAuth, requirePermission, auditLog);
  app.use("/api/facilities", enhancedFacilityRoutes);

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
      // Get staff data from unified service to ensure consistency
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();

      // Filter staff to match "all staff" page logic - exclude superusers
      const filteredStaff = dbStaffData.filter(staff => {
        const superuserEmails = ['joshburn@nexspace.com', 'brian.nangle@nexspace.com'];
        if (superuserEmails.includes(staff.email)) return false;
        if (staff?.role === "super_admin" || staff?.role === "facility_manager") return false;
        return true;
      });

      // Get template-generated shifts if they exist
      let templateShifts = (global as any).templateGeneratedShifts || [];

      // Auto-generate shifts from active templates if none exist
      if (templateShifts.length === 0) {
        const activeTemplates = [
          {
            id: 1,
            name: "ICU Day Shift RN",
            department: "ICU",
            specialty: "Registered Nurse",
            facilityId: 1,
            facilityName: "Portland General Hospital",
            minStaff: 2,
            maxStaff: 4,
            startTime: "07:00",
            endTime: "19:00",
            daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
            isActive: true,
            hourlyRate: 45,
            daysPostedOut: 14, // 2 weeks
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
            startTime: "19:00",
            endTime: "07:00",
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
            isActive: true,
            hourlyRate: 52,
            daysPostedOut: 7, // 1 week
          },
          {
            id: 3,
            name: "OR Morning Team",
            department: "Operating Room",
            specialty: "Surgical Technologist",
            facilityId: 1,
            facilityName: "Portland General Hospital",
            minStaff: 1,
            maxStaff: 2,
            startTime: "06:00",
            endTime: "14:00",
            daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
            isActive: true,
            hourlyRate: 48,
            daysPostedOut: 10, // 10 days
          }
        ];

        // Generate shifts based on template's daysPostedOut setting
        const generatedShifts: any[] = [];
        const today = new Date();
        const currentDate = new Date();

        for (const template of activeTemplates) {
          if (template.isActive) {
            const daysToGenerate = template.daysPostedOut || 7; // Default to 7 days if not specified
            for (let i = 0; i < daysToGenerate; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() + i);

              if (template.daysOfWeek.includes(date.getDay())) {
                // Generate minimum required shifts for each day
                for (let staffCount = 0; staffCount < template.minStaff; staffCount++) {
                  // Create stable shift ID based on template, date, and position (not timestamp)
                  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
                  const shiftId = parseInt(`${template.id}${dateStr}${staffCount.toString().padStart(2, '0')}`);
                  generatedShifts.push({
                    id: shiftId,
                    title: template.name,
                    date: date.toISOString().split('T')[0],
                    startTime: template.startTime,
                    endTime: template.endTime,
                    department: template.department,
                    specialty: template.specialty === "Registered Nurse" ? "RN" : 
                              template.specialty === "Licensed Practical Nurse" ? "LPN" :
                              template.specialty === "Surgical Technologist" ? "CST" : 
                              template.specialty,
                    facilityId: template.facilityId,
                    facilityName: template.facilityName,
                    status: "open",
                    rate: template.hourlyRate,
                    urgency: "medium",
                    description: `${template.department} shift - ${template.name}`,
                    templateId: template.id,
                    createdFromTemplate: true,
                    assignedStaffId: null,
                    assignedStaffName: null,
                    assignedStaffEmail: null,
                    assignedStaffSpecialty: null,
                    assignedStaffRating: null,
                    invoiceAmount: null,
                    invoiceStatus: null,
                    invoiceHours: null
                  });
                }
              }
            }
          }
        }

        // Group shifts by template and date to assign multiple staff properly
        const shiftGroups = new Map();

        generatedShifts.forEach(shift => {
          const key = `${shift.templateId}-${shift.date}`;
          if (!shiftGroups.has(key)) {
            shiftGroups.set(key, []);
          }
          shiftGroups.get(key).push(shift);
        });

        const assignableStaff = filteredStaff.filter(staff => 
          staff.specialty === "RN" || staff.specialty === "LPN" || staff.specialty === "CST"
        );

        // Assign staff to shift groups based on template requirements
        shiftGroups.forEach((shifts, key) => {
          const template = activeTemplates.find(t => t.id === shifts[0].templateId);
          if (!template) return;

          const matchingStaff = assignableStaff.filter(staff => 
            staff.specialty === shifts[0].specialty || 
            (shifts[0].specialty === "RN" && staff.specialty === "RN") ||
            (shifts[0].specialty === "CST" && staff.specialty === "RN")
          );

          // Determine how many positions to fill (partial filling for realism)
          const fillRate = Math.random() > 0.3 ? 0.7 : 0.4; // 70% or 40% fill rate
          const positionsToFill = Math.floor(shifts.length * fillRate);

          // Assign staff to positions
          for (let i = 0; i < positionsToFill && i < matchingStaff.length; i++) {
            const shift = shifts[i];
            const assignedStaff = matchingStaff[i % matchingStaff.length];

            shift.status = new Date(shift.date) < currentDate ? "completed" : "filled";
            shift.assignedStaffId = assignedStaff.id;
            shift.assignedStaffName = `${assignedStaff.firstName} ${assignedStaff.lastName}`;
            shift.assignedStaffEmail = assignedStaff.email;
            shift.assignedStaffSpecialty = assignedStaff.specialty;
            shift.assignedStaffRating = 4.5 + Math.random() * 0.5;

            // Only add invoice info for completed shifts
            if (shift.status === "completed") {
              const hours = shift.startTime === "07:00" && shift.endTime === "19:00" ? 12 : 
                           shift.startTime === "19:00" && shift.endTime === "07:00" ? 12 : 8;
              shift.invoiceAmount = hours * shift.rate;
              shift.invoiceStatus = Math.random() > 0.5 ? "approved" : "pending_review";
              shift.invoiceHours = hours;
            }
          }

          // Update shift status based on filling
          const filledCount = shifts.filter((s: any) => s.assignedStaffId).length;
          const totalRequired = shifts.length;

          shifts.forEach((shift: any) => {
            if (!shift.assignedStaffId) {
              shift.status = "open";
            }
            // Add staffing info to shift
            shift.filledPositions = filledCount;
            shift.totalPositions = totalRequired;
            shift.minStaff = template.minStaff;
            shift.maxStaff = template.maxStaff;
          });
        });

        // Store generated shifts
        (global as any).templateGeneratedShifts = generatedShifts;
        templateShifts = generatedShifts;
      }

      // Current date for status logic
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];

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
          requiredWorkers: 3,
          totalPositions: 3,
          minStaff: 2,
          maxStaff: 3,
        },
        {
          id: 2,
          title: "Emergency Department",
          date: "2025-06-19",
          startTime: "15:00",
          endTime: "23:00",
          department: "Emergency",
          specialty: "RN",
          status: new Date("2025-06-19") < new Date() ? "completed" : "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 45.0,
          urgency: "critical",
          description: "Emergency department evening shift",
          requiredWorkers: 2,
          totalPositions: 2,
          minStaff: 1,
          maxStaff: 2,
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0] ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}` : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffPhone: "(503) 555-0123",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "RN",
          assignedStaffRating: 4.8,
          invoiceAmount: new Date("2025-06-19") < new Date() ? 360.00 : null,
          invoiceStatus: new Date("2025-06-19") < new Date() ? "pending_review" : null,
          invoiceHours: new Date("2025-06-19") < new Date() ? 8 : null,
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
        // Add more shifts matching active shift templates
        {
          id: 17,
          title: "ICU Day Shift RN",
          date: "2025-06-23",
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
          status: "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 45.0,
          urgency: "high",
          description: "Primary ICU coverage",
          filledPositions: 2,
          totalPositions: 3,
          minStaff: 2,
          maxStaff: 3,
          assignedStaff: [
            {
              id: filteredStaff[0]?.id || 3,
              name: filteredStaff[0] ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}` : "Alice Smith",
              email: filteredStaff[0]?.email || "alice.smith@nexspace.com",
              specialty: filteredStaff[0]?.specialty || "LPN",
              rating: 4.6
            },
            {
              id: filteredStaff[1]?.id || 4,
              name: filteredStaff[1] ? `${filteredStaff[1].firstName} ${filteredStaff[1].lastName}` : "Bob Johnson",
              email: filteredStaff[1]?.email || "bob.johnson@nexspace.com",
              specialty: filteredStaff[1]?.specialty || "RN",
              rating: 4.8
            }
          ],
          // Keep legacy fields for backward compatibility
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0] ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}` : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "LPN",
          assignedStaffRating: 4.6,
        },
        {
          id: 18,
          title: "Emergency Night Coverage",
          date: "2025-06-24",
          startTime: "19:00",
          endTime: "07:00",
          department: "Emergency",
          specialty: "RN",
          status: "open",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 52.0,
          urgency: "critical",
          description: "24/7 emergency coverage",
        },
        {
          id: 19,
          title: "OR Morning Team",
          date: "2025-06-25",
          startTime: "06:00",
          endTime:```text
"14:00",
          department: "Operating Room",
          specialty: "RN",
          status: "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 48.0,
          urgency: "high",
          description: "Morning surgical team coverage",
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0] ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}` : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "RN",
          assignedStaffRating: 4.8,
        },
        {
          id: 20,
          title: "ICU Night Shift",
          date: "2025-06-18",
          startTime: "19:00",
          endTime: "07:00",
          department: "ICU",
          specialty: "RN",
          status: new Date("2025-06-18") < new Date() ? "completed" : "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 48.0,
          urgency: "high",
          description: "Night ICU coverage",
          assignedStaffId: filteredStaff[1]?.id || 4,
          assignedStaffName: filteredStaff[1] ? `${filteredStaff[1].firstName} ${filteredStaff[1].lastName}` : "Bob Johnson",
          assignedStaffEmail: filteredStaff[1]?.email || "bob.johnson@nexspace.com",
          assignedStaffSpecialty: filteredStaff[1]?.specialty || "RN",
          assignedStaffRating: 4.6,
          invoiceAmount: new Date("2025-06-18") < new Date() ? 576.00 : null,
          invoiceStatus: new Date("2025-06-18") < new Date() ? "approved" : null,
          invoiceHours: new Date("2025-06-18") < new Date() ? 12 : null,
        },
        {
          id: 21,
          title: "Emergency Day Shift",
          date: "2025-06-17",
          startTime: "07:00",
          endTime: "19:00",
          department: "Emergency",
          specialty: "RN",
          status: new Date("2025-06-17") < new Date() ? "completed" : "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 50.0,
          urgency: "critical",
          description: "Day emergency coverage",
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0] ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}` : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "RN",
          assignedStaffRating: 4.8,
          invoiceAmount: new Date("2025-06-17") < new Date() ? 600.00 : null,
          invoiceStatus: new Date("2025-06-17") < new Date() ? "pending_review" : null,
          invoiceHours: new Date("2025-06-17") < new Date() ? 12 : null,
        },
      ];

      // Get staff data for assignment display
      const staffData = await unifiedDataService.getStaffWithAssociations();

      // Get all database shifts from multiple tables
      let dbGeneratedShifts = [];
      let dbMainShifts = [];
      let formattedDbShifts = [];

      try {
        // Get template-generated shifts
        dbGeneratedShifts = await db.select().from(generatedShifts);

        // Get main shifts table (where new shifts are created)
        dbMainShifts = await db.select().from(shifts);

        // Convert generated shifts to proper format
        const formattedGeneratedShifts = dbGeneratedShifts.map(shift => ({
          id: shift.id,
          title: shift.title,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          department: shift.department,
          specialty: shift.specialty,
          facilityId: shift.facilityId,
          facilityName: shift.facilityName,
          buildingId: shift.buildingId,
          buildingName: shift.buildingName,
          status: shift.status,
          rate: parseFloat(shift.rate?.toString() || "0"),
          urgency: shift.urgency,
          description: shift.description,
          totalPositions: shift.requiredWorkers || 1,
          minStaff: shift.minStaff || 1,
          maxStaff: shift.maxStaff || 1,
          totalHours: shift.totalHours || 8
        }));

        // Convert main shifts to proper format
        const formattedMainShifts = dbMainShifts.map(shift => ({
          id: shift.id,
          title: shift.title,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          department: shift.department,
          specialty: shift.specialty,
          facilityId: shift.facilityId,
          facilityName: shift.facilityName,
          status: shift.status,
          rate: parseFloat(shift.rate?.toString() || "0"),
          urgency: shift.urgency,
          description: shift.description,
          totalPositions: shift.requiredStaff || 1,
          minStaff: 1,
          maxStaff: shift.requiredStaff || 1,
          totalHours: 8
        }));

        formattedDbShifts = [...formattedGeneratedShifts, ...formattedMainShifts];
        console.log(`[SHIFTS API] Loaded ${formattedMainShifts.length} main shifts, ${formattedGeneratedShifts.length} generated shifts`);

      } catch (error) {
        console.error('Error fetching database shifts:', error);
        // Continue with example shifts only if database query fails
      }

      // Combine all shifts: example + generated + main database shifts
      const combinedShifts = [...getShiftData(), ...formattedDbShifts];

      const allShifts = await Promise.all(combinedShifts.map(async shift => {
        // Normalize shift ID to string format for consistent assignment lookup
        const normalizedShiftId = shift.id.toString();
        const assignedWorkerIds = await getShiftAssignments(normalizedShiftId);

        // Get detailed staff info for assigned workers
        const assignedStaff = assignedWorkerIds.map((workerId: number) => {
          const staff = staffData.find((s: any) => s.id === workerId);
          if (staff) {
            return {
              id: staff.id,
              name: `${staff.firstName} ${staff.lastName}`,
              firstName: staff.firstName,
              lastName: staff.lastName,
              specialty: staff.specialty,
              rating: 4.2 + Math.random() * 0.8,
              email: staff.email,
              avatar: staff.avatar
            };
          }
          return null;
        }).filter(Boolean);

        // Calculate proper staffing levels
        const totalPositions = shift.totalPositions || shift.requiredWorkers || shift.required_staff || 1;
        const filledPositions = assignedWorkerIds.length;

        // Update shift with real assignment data
        const updatedShift = {
          ...shift,
          assignedStaff: assignedStaff,
          assignedStaffNames: assignedStaff.map((s: any) => s?.name),
          filledPositions: filledPositions,
          totalPositions: totalPositions,
          minStaff: shift.minStaff || Math.max(1, totalPositions - 1)
        };

        // Update status based on actual assignments
        if (filledPositions >= totalPositions) {
          updatedShift.status = "filled";
        } else if (filledPositions > 0) {
          updatedShift.status = "partially_filled";
        } else {
          updatedShift.status = "open";
        }

        // Debug logging for assignment tracking
        console.log(`Processing shift ${normalizedShiftId}:`, {
          originalShiftId: shift.id,
          normalizedShiftId,
          assignedWorkerIds,
          assignedStaffCount: assignedStaff.length,
          assignedStaffNames: assignedStaff.map((s: any) => s?.name),
          filledPositions,
          totalPositions,
          status: updatedShift.status
        });

        return updatedShift;
      }));

      res.json(allShifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // Database-backed assignment tracking using existing shift_assignments table
  const getShiftAssignments = async (shiftId: string | number) => {
    try {
      console.log(`[ROUTES DEBUG] Getting assignments for shift ${shiftId}`);
      const assignments = await storage.getShiftAssignments(shiftId.toString());
      console.log(`[ROUTES DEBUG] Retrieved ${assignments.length} assignments for shift ${shiftId}`);
      return assignments.map(a => a.workerId);
    } catch (error) {
      console.error(`Error fetching assignments for shift ${shiftId}:`, error);
      return [];
    }
  };

  const addShiftAssignment = async (shiftId: string | number, workerId: number, assignedById: number = 1) => {
    try {
      await storage.addShiftAssignment({
        shiftId: shiftId.toString(),
        workerId,
        assignedById,
        status: 'assigned'
      });
      console.log(`Added assignment: worker ${workerId} to shift ${shiftId}`);
    } catch (error) {
      console.error(`Error adding assignment:`, error);
      throw error;
    }
  };

  const removeShiftAssignment = async (shiftId: string | number, workerId: number) => {
    try {
      await storage.updateShiftAssignmentStatus(shiftId.toString(), workerId, 'unassigned');
      console.log(`Removed assignment: worker ${workerId} from shift ${shiftId}`);
    } catch (error) {
      console.error(`Error removing assignment:`, error);
      throw error;
    }
  };

  // Get shift data helper function
  function getShiftData() {
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
        rate: 45.0,
        urgency: "high",
        description: "12-hour ICU nursing shift, ACLS certification required",
      }
    ];

    const templateShifts = (global as any).templateGeneratedShifts || [];
    return [...exampleShifts, ...templateShifts];
  }

  // Enhanced shift requests API with database-backed assignment checking
  app.get("/api/shift-requests/:shiftId", requireAuth, async (req, res) => {
    try {
      const shiftId = req.params.shiftId; // Keep as string to match stable ID format

      // Get already assigned workers for this shift from database
      const currentAssignments = await storage.getShiftAssignments(shiftId);
      const assignedWorkerIds = currentAssignments.map(a => a.workerId);

      // Get the shift to determine specialty requirement and capacity
      // Check both example shifts and database-generated shifts
      const allShifts = getShiftData();
      let targetShift = allShifts.find(s => s.id.toString() === shiftId);

      // If not found in example shifts, check database-generated shifts
      if (!targetShift) {
        const generatedShift = await storage.getGeneratedShift(shiftId);
        if (generatedShift) {
          targetShift = {
            id: generatedShift.id,
            specialty: generatedShift.specialty,
            requiredWorkers: generatedShift.requiredWorkers,
            totalPositions: generatedShift.requiredWorkers,
            title: generatedShift.title,
            department: generatedShift.department
          };
        }
      }

      if (!targetShift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      const requiredSpecialty = targetShift?.specialty || "RN";
      const maxCapacity = targetShift?.requiredWorkers || targetShift?.totalPositions || 3;

      // Check if shift is already at capacity
      const isAtCapacity = currentAssignments.length >= maxCapacity;

      // Get staff data for realistic requests
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();

      const filteredStaff = dbStaffData.filter(staff => {
        // Strict role validation - exclude all admin/management roles
        const ineligibleRoles = ['super_admin', 'facility_admin', 'admin', 'facility_manager', 'manager'];
        if (ineligibleRoles.includes(staff.role)) return false;

        // Strict email validation - exclude known superusers
        const superuserEmails = ['joshburn@nexspace.com', 'josh.burnett@nexspace.com', 'brian.nangle@nexspace.com'];
        if (superuserEmails.includes(staff.email)) return false;

        // Filter out already assigned workers
        if (assignedWorkerIds.includes(staff.id)) return false;

        // Strict specialty matching - only workers with exact specialty match
        if (staff.specialty !== requiredSpecialty) return false;

        // Only include internal employees and verified contractors
        if (!['internal_employee', 'contractor_1099'].includes(staff.role)) return false;

        return true;
      });

      // Return available workers only if shift has remaining capacity
      let shiftRequests: any[] = [];

      if (!isAtCapacity && filteredStaff.length > 0) {
        // Generate realistic shift requests from unassigned workers
        shiftRequests = filteredStaff.slice(0, Math.min(6, maxCapacity - currentAssignments.length)).map((staff, index) => ({
          id: parseInt(shiftId.toString()) * 100 + index,
          shiftId: shiftId,
          workerId: staff.id,
          workerName: `${staff.firstName} ${staff.lastName}`,
          workerEmail: staff.email,
          specialty: staff.specialty,
          reliabilityScore: Math.floor(85 + Math.random() * 15), // 85-100%
          totalShiftsWorked: Math.floor(50 + Math.random() * 150), // 50-200 shifts
          averageRating: 4.2 + Math.random() * 0.8, // 4.2-5.0 rating
          requestedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          certifications: staff.specialty === "RN" ? ["RN", "ACLS", "BLS"] : 
                         staff.specialty === "LPN" ? ["LPN", "BLS"] : 
                         ["CST", "BLS"],
          hourlyRate: staff.specialty === "RN" ? 45 + Math.random() * 10 : 
                     staff.specialty === "LPN" ? 35 + Math.random() * 8 : 
                     40 + Math.random() * 8,
          availability: "Available",
          profileUrl: `/enhanced-staff?profile=${staff.id}`
        }));
      }

      console.log(`[SHIFT REQUESTS] Shift ${shiftId}: ${currentAssignments.length}/${maxCapacity} filled, returning ${shiftRequests.length} available workers`);
      res.json(shiftRequests);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Shift assignment endpoint
  app.post("/api/shifts/:shiftId/assign", requireAuth, async (req, res) => {
    try {
      const shiftId = req.params.shiftId;
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
      }

      // Get shift details - prioritize generated shifts (string IDs) over regular shifts
      let shift;

      // Try generated shift first (most common case for assignments)
      const generatedShift = await storage.getGeneratedShift(shiftId);
      if (generatedShift) {
        shift = {
          id: parseInt(generatedShift.id) || 0,
          title: generatedShift.title,
          specialty: generatedShift.specialty,
          description: generatedShift.description,
          facilityId: generatedShift.facilityId,
          department: generatedShift.department,
          date: generatedShift.date,
          startTime: generatedShift.startTime,
          endTime: generatedShift.endTime,
          rate: generatedShift.rate,
          status: generatedShift.status,
          urgency: generatedShift.urgency,
          requiredStaff: generatedShift.requiredWorkers || generatedShift.totalPositions || 3,
          assignedStaffIds: [],
          specialRequirements: [],
          createdById: 1,
          createdAt: generatedShift.createdAt,
          updatedAt: generatedShift.updatedAt,
          facilityName: generatedShift.facilityName,
          premiumMultiplier: generatedShift.rate
        };
      } else {
        // For regular shifts, get from the example shifts data since database shifts table doesn't have title column
        const allShifts = getShiftData();
        const exampleShift = allShifts.find(s => s.id.toString() === shiftId);

        if (exampleShift) {
          shift = {
            id: exampleShift.id,
            title: exampleShift.title,
            specialty: exampleShift.specialty,
            description: exampleShift.description,
            facilityId: exampleShift.facilityId,
            department: exampleShift.department,
            date: exampleShift.date,
            startTime: exampleShift.startTime,
            endTime: exampleShift.endTime,
            rate: exampleShift.rate,
            status: exampleShift.status,
            urgency: exampleShift.urgency,
            requiredStaff: exampleShift.requiredWorkers || exampleShift.totalPositions || 3,
            assignedStaffIds: [],
            specialRequirements: [],
            createdById: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            facilityName: exampleShift.facilityName,
            premiumMultiplier: exampleShift.rate
          };
        }
      }

      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Get worker details to validate they can be assigned
      const worker = await storage.getUser(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // Strict validation - prevent superusers/admins from being assigned
      const ineligibleRoles = ['super_admin', 'facility_admin', 'admin', 'facility_manager', 'manager'];
      const superuserEmails = ['joshburn@nexspace.com', 'josh.burnett@nexspace.com', 'brian.nangle@nexspace.com'];

      if (ineligibleRoles.includes(worker.role) || superuserEmails.includes(worker.email)) {
        return res.status(400).json({ 
          message: `Administrative users cannot be assigned to shifts. Only clinical staff can work shifts.` 
        });
      }

      // Only allow internal employees and verified contractors
      if (!['internal_employee', 'contractor_1099'].includes(worker.role)) {
        return res.status(400).json({ 
          message: `Only clinical staff can be assigned to shifts` 
        });
      }

      // Strict specialty validation - prevent mismatched assignments
      if (worker.specialty !== shift.specialty) {
        return res.status(400).json({ 
          message: `Specialty mismatch: ${worker.specialty} worker cannot be assigned to ${shift.specialty} shift` 
        });
      }

      // Additional validation for specific specialty restrictions
      if (shift.specialty === 'CST' && worker.specialty !== 'CST') {
        return res.status(400).json({ 
          message: `Only certified surgical technicians (CST) can be assigned to OR shifts` 
        });
      }

      if (shift.specialty === 'RN' && !['RN', 'BSN', 'MSN'].includes(worker.specialty || '')) {
        return res.status(400).json({ 
          message: `Only registered nurses can be assigned to RN shifts` 
        });
      }

      // Get current assignments for this shift using string ID
      const currentAssignments = await storage.getShiftAssignments(shiftId);
      const assignedWorkerIds = currentAssignments.map(a => a.workerId);

      // Check if worker is already assigned
      if (assignedWorkerIds.includes(workerId)) {
        return res.status(400).json({ message: "Worker is already assigned to this shift" });
      }

      // Get shift capacity from database - use all possible field names for required workers
      const maxCapacity = shift.requiredStaff || 
                          shift.requiredWorkers || 
                          shift.totalPositions || 
                          shift.required_staff ||
                          generatedShift?.requiredWorkers || 
                          generatedShift?.maxStaff || 
                          generatedShift?.totalPositions ||
                          3; // Default to 3 for multi-worker shifts instead of 1

      console.log(`[CAPACITY CHECK] Shift ${shiftId}: maxCapacity=${maxCapacity}, currentAssignments=${currentAssignments.length}`);
      if (currentAssignments.length >= maxCapacity) {
        return res.status(400).json({ 
          message: `Shift is at full capacity (${currentAssignments.length}/${maxCapacity})` 
        });
      }

      // Add worker to assignments using storage interface
      await storage.addShiftAssignment({
        shiftId: shiftId,
        workerId: workerId,
        assignedById: (req as any).user?.id || 1,
        status: 'assigned'
      });

      // Get updated assignments and verify the assignment was successful
      const updatedAssignments = await storage.getShiftAssignments(shiftId);
      const assignmentConfirmed = updatedAssignments.find(a => a.workerId === workerId);

      if (!assignmentConfirmed) {
        return res.status(500).json({ 
          message: "Assignment failed - could not confirm in database" 
        });
      }

      // Broadcast real-time update to all connected clients for immediate UI sync
      if (wss) {
        const updateMessage = {
          type: 'SHIFT_ASSIGNMENT_UPDATED',
          shiftId: shiftId,
          workerId: workerId,
          workerName: `${worker.firstName} ${worker.lastName}`,
          assignments: updatedAssignments,
          assignedWorkers: updatedAssignments.length,
          maxCapacity: maxCapacity,
          action: 'assigned'
        };

        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(updateMessage));
          }
        });
      }

      console.log(`[ASSIGNMENT SUCCESS] Worker ${workerId} (${worker.firstName} ${worker.lastName}) assigned to shift ${shiftId}. Total: ${updatedAssignments.length}/${maxCapacity}`);

      res.json({ 
        success: true, 
        message: "Worker assigned successfully",
        assignedWorkers: updatedAssignments.length,
        maxCapacity: maxCapacity,
        assignments: updatedAssignments,
        workerName: `${worker.firstName} ${worker.lastName}`
      });
    } catch (error) {
      console.error("Error assigning worker:", error);
      res.status(500).json({ message: "Failed to assign worker" });
    }
  });

  // Shift unassignment endpoint
  app.post("/api/shifts/:shiftId/unassign", requireAuth, async (req, res) => {
    try {
      const shiftId = req.params.shiftId;
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
      }

      // Get current assignments for this shift using string ID
      const currentAssignments = await storage.getShiftAssignments(shiftId);
      const assignedWorkerIds = currentAssignments.map(a => a.workerId);

      // Check if worker is assigned
      if (!assignedWorkerIds.includes(workerId)) {
        return res.status(400).json({ message: "Worker is not assigned to this shift" });
      }

      // Update assignment status to 'unassigned' instead of deleting
      await storage.updateShiftAssignmentStatus(shiftId, workerId, 'unassigned');

      // Get updated assignments (only active ones)
      const updatedAssignments = await storage.getShiftAssignments(shiftId);

      console.log(`Worker ${workerId} unassigned from shift ${shiftId}. Total assigned: ${updatedAssignments.length}`);

      res.json({ 
        success: true, 
        message: "Worker unassigned successfully",
        assignedWorkers: updatedAssignments.length,
        assignments: updatedAssignments
      });
    } catch (error) {
      console.error("Error unassigning worker:", error);
      res.status(500).json({ message: "Failed to unassign worker" });
    }
  });

  // Enhanced assignment endpoint with database backing and proper capacity checking
  app.post("/api/shifts/:shiftId/assign-enhanced", requireAuth, async (req, res) => {
    try {
      const shiftId = req.params.shiftId; // Keep as string to match stable ID format
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
      }

      // Get shift details to check capacity
      const allShifts = getShiftData();
      const targetShift = allShifts.find(s => s.id.toString() === shiftId);

      if (!targetShift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Check current assignments from database
      const currentAssignments = await storage.getShiftAssignments(shiftId);
      const assignedWorkerIds = currentAssignments.map(a => a.workerId);

      // Check if worker is already assigned
      if (assignedWorkerIds.includes(workerId)) {
        return res.status(400).json({ message: "Worker is already assigned to this shift" });
      }

      // Check capacity - allow assignment up to requiredWorkers limit
      const maxCapacity = targetShift.requiredWorkers || 3;
      if (currentAssignments.length >= maxCapacity) {
        return res.status(400).json({ message: "Shift is already fully staffed" });
      }

      // Get worker details
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();
      const worker = dbStaffData.find(staff => staff.id === workerId);

      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // Add assignment to database
      await storage.addShiftAssignment({
        shiftId: shiftId,
        workerId: workerId,
        assignedById: req.user?.id || 1,
        status: 'assigned'
      });

      // Get updated assignments
      const updatedAssignments = await storage.getShiftAssignments(shiftId);
      const filledPositions = updatedAssignments.length;

      // Broadcast update to connected clients
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'SHIFT_ASSIGNMENT_UPDATE',
            shiftId: shiftId,
            filledPositions: filledPositions,
            totalPositions: maxCapacity,
            status: filledPositions >= maxCapacity ? 'filled' : 'partially_filled'
          }));
        }
      });

      console.log(`Worker ${workerId} assigned to shift ${shiftId}. Total assigned: ${filledPositions}/${maxCapacity}`);

      res.json({
        success: true,
        message: "Worker assigned successfully",
        assignedWorkers: filledPositions,
        totalCapacity: maxCapacity
      });
    } catch (error) {
      console.error("Error assigning worker to shift:", error);
      res.status(500).json({ message: "Failed to assign worker to shift" });
    }
  });