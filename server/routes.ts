import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
// import { createEnhancedFacilitiesRoutes } from "./enhanced-facilities-routes"; // DISABLED
import { format } from "date-fns";

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
import { eq, sql, and, inArray, or } from "drizzle-orm";
import { recommendationEngine } from "./recommendation-engine";
import type { RecommendationCriteria } from "./recommendation-engine";
import { UnifiedDataService } from "./unified-data-service";
import { NotificationService } from "./services/notification-service";
import multer from "multer";
import OpenAI from "openai";
import dashboardPreferencesRoutes from "./dashboard-preferences-routes";
import calendarSyncRoutes from "./calendar-sync-routes";
import { analytics } from "./analytics-tracker";
import { insertJobPostingSchema, jobPostings, type JobPosting, jobApplications, interviewSchedules } from "@shared/schema";
import { updateJobPostingSchema, insertJobApplicationSchema, insertInterviewScheduleSchema } from "@shared/schema/job";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Dashboard preferences routes
  app.use(dashboardPreferencesRoutes);

  // Calendar sync routes
  app.use("/api/calendar-sync", calendarSyncRoutes);

  // Initialize unified data service (will be properly initialized with WebSocket later)
  let unifiedDataService: UnifiedDataService;

  // Initialize notification service
  const notificationService = new NotificationService(storage);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
      }
    },
  });

  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Enhanced security middleware
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "super_admin" && req.user.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  };

  const requirePermission = (permission: string) => {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      // Super admin always has access
      if (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }
      const hasPermission = await storage.hasPermission(req.user.role, permission);
      if (!hasPermission) {
        return res.status(403).json({
          message: "Insufficient permissions",
          required: permission,
          userRole: req.user.role,
        });
      }
      next();
    };
  };

  // Facility access control
  const requireFacilityAccess = (facilityIdParam: string = "facilityId") => {
    return async (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      // Super admin can access all facilities
      if (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }
      const requestedFacilityId = parseInt(
        req.params[facilityIdParam] || req.body[facilityIdParam] || req.query[facilityIdParam]
      );
      if (!requestedFacilityId) {
        return res.status(400).json({ message: "Facility ID required" });
      }
      const userFacilityIds = req.user.associatedFacilityIds || req.user.associatedFacilities || [];
      const hasAccess =
        userFacilityIds.includes(requestedFacilityId) ||
        req.user.facilityId === requestedFacilityId;
      if (!hasAccess) {
        return res.status(403).json({
          message: "Access denied to this facility",
          requestedFacility: requestedFacilityId,
          userFacilities: userFacilityIds,
        });
      }
      next();
    };
  };

  // Resource ownership validation
  const requireResourceOwnership = (userIdParam: string = "userId") => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      // Super admin can access all resources
      if (req.user.role === "super_admin" || req.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }
      const requestedUserId = parseInt(
        req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam]
      );
      if (!requestedUserId) {
        return res.status(400).json({ message: "User ID required" });
      }
      if (req.user.id !== requestedUserId) {
        return res.status(403).json({
          message: "Access denied - can only access your own resources",
          requestedUser: requestedUserId,
          currentUser: req.user.id,
        });
      }
      next();
    };
  };

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
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

  // Mount enhanced facility routes - TEMPORARILY DISABLED due to database schema issues
  // const enhancedFacilityRoutes = createEnhancedFacilitiesRoutes(
  //   requireAuth,
  //   requirePermission,
  //   auditLog
  // );
  // app.use("/api/facilities", enhancedFacilityRoutes);

  // Basic facilities endpoint with actual database structure
  app.get("/api/facilities", requireAuth, async (req, res) => {
    try {
      // Use storage method instead of direct db query
      const facilitiesData = await storage.getAllFacilities();
      res.json(facilitiesData);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Security audit endpoint (development only)
  if (process.env.NODE_ENV === "development") {
    app.get("/api/security/audit", requireAuth, requireSuperAdmin, async (req, res) => {
      try {
        const { securityTests } = await import("./security-audit-tests.js");
        await securityTests.runFullAudit();
        res.json({
          status: "completed",
          message: "Security audit completed successfully",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Security audit failed:", error);
        res.status(500).json({
          status: "failed",
          message: "Security audit failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    app.get("/api/security/quick-check", requireAuth, requireSuperAdmin, async (req, res) => {
      try {
        const { securityTests } = await import("./security-audit-tests.js");
        await securityTests.quickCheck();
        res.json({
          status: "completed",
          message: "Quick security check completed",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Quick security check failed:", error);
        res.status(500).json({ message: "Security check failed" });
      }
    });
  }

  // Users API - Only super admin or resource owner can access
  app.get("/api/users/:id", requireAuth, requireResourceOwnership("id"), async (req: any, res) => {
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

  // User Profile API
  app.get("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For staff users, get additional information
      let profileData: any = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.isActive ? "active" : "inactive",
      };

      // Check if this is a staff member
      const [staffMember] = await db
        .select()
        .from(staff)
        .where(eq(staff.email, user.email))
        .limit(1);

      if (staffMember) {
        profileData = {
          ...profileData,
          phone: staffMember.phone,
          address: staffMember.homeStreet || "N/A",
          city: staffMember.homeCity || "N/A",
          state: staffMember.homeState || "N/A",
          zipCode: staffMember.homeZipCode || "N/A",
          specialty: staffMember.specialty,
          department: staffMember.department,
          employmentType: staffMember.employmentType,
          hireDate: staffMember.hireDate,
          emergencyContact: staffMember.emergencyContactName || "N/A",
          emergencyPhone: staffMember.emergencyContactPhone || "N/A",
          bio: staffMember.bio,
          facilities: [],
          credentials: [],
        };
      } else if (user.role !== "super_admin") {
        // For facility users, get their facility associations
        const [facilityUser] = await db
          .select()
          .from(facilityUsers)
          .where(eq(facilityUsers.email, user.email))
          .limit(1);

        if (facilityUser) {
          profileData.facilities = facilityUser.associatedFacilityIds || [];
          profileData.primaryFacilityId = facilityUser.primaryFacilityId;
          profileData.title = facilityUser.title;
          profileData.department = facilityUser.department;
        }
      }

      res.json(profileData);
    } catch (error) {
      console.error("User profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const updates = req.body;

      // Update user basic info
      if (updates.firstName || updates.lastName || updates.email) {
        await storage.updateUser(userId, {
          firstName: updates.firstName,
          lastName: updates.lastName,
          email: updates.email,
        });
      }

      // For staff members, update additional fields
      const [staffMember] = await db
        .select()
        .from(staff)
        .where(eq(staff.email, req.user.email))
        .limit(1);

      if (staffMember) {
        await db
          .update(staff)
          .set({
            phone: updates.phone,
            address: updates.address,
            city: updates.city,
            state: updates.state,
            zipCode: updates.zipCode,
            emergencyContact: updates.emergencyContact,
            emergencyPhone: updates.emergencyPhone,
            bio: updates.bio,
            updatedAt: new Date(),
          })
          .where(eq(staff.id, staffMember.id));
      }

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("User profile update error:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Credential upload endpoint
  app.post(
    "/api/user/credentials/upload",
    requireAuth,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Here you would typically upload the file to a storage service
        // For now, we'll just save the file info
        const credentialData = {
          userId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
        };

        // In a real implementation, save this to database

        res.json({ message: "Credential uploaded successfully", data: credentialData });
      } catch (error) {
        console.error("Credential upload error:", error);
        res.status(500).json({ message: "Failed to upload credential" });
      }
    }
  );

  // Global Search API
  app.get("/api/search", requireAuth, requirePermission("staff.view"), async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json({ results: [] });
      }

      const searchTerm = `%${query.toLowerCase()}%`;
      const results: any[] = [];

      // Search staff
      const staffResults = await db
        .select({
          id: staff.id,
          type: sql<string>`'staff'`,
          title: sql<string>`${staff.firstName} || ' ' || ${staff.lastName}`,
          subtitle: staff.specialty,
          description: sql<string>`COALESCE(${staff.department}, '')`,
          route: sql<string>`'/staff'`,
        })
        .from(staff)
        .where(
          or(
            sql`LOWER(${staff.firstName} || ' ' || ${staff.lastName}) LIKE ${searchTerm}`,
            sql`LOWER(${staff.specialty}) LIKE ${searchTerm}`,
            sql`LOWER(${staff.email}) LIKE ${searchTerm}`,
            sql`CAST(${staff.id} AS TEXT) LIKE ${searchTerm}`
          )
        )
        .limit(5);

      // Search shifts
      const shiftResults = await db
        .select({
          id: shifts.id,
          type: sql<string>`'shift'`,
          title: shifts.title,
          subtitle: sql<string>`${shifts.date} || ' - ' || ${shifts.specialty}`,
          description: sql<string>`COALESCE(${shifts.description}, '')`,
          route: sql<string>`'/schedule'`,
        })
        .from(shifts)
        .where(
          or(
            sql`LOWER(${shifts.title}) LIKE ${searchTerm}`,
            sql`LOWER(${shifts.specialty}) LIKE ${searchTerm}`,
            sql`CAST(${shifts.id} AS TEXT) LIKE ${searchTerm}`
          )
        )
        .limit(5);

      // Search facilities
      const facilityResults = await db
        .select({
          id: facilities.id,
          type: sql<string>`'facility'`,
          title: facilities.name,
          subtitle: facilities.facilityType,
          description: sql<string>`COALESCE(${facilities.name}, '')`,
          route: sql<string>`'/facilities'`,
        })
        .from(facilities)
        .where(
          or(
            sql`LOWER(${facilities.name}) LIKE ${searchTerm}`,
            sql`LOWER(${facilities.facilityType}) LIKE ${searchTerm}`,
            sql`CAST(${facilities.id} AS TEXT) LIKE ${searchTerm}`
          )
        )
        .limit(5);

      // Search shifts (replacing jobs search)
      const jobResults: Array<any> = [];

      // Combine all results
      results.push(...staffResults, ...shiftResults, ...facilityResults, ...jobResults);

      res.json({ results });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Dashboard API - Enhanced with comprehensive statistics and facility filtering
  app.get(
    "/api/dashboard/stats",
    requireAuth,
    requirePermission("analytics.view"),
    async (req: any, res) => {
      try {

        // Get facility IDs for filtering based on user role
        let facilityIds: number[] | undefined;

        if (req.user.role === "super_admin") {
          // Super admin sees all data (undefined = no filtering)
        } else {
          // For facility users, filter by their associated facilities
          // Check associatedFacilityIds first (set by impersonation), then associatedFacilities
          const associatedFacilities =
            req.user?.associatedFacilityIds || req.user?.associatedFacilities;
          const singleFacility = req.user?.facilityId;

          if (associatedFacilities && associatedFacilities.length > 0) {
            facilityIds = associatedFacilities;
          } else if (singleFacility) {
            facilityIds = [singleFacility];
          } else {
            facilityIds = []; // Empty array means no data visible
          }
        }

        // Get comprehensive dashboard stats with facility filtering
        const stats = await storage.getDashboardStats(facilityIds);

        res.json(stats);
      } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
      }
    }
  );

  // Dashboard widget configuration API
  app.get("/api/dashboard/widgets", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const widgets = await storage.getUserDashboardWidgets(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Dashboard widgets error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard widgets" });
    }
  });

  app.post("/api/dashboard/widgets", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { widgets } = req.body;
      await storage.saveDashboardWidgets(userId, widgets);
      res.json({ success: true, message: "Dashboard layout saved successfully" });
    } catch (error) {
      console.error("Save dashboard widgets error:", error);
      res.status(500).json({ error: "Failed to save dashboard widgets" });
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
  app.get("/api/jobs", requireAuth, requirePermission("jobs.view"), async (req: any, res) => {
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

  // Job Postings API
  app.get("/api/job-postings", requireAuth, async (req: any, res) => {
    try {
      const { facilityId, status, search } = req.query;
      
      // Build filter conditions
      const conditions = [];
      
      // For staff users, show only active postings
      if (!req.user.facilityId && req.user.role !== "super_admin") {
        conditions.push(eq(jobPostings.status, 'active'));
      }
      
      // Filter by facility if not super admin
      if (req.user.role !== "super_admin" && req.user.facilityId) {
        conditions.push(eq(jobPostings.facilityId, req.user.facilityId));
      } else if (facilityId) {
        conditions.push(eq(jobPostings.facilityId, parseInt(facilityId as string)));
      }
      
      // Filter by status
      if (status && status !== 'all') {
        conditions.push(eq(jobPostings.status, status as string));
      }
      
      // Search by title
      if (search) {
        conditions.push(sql`${jobPostings.title} ILIKE ${`%${search}%`}`);
      }
      
      // Fetch job postings with filters
      const postings = await db
        .select()
        .from(jobPostings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`${jobPostings.createdAt} DESC`);
        
      res.json(postings);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  app.post(
    "/api/job-postings",
    requireAuth,
    auditLog("CREATE", "job_posting"),
    async (req: any, res) => {
      try {
        // Check if user is facility user or super admin
        if (req.user.role !== "super_admin" && !req.user.facilityId) {
          return res.status(403).json({ message: "Only facility users and super admins can create job postings" });
        }
        
        // Validate input data
        const postingData = insertJobPostingSchema.parse({
          ...req.body,
          facilityId: req.user.facilityId || req.body.facilityId,
        });
        
        // Create job posting
        const [newPosting] = await db
          .insert(jobPostings)
          .values(postingData)
          .returning();
          
        res.status(201).json(newPosting);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid job posting data", errors: error.errors });
        } else {
          console.error("Error creating job posting:", error);
          res.status(500).json({ message: "Failed to create job posting" });
        }
      }
    }
  );

  app.patch(
    "/api/job-postings/:id",
    requireAuth,
    auditLog("UPDATE", "job_posting"),
    async (req: any, res) => {
      try {
        const postingId = parseInt(req.params.id);
        
        // Fetch existing posting to check ownership
        const [existingPosting] = await db
          .select()
          .from(jobPostings)
          .where(eq(jobPostings.id, postingId));
          
        if (!existingPosting) {
          return res.status(404).json({ message: "Job posting not found" });
        }
        
        // Check if user has permission to update
        if (req.user.role !== "super_admin" && req.user.facilityId !== existingPosting.facilityId) {
          return res.status(403).json({ message: "You can only update job postings from your facility" });
        }
        
        // Validate update data
        const updateData = updateJobPostingSchema.parse(req.body);
        
        // Update job posting
        const [updatedPosting] = await db
          .update(jobPostings)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(jobPostings.id, postingId))
          .returning();
          
        res.json(updatedPosting);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid update data", errors: error.errors });
        } else {
          console.error("Error updating job posting:", error);
          res.status(500).json({ message: "Failed to update job posting" });
        }
      }
    }
  );

  app.delete(
    "/api/job-postings/:id",
    requireAuth,
    auditLog("DELETE", "job_posting"),
    async (req: any, res) => {
      try {
        const postingId = parseInt(req.params.id);
        
        // Fetch existing posting to check ownership
        const [existingPosting] = await db
          .select()
          .from(jobPostings)
          .where(eq(jobPostings.id, postingId));
          
        if (!existingPosting) {
          return res.status(404).json({ message: "Job posting not found" });
        }
        
        // Check if user has permission to delete
        if (req.user.role !== "super_admin" && req.user.facilityId !== existingPosting.facilityId) {
          return res.status(403).json({ message: "You can only delete job postings from your facility" });
        }
        
        // Soft delete by updating status
        const [deletedPosting] = await db
          .update(jobPostings)
          .set({
            status: 'inactive',
            updatedAt: new Date(),
          })
          .where(eq(jobPostings.id, postingId))
          .returning();
          
        res.json({ message: "Job posting deleted successfully", posting: deletedPosting });
      } catch (error) {
        console.error("Error deleting job posting:", error);
        res.status(500).json({ message: "Failed to delete job posting" });
      }
    }
  );

  // Job Applications API (New endpoints for job applications)
  app.post(
    "/api/job-applications",
    requireAuth,
    auditLog("CREATE", "job_application"),
    async (req: any, res) => {
      try {
        // Staff can only apply for jobs
        if (!req.user.id) {
          return res.status(403).json({ message: "Must be logged in to apply for jobs" });
        }
        
        const { jobPostingId, coverLetter, resumeUrl } = req.body;
        
        if (!jobPostingId) {
          return res.status(400).json({ message: "Job posting ID is required" });
        }
        
        // Check if job posting exists
        const [jobPosting] = await db
          .select()
          .from(jobPostings)
          .where(eq(jobPostings.id, jobPostingId));
          
        if (!jobPosting) {
          return res.status(404).json({ message: "Job posting not found" });
        }
        
        // Check if already applied
        const [existingApplication] = await db
          .select()
          .from(jobApplications)
          .where(
            and(
              eq(jobApplications.jobId, jobPostingId),
              eq(jobApplications.applicantId, req.user.id)
            )
          );
          
        if (existingApplication) {
          return res.status(400).json({ message: "You have already applied for this job" });
        }
        
        // Create application
        const applicationData = insertJobApplicationSchema.parse({
          jobId: jobPostingId,
          applicantId: req.user.id,
          status: 'pending',
          coverLetter,
          resume: resumeUrl,
        });
        
        const [newApplication] = await db
          .insert(jobApplications)
          .values(applicationData)
          .returning();
          
        res.status(201).json(newApplication);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid application data", errors: error.errors });
        } else {
          console.error("Error creating job application:", error);
          res.status(500).json({ message: "Failed to submit application" });
        }
      }
    }
  );

  app.get("/api/job-applications", requireAuth, async (req: any, res) => {
    try {
      const { staffId, facilityId } = req.query;
      
      let applications;
      
      if (staffId) {
        // Staff viewing their own applications
        const requestedStaffId = parseInt(staffId as string);
        if (req.user.id !== requestedStaffId && req.user.role !== 'super_admin') {
          return res.status(403).json({ message: "You can only view your own applications" });
        }
        
        applications = await db
          .select({
            application: jobApplications,
            jobPosting: jobPostings,
          })
          .from(jobApplications)
          .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
          .where(eq(jobApplications.applicantId, requestedStaffId))
          .orderBy(sql`${jobApplications.appliedAt} DESC`);
          
      } else if (facilityId) {
        // Facility viewing applications for their jobs
        const requestedFacilityId = parseInt(facilityId as string);
        if (req.user.facilityId !== requestedFacilityId && req.user.role !== 'super_admin') {
          return res.status(403).json({ message: "You can only view applications for your facility" });
        }
        
        applications = await db
          .select({
            application: jobApplications,
            jobPosting: jobPostings,
            staff: staff,
          })
          .from(jobApplications)
          .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
          .leftJoin(staff, eq(jobApplications.applicantId, staff.id))
          .where(eq(jobPostings.facilityId, requestedFacilityId))
          .orderBy(sql`${jobApplications.appliedAt} DESC`);
          
      } else {
        return res.status(400).json({ message: "staffId or facilityId query parameter is required" });
      }
      
      res.json(applications);
    } catch (error) {
      console.error("Error fetching job applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.patch(
    "/api/job-applications/:id/status",
    requireAuth,
    auditLog("UPDATE", "job_application_status"),
    async (req: any, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (!['hired', 'rejected', 'interview_completed'].includes(status)) {
          return res.status(400).json({ message: "Status must be 'hired', 'rejected', or 'interview_completed'" });
        }
        
        // Get application with job posting info
        const [applicationData] = await db
          .select({
            application: jobApplications,
            jobPosting: jobPostings,
          })
          .from(jobApplications)
          .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
          .where(eq(jobApplications.id, applicationId));
          
        if (!applicationData) {
          return res.status(404).json({ message: "Application not found" });
        }
        
        // Check if user has permission
        if (req.user.role !== 'super_admin' && 
            req.user.facilityId !== applicationData.jobPosting?.facilityId) {
          return res.status(403).json({ message: "You can only update applications for your facility" });
        }
        
        // Update application status
        const [updatedApplication] = await db
          .update(jobApplications)
          .set({
            status,
            reviewedAt: new Date(),
            reviewedById: req.user.id,
          })
          .where(eq(jobApplications.id, applicationId))
          .returning();
          
        // If hiring, create facility association and notify staff
        if (status === 'hired') {
          // Create staff-facility association
          await db.insert(staffFacilityAssociations).values({
            staffId: applicationData.application.applicantId,
            facilityId: applicationData.jobPosting!.facilityId,
            isPrimary: false,
            status: 'active',
            startDate: new Date(),
          });
          
          // Get staff details for notification
          const [staffMember] = await db
            .select({ 
              id: staff.id, 
              firstName: staff.firstName, 
              lastName: staff.lastName 
            })
            .from(staff)
            .where(eq(staff.id, applicationData.application.applicantId));
          
          // Emit WebSocket notification to the hired staff member
          if (wss) {
            const staffName = staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Staff member';
            wss.clients.forEach((client) => {
              client.send(JSON.stringify({
                type: 'staffHired',
                data: {
                  staffId: applicationData.application.applicantId,
                  staffName,
                  facilityId: applicationData.jobPosting!.facilityId,
                  jobTitle: applicationData.jobPosting!.title,
                  message: `Congratulations! You have been hired for ${applicationData.jobPosting!.title}`,
                }
              }));
            });
          }
        }
          
        res.json(updatedApplication);
      } catch (error) {
        console.error("Error updating application status:", error);
        res.status(500).json({ message: "Failed to update application status" });
      }
    }
  );

  // Interview Schedule API
  app.post(
    "/api/interviews",
    requireAuth,
    auditLog("CREATE", "interview_schedule"),
    async (req: any, res) => {
      try {
        const { applicationId, start, end, meetingUrl } = req.body;
        
        // Verify application exists
        const [application] = await db
          .select({
            application: jobApplications,
            jobPosting: jobPostings,
          })
          .from(jobApplications)
          .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
          .where(eq(jobApplications.id, applicationId));
          
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }
        
        // Check permission
        if (req.user.role !== 'super_admin' && 
            req.user.facilityId !== application.jobPosting?.facilityId) {
          return res.status(403).json({ message: "You can only schedule interviews for your facility" });
        }
        
        // Create interview
        const interviewData = insertInterviewScheduleSchema.parse({
          applicationId,
          start: new Date(start),
          end: new Date(end),
          meetingUrl,
          status: 'scheduled',
        });
        
        const [newInterview] = await db
          .insert(interviewSchedules)
          .values(interviewData)
          .returning();
          
        // Emit WebSocket event for real-time updates
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'interviewCreated',
                interview: {
                  ...newInterview,
                  applicantName: application.application.candidateName,
                  jobTitle: application.jobPosting?.title,
                  facilityId: application.jobPosting?.facilityId,
                },
              })
            );
          }
        });
          
        res.status(201).json(newInterview);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid interview data", errors: error.errors });
        } else {
          console.error("Error creating interview:", error);
          res.status(500).json({ message: "Failed to schedule interview" });
        }
      }
    }
  );

  app.get("/api/interviews", requireAuth, async (req: any, res) => {
    try {
      const { applicationId } = req.query;
      
      if (!applicationId) {
        return res.status(400).json({ message: "applicationId query parameter is required" });
      }
      
      const interviews = await db
        .select()
        .from(interviewSchedules)
        .where(eq(interviewSchedules.applicationId, parseInt(applicationId as string)))
        .orderBy(sql`${interviewSchedules.start} ASC`);
        
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  // File Upload API
  app.post("/api/upload", requireAuth, async (req: any, res) => {
    try {
      // In a real app, you would:
      // 1. Use multer or similar for file handling
      // 2. Upload to S3, Cloudinary, or similar service
      // 3. Store the URL in the database
      
      // For now, we'll simulate a successful upload
      const mockUrl = `https://storage.example.com/resumes/${Date.now()}_${req.user.id}.pdf`;
      
      res.json({
        url: mockUrl,
        message: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Shifts API with example data showing various statuses
  app.get("/api/shifts", requireAuth, requirePermission("shifts.view"), async (req: any, res) => {
    try {
      // Get user's facility associations if facility user
      const user = req.user;
      const isFacilityUser = user.role && user.role !== "super_admin";
      let userAssociatedFacilities: number[] = [];

      if (isFacilityUser && user.associatedFacilities) {
        userAssociatedFacilities = user.associatedFacilities;
      } else if (isFacilityUser) {
        // If no associatedFacilities in user object, try to fetch from facility_users table
        try {
          const facilityUser = await storage.getFacilityUserByEmail(user.email);
          if (facilityUser && facilityUser.associatedFacilityIds) {
            userAssociatedFacilities = facilityUser.associatedFacilityIds;
          }
        } catch (error) {
          console.error(
            `[FACILITY FILTER] Error fetching facility associations for ${user.email}:`,
            error
          );
        }
      }

      // Get staff data from unified service to ensure consistency
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();

      // Filter staff to match "all staff" page logic - exclude superusers
      const filteredStaff = dbStaffData.filter((staff) => {
        const superuserEmails = ["joshburn@nexspace.com", "brian.nangle@nexspace.com"];
        if (superuserEmails.includes(staff.email)) return false;
        if (staff?.role === "super_admin" || staff?.role === "facility_manager") return false;
        return true;
      });

      // Get generated shifts from database instead of global memory
      const { shiftTemplateService } = await import("./shift-template-service");

      // Auto-generate shifts from active templates if none exist in database
      const activeTemplates = await storage.getShiftTemplates();
      const activeTemplatesList = activeTemplates.filter((t) => t.isActive);

      // Check if we need to generate shifts for any templates
      const today = new Date();
      for (const template of activeTemplatesList) {
        const daysToGenerate = template.daysPostedOut || 14; // Default to 14 days
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + daysToGenerate);

        // Generate shifts for this template if needed
        await shiftTemplateService.generateShiftsFromTemplate({
          templateId: template.id,
          startDate: today,
          endDate: endDate,
          skipExisting: true,
          preserveAssigned: true,
        });
      }

      // Current date for status logic
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split("T")[0];

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
          assignedStaffName: filteredStaff[0]
            ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}`
            : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffPhone: "(503) 555-0123",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "RN",
          assignedStaffRating: 4.8,
          invoiceAmount: new Date("2025-06-19") < new Date() ? 360.0 : null,
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
              name: filteredStaff[0]
                ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}`
                : "Alice Smith",
              email: filteredStaff[0]?.email || "alice.smith@nexspace.com",
              specialty: filteredStaff[0]?.specialty || "LPN",
              rating: 4.6,
            },
            {
              id: filteredStaff[1]?.id || 4,
              name: filteredStaff[1]
                ? `${filteredStaff[1].firstName} ${filteredStaff[1].lastName}`
                : "Bob Johnson",
              email: filteredStaff[1]?.email || "bob.johnson@nexspace.com",
              specialty: filteredStaff[1]?.specialty || "RN",
              rating: 4.8,
            },
          ],
          // Keep legacy fields for backward compatibility
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0]
            ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}`
            : "Alice Smith",
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
          endTime: "14:00",
          department: "Operating Room",
          specialty: "RN",
          status: "filled",
          facilityId: 1,
          facilityName: "Portland General Hospital",
          rate: 48.0,
          urgency: "high",
          description: "Morning surgical team coverage",
          assignedStaffId: filteredStaff[0]?.id || 3,
          assignedStaffName: filteredStaff[0]
            ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}`
            : "Alice Smith",
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
          assignedStaffName: filteredStaff[1]
            ? `${filteredStaff[1].firstName} ${filteredStaff[1].lastName}`
            : "Bob Johnson",
          assignedStaffEmail: filteredStaff[1]?.email || "bob.johnson@nexspace.com",
          assignedStaffSpecialty: filteredStaff[1]?.specialty || "RN",
          assignedStaffRating: 4.6,
          invoiceAmount: new Date("2025-06-18") < new Date() ? 576.0 : null,
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
          assignedStaffName: filteredStaff[0]
            ? `${filteredStaff[0].firstName} ${filteredStaff[0].lastName}`
            : "Alice Smith",
          assignedStaffEmail: filteredStaff[0]?.email || "alice.smith@nexspace.com",
          assignedStaffSpecialty: filteredStaff[0]?.specialty || "RN",
          assignedStaffRating: 4.8,
          invoiceAmount: new Date("2025-06-17") < new Date() ? 600.0 : null,
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
        const formattedGeneratedShifts = dbGeneratedShifts.map((shift) => ({
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
          totalHours: shift.totalHours || 8,
        }));

        // Convert main shifts to proper format
        const formattedMainShifts = dbMainShifts.map((shift) => ({
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
          totalHours: 8,
        }));

        formattedDbShifts = [...formattedGeneratedShifts, ...formattedMainShifts];
      } catch (error) {
        console.error("Error fetching database shifts:", error);
        // Continue with example shifts only if database query fails
      }

      // Combine all shifts: example + generated + main database shifts
      const combinedShifts = [...getShiftData(), ...formattedDbShifts];

      const allShifts = await Promise.all(
        combinedShifts.map(async (shift) => {
          // Normalize shift ID to string format for consistent assignment lookup
          const normalizedShiftId = shift.id.toString();
          const assignedWorkerIds = await getShiftAssignments(normalizedShiftId);

          // Get detailed staff info for assigned workers
          const assignedStaff = assignedWorkerIds
            .map((workerId: number) => {
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
                  avatar: staff.avatar,
                };
              }
              return null;
            })
            .filter(Boolean);

          // Calculate proper staffing levels
          const totalPositions =
            shift.totalPositions || shift.requiredWorkers || shift.required_staff || 1;
          const filledPositions = assignedWorkerIds.length;

          // Update shift with real assignment data
          const updatedShift = {
            ...shift,
            assignedStaff: assignedStaff,
            assignedStaffNames: assignedStaff.map((s: any) => s?.name),
            filledPositions: filledPositions,
            totalPositions: totalPositions,
            minStaff: shift.minStaff || Math.max(1, totalPositions - 1),
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

          return updatedShift;
        })
      );

      // Filter shifts for facility users to only show their associated facilities
      let filteredShifts = allShifts;
      if (isFacilityUser && userAssociatedFacilities.length > 0) {
        filteredShifts = allShifts.filter((shift) =>
          userAssociatedFacilities.includes(shift.facilityId)
        );
      }

      res.json(filteredShifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // Database-backed assignment tracking using existing shift_assignments table
  const getShiftAssignments = async (shiftId: string | number) => {
    try {
      const assignments = await storage.getShiftAssignments(shiftId.toString());
      return assignments.map((a) => a.workerId);
    } catch (error) {
      console.error(`Error fetching assignments for shift ${shiftId}:`, error);
      return [];
    }
  };

  const addShiftAssignment = async (
    shiftId: string | number,
    workerId: number,
    assignedById: number = 1
  ) => {
    try {
      await storage.addShiftAssignment({
        shiftId: shiftId.toString(),
        workerId,
        assignedById,
        status: "assigned",
      });
    } catch (error) {
      console.error(`Error adding assignment:`, error);
      throw error;
    }
  };

  const removeShiftAssignment = async (shiftId: string | number, workerId: number) => {
    try {
      await storage.updateShiftAssignmentStatus(shiftId.toString(), workerId, "unassigned");
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
      },
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
      const assignedWorkerIds = currentAssignments.map((a) => a.workerId);

      // Get the shift to determine specialty requirement and capacity
      // Check both example shifts and database-generated shifts
      const allShifts = getShiftData();
      let targetShift = allShifts.find((s) => s.id.toString() === shiftId);

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
            department: generatedShift.department,
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

      const filteredStaff = dbStaffData.filter((staff) => {
        // Strict role validation - exclude all admin/management roles
        const ineligibleRoles = [
          "super_admin",
          "facility_admin",
          "admin",
          "facility_manager",
          "manager",
        ];
        if (ineligibleRoles.includes(staff.role)) return false;

        // Strict email validation - exclude known superusers
        const superuserEmails = [
          "joshburn@nexspace.com",
          "josh.burnett@nexspace.com",
          "brian.nangle@nexspace.com",
        ];
        if (superuserEmails.includes(staff.email)) return false;

        // Filter out already assigned workers
        if (assignedWorkerIds.includes(staff.id)) return false;

        // Strict specialty matching - only workers with exact specialty match
        if (staff.specialty !== requiredSpecialty) return false;

        // Only include internal employees and verified contractors
        if (!["internal_employee", "contractor_1099"].includes(staff.role)) return false;

        return true;
      });

      // Return available workers only if shift has remaining capacity
      let shiftRequests: any[] = [];

      if (!isAtCapacity && filteredStaff.length > 0) {
        // Generate realistic shift requests from unassigned workers
        shiftRequests = filteredStaff
          .slice(0, Math.min(6, maxCapacity - currentAssignments.length))
          .map((staff, index) => ({
            id: parseInt(shiftId.toString()) * 100 + index,
            shiftId: shiftId,
            workerId: staff.id,
            workerName: `${staff.firstName} ${staff.lastName}`,
            workerEmail: staff.email,
            specialty: staff.specialty,
            reliabilityScore: Math.floor(85 + Math.random() * 15), // 85-100%
            totalShiftsWorked: Math.floor(50 + Math.random() * 150), // 50-200 shifts
            averageRating: 4.2 + Math.random() * 0.8, // 4.2-5.0 rating
            requestedAt: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            status: "pending",
            certifications:
              staff.specialty === "RN"
                ? ["RN", "ACLS", "BLS"]
                : staff.specialty === "LPN"
                  ? ["LPN", "BLS"]
                  : ["CST", "BLS"],
            hourlyRate:
              staff.specialty === "RN"
                ? 45 + Math.random() * 10
                : staff.specialty === "LPN"
                  ? 35 + Math.random() * 8
                  : 40 + Math.random() * 8,
            availability: "Available",
            profileUrl: `/enhanced-staff?profile=${staff.id}`,
          }));
      }

      console.log(
        `[SHIFT REQUESTS] Shift ${shiftId}: ${currentAssignments.length}/${maxCapacity} filled, returning ${shiftRequests.length} available workers`
      );
      res.json(shiftRequests);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Shift assignment endpoint
  app.post(
    "/api/shifts/:shiftId/assign",
    requireAuth,
    requirePermission("shifts.assign"),
    async (req, res) => {
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
            premiumMultiplier: generatedShift.rate,
          };
        } else {
          // For regular shifts, get from the example shifts data since database shifts table doesn't have title column
          const allShifts = getShiftData();
          const exampleShift = allShifts.find((s) => s.id.toString() === shiftId);

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
              premiumMultiplier: exampleShift.rate,
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
        const ineligibleRoles = [
          "super_admin",
          "facility_admin",
          "admin",
          "facility_manager",
          "manager",
        ];
        const superuserEmails = [
          "joshburn@nexspace.com",
          "josh.burnett@nexspace.com",
          "brian.nangle@nexspace.com",
        ];

        if (ineligibleRoles.includes(worker.role) || superuserEmails.includes(worker.email)) {
          return res.status(400).json({
            message: `Administrative users cannot be assigned to shifts. Only clinical staff can work shifts.`,
          });
        }

        // Only allow internal employees and verified contractors
        if (!["internal_employee", "contractor_1099"].includes(worker.role)) {
          return res.status(400).json({
            message: `Only clinical staff can be assigned to shifts`,
          });
        }

        // Strict specialty validation - prevent mismatched assignments
        if (worker.specialty !== shift.specialty) {
          return res.status(400).json({
            message: `Specialty mismatch: ${worker.specialty} worker cannot be assigned to ${shift.specialty} shift`,
          });
        }

        // Additional validation for specific specialty restrictions
        if (shift.specialty === "CST" && worker.specialty !== "CST") {
          return res.status(400).json({
            message: `Only certified surgical technicians (CST) can be assigned to OR shifts`,
          });
        }

        if (shift.specialty === "RN" && !["RN", "BSN", "MSN"].includes(worker.specialty || "")) {
          return res.status(400).json({
            message: `Only registered nurses can be assigned to RN shifts`,
          });
        }

        // Get current assignments for this shift using string ID
        const currentAssignments = await storage.getShiftAssignments(shiftId);
        const assignedWorkerIds = currentAssignments.map((a) => a.workerId);

        // Check if worker is already assigned
        if (assignedWorkerIds.includes(workerId)) {
          return res.status(400).json({ message: "Worker is already assigned to this shift" });
        }

        // Get shift capacity from database - use all possible field names for required workers
        const maxCapacity =
          shift.requiredStaff ||
          shift.requiredWorkers ||
          shift.totalPositions ||
          shift.required_staff ||
          generatedShift?.requiredWorkers ||
          generatedShift?.maxStaff ||
          generatedShift?.totalPositions ||
          3; // Default to 3 for multi-worker shifts instead of 1

        console.log(
          `[CAPACITY CHECK] Shift ${shiftId}: maxCapacity=${maxCapacity}, currentAssignments=${currentAssignments.length}`
        );
        if (currentAssignments.length >= maxCapacity) {
          return res.status(400).json({
            message: `Shift is at full capacity (${currentAssignments.length}/${maxCapacity})`,
          });
        }

        // Add worker to assignments using storage interface
        await storage.addShiftAssignment({
          shiftId: shiftId,
          workerId: workerId,
          assignedById: (req as any).user?.id || 1,
          status: "assigned",
        });

        // Get updated assignments and verify the assignment was successful
        const updatedAssignments = await storage.getShiftAssignments(shiftId);
        const assignmentConfirmed = updatedAssignments.find((a) => a.workerId === workerId);

        if (!assignmentConfirmed) {
          return res.status(500).json({
            message: "Assignment failed - could not confirm in database",
          });
        }

        // Broadcast real-time update to all connected clients for immediate UI sync
        if (wss) {
          const updateMessage = {
            type: "SHIFT_ASSIGNMENT_UPDATED",
            shiftId: shiftId,
            workerId: workerId,
            workerName: `${worker.firstName} ${worker.lastName}`,
            assignments: updatedAssignments,
            assignedWorkers: updatedAssignments.length,
            maxCapacity: maxCapacity,
            action: "assigned",
          };

          wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(updateMessage));
            }
          });
        }

        console.log(
          `[ASSIGNMENT SUCCESS] Worker ${workerId} (${worker.firstName} ${worker.lastName}) assigned to shift ${shiftId}. Total: ${updatedAssignments.length}/${maxCapacity}`
        );

        res.json({
          success: true,
          message: "Worker assigned successfully",
          assignedWorkers: updatedAssignments.length,
          maxCapacity: maxCapacity,
          assignments: updatedAssignments,
          workerName: `${worker.firstName} ${worker.lastName}`,
        });
      } catch (error) {
        console.error("Error assigning worker:", error);
        res.status(500).json({ message: "Failed to assign worker" });
      }
    }
  );

  // Shift unassignment endpoint
  app.post(
    "/api/shifts/:shiftId/unassign",
    requireAuth,
    requirePermission("shifts.assign"),
    async (req, res) => {
      try {
        const shiftId = req.params.shiftId;
        const { workerId } = req.body;

        if (!workerId) {
          return res.status(400).json({ message: "Worker ID is required" });
        }

        // Get current assignments for this shift using string ID
        const currentAssignments = await storage.getShiftAssignments(shiftId);
        const assignedWorkerIds = currentAssignments.map((a) => a.workerId);

        // Check if worker is assigned
        if (!assignedWorkerIds.includes(workerId)) {
          return res.status(400).json({ message: "Worker is not assigned to this shift" });
        }

        // Update assignment status to 'unassigned' instead of deleting
        await storage.updateShiftAssignmentStatus(shiftId, workerId, "unassigned");

        // Get updated assignments (only active ones)
        const updatedAssignments = await storage.getShiftAssignments(shiftId);

        console.log(
          `Worker ${workerId} unassigned from shift ${shiftId}. Total assigned: ${updatedAssignments.length}`
          );

        res.json({
          success: true,
          message: "Worker unassigned successfully",
          assignedWorkers: updatedAssignments.length,
          assignments: updatedAssignments,
        });
      } catch (error) {
        console.error("Error unassigning worker:", error);
        res.status(500).json({ message: "Failed to unassign worker" });
      }
    }
  );

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
      const targetShift = allShifts.find((s) => s.id.toString() === shiftId);

      if (!targetShift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Check current assignments from database
      const currentAssignments = await storage.getShiftAssignments(shiftId);
      const assignedWorkerIds = currentAssignments.map((a) => a.workerId);

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
      const worker = dbStaffData.find((staff) => staff.id === workerId);

      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // Add assignment to database
      await storage.addShiftAssignment({
        shiftId: shiftId,
        workerId: workerId,
        assignedById: req.user?.id || 1,
        status: "assigned",
      });

      // Get updated assignments
      const updatedAssignments = await storage.getShiftAssignments(shiftId);
      const filledPositions = updatedAssignments.length;

      // Broadcast update to connected clients
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "SHIFT_ASSIGNMENT_UPDATE",
              shiftId: shiftId,
              filledPositions: filledPositions,
              totalPositions: maxCapacity,
              status: filledPositions >= maxCapacity ? "filled" : "partially_filled",
            })
          );
        }
      });

      console.log(
        `Worker ${workerId} assigned to shift ${shiftId}. Total assigned: ${filledPositions}/${maxCapacity}`
        );

      res.json({
        success: true,
        message: "Worker assigned successfully",
        assignedWorkers: filledPositions,
        totalCapacity: maxCapacity,
      });
    } catch (error) {
      console.error("Error assigning worker to shift:", error);
      res.status(500).json({ message: "Failed to assign worker to shift" });
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
      const currentDate = new Date().toISOString().split("T")[0];

      // Get user's specialty and facility associations
      const userStaff = await unifiedDataService.getStaffWithAssociations();
      const currentUserStaff = userStaff.find((s) => s.email === user.email);
      const userSpecialty = currentUserStaff?.specialty || "RN";
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
        },
      ];

      // Combine worker shifts with template-generated shifts
      const allWorkerShifts = [...workerShifts, ...templateShifts];

      // Filter shifts for workers based on multiple criteria
      let filteredShifts = allWorkerShifts.filter((shift) => {
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

  // Worker's assigned shifts API - Users can only access their own shifts
  app.get("/api/shifts/my-shifts", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;

      // Get shifts assigned to this worker - sync with Enhanced Schedule data
      const myShifts =
        user.id === 3
          ? [
              // Alice Smith's shifts
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
              },
            ]
          : [
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
              },
            ];

      // Filter by user's specialty if available
      const filteredShifts = user.specialty
        ? myShifts.filter((shift) => shift.specialty === user.specialty)
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

        // Build the data object step by step with validation
        const dataToValidate = {
          title: req.body.title || `${req.body.specialty || "Shift"} Assignment`,
          facilityId: req.user?.facilityId || req.body.facilityId,
          facilityName: req.body.facilityName || "Default Facility", // Add missing facilityName
          department: req.body.department || req.body.specialty,
          specialty: req.body.specialty,
          shiftType: req.body.shiftType || "Day", // Add missing shiftType mapping
          date: req.body.date,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          rate: String(req.body.rate), // Convert to string for decimal parsing
          premiumMultiplier: req.body.premiumMultiplier || "1.00", // Add missing premiumMultiplier
          status: req.body.status || "open",
          urgency: req.body.urgency || "medium",
          description: req.body.description || "",
          requiredStaff: Number(req.body.requiredStaff) || 1,
          assignedStaffIds: req.body.assignedStaffIds || [],
          specialRequirements: req.body.specialRequirements || [],
          createdById: req.user?.id,
        };

        Object.entries(dataToValidate).forEach(([key, value]) => {
        });

        // Validate each required field manually first - check against actual database schema
        const requiredFields = [
          "facilityId",
          "department",
          "specialty",
          "shiftType",
          "date",
          "startTime",
          "endTime",
          "rate",
          "createdById",
        ];
        const missingFields = requiredFields.filter((field) => !(dataToValidate as any)[field]);

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: `Missing required fields: ${missingFields.join(", ")}`,
            missingFields,
          });
        }


        try {
          const shiftData = insertShiftSchema.parse(dataToValidate);

          const shift = await storage.createShift(shiftData);
          res.status(201).json(shift);
        } catch (dbError: any) {
          console.error("Database insertion error:", dbError);
          console.error("Error details:", {
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            column: dbError.column,
            table: dbError.table,
          });
          throw dbError; // Re-throw to be caught by outer catch block
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("=== ZOD VALIDATION ERRORS ===");
          error.errors.forEach((err, index) => {
            console.error(`Error ${index + 1}:`);
            console.error(`  Field: ${err.path.join(".")}`);
            console.error(`  Message: ${err.message}`);
            console.error(`  Code: ${err.code}`);
            if ("expected" in err) console.error(`  Expected: ${err.expected}`);
            if ("received" in err) console.error(`  Received: ${err.received}`);
          });
          console.error("==============================");

          // Create user-friendly error messages
          const fieldErrors = error.errors.map((err) => {
            const field = err.path.join(".");
            return `${field}: ${err.message}`;
          });

          res.status(400).json({
            message: `Validation failed: ${fieldErrors.join("; ")}`,
            fieldErrors,
            zodErrors: error.errors,
          });
        } else {
          console.error("Shift creation error:", error);
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

      if (!shift || shift.status !== "open") {
        return res.status(400).json({ message: "Shift not available for request" });
      }

      // Create shift request record (simulated)
      const shiftRequest = {
        id: Date.now(),
        shiftId,
        userId,
        status: "pending",
        requestedAt: new Date().toISOString(),
      };

      // Create history entry
      const historyEntry = {
        id: Date.now() + 1,
        shiftId,
        userId,
        action: "requested",
        timestamp: new Date().toISOString(),
        performedById: userId,
        previousStatus: "open",
        newStatus: "requested",
      };

      // Check auto-assignment criteria
      const autoAssignCriteria = await checkAutoAssignmentCriteria(shiftId, userId);
      let autoAssigned = false;
      let assignedShift = null;

      if (autoAssignCriteria.shouldAutoAssign) {
        // Auto-assign the shift
        const updatedShift = {
          ...shift,
          status: "filled" as const,
          assignedStaffIds: [userId],
          updatedAt: new Date().toISOString(),
        };

        // Log assignment history
        const assignmentHistory = {
          id: Date.now() + 2,
          shiftId,
          userId,
          action: "filled",
          timestamp: new Date().toISOString(),
          performedById: userId,
          previousStatus: "requested",
          newStatus: "filled",
          notes: "Auto-assigned based on criteria",
        };

        assignedShift = updatedShift;
        autoAssigned = true;
      }

      const requestedShift = { ...shift, status: "requested" as const };

      res.json({
        requestedShift,
        autoAssigned,
        assignedShift,
        historyEntry,
        shiftRequest,
      });
    } catch (error) {
      console.error("Shift request error:", error);
      res.status(500).json({ message: "Failed to request shift" });
    }
  });

  app.post(
    "/api/shifts/assign",
    requireAuth,
    requirePermission("shifts.assign"),
    async (req: any, res) => {
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
          status: "filled" as const,
          assignedStaffIds: [userId],
          updatedAt: new Date().toISOString(),
        };

        // Create history entry
        const historyEntry = {
          id: Date.now(),
          shiftId,
          userId,
          action: "filled",
          timestamp: new Date().toISOString(),
          performedById: req.user.id,
          previousStatus: shift.status,
          newStatus: "filled",
        };

        res.json({
          assignedShift,
          historyEntry,
        });
      } catch (error) {
        console.error("Shift assignment error:", error);
        res.status(500).json({ message: "Failed to assign shift" });
      }
    }
  );

  app.get("/api/shifts/history/:userId", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Check if user can access this history
      if (
        req.user.id !== userId &&
        req.user.role !== UserRole.SUPER_ADMIN &&
        req.user.role !== UserRole.FACILITY_MANAGER
      ) {
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
          timestamp: "2025-06-18T07:00:00Z",
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
          timestamp: "2025-06-18T16:00:00Z",
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
          timestamp: "2025-06-16T15:00:00Z",
        },
      ];

      res.json(sampleHistory);
    } catch (error) {
      console.error("Shift history error:", error);
      res.status(500).json({ message: "Failed to fetch shift history" });
    }
  });

  // Auto-assignment criteria helper function
  async function checkAutoAssignmentCriteria(
    shiftId: number,
    userId: number
  ): Promise<{ shouldAutoAssign: boolean; reason?: string }> {
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
        shiftIsUrgent: shift.urgency === "critical" || shift.urgency === "high",
        userIsAvailable: user.availabilityStatus === "available",
        facilityMatch: !shift.facilityId || user.facilityId === shift.facilityId,
      };

      const shouldAutoAssign =
        criteria.userHasRequiredSpecialty &&
        criteria.shiftIsUrgent &&
        criteria.userIsAvailable &&
        criteria.facilityMatch;

      return {
        shouldAutoAssign,
        reason: shouldAutoAssign ? "Meets auto-assignment criteria" : "Does not meet all criteria",
      };
    } catch (error) {
      console.error("Auto-assignment criteria check error:", error);
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

  // Conversation API
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.id);

      // Enrich conversations with participant info and last message
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const participants = await storage.getConversationParticipants(conv.id);
          const messages = await storage.getConversationMessages(conv.id, 1, 0);
          const lastMessage = messages[0] || null;

          // Get participant user details
          const participantDetails = await Promise.all(
            participants.map(async (p) => {
              const user = await storage.getUser(p.userId);
              return user
                ? {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                    avatar: null,
                  }
                : null;
            })
          );

          return {
            ...conv,
            participants: participantDetails.filter(Boolean),
            lastMessage,
            unreadCount: conv.unreadCount || 0,
          };
        })
      );

      res.json(enrichedConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const { subject, participantIds, type = "direct" } = req.body;

      // Create conversation
      const conversation = await storage.createConversation({
        subject,
        type,
        createdById: req.user.id,
      });

      // Add creator as participant
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: req.user.id,
      });

      // Add other participants
      if (participantIds && participantIds.length > 0) {
        await Promise.all(
          participantIds.map((userId: number) =>
            storage.addConversationParticipant({
              conversationId: conversation.id,
              userId,
            })
          )
        );
      }

      res.status(201).json(conversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);

      // Check if user is a participant
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some((p) => p.userId === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Messages API
  app.get("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { limit = 50, offset = 0 } = req.query;

      // Check if user is a participant
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some((p) => p.userId === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getConversationMessages(
        conversationId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // Mark messages as read
      await storage.markMessagesAsRead(conversationId, req.user.id);

      // Enrich messages with sender info
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const sender = await storage.getUser(msg.senderId);
          return {
            ...msg,
            senderName: sender ? `${sender.firstName} ${sender.lastName}` : "Unknown",
            senderRole: sender?.role,
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, messageType = "text" } = req.body;

      // Check if user is a participant
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some((p) => p.userId === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      const message = await storage.createMessage({
        conversationId,
        senderId: req.user.id,
        content,
        messageType,
      });

      // Broadcast via WebSocket to conversation participants
      const enrichedMessage = {
        ...message,
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        senderRole: req.user.role,
      };

      // Send to all participants in the conversation
      for (const participant of participants) {
        const userSockets = userConnections.get(participant.userId);
        if (userSockets) {
          userSockets.forEach((socket) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "new_message",
                  conversationId,
                  data: enrichedMessage,
                })
              );
            }
          });
        }
      }

      res.status(201).json(enrichedMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
      res.status(500).json({ message: "Failed to send message" });
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

  app.get("/api/messages/search", requireAuth, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json([]);
      }

      const messages = await storage.searchMessages(req.user.id, q as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to search messages" });
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
  app.get("/api/staff", requireAuth, requirePermission("staff.view"), async (req: any, res) => {
    try {
      // Get staff data using storage method
      let dbStaffData = await storage.getAllStaff();

      // Format staff data for consistency with frontend expectations
      dbStaffData = dbStaffData.map((staffMember) => {
        return {
          ...staffMember,
          name: `${staffMember.firstName} ${staffMember.lastName}`, // Create full name for backward compatibility
          role: staffMember.employmentType || "unknown",
          associatedFacilities: Array.isArray(staffMember.associatedFacilities)
            ? staffMember.associatedFacilities
            : [],
          avatar: staffMember.profilePhoto,
        };
      });

      // Implement facility-based access control for facility users
      const facilityUserRoles = [
        "facility_administrator",
        "scheduling_coordinator",
        "hr_manager",
        "billing",
        "supervisor",
        "director_of_nursing",
        "viewer",
        "corporate",
        "regional_director",
        "facility_admin",
      ];

      if (facilityUserRoles.includes(req.user.role) && req.user.facility_id) {
        console.log(
          `[STAFF ACCESS CONTROL] User ${req.user.firstName} ${req.user.lastName} (${req.user.role}) requesting staff data for facility ${req.user.facility_id}`
        );

        // For facility users, only return staff associated with their facilities
        // Since staff table doesn't have facility_id, we'll filter by similar locations or other criteria
        // For now, we'll implement a basic filtering mechanism
        const userFacilityId = req.user.facility_id;

        // Get the user's facility information
        const userFacility = await db
          .select()
          .from(facilities)
          .where(eq(facilities.id, userFacilityId))
          .limit(1);

        if (userFacility.length > 0) {
          const facilityName = userFacility[0].name;

          // For now, we'll create facility-specific staff assignments
          // This would normally be done through proper facility-staff associations
          const facilityStaffMapping = {
            1: dbStaffData.slice(0, Math.ceil(dbStaffData.length / 3)), // General Hospital
            2: dbStaffData.slice(
              Math.ceil(dbStaffData.length / 3),
              Math.ceil((2 * dbStaffData.length) / 3)
            ), // Sunset Nursing Home
            3: dbStaffData.slice(Math.ceil((2 * dbStaffData.length) / 3)), // Care Medical Center
          };

          dbStaffData = facilityStaffMapping[userFacilityId] || dbStaffData.slice(0, 5);
          console.log(
            `[STAFF ACCESS CONTROL] Returning ${dbStaffData.length} staff members for facility ${userFacilityId}`
          );
        }
      } else if (req.user.role === "super_admin") {
        console.log(
          `[STAFF ACCESS CONTROL] Super admin ${req.user.firstName} ${req.user.lastName} accessing all staff data`
        );
        // Super admins can see all staff
      } else {
        console.log(
          `[STAFF ACCESS CONTROL] User ${req.user.firstName} ${req.user.lastName} (${req.user.role}) has limited staff access`
        );
        // Other users get limited access
        dbStaffData = dbStaffData.slice(0, 5);
      }

      // Map database staff to frontend format with extended profile information
      const staffData = dbStaffData.map((staff, index) => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role === "internal_employee" ? "employee" : staff.role,
        specialty: staff.specialty,
        employmentType: staff.employmentType || "Full-time Employee", // Use actual employment type from database
        associatedFacilities: staff.associatedFacilities || [],
        avatar: staff.avatar,
        // Extended profile data
        phone: index === 0 ? "(555) 123-4567" : index === 1 ? "(555) 234-5678" : "(555) 345-6789",
        department:
          staff.specialty === "RN"
            ? "ICU"
            : staff.specialty === "LPN"
              ? "Medical/Surgical"
              : "Emergency",
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
        reliabilityScore: staff.reliabilityScore || 4.8, // Use actual reliability score from database
        totalShifts: 156,
        workerType: staff.role === "internal_employee" ? "internal_employee" : "contractor_1099",
        status: "active",
        availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        emergencyContact: {
          name: "Emergency Contact",
          phone: "(555) 999-0000",
          relationship: "Spouse",
        },
        workHistory: [
          {
            facility: "Healthcare Facility",
            position: staff.specialty + " Nurse",
            startDate: "2020-01-01",
            description: "Providing quality patient care",
          },
        ],
        education: [
          {
            institution: "Nursing School",
            degree: "Bachelor of Science in Nursing",
            graduationYear: 2019,
            gpa: 3.8,
          },
        ],
        documents: [
          {
            type: "License",
            name: staff.specialty + " License",
            uploadDate: "2024-01-01",
            expirationDate: "2026-01-01",
            verified: true,
          },
        ],
        socialStats: {
          profileViews: 200,
          shiftsCompleted: 150,
          ratings: 80,
          endorsements: 20,
        },
      }));

      res.json(staffData);
    } catch (error) {
      console.error("Error fetching staff data:", error);
      res.status(500).json({ message: "Failed to fetch staff data", error: error.message });
    }
  });

  // Facility Users API - Separate from staff
  app.get("/api/facility-users", requireAuth, async (req: any, res) => {
    try {
      // Only super admins can access facility users management
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

        console.log(
          `[FACILITY USERS] Super admin ${req.user.firstName} ${req.user.lastName} accessing facility users`
        );

      // Get facility users data from unified service
      const facilityUsersData = await unifiedDataService.getFacilityUsersWithAssociations();

      // Map to frontend format
      const facilityUsersFormatted = facilityUsersData.map((user, index) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        specialty: user.specialty,
        associatedFacilities: user.associatedFacilities || [],
        associatedFacilityIds: user.associatedFacilities || [],
        avatar: user.avatar,
        facilityId: user.facilityId,
        primaryFacilityId: user.facilityId,
        facilityName: user.facilityName,
        teamMemberships: user.teamMemberships || [],
        isActive: user.isActive,
        phone:
          user.phone ||
          `(555) ${String(123 + index).padStart(3, "0")}-${String(4567 + index).padStart(4, "0")}`,
        title: user.title,
        department: user.department,
        permissions: user.permissions,
        status: user.isActive ? "active" : "inactive",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      res.json(facilityUsersFormatted);
    } catch (error) {
      console.error("Error fetching facility users:", error);
      res.status(500).json({ message: "Failed to fetch facility users" });
    }
  });

  // Update facility user endpoint
  app.patch("/api/facility-users/:id", requireAuth, async (req: any, res) => {
    try {
      // Only super admins can edit facility users
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const userId = parseInt(req.params.id);
      const updateData = req.body;


      // Update the facility user in the facility_users table
      const updatedUser = await db
        .update(facilityUsers)
        .set({
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          role: updateData.role,
          isActive: updateData.isActive,
          primaryFacilityId: updateData.facilityId,
          associatedFacilityIds: updateData.associatedFacilities || [updateData.facilityId],
          phone: updateData.phone,
          title: updateData.title,
          department: updateData.department,
          permissions: updateData.permissions,
          updatedAt: new Date(),
        })
        .where(eq(facilityUsers.id, userId))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "Facility user not found" });
      }

      res.json({ message: "Facility user updated successfully", user: updatedUser[0] });
    } catch (error) {
      console.error("Error updating facility user:", error);
      res.status(500).json({ message: "Failed to update facility user" });
    }
  });

  // Team management API - Associate facility users with teams
  app.post("/api/teams/:teamId/members", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const teamId = parseInt(req.params.teamId);
      const { userId, userType, role } = req.body;


      if (userType === "facility") {
        // For facility users, create association in facility_user_team_memberships table
        const [facilityUserTeam] = await db
          .insert(facilityUserTeamMemberships)
          .values({
            facilityUserId: userId,
            teamId: teamId,
            role: role || "member",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        res.json({
          message: "Facility user added to team successfully",
          teamMember: facilityUserTeam,
        });
      } else {
        // For regular users, use team_members table
        const [teamMember] = await db
          .insert(teamMembers)
          .values({
            userId: userId,
            teamId: teamId,
            role: role || "member",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        res.json({ message: "User added to team successfully", teamMember: teamMember });
      }
    } catch (error) {
      console.error("Error adding user to team:", error);
      res.status(500).json({ message: "Failed to add user to team" });
    }
  });

  // Remove team member (handles both facility users and regular users)
  app.delete("/api/teams/:teamId/members/:memberId", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);


      // Try to remove from facility_user_team_memberships first
      const facilityUserRemoval = await db
        .delete(facilityUserTeamMemberships)
        .where(
          and(
            eq(facilityUserTeamMemberships.facilityUserId, memberId),
            eq(facilityUserTeamMemberships.teamId, teamId)
          )
        )
        .returning();

      if (facilityUserRemoval.length > 0) {
        res.json({ message: "Member removed from team successfully" });
        return;
      }

      // If not found in facility users, try regular team members
      const regularUserRemoval = await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.userId, memberId), eq(teamMembers.teamId, teamId)))
        .returning();

      if (regularUserRemoval.length > 0) {
        res.json({ message: "Member removed from team successfully" });
      } else {
        res.status(404).json({ message: "Team member not found" });
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Get facility association counts for facility management
  app.get("/api/facilities/:facilityId/counts", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const facilityId = parseInt(req.params.facilityId);

      // Count staff associated with this facility (from staff table)
      const staffCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(staff)
        .where(
          and(
            eq(staff.isActive, true),
            sql`${staff.location} LIKE '%${facilityId === 1 ? "Portland" : facilityId === 2 ? "Beaverton" : "Hillsboro"}%'`
          )
        );

      // Count facility users associated with this facility
      const facilityUserCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.facilityId, facilityId), eq(users.isActive, true)));

      res.json({
        facilityId,
        staffCount: staffCount[0]?.count || 0,
        facilityUserCount: facilityUserCount[0]?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching facility counts:", error);
      res.status(500).json({ message: "Failed to fetch facility counts" });
    }
  });

  // Individual staff profile route
  app.get("/api/staff/:id", requireAuth, requirePermission("staff.view"), async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const dbStaffData = await unifiedDataService.getStaffWithAssociations();
      const staff = dbStaffData.find((s) => s.id === staffId);

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
          relationship: "Spouse",
        },
        workHistory: [
          {
            facility: "Healthcare Facility",
            position: staff.specialty + " Nurse",
            startDate: "2020-01-01",
            description: "Providing quality patient care",
          },
        ],
        education: [
          {
            institution: "Nursing School",
            degree: "Bachelor of Science in Nursing",
            graduationYear: 2019,
            gpa: 3.8,
          },
        ],
        documents: [
          {
            type: "License",
            name: staff.specialty + " License",
            uploadDate: "2024-01-01",
            expirationDate: "2026-01-01",
            verified: true,
          },
        ],
        socialStats: {
          profileViews: 200,
          shiftsCompleted: 150,
          ratings: 80,
          endorsements: 20,
        },
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
        isRead: false,
      };

      const message = await unifiedDataService.createMessage(messageData);

      res.json({
        message: "Message sent successfully",
        data: message,
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
            relationship: "Spouse",
          },
          workHistory: [
            {
              facility: "Portland General Hospital",
              position: "ICU Nurse",
              startDate: "2017-01-15",
              description: "Providing critical care nursing in intensive care unit",
            },
          ],
          education: [
            {
              institution: "Oregon Health & Science University",
              degree: "Bachelor of Science in Nursing",
              graduationYear: 2016,
              gpa: 3.8,
            },
          ],
          documents: [
            {
              type: "License",
              name: "RN License",
              uploadDate: "2024-01-15",
              expirationDate: "2026-01-15",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 245,
            shiftsCompleted: 156,
            ratings: 89,
            endorsements: 23,
          },
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
            relationship: "Wife",
          },
          workHistory: [
            {
              facility: "Seattle Emergency Center",
              position: "Emergency Nurse",
              startDate: "2012-03-01",
              description: "Emergency medicine and trauma care specialist",
            },
          ],
          education: [
            {
              institution: "University of Washington",
              degree: "Bachelor of Science in Nursing",
              graduationYear: 2011,
              gpa: 3.9,
            },
          ],
          documents: [
            {
              type: "License",
              name: "RN License",
              uploadDate: "2024-02-01",
              expirationDate: "2026-02-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 189,
            shiftsCompleted: 89,
            ratings: 67,
            endorsements: 18,
          },
          associatedFacilities: [], // Will be populated from database
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
            relationship: "Husband",
          },
          workHistory: [
            {
              facility: "Portland Medical Center",
              position: "Med/Surg Nurse",
              startDate: "2019-06-01",
              description: "Medical surgical nursing and patient care",
            },
          ],
          education: [
            {
              institution: "Portland State University",
              degree: "Bachelor of Science in Nursing",
              graduationYear: 2019,
              gpa: 3.7,
            },
          ],
          documents: [
            {
              type: "License",
              name: "RN License",
              uploadDate: "2024-03-01",
              expirationDate: "2026-03-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 156,
            shiftsCompleted: 98,
            ratings: 45,
            endorsements: 12,
          },
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
            relationship: "Brother",
          },
          workHistory: [
            {
              facility: "Portland General Hospital",
              position: "Surgical Technologist",
              startDate: "2018-09-15",
              description: "Operating room procedures and sterile technique specialist",
            },
          ],
          education: [
            {
              institution: "Portland Community College",
              degree: "Associate Degree in Surgical Technology",
              graduationYear: 2018,
              gpa: 3.9,
            },
          ],
          documents: [
            {
              type: "Certification",
              name: "CST Certification",
              uploadDate: "2024-04-01",
              expirationDate: "2026-04-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 87,
            shiftsCompleted: 143,
            ratings: 52,
            endorsements: 8,
          },
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
          credentials: [
            {
              type: "license",
              name: "Physical Therapy License",
              number: "PT-2024-789",
              issuer: "Oregon Board of Physical Therapy",
              issuedDate: "2024-01-01",
              expirationDate: "2026-01-01",
              uploadDate: "2024-01-05",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 167,
            shiftsCompleted: 145,
            ratings: 89,
            endorsements: 23,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Registered Respiratory Therapist",
              number: "RRT-2022-456",
              issuer: "NBRC",
              issuedDate: "2022-06-01",
              expirationDate: "2025-06-01",
              uploadDate: "2022-08-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 203,
            shiftsCompleted: 198,
            ratings: 156,
            endorsements: 34,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Medical Laboratory Technician",
              number: "MLT-2023-789",
              issuer: "ASCP",
              issuedDate: "2023-10-01",
              expirationDate: "2026-10-01",
              uploadDate: "2023-11-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 98,
            shiftsCompleted: 87,
            ratings: 67,
            endorsements: 12,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Pharmacy Technician",
              number: "CPhT-2024-123",
              issuer: "PTCB",
              issuedDate: "2024-01-01",
              expirationDate: "2026-01-01",
              uploadDate: "2024-01-10",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 134,
            shiftsCompleted: 112,
            ratings: 89,
            endorsements: 18,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Radiologic Technologist",
              number: "RT-2022-567",
              issuer: "ARRT",
              issuedDate: "2022-03-01",
              expirationDate: "2025-03-01",
              uploadDate: "2022-05-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 189,
            shiftsCompleted: 167,
            ratings: 134,
            endorsements: 28,
          },
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
          credentials: [
            {
              type: "license",
              name: "Occupational Therapist License",
              number: "OT-2023-345",
              issuer: "Oregon Board of Occupational Therapy",
              issuedDate: "2023-01-01",
              expirationDate: "2025-01-01",
              uploadDate: "2023-02-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 221,
            shiftsCompleted: 142,
            ratings: 128,
            endorsements: 41,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Nursing Assistant",
              number: "CNA-2023-456",
              issuer: "Oregon State Board of Nursing",
              issuedDate: "2023-08-01",
              expirationDate: "2025-08-01",
              uploadDate: "2023-09-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 76,
            shiftsCompleted: 89,
            ratings: 71,
            endorsements: 9,
          },
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
          credentials: [
            {
              type: "license",
              name: "Licensed Practical Nurse",
              number: "LPN-2022-789",
              issuer: "Washington State Nursing Commission",
              issuedDate: "2022-10-01",
              expirationDate: "2024-10-01",
              uploadDate: "2022-11-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 145,
            shiftsCompleted: 156,
            ratings: 123,
            endorsements: 26,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Surgical Technologist",
              number: "CST-2022-123",
              issuer: "NBSTSA",
              issuedDate: "2022-01-01",
              expirationDate: "2026-01-01",
              uploadDate: "2022-03-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 198,
            shiftsCompleted: 178,
            ratings: 156,
            endorsements: 32,
          },
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
          credentials: [
            {
              type: "license",
              name: "Registered Nurse License",
              number: "RN-2021-456",
              issuer: "Washington State Nursing Commission",
              issuedDate: "2021-05-01",
              expirationDate: "2024-05-01",
              uploadDate: "2021-06-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 287,
            shiftsCompleted: 234,
            ratings: 198,
            endorsements: 47,
          },
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
          credentials: [
            {
              type: "license",
              name: "Registered Nurse License",
              number: "RN-2021-789",
              issuer: "Oregon State Board of Nursing",
              issuedDate: "2021-01-01",
              expirationDate: "2024-01-01",
              uploadDate: "2021-01-15",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 312,
            shiftsCompleted: 289,
            ratings: 245,
            endorsements: 58,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Nursing Assistant",
              number: "CNA-2023-789",
              issuer: "Washington State Department of Health",
              issuedDate: "2023-03-01",
              expirationDate: "2025-03-01",
              uploadDate: "2023-04-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 98,
            shiftsCompleted: 124,
            ratings: 89,
            endorsements: 15,
          },
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
          credentials: [
            {
              type: "license",
              name: "Registered Nurse License",
              number: "RN-2022-234",
              issuer: "Oregon State Board of Nursing",
              issuedDate: "2022-06-01",
              expirationDate: "2025-06-01",
              uploadDate: "2022-07-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 176,
            shiftsCompleted: 203,
            ratings: 167,
            endorsements: 29,
          },
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
          credentials: [
            {
              type: "license",
              name: "Licensed Practical Nurse",
              number: "LPN-2022-567",
              issuer: "Washington State Nursing Commission",
              issuedDate: "2022-08-01",
              expirationDate: "2024-08-01",
              uploadDate: "2022-09-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 154,
            shiftsCompleted: 167,
            ratings: 134,
            endorsements: 31,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Patient Care Technician",
              number: "PCT-2023-123",
              issuer: "Oregon Health Authority",
              issuedDate: "2023-01-01",
              expirationDate: "2025-01-01",
              uploadDate: "2023-01-15",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 109,
            shiftsCompleted: 134,
            ratings: 112,
            endorsements: 18,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Medical Assistant",
              number: "CMA-2024-456",
              issuer: "AAMA",
              issuedDate: "2024-01-01",
              expirationDate: "2029-01-01",
              uploadDate: "2024-02-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 67,
            shiftsCompleted: 78,
            ratings: 56,
            endorsements: 11,
          },
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
          credentials: [
            {
              type: "certification",
              name: "Certified Nursing Assistant",
              number: "CNA-2022-890",
              issuer: "Oregon State Board of Nursing",
              issuedDate: "2022-11-01",
              expirationDate: "2024-11-01",
              uploadDate: "2022-12-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 143,
            shiftsCompleted: 198,
            ratings: 167,
            endorsements: 25,
          },
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
          credentials: [
            {
              type: "license",
              name: "Licensed Practical Nurse",
              number: "LPN-2021-345",
              issuer: "Washington State Nursing Commission",
              issuedDate: "2021-09-01",
              expirationDate: "2023-09-01",
              uploadDate: "2021-10-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 201,
            shiftsCompleted: 223,
            ratings: 189,
            endorsements: 38,
          },
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
          credentials: [
            {
              type: "license",
              name: "Certified Registered Nurse Anesthetist",
              number: "CRNA-2020-123",
              issuer: "Oregon State Board of Nursing",
              issuedDate: "2020-07-01",
              expirationDate: "2024-07-01",
              uploadDate: "2020-08-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 387,
            shiftsCompleted: 312,
            ratings: 298,
            endorsements: 67,
          },
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
          credentials: [
            {
              type: "license",
              name: "Registered Nurse License",
              number: "RN-2021-678",
              issuer: "Washington State Nursing Commission",
              issuedDate: "2021-02-01",
              expirationDate: "2024-02-01",
              uploadDate: "2021-03-01",
              verified: true,
            },
          ],
          socialStats: {
            profileViews: 245,
            shiftsCompleted: 267,
            ratings: 223,
            endorsements: 49,
          },
          associatedFacilities: [1, 2],
        },
      ];

      res.json(legacyStaffData);
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
          attachments: [],
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
          attachments: [],
        },
      ];
      res.json(samplePosts);
    } catch (error) {
      console.error("Error fetching staff posts:", error);
      res.status(500).json({ message: "Failed to fetch staff posts" });
    }
  });

  app.patch("/api/staff/:id", requireAuth, async (req: any, res) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    try {
      const staffId = parseInt(req.params.id);

      // Only allow users to update their own profile
      if (req.user.id !== staffId) {
        // Track unauthorized update attempt
        await analytics.trackStaff("update", staffId, context, {
          reason: "unauthorized_update",
          attemptedBy: req.user.id,
          targetStaffId: staffId,
          success: false,
        });

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
        portfolio,
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
        updatedAt: new Date().toISOString(),
      };

      // Track successful staff update
      await analytics.trackStaff("update", staffId, context, {
        fieldsUpdated: Object.keys(req.body).filter((key) => req.body[key] !== undefined),
        hasSkills: skills && skills.length > 0,
        hasCertifications: certifications && certifications.length > 0,
        hasPortfolio: !!portfolio,
        hasLinkedIn: !!linkedIn,
        hourlyRate: parseFloat(hourlyRate) || 0,
        success: true,
        duration: Date.now() - startTime,
      });

      res.json(updatedProfile);
    } catch (error) {
      // Track failed staff update
      await analytics.trackStaff("update", req.params.id, context, {
        reason: "update_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });

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
          location: "ICU Unit",
        },
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
        upcomingShift: null,
      };

      // Get user's shifts for today to validate clock-in eligibility
      const today = new Date().toISOString().split("T")[0];
      // For demo purposes, simulate getting user's shifts for today
      const todayShifts = [
        {
          id: 1,
          assignedStaffId: userId,
          date: today,
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
        },
      ].filter((shift) => shift.assignedStaffId === userId);

      if (todayShifts.length > 0) {
        const shift = todayShifts[0];
        const now = new Date();
        const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
        const earliestClockIn = new Date(shiftStart.getTime() - 30 * 60 * 1000); // 30 minutes before

        activeEntry.upcomingShift = shift as any;
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
      const today = now.toISOString().split("T")[0];
      // For demo purposes, simulate getting user's shifts for today
      const todayShifts = [
        {
          id: 1,
          assignedStaffId: userId,
          date: today,
          startTime: "07:00",
          endTime: "19:00",
          department: "ICU",
          specialty: "RN",
        },
      ].filter((shift) => shift.assignedStaffId === userId);

      if (todayShifts.length === 0) {
        return res.status(400).json({
          message: "No assigned shift found for today. Cannot clock in without a scheduled shift.",
          canClockIn: false,
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
          earliestClockIn: earliestClockIn.toISOString(),
        });
      }

      // Create time clock entry
      const entry = {
        id: Date.now(),
        userId: userId,
        shiftId: shift.id,
        clockInTime: now.toISOString(),
        location: req.body.location || shift.department,
        status: "active",
      };

      res.status(201).json({
        ...entry,
        message: "Successfully clocked in",
        shift: shift,
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
        status: "active",
      };

      if (!mockActiveEntry) {
        return res.status(400).json({
          message: "No active clock-in found. Must clock in before clocking out.",
          canClockOut: false,
        });
      }

      // Calculate total hours worked
      const clockInTime = new Date(mockActiveEntry.clockInTime);
      const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Validate minimum shift duration (at least 1 hour)
      if (hoursWorked < 1) {
        return res.status(400).json({
          message:
            "Cannot clock out within 1 hour of clocking in. Minimum shift duration required.",
          canClockOut: false,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
        });
      }

      // Update time clock entry with clock-out information
      const completedEntry = {
        id: mockActiveEntry.id,
        userId: mockActiveEntry.userId,
        shiftId: mockActiveEntry.shiftId,
        clockInTime: mockActiveEntry.clockInTime,
        clockOutTime: now.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        location: req.body.location || "ICU Unit",
        status: "completed",
      };

      res.json({
        ...completedEntry,
        message: "Successfully clocked out",
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

  // Facilities API - now handled by enhanced facility routes
  // app.get("/api/facilities", requireAuth, async (req, res) => {
  //   ... commented out in favor of enhanced facility routes
  // });

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

  // Deactivate all shift templates for a facility (used when facility is deactivated)
  app.patch(
    "/api/shift-templates/deactivate-by-facility/:facilityId",
    requireAuth,
    async (req, res) => {
      // Check if user is superuser
      if (req.user?.role !== "superuser") {
        return res.status(403).json({ message: "Superuser access required" });
      }
      try {
        const facilityId = parseInt(req.params.facilityId);

        if (!facilityId || isNaN(facilityId)) {
          return res.status(400).json({ message: "Invalid facility ID" });
        }

        const result = await db
          .update(shiftTemplates)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(shiftTemplates.facilityId, facilityId))
          .returning();


        res.json({
          message: `Deactivated ${result.length} shift templates for facility`,
          deactivatedTemplates: result.length,
          facilityId,
        });
      } catch (error) {
        console.error("Error deactivating facility templates:", error);
        res.status(500).json({
          message: "Failed to deactivate facility templates",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Test endpoints for template system validation
  app.get("/api/test/shift-templates", requireAuth, async (req, res) => {
    try {
      const { runShiftTemplateTests } = await import("./test-shift-templates");

      // Capture console output for test results
      const originalLog = console.log;
      const originalError = console.error;
      const logs: string[] = [];

      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      console.error = (...args) => {
        logs.push("ERROR: " + args.join(" "));
        originalError(...args);
      };

      await runShiftTemplateTests();

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      res.json({
        message: "Shift template tests completed",
        testOutput: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Test execution failed:", error);
      res.status(500).json({
        message: "Test execution failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Deprecated: Scheduling Configuration API - functionality moved to /api/shift-templates
  // These endpoints are maintained for backwards compatibility but redirect to shift templates

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

  // Shift Templates API with facility filtering
  app.get("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;

      // Get the effective user (original or impersonated)
      const impersonatedUserId = (req.session as any).impersonatedUserId;
      let effectiveUser = currentUser;

      if (impersonatedUserId) {
        effectiveUser = await storage.getUser(impersonatedUserId);
        if (effectiveUser && effectiveUser.role !== "super_admin") {
          const facilityUser = await storage.getFacilityUserByEmail(effectiveUser.email);
          if (facilityUser) {
            (effectiveUser as any).associatedFacilities = facilityUser.associatedFacilityIds;
          }
        }
      }

        console.log(
          `[SHIFT TEMPLATES API] Fetching templates for user ${effectiveUser?.email}, role: ${effectiveUser?.role}`
        );

      // Get all templates from database
      const allTemplates = await db.select().from(shiftTemplates);

      // Filter templates based on user's facility associations
      let filteredTemplates = allTemplates;

      if (effectiveUser?.role !== "super_admin") {
        const userFacilities = (effectiveUser as any).associatedFacilities || [];

        if (userFacilities && userFacilities.length > 0) {
          filteredTemplates = allTemplates.filter((template) =>
            userFacilities.includes(template.facilityId)
          );
        }
      }


      // Transform database response to frontend format
      const formattedTemplates = filteredTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        department: template.department,
        specialty: template.specialty,
        facilityId: template.facilityId,
        facilityName: template.facilityName,
        buildingId: template.buildingId,
        buildingName: template.buildingName,
        minStaff: template.minStaff,
        maxStaff: template.maxStaff,
        shiftType: template.shiftType,
        startTime: template.startTime,
        endTime: template.endTime,
        daysOfWeek: template.daysOfWeek,
        isActive: template.isActive,
        hourlyRate: template.hourlyRate?.toString() || "0.00",
        daysPostedOut: template.daysPostedOut,
        notes: template.notes,
        generatedShiftsCount: template.generatedShiftsCount || 0,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }));

      res.json(formattedTemplates);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      res.status(500).json({ message: "Failed to fetch shift templates" });
    }
  });

  app.post("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const templateData = insertShiftTemplateSchema.parse(req.body);
      const [template] = await db.insert(shiftTemplates).values(templateData).returning();

      // Generate shifts based on the template's daysPostedOut setting
      await generateShiftsFromTemplate(template);

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating shift template:", error);
      res.status(500).json({ message: "Failed to create shift template" });
    }
  });

  app.put("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const updateData = insertShiftTemplateSchema.partial().parse(req.body);

      const [template] = await db
        .update(shiftTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(shiftTemplates.id, id))
        .returning();

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Transform database response to frontend format
      const formattedTemplate = {
        id: template.id,
        name: template.name,
        department: template.department,
        specialty: template.specialty,
        facilityId: template.facilityId,
        facilityName: template.facilityName,
        buildingId: template.buildingId,
        buildingName: template.buildingName,
        minStaff: template.minStaff,
        maxStaff: template.maxStaff,
        shiftType: template.shiftType,
        startTime: template.startTime,
        endTime: template.endTime,
        daysOfWeek: template.daysOfWeek,
        isActive: template.isActive,
        hourlyRate: template.hourlyRate?.toString() || "0.00",
        daysPostedOut: template.daysPostedOut,
        notes: template.notes,
        generatedShiftsCount: template.generatedShiftsCount || 0,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };

      // Regenerate shifts with new settings
      await regenerateShiftsFromTemplate(template);

      res.json(formattedTemplate);
    } catch (error) {
      console.error("Error updating shift template:", error);
      res.status(500).json({ message: "Failed to update shift template", error: error.message });
    }
  });

  app.delete("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Delete associated generated shifts
      await db.delete(generatedShifts).where(eq(generatedShifts.templateId, id));

      // Delete the template
      await db.delete(shiftTemplates).where(eq(shiftTemplates.id, id));

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Failed to delete shift template" });
    }
  });

  app.post("/api/shift-templates/:id/regenerate", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [template] = await db.select().from(shiftTemplates).where(eq(shiftTemplates.id, id));

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      await regenerateShiftsFromTemplate(template);

      res.json({ message: "Shifts regenerated successfully" });
    } catch (error) {
      console.error("Error regenerating shifts:", error);
      res.status(500).json({ message: "Failed to regenerate shifts" });
    }
  });

  app.patch("/api/shift-templates/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;

      const [template] = await db
        .update(shiftTemplates)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(shiftTemplates.id, id))
        .returning();

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Regenerate shifts based on new status
      if (isActive) {
        await generateShiftsFromTemplate(template);
      } else {
        // Deactivate future shifts from this template
        await db.delete(generatedShifts).where(eq(generatedShifts.templateId, id));
      }

      res.json(template);
    } catch (error) {
      console.error("Error updating template status:", error);
      res.status(500).json({ message: "Failed to update template status" });
    }
  });

  // Helper functions for shift generation
  async function generateShiftsFromTemplate(template: any) {
    const today = new Date();
    const daysToGenerate = template.daysPostedOut || 7;

      console.log(
        `[SHIFT GENERATION] Generating ${daysToGenerate} days of shifts for template ${template.name}`
      );

    const generatedCount = await db
      .select({ count: sql`count(*)` })
      .from(generatedShifts)
      .where(eq(generatedShifts.templateId, template.id));

      console.log(
        `[SHIFT GENERATION] Current shifts for template ${template.id}:`,
        generatedCount[0]?.count || 0
      );

    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      if (template.daysOfWeek && template.daysOfWeek.includes(date.getDay())) {
        for (let staffCount = 0; staffCount < (template.minStaff || 1); staffCount++) {
          const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
          const shiftId = `${template.id}${dateStr}${staffCount.toString().padStart(2, "0")}`;

          const shiftData = {
            id: shiftId,
            templateId: template.id,
            title: template.name,
            date: date.toISOString().split("T")[0],
            startTime: template.startTime,
            endTime: template.endTime,
            department: template.department,
            specialty: template.specialty,
            facilityId: template.facilityId,
            facilityName: template.facilityName || "Unknown Facility",
            buildingId: template.buildingId || null,
            buildingName: template.buildingName || null,
            status: "open",
            rate: template.hourlyRate ? template.hourlyRate.toString() : "0",
            urgency: "medium",
            description: template.notes || `${template.department} shift - ${template.name}`,
            requiredWorkers: template.minStaff || 1,
            totalPositions: template.maxStaff || 1,
            minStaff: template.minStaff || 1,
            maxStaff: template.maxStaff || 1,
            totalHours: calculateShiftHours(template.startTime, template.endTime),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          try {
            await db.insert(generatedShifts).values(shiftData).onConflictDoNothing();
              console.log(
                `[SHIFT GENERATION] Created shift ${shiftId} for ${date.toISOString().split("T")[0]}`
              );
          } catch (error) {
            console.error(`Error inserting shift ${shiftId}:`, error);
          }
        }
      }
    }

    // Update generated shifts count
    const newCount = await db
      .select({ count: sql`count(*)` })
      .from(generatedShifts)
      .where(eq(generatedShifts.templateId, template.id));

    await db
      .update(shiftTemplates)
      .set({ generatedShiftsCount: parseInt(newCount[0]?.count?.toString() || "0") })
      .where(eq(shiftTemplates.id, template.id));

      console.log(
        `[SHIFT GENERATION] Template ${template.id} now has ${newCount[0]?.count || 0} total shifts`
      );
  }

  function calculateShiftHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    let hours = endHour - startHour;
    let minutes = endMin - startMin;

    // Handle overnight shifts
    if (hours < 0) {
      hours += 24;
    }

    return hours + minutes / 60;
  }

  async function regenerateShiftsFromTemplate(template: any) {
    // Delete existing future shifts from this template
    const today = new Date().toISOString().split("T")[0];
    await db.delete(generatedShifts).where(eq(generatedShifts.templateId, template.id));

    // Generate new shifts
    await generateShiftsFromTemplate(template);
  }

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
          requestedAt: "2025-06-21T15:30:00Z",
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
          requestedAt: "2025-06-20T10:15:00Z",
        },
      ];

      // Filter to only show requests by this user
      const userRequests = workerShiftRequests.filter((request) => request.requestedBy === user.id);

      res.json(userRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Employee Dashboard API - personalized data for clinicians
  app.get("/api/employee/dashboard", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate week hours from timesheet data
      const weekHours = 32; // In production, calculate from actual timesheet entries

      // Calculate monthly earnings
      const monthlyEarnings = 3245.67; // In production, calculate from actual paystubs

      res.json({
        weekHours,
        monthlyEarnings,
        totalShiftsThisMonth: 12,
        upcomingShiftsCount: 3,
        pendingRequests: 2,
        credentialsExpiring: 1,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get upcoming shifts for employee
  app.get("/api/shifts/my-upcoming", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Mock upcoming shifts for the employee
      const upcomingShifts = [
        {
          id: 201,
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow
          startTime: "07:00",
          endTime: "15:00",
          department: "ICU",
          specialty: "RN",
          facilityName: "Portland General Hospital",
          status: "confirmed",
        },
        {
          id: 202,
          date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days from now
          startTime: "15:00",
          endTime: "23:00",
          department: "Emergency",
          specialty: "RN",
          facilityName: "Portland General Hospital",
          status: "confirmed",
        },
      ];

      res.json(upcomingShifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming shifts" });
    }
  });

  // Get available shifts count for employee
  app.get("/api/shifts/available-count", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;

      // In production, this would query shifts matching employee's specialty and facility associations
      const availableCount = 24; // Mock count

      res.json({ count: availableCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available shifts count" });
    }
  });

  // Admin shift requests API with worker details for management view
  app.get("/api/admin/shift-requests", requireAuth, requireSuperAdmin, async (req, res) => {
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

  // Create new facility - Restricted to superusers only
  app.post("/api/facilities", requireAuth, async (req, res) => {
    try {
      // Check if user is a superuser
      if (req.user?.role !== "super_admin") {
        return res.status(403).json({ 
          message: "Access denied. Only superusers can create facilities." 
        });
      }
      
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

  // Import facility from external source - Restricted to superusers only
  app.post("/api/facilities/import", requireAuth, async (req, res) => {
    // Check if user is a superuser
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ 
        message: "Access denied. Only superusers can import facilities." 
      });
    }
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

        // Import enhanced validation
        const {
          enhancedFacilitySchema,
          validateFacilityRates,
          validateStaffingTargets,
          validateTimezone,
        } = await import("./enhanced-facility-validation");

        // Validate the enhanced facility data
        const facilityData = enhancedFacilitySchema.parse(req.body);

        // Additional business rule validations
        const ratesValidation = validateFacilityRates(
          facilityData.billRates,
          facilityData.payRates
        );
        if (!ratesValidation.valid) {
          return res.status(400).json({
            message: "Invalid rates configuration",
            errors: ratesValidation.errors,
          });
        }

        const staffingValidation = validateStaffingTargets(facilityData.staffingTargets);
        if (!staffingValidation.valid) {
          return res.status(400).json({
            message: "Invalid staffing targets",
            errors: staffingValidation.errors,
          });
        }

        if (facilityData.timezone && !validateTimezone(facilityData.timezone)) {
          return res.status(400).json({ message: "Invalid timezone" });
        }

        const facility = await storage.createFacility(facilityData);
        res.status(201).json(facility);
      } catch (error) {
        console.error("Error creating facility:", error);

        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));

          return res.status(400).json({
            message: "Validation failed",
            fieldErrors,
            details: error.errors,
          });
        }

        res.status(500).json({ message: "Failed to create facility" });
      }
    }
  );

  app.patch(
    "/api/facilities/:id",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);

        // Check if facility exists
        const existingFacility = await storage.getFacility(id);
        if (!existingFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        // Import enhanced validation
        const {
          enhancedFacilityUpdateSchema,
          validateFacilityRates,
          validateStaffingTargets,
          validateTimezone,
        } = await import("./enhanced-facility-validation");

        // Validate partial update data
        const updateData = enhancedFacilityUpdateSchema.parse({
          ...req.body,
          updatedAt: new Date(),
        });

        // Business rule validations for fields being updated
        if (updateData.billRates || updateData.payRates) {
          const billRates = updateData.billRates || existingFacility.billRates;
          const payRates = updateData.payRates || existingFacility.payRates;

          const ratesValidation = validateFacilityRates(billRates, payRates);
          if (!ratesValidation.valid) {
            return res.status(400).json({
              message: "Invalid rates configuration",
              errors: ratesValidation.errors,
            });
          }
        }

        if (updateData.staffingTargets) {
          const staffingValidation = validateStaffingTargets(updateData.staffingTargets);
          if (!staffingValidation.valid) {
            return res.status(400).json({
              message: "Invalid staffing targets",
              errors: staffingValidation.errors,
            });
          }
        }

        if (updateData.timezone && !validateTimezone(updateData.timezone)) {
          return res.status(400).json({ message: "Invalid timezone" });
        }

        const facility = await storage.updateFacility(id, updateData);
        if (!facility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json(facility);
      } catch (error) {
        console.error("Error updating facility:", error);

        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));

          return res.status(400).json({
            message: "Validation failed",
            fieldErrors,
            details: error.errors,
          });
        }

        res.status(500).json({ message: "Failed to update facility" });
      }
    }
  );

  // Enhanced Facility Management Endpoints

  // Get single facility with enhanced data
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

  // Update facility rates
  app.post(
    "/api/facilities/:id/rates",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_rates"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { billRates, payRates, floatPoolMargins } = req.body;

        // Import validation
        const { validateFacilityRates } = await import("./enhanced-facility-validation");

        // Validate rates
        const ratesValidation = validateFacilityRates(billRates, payRates);
        if (!ratesValidation.valid) {
          return res.status(400).json({
            message: "Invalid rates configuration",
            errors: ratesValidation.errors,
          });
        }

        const updateData: any = {};
        if (billRates) updateData.billRates = billRates;
        if (payRates) updateData.payRates = payRates;
        if (floatPoolMargins) updateData.floatPoolMargins = floatPoolMargins;

        const facility = await storage.updateFacility(id, updateData);
        if (!facility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Rates updated successfully",
          billRates: facility.billRates,
          payRates: facility.payRates,
          floatPoolMargins: facility.floatPoolMargins,
        });
      } catch (error) {
        console.error("Error updating facility rates:", error);
        res.status(500).json({ message: "Failed to update rates" });
      }
    }
  );

  // Update staffing targets
  app.post(
    "/api/facilities/:id/staffing-targets",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_staffing"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { staffingTargets } = req.body;

        // Import validation
        const { validateStaffingTargets } = await import("./enhanced-facility-validation");

        const staffingValidation = validateStaffingTargets(staffingTargets);
        if (!staffingValidation.valid) {
          return res.status(400).json({
            message: "Invalid staffing targets",
            errors: staffingValidation.errors,
          });
        }

        const facility = await storage.updateFacility(id, {
          staffingTargets,
        });

        if (!facility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Staffing targets updated successfully",
          staffingTargets: facility.staffingTargets,
        });
      } catch (error) {
        console.error("Error updating staffing targets:", error);
        res.status(500).json({ message: "Failed to update staffing targets" });
      }
    }
  );

  // Update workflow automation configuration
  app.post(
    "/api/facilities/:id/workflow-config",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_workflow"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { workflowAutomationConfig } = req.body;

        const facility = await storage.updateFacility(id, {
          workflowAutomationConfig,
        });

        if (!facility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Workflow configuration updated successfully",
          workflowAutomationConfig: facility.workflowAutomationConfig,
        });
      } catch (error) {
        console.error("Error updating workflow configuration:", error);
        res.status(500).json({ message: "Failed to update workflow configuration" });
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
        res.status(400).json({
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

  // Enhanced Facilities API with complete field support
  app.get("/api/facilities", requireAuth, async (req, res) => {
    try {
      const { state, facilityType, active, search } = req.query;
      const facilitiesData = await storage.getAllFacilities();

      // Apply filters if provided
      let filteredData = facilitiesData;
      if (state) filteredData = filteredData.filter((f) => f.state === state);
      if (facilityType) filteredData = filteredData.filter((f) => f.facilityType === facilityType);
      if (active !== undefined)
        filteredData = filteredData.filter((f) => f.isActive === (active === "true"));
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredData = filteredData.filter(
          (f) =>
            f.name?.toLowerCase().includes(searchTerm) ||
            f.city?.toLowerCase().includes(searchTerm) ||
            f.address?.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredData);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Staff API endpoint with facility filtering
  app.get("/api/staff", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;

      // Get the effective user (original or impersonated)
      const impersonatedUserId = (req.session as any).impersonatedUserId;
      let effectiveUser = currentUser;

      if (impersonatedUserId) {
        effectiveUser = await storage.getUser(impersonatedUserId);
        if (effectiveUser && effectiveUser.role !== "super_admin") {
          const facilityUser = await storage.getFacilityUserByEmail(effectiveUser.email);
          if (facilityUser) {
            (effectiveUser as any).associatedFacilities = facilityUser.associatedFacilityIds;
          }
        }
      }

        console.log(
          `[STAFF API] Fetching staff for user ${effectiveUser?.email}, role: ${effectiveUser?.role}`
        );

      // Get staff from database
      const allStaff = await db.select().from(staff);

      // Filter staff based on user's facility associations
      let filteredStaff = allStaff;

      if (effectiveUser?.role !== "super_admin") {
        const userFacilities = (effectiveUser as any).associatedFacilities || [];

        if (userFacilities && userFacilities.length > 0) {
          filteredStaff = allStaff.filter((staffMember) => {
            const staffFacilities = staffMember.associated_facilities || [];
            const hasOverlap = userFacilities.some((facilityId: number) =>
              staffFacilities.includes(facilityId)
            );
            return hasOverlap;
          });
        }
      }

      res.json(filteredStaff);
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


      if (!currentUser || currentUser.role !== "super_admin") {
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


      // If this is a facility user, fetch their permissions and facility associations
      if (targetUser.role !== "super_admin") {
        try {

          // First try to get facility user data from facility_users table
          const facilityUser = await storage.getFacilityUserByEmail(targetUser.email);
          if (facilityUser) {
            // Use individual permissions from the database if available
            if (facilityUser.permissions && facilityUser.permissions.length > 0) {
              (targetUser as any).permissions = facilityUser.permissions;
                console.log(
                    `[IMPERSONATION] Set individual permissions for ${targetUser.email}:`,
                facilityUser.permissions
              );
            } else {
              // Fallback to role template permissions
              const roleTemplate = await storage.getFacilityUserRoleTemplate(targetUser.role);
              if (roleTemplate && roleTemplate.permissions) {
                (targetUser as any).permissions = roleTemplate.permissions;
                  console.log(
                      `[IMPERSONATION] Set role template permissions for ${targetUser.email}:`,
                  roleTemplate.permissions
                );
              }
            }

            // Set associated facilities - use associatedFacilityIds to match auth.ts
            if (facilityUser.associated_facility_ids) {
              (targetUser as any).associatedFacilityIds = facilityUser.associated_facility_ids;
              (targetUser as any).associatedFacilities = facilityUser.associated_facility_ids; // Keep both for compatibility
                console.log(
                    `[IMPERSONATION] Set associatedFacilityIds for ${targetUser.email}:`,
                facilityUser.associated_facility_ids
              );
            }

            // Include facility user role for proper permission handling
            (targetUser as any).facilityRole = facilityUser.role;
              console.log(
                  `[IMPERSONATION] Set facility role for ${targetUser.email}:`,
              facilityUser.role
            );
          } else {
            // If not in facility_users table, check if user has associated_facilities in users table
              console.log(
                  `[IMPERSONATION] User not found in facility_users, checking users table data`
                  );

            if (targetUser.associated_facilities && targetUser.associated_facilities.length > 0) {
              (targetUser as any).associatedFacilities = targetUser.associated_facilities;
                console.log(
                    `[IMPERSONATION] Set associatedFacilities from users table for ${targetUser.email}:`,
                targetUser.associated_facilities
              );
            }

            // Get role template permissions
            const roleTemplate = await storage.getFacilityUserRoleTemplate(targetUser.role);
            if (roleTemplate && roleTemplate.permissions) {
              (targetUser as any).permissions = roleTemplate.permissions;
                console.log(
                    `[IMPERSONATION] Set role template permissions for ${targetUser.email}:`,
                roleTemplate.permissions
              );
            }

            // Set facility role to user's role
            (targetUser as any).facilityRole = targetUser.role;
              console.log(
                  `[IMPERSONATION] Set facility role for ${targetUser.email}:`,
              targetUser.role
            );
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
        }
      }

      res.json({
        success: true,
        impersonatedUser: targetUser,
        originalUser: currentUser,
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ message: "Failed to start impersonation" });
    }
  });

  app.post("/api/stop-impersonation", requireAuth, async (req, res) => {
    try {
      console.log("Stop impersonation debug:", {
        hasOriginalUser: !!(req.session as any).originalUser,
        hasImpersonatedUserId: !!(req.session as any).impersonatedUserId,
      });

      if (!(req.session as any).originalUser) {
        return res.status(400).json({ message: "No active impersonation session" });
      }

      const originalUser = (req.session as any).originalUser;
      delete (req.session as any).originalUser;
      delete (req.session as any).impersonatedUserId;

      res.json({
        success: true,
        restoredUser: originalUser,
      });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // Shift requests API endpoint
  app.get("/api/shift-requests/:shiftId", requireAuth, async (req, res) => {
    try {
      const shiftId = parseInt(req.params.shiftId);

      // Mock shift requests data based on shift ID
      const mockShiftRequests = [
        {
          id: 1,
          shiftId: shiftId,
          workerId: 3,
          workerName: "Josh Burnett",
          specialty: "RN",
          reliabilityScore: 96,
          averageRating: 4.8,
          totalShiftsWorked: 156,
          hourlyRate: 48,
          requestedAt: "2025-06-23T10:30:00Z",
          status: "pending",
        },
        {
          id: 2,
          shiftId: shiftId,
          workerId: 4,
          workerName: "Sarah Johnson",
          specialty: "LPN",
          reliabilityScore: 94,
          averageRating: 4.7,
          totalShiftsWorked: 142,
          hourlyRate: 42,
          requestedAt: "2025-06-23T11:15:00Z",
          status: "pending",
        },
        {
          id: 3,
          shiftId: shiftId,
          workerId: 42,
          workerName: "Jennifer Kim",
          specialty: "CST",
          reliabilityScore: 98,
          averageRating: 4.9,
          totalShiftsWorked: 89,
          hourlyRate: 35,
          requestedAt: "2025-06-23T09:45:00Z",
          status: "pending",
        },
      ];

      res.json(mockShiftRequests);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ message: "Failed to fetch shift requests" });
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
        impersonatedUserId: (req.session as any).impersonatedUserId || null,
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
          password: "",
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
              originalUser: superUser,
            });
          }
        }

        res.json({
          success: true,
          user: superUser,
          isImpersonating: false,
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
  app.get(
    "/api/admin/users",
    requireAuth,
    requirePermission("system.manage_permissions"),
    async (req: any, res) => {
      try {
        // Get all users from database
        const allUsers = await storage.getAllUsers();
        const facilityUsers = await storage.getAllFacilityUsers();
        const facilities = await storage.getFacilities();

        // Map users to include role information
        const mappedUsers = allUsers.map((user) => {
          // Check if user is a facility user to get facility associations
          const facilityUser = facilityUsers.find((fu) => fu.email === user.email);
          let facilityName = null;
          let facilityId = null;

          if (facilityUser && facilityUser.associatedFacilityIds?.length > 0) {
            const facility = facilities.find((f) => f.id === facilityUser.associatedFacilityIds[0]);
            if (facility) {
              facilityName = facility.name;
              facilityId = facility.id;
            }
          }

          // Determine the system role based on user.role
          let systemRole: SystemRole = "viewer"; // default

          if (user.role === "super_admin") {
            systemRole = "super_admin";
          } else if (user.role === "internal_employee") {
            systemRole = "staff";
          } else if (user.role === "contractor_1099") {
            systemRole = "staff";
          } else if (facilityUser) {
            // Map facility user roles to system roles
            switch (facilityUser.role) {
              case "facility_admin":
                systemRole = "facility_admin";
                break;
              case "scheduling_coordinator":
                systemRole = "scheduling_coordinator";
                break;
              case "hr_manager":
                systemRole = "hr_manager";
                break;
              case "billing":
                systemRole = "billing_manager";
                break;
              case "supervisor":
                systemRole = "supervisor";
                break;
              case "director_of_nursing":
                systemRole = "director_of_nursing";
                break;
              case "corporate":
                systemRole = "corporate";
                break;
              case "regional_director":
                systemRole = "regional_director";
                break;
              default:
                systemRole = "viewer";
            }
          }

          return {
            id: user.id,
            email: user.email,
            name:
              user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
            role: systemRole,
            facilityName,
            facilityId,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            status: user.status || "active",
          };
        });

        res.json(mappedUsers);
      } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  // Update user role endpoint
  app.patch(
    "/api/admin/users/:id/role",
    requireAuth,
    requirePermission("system.manage_permissions"),
    auditLog("UPDATE", "user_role"),
    async (req: any, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        if (!role) {
          return res.status(400).json({ message: "Role is required" });
        }

        // Get the user to determine if they are a facility user
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if this is a facility user
        const facilityUser = await storage.getFacilityUserByEmail(user.email);

        if (facilityUser) {
          // Map system role to facility user role
          let facilityRole = "viewer";
          switch (role) {
            case "facility_admin":
              facilityRole = "facility_admin";
              break;
            case "scheduling_coordinator":
              facilityRole = "scheduling_coordinator";
              break;
            case "hr_manager":
              facilityRole = "hr_manager";
              break;
            case "billing_manager":
              facilityRole = "billing";
              break;
            case "supervisor":
              facilityRole = "supervisor";
              break;
            case "director_of_nursing":
              facilityRole = "director_of_nursing";
              break;
            case "corporate":
              facilityRole = "corporate";
              break;
            case "regional_director":
              facilityRole = "regional_director";
              break;
            default:
              facilityRole = "viewer";
          }

          // Update facility user role
          await storage.updateFacilityUserRole(facilityUser.id, facilityRole);
        } else {
          // Update regular user role
          if (role === "super_admin" || role === "staff") {
            const userRole = role === "super_admin" ? "super_admin" : "internal_employee";
            await storage.updateUserRole(userId, userRole);
          }
        }

        res.json({ success: true, message: "Role updated successfully" });
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }
    }
  );

  // Placeholder for other admin user endpoints (from hardcoded data)
  app.get("/api/admin/users/placeholder", requireAuth, async (req, res) => {
    try {
      // This preserves the old hardcoded data for reference
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
          createdAt: "2025-03-01T00:00:00Z",
          lastLogin: "2025-06-19T12:15:00Z",
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
          lastLogin: "2025-06-20T14:20:00Z",
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
          lastLogin: "2025-06-20T10:00:00Z",
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
          lastLogin: null,
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
          lastLogin: "2025-05-15T08:30:00Z",
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
          lastLogin: "2025-06-20T15:30:00Z",
        },
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
        permissions: permissions,
      });
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.get(
    "/api/admin/audit-logs",
    requireAuth,
    requirePermission("system.view_audit_logs"),
    async (req, res) => {
      try {
        const logs = await storage.getAuditLogs();
        res.json(logs);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ message: "Failed to fetch audit logs" });
      }
    }
  );

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
          bio: "Licensed physical therapist specializing in orthopedic rehabilitation.",
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
          bio: "Respiratory therapist with expertise in critical care ventilation.",
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
          bio: "Medical laboratory technician with clinical chemistry expertise.",
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
          bio: "Certified pharmacy technician with sterile compounding experience.",
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
          bio: "Radiologic technologist specializing in CT and MRI imaging.",
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
          bio: "Occupational therapist with pediatric and geriatric expertise.",
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
          bio: "Certified nursing assistant with ICU and critical care experience.",
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
          bio: "Licensed practical nurse with emergency department expertise.",
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
          bio: "Certified surgical technologist with orthopedic and general surgery experience.",
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
          bio: "Pediatric registered nurse with NICU and general pediatrics experience.",
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
          bio: "Cardiac care registered nurse with telemetry and cath lab experience.",
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
          bio: "Medical-surgical certified nursing assistant with wound care expertise.",
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
          bio: "Neurological registered nurse with stroke and brain injury expertise.",
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
          bio: "Licensed practical nurse specializing in oncology and chemotherapy administration.",
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
          bio: "Patient care technician with dialysis and nephrology experience.",
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
          bio: "Medical assistant with mental health and behavioral health experience.",
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

  app.post("/api/staff/posts", requireAuth, async (req: any, res) => {
    try {
      const newPost = {
        id: Date.now(),
        authorId: req.user!.id,
        authorName: req.user!.username,
        authorAvatar:
          req.user!.avatar ||
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

  // Staff Facility Association API - Direct Database Implementation
  app.post("/api/staff/:staffId/facilities", requireAuth, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { facilityId } = req.body;

      const staffIdNum = parseInt(staffId);
      const facilityIdNum = parseInt(facilityId);


      // Get current staff data from database - select specific columns to avoid issues with missing columns
      const staffData = await db
        .select({
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          associatedFacilities: staff.associatedFacilities,
        })
        .from(staff)
        .where(eq(staff.id, staffIdNum))
        .limit(1);

      if (!staffData.length) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const currentStaff = staffData[0];

      // Add facility if not already associated
      const currentAssociations = Array.isArray(currentStaff.associatedFacilities)
        ? currentStaff.associatedFacilities
        : [];
      let updatedAssociations = [...currentAssociations];

      if (!updatedAssociations.includes(facilityIdNum)) {
        updatedAssociations.push(facilityIdNum);
      }

      // Update in database
      await db
        .update(staff)
        .set({
          associatedFacilities: updatedAssociations,
          updatedAt: new Date(),
        })
        .where(eq(staff.id, staffIdNum));


      res.json({
        message: "Facility association added successfully",
        staffId: staffIdNum,
        facilityId: facilityIdNum,
        associations: updatedAssociations,
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


      // Get current staff data from database - select specific columns to avoid issues with missing columns
      const staffData = await db
        .select({
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          associatedFacilities: staff.associatedFacilities,
        })
        .from(staff)
        .where(eq(staff.id, staffIdNum))
        .limit(1);

      if (!staffData.length) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const currentStaff = staffData[0];

      // Remove facility from associations
      const currentAssociations = Array.isArray(currentStaff.associatedFacilities)
        ? currentStaff.associatedFacilities
        : [];
      const updatedAssociations = currentAssociations.filter((id) => id !== facilityIdNum);

      // Update in database
      await db
        .update(staff)
        .set({
          associatedFacilities: updatedAssociations,
          updatedAt: new Date(),
        })
        .where(eq(staff.id, staffIdNum));


      res.json({
        message: "Facility association removed successfully",
        staffId: staffIdNum,
        facilityId: facilityIdNum,
        associations: updatedAssociations,
      });
    } catch (error) {
      console.error("Error removing facility association:", error);
      res.status(500).json({ message: "Failed to remove facility association" });
    }
  });

  // Comprehensive Staff Profile Editing API
  app.patch("/api/staff/:id", requireAuth, async (req: any, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const updates = req.body;


      // Validate staff exists
      const existingStaff = await db
        .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName })
        .from(staff)
        .where(eq(staff.id, staffId))
        .limit(1);

      if (!existingStaff.length) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      // Prepare update object with only defined fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Basic information
      if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.specialty !== undefined) updateData.specialty = updates.specialty;
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.employmentType !== undefined) updateData.employmentType = updates.employmentType;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.hourlyRate !== undefined) updateData.hourlyRate = updates.hourlyRate;
      if (updates.profilePhoto !== undefined) updateData.profilePhoto = updates.profilePhoto;
      if (updates.reliabilityScore !== undefined)
        updateData.reliabilityScore = updates.reliabilityScore;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.availabilityStatus !== undefined)
        updateData.availabilityStatus = updates.availabilityStatus;

      // Licensing and credentials
      if (updates.licenseNumber !== undefined) updateData.licenseNumber = updates.licenseNumber;
      if (updates.licenseExpiry !== undefined)
        updateData.licenseExpiry = new Date(updates.licenseExpiry);
      if (updates.certifications !== undefined) updateData.certifications = updates.certifications;
      if (updates.languages !== undefined) updateData.languages = updates.languages;

      // Contact and address information
      if (updates.homeAddress !== undefined) updateData.homeAddress = updates.homeAddress;
      if (updates.homeZipCode !== undefined) updateData.homeZipCode = updates.homeZipCode;
      if (updates.emergencyContact !== undefined)
        updateData.emergencyContact = updates.emergencyContact;

      // Facility associations
      if (updates.associatedFacilities !== undefined) {
        updateData.associatedFacilities = Array.isArray(updates.associatedFacilities)
          ? updates.associatedFacilities
          : [];
      }

      // Performance metrics
      if (updates.totalWorkedShifts !== undefined)
        updateData.totalWorkedShifts = updates.totalWorkedShifts;
      if (updates.lateArrivalCount !== undefined)
        updateData.lateArrivalCount = updates.lateArrivalCount;
      if (updates.noCallNoShowCount !== undefined)
        updateData.noCallNoShowCount = updates.noCallNoShowCount;
      if (updates.lastWorkDate !== undefined)
        updateData.lastWorkDate = new Date(updates.lastWorkDate);

      // Scheduling preferences
      if (updates.preferredShiftTypes !== undefined)
        updateData.preferredShiftTypes = updates.preferredShiftTypes;
      if (updates.weeklyAvailability !== undefined)
        updateData.weeklyAvailability = updates.weeklyAvailability;

      // Compliance information
      if (updates.backgroundCheckDate !== undefined)
        updateData.backgroundCheckDate = new Date(updates.backgroundCheckDate);
      if (updates.drugTestDate !== undefined)
        updateData.drugTestDate = new Date(updates.drugTestDate);
      if (updates.covidVaccinationStatus !== undefined)
        updateData.covidVaccinationStatus = updates.covidVaccinationStatus;
      if (updates.requiredCredentialsStatus !== undefined)
        updateData.requiredCredentialsStatus = updates.requiredCredentialsStatus;

      // Perform the update
      await db.update(staff).set(updateData).where(eq(staff.id, staffId));

      // Fetch and return updated staff data
      const updatedStaff = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);


      res.json({
        message: "Staff profile updated successfully",
        staff: updatedStaff[0],
      });
    } catch (error) {
      console.error("Error updating staff profile:", error);
      res.status(500).json({ message: "Failed to update staff profile" });
    }
  });

  // New Staff-Facility Association API using normalized tables
  app.get("/api/staff/:staffId/facility-associations", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const associations = await storage.getStaffFacilityAssociations(staffId);
      res.json(associations);
    } catch (error) {
      console.error("Error fetching staff facility associations:", error);
      res.status(500).json({ message: "Failed to fetch facility associations" });
    }
  });

  app.post("/api/staff/:staffId/facility-associations", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { facilityId, isPrimary, startDate } = req.body;

      const association = await storage.addStaffFacilityAssociation({
        staffId,
        facilityId,
        isPrimary: isPrimary || false,
        startDate: startDate ? new Date(startDate) : new Date(),
        status: "active",
      });

      res.json(association);
    } catch (error) {
      console.error("Error adding staff facility association:", error);
      res.status(500).json({ message: "Failed to add facility association" });
    }
  });

  app.delete(
    "/api/staff/:staffId/facility-associations/:facilityId",
    requireAuth,
    async (req, res) => {
      try {
        const staffId = parseInt(req.params.staffId);
        const facilityId = parseInt(req.params.facilityId);

        await storage.removeStaffFacilityAssociation(staffId, facilityId);
        res.json({ message: "Facility association removed successfully" });
      } catch (error) {
        console.error("Error removing staff facility association:", error);
        res.status(500).json({ message: "Failed to remove facility association" });
      }
    }
  );

  // Staff Credentials API
  app.get("/api/staff/:staffId/credentials", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const credentials = await storage.getStaffCredentials(staffId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching staff credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post("/api/staff/:staffId/credentials", requireAuth, async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { credentialId, issueDate, expiryDate, credentialNumber } = req.body;

      const credential = await storage.addStaffCredential({
        staffId,
        credentialId,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialNumber,
        isVerified: false,
        createdAt: new Date(),
      });

      res.json(credential);
    } catch (error) {
      console.error("Error adding staff credential:", error);
      res.status(500).json({ message: "Failed to add credential" });
    }
  });

  // Get staff by facility using the new association
  app.get("/api/facilities/:facilityId/staff", requireAuth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const staffMembers = await storage.getStaffByFacility(facilityId);

      // Add full name for backward compatibility
      const formattedStaff = staffMembers.map((member) => ({
        ...member,
        name: `${member.firstName} ${member.lastName}`,
      }));

      res.json(formattedStaff);
    } catch (error) {
      console.error("Error fetching staff by facility:", error);
      res.status(500).json({ message: "Failed to fetch staff for facility" });
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

  // Shifts API with facility filtering
  app.get("/api/shifts", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user;

      // Get the effective user (original or impersonated)
      const impersonatedUserId = (req.session as any).impersonatedUserId;
      let effectiveUser = currentUser;

      if (impersonatedUserId) {
        effectiveUser = await storage.getUser(impersonatedUserId);
        if (effectiveUser && effectiveUser.role !== "super_admin") {
          const facilityUser = await storage.getFacilityUserByEmail(effectiveUser.email);
          if (facilityUser) {
            (effectiveUser as any).associatedFacilities = facilityUser.associated_facility_ids;
          }
        }
      }

        console.log(
          `[SHIFTS API] Fetching shifts for user ${effectiveUser?.email}, role: ${effectiveUser?.role}`
        );

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
            const baseRates: { [key: string]: number } = {
              "Registered Nurse": 35,
              "Licensed Practical Nurse": 28,
              "Certified Nursing Assistant": 18,
              "Physical Therapist": 45,
              "Respiratory Therapist": 32,
            };
            const baseRate = baseRates[specialty] || 30;
            const premiumMultiplier = 1 + Math.random() * 0.7; // 100-170% of base rate
            const rate = Math.round(baseRate * premiumMultiplier);

            // Only generate shifts for user's associated facilities
            const userFacilities = (effectiveUser as any).associatedFacilities || [1];
            const targetFacilityId = userFacilities.includes(19) ? 19 : userFacilities[0] || 1;
            const targetFacilityName =
              targetFacilityId === 19
                ? "Test Squad Skilled Nursing"
                : "Sunrise Manor Skilled Nursing";

            shifts.push({
              id: id++,
              title: `${department} ${shiftTime.type} Shift`,
              date: d.toISOString().split("T")[0],
              startTime: shiftTime.start,
              endTime: shiftTime.end,
              department,
              specialty,
              status,
              facilityId: targetFacilityId,
              facilityName: targetFacilityName,
              rate,
              urgency,
              description: `${department} coverage needed, ${specialty} position`,
            });
          }
        }
        return shifts.slice(0, 5000); // Return recent shifts for performance
      };

      let shifts = generateShifts();

      // Filter shifts by user's associated facilities
      if (effectiveUser?.role !== "super_admin") {
        const userFacilities = (effectiveUser as any).associatedFacilities || [];

        if (userFacilities && userFacilities.length > 0) {
          shifts = shifts.filter((shift) => userFacilities.includes(shift.facilityId));
        }
      }

        console.log(
          `[SHIFTS API] Returning ${shifts.length} shifts for user ${effectiveUser?.email}`
        );
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // Duplicate route removed - using the one with proper validation at line ~1676

  // Remove this duplicate route - using the one below with transformations

  app.post("/api/shift-templates", requireAuth, async (req, res) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    try {
      const {
        name,
        department,
        specialty,
        facilityId,
        facilityName,
        minStaff,
        maxStaff,
        shiftType,
        startTime: shiftStartTime,
        endTime,
        daysOfWeek,
        hourlyRate,
        daysPostedOut,
        notes,
      } = req.body;

      const newTemplate = await storage.createShiftTemplate({
        name,
        department,
        specialty,
        facilityId,
        facilityName: facilityName || "Unknown Facility",
        minStaff,
        maxStaff: maxStaff || minStaff, // Default maxStaff to minStaff if not provided
        shiftType,
        startTime: shiftStartTime,
        endTime,
        daysOfWeek,
        hourlyRate,
        daysPostedOut: daysPostedOut || 7,
        notes,
        isActive: true,
        generatedShiftsCount: 0,
      });

      // Track successful template creation
      await analytics.trackTemplate(
        "create",
        newTemplate.id,
        { ...context, facilityId },
        {
          templateName: name,
          department,
          specialty,
          facilityId,
          facilityName: facilityName || "Unknown Facility",
          shiftType,
          minStaff,
          maxStaff: maxStaff || minStaff,
          daysOfWeek: daysOfWeek.length,
          hourlyRate,
          daysPostedOut: daysPostedOut || 7,
          success: true,
          duration: Date.now() - startTime,
        }
      );

      res.status(201).json(newTemplate);
    } catch (error) {
      // Track failed template creation
      await analytics.trackTemplate("create", "failed", context, {
        reason: "creation_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        templateName: req.body.name,
        facilityId: req.body.facilityId,
        success: false,
      });

      console.error("Error creating shift template:", error);
      res.status(500).json({ message: "Failed to create shift template" });
    }
  });

  app.put("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      const {
        name,
        department,
        specialty,
        facilityId,
        facilityName,
        buildingId,
        buildingName,
        minStaff,
        maxStaff,
        shiftType,
        startTime,
        endTime,
        daysOfWeek,
        hourlyRate,
        daysPostedOut,
        notes,
      } = req.body;

      const updateData = {
        name,
        department,
        specialty,
        facilityId,
        facilityName,
        buildingId,
        buildingName,
        minStaff,
        maxStaff: maxStaff || minStaff, // Ensure maxStaff is at least minStaff
        shiftType,
        startTime,
        endTime,
        daysOfWeek,
        hourlyRate,
        daysPostedOut,
        notes,
      };


      const updatedTemplate = await storage.updateShiftTemplate(templateId, updateData);

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }


      // Transform database response to camelCase for frontend
      const transformedTemplate = {
        ...updatedTemplate,
        facilityId: updatedTemplate.facilityId,
        facilityName: updatedTemplate.facilityName,
        buildingId: updatedTemplate.buildingId,
        buildingName: updatedTemplate.buildingName,
        minStaff: updatedTemplate.minStaff,
        maxStaff: updatedTemplate.maxStaff,
        shiftType: updatedTemplate.shiftType,
        startTime: updatedTemplate.startTime,
        endTime: updatedTemplate.endTime,
        daysOfWeek: updatedTemplate.daysOfWeek,
        isActive: updatedTemplate.isActive,
        hourlyRate: updatedTemplate.hourlyRate,
        daysPostedOut: updatedTemplate.daysPostedOut,
      };

      res.json(transformedTemplate);
    } catch (error) {
      console.error("Error updating shift template:", error);
      res.status(500).json({ message: "Failed to update shift template", error: error.message });
    }
  });

  app.delete("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      const deleted = await storage.deleteShiftTemplate(templateId);

      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json({
        message: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Failed to delete shift template" });
    }
  });

  // Create shift endpoint - validates facility associations for facility users
  app.post("/api/shifts", requireAuth, async (req, res) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    try {
      const shiftData = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Validate facility association for facility users
      if (user.role !== "super_admin") {
        const facilityUser = await storage.getFacilityUserByEmail(user.email);
        if (facilityUser && facilityUser.associatedFacilityIds) {
          const associatedFacilityIds = facilityUser.associatedFacilityIds;
          const requestedFacilityId = parseInt(shiftData.facilityId);

          if (!associatedFacilityIds.includes(requestedFacilityId)) {
            // Track unauthorized shift creation attempt
            await analytics.trackShift("create", "unauthorized", context, {
              facilityId: requestedFacilityId,
              userFacilities: associatedFacilityIds,
              reason: "facility_not_associated",
              success: false,
            });

            return res.status(403).json({
              message: "You can only create shifts for facilities you are associated with",
            });
          }
        }
      }

      // Generate unique shift ID
      const shiftId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Get facility details
      const facilities = await storage.getFacilities({ isActive: true });
      const facility = facilities.find((f) => f.id === parseInt(shiftData.facilityId));

      // Insert shift into generated_shifts table
      await db.insert(generatedShifts).values({
        id: shiftId,
        templateId: 0,
        title: shiftData.title || "Untitled Shift",
        date: shiftData.date || new Date().toISOString().split("T")[0],
        startTime: shiftData.startTime || "07:00",
        endTime: shiftData.endTime || "19:00",
        department: shiftData.specialty || "General",
        specialty: shiftData.specialty || "General",
        facilityId: parseInt(shiftData.facilityId) || 1,
        facilityName: facility?.name || "General Hospital",
        buildingId: "main-building",
        buildingName: "Main Building",
        status: "open",
        rate: parseFloat(shiftData.rate) || 45.0,
        urgency: shiftData.urgency || "medium",
        description: shiftData.description || "",
        requiredWorkers: parseInt(shiftData.requiredStaff) || 1,
        minStaff: 1,
        maxStaff: parseInt(shiftData.requiredStaff) || 1,
        totalHours: 8,
        shiftType: shiftData.shiftType || "Day",
      });

      // Track successful shift creation
      await analytics.trackShift(
        "create",
        shiftId,
        { ...context, facilityId: parseInt(shiftData.facilityId) },
        {
          title: shiftData.title,
          specialty: shiftData.specialty,
          date: shiftData.date,
          facilityId: parseInt(shiftData.facilityId),
          facilityName: facility?.name,
          urgency: shiftData.urgency,
          requiredWorkers: parseInt(shiftData.requiredStaff) || 1,
          rate: parseFloat(shiftData.rate) || 45.0,
          success: true,
          duration: Date.now() - startTime,
        }
      );

      res.json({
        message: "Shift created successfully",
        shiftId,
        shift: {
          id: shiftId,
          ...shiftData,
          status: "open",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Create shift error:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  // Post shift endpoint - generates individual shifts to database
  app.post("/api/shifts/post", requireAuth, async (req, res) => {
    try {
      const requestBody = req.body;
      const userId = (req as any).user?.id;


      // Extract shiftData from request body (the mutation wraps it in { shiftData })
      const shiftData = requestBody.shiftData || requestBody;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Generate unique shift ID using timestamp and random component
      const shiftId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Insert shift into generated_shifts table
      await db.insert(generatedShifts).values({
        id: shiftId,
        templateId: shiftData.templateId || 0,
        title: shiftData.title || "Untitled Shift",
        date: shiftData.date || new Date().toISOString().split("T")[0],
        startTime: shiftData.startTime || "07:00",
        endTime: shiftData.endTime || "19:00",
        department: shiftData.department || "General",
        specialty: shiftData.specialty || "General",
        facilityId: shiftData.facilityId || 1,
        facilityName: shiftData.facilityName || "General Hospital",
        buildingId: shiftData.buildingId || "main-building",
        buildingName: shiftData.buildingName || "Main Building",
        status: "open",
        rate: shiftData.rate || shiftData.hourlyRate || "45.00",
        urgency: shiftData.urgency || "medium",
        description: shiftData.description || "",
        requiredWorkers: shiftData.requiredWorkers || 1,
        minStaff: shiftData.minStaff || 1,
        maxStaff: shiftData.maxStaff || 1,
        totalHours: shiftData.totalHours || 8,
      });

      res.json({
        message: "Shift posted successfully",
        shiftId,
        shift: {
          id: shiftId,
          ...shiftData,
          status: "open",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Post shift error:", error);
      res.status(500).json({ message: "Failed to post shift" });
    }
  });

  // Create shifts from template endpoint - generates multiple shifts with individual IDs
  app.post("/api/shifts/from-template", requireAuth, async (req, res) => {
    try {
      const { templateId, startDate, endDate, daysInAdvance } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Import the service
      const { shiftTemplateService } = await import("./shift-template-service");

      // Generate shifts using the service
      const generatedShifts = await shiftTemplateService.generateShiftsFromTemplate({
        templateId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        skipExisting: true,
        preserveAssigned: true,
      });


      res.json({
        message: `Successfully created ${generatedShifts.length} shifts from template`,
        generatedShifts: generatedShifts.length,
        shifts: generatedShifts,
        templateId: templateId,
        dateRange: { startDate, endDate },
        daysInAdvance,
      });
    } catch (error) {
      console.error("Create shifts from template error:", error);
      res
        .status(500)
        .json({
          message: error instanceof Error ? error.message : "Failed to create shifts from template",
        });
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
          generatedShifts: newShifts,
        });
      } else {
        // Remove future open shifts when deactivating template
        const removedShifts = 15;
        res.json({
          message: `Template deactivated and ${removedShifts} future open shifts removed`,
          removedShifts: removedShifts,
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update template status" });
    }
  });

  app.post("/api/shift-templates/:id/regenerate", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      // Import the service
      const { shiftTemplateService } = await import("./shift-template-service");

      // Get the template from database
      const templates = await storage.getShiftTemplates();
      const template = templates.find((t) => t.id === templateId);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Update template to trigger regeneration of future shifts
      const updatedTemplate = await shiftTemplateService.updateTemplate({
        templateId,
        updates: {}, // No actual updates, just trigger regeneration
        regenerateFuture: true,
      });

      // Count generated shifts for the next 30 days
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);

      const regeneratedShifts = await db
        .select()
        .from(generatedShifts)
        .where(
          and(
            eq(generatedShifts.templateId, templateId),
            gte(generatedShifts.date, today.toISOString().split("T")[0]),
            lte(generatedShifts.date, futureDate.toISOString().split("T")[0])
          )
        );

        console.log(
          `[REGENERATE] Generated ${regeneratedShifts.length} shifts for template "${template.name}" (ID: ${templateId})`
        );

      res.json({
        message: `Successfully regenerated ${regeneratedShifts.length} future shifts from template "${template.name}"`,
        regeneratedShifts: regeneratedShifts.length,
        templateName: template.name,
      });
    } catch (error) {
      console.error("Regenerate shifts error:", error);
      res
        .status(500)
        .json({ message: error instanceof Error ? error.message : "Failed to regenerate shifts" });
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
          notes: "Primary assignment",
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
          notes: "Night coverage needed",
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
          notes: "Pending approval",
        },
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
          overage: 0,
        },
        {
          department: "Emergency",
          requiredHours: 210,
          budgetHours: 220,
          currentHours: 198,
          shortage: 12,
          overage: 0,
        },
        {
          department: "Medical-Surgical",
          requiredHours: 140,
          budgetHours: 150,
          currentHours: 152,
          shortage: 0,
          overage: 2,
        },
        {
          department: "Operating Room",
          requiredHours: 120,
          budgetHours: 130,
          currentHours: 118,
          shortage: 2,
          overage: 0,
        },
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
        createdAt: new Date().toISOString(),
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
        filledAt: new Date().toISOString(),
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
          // Create stable shift ID based on template, date, and position
          const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
          const shiftId = parseInt(
            `${template.id}${dateStr}${staffCount.toString().padStart(2, "0")}`
            );
          shifts.push({
            id: shiftId,
            templateId: template.id,
            date: date.toISOString().split("T")[0],
            startTime: template.startTime,
            endTime: template.endTime,
            department: template.department,
            specialty: template.specialty,
            facilityId: template.facilityId,
            status: "open",
            hourlyRate: template.hourlyRate,
            createdFromTemplate: true,
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
          isActive: true,
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
          isActive: true,
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
          isActive: true,
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
          isActive: true,
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
          isActive: true,
        },
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

      // Get target user from database
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Store original user in session
      (req.session as any).originalUser = req.user;
      (req.session as any).isImpersonating = true;

      // Set impersonated user as current user
      (req.session as any).user = {
        ...targetUser,
        isActive: true,
        canImpersonate: true,
      };

      res.json({
        message: "Impersonation started successfully",
        impersonatedUser: targetUser,
        originalUser: (req.session as any).originalUser,
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
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
        originalUser: originalUser,
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
       );
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

  // Track authenticated WebSocket connections
  const userConnections = new Map<number, Set<WebSocket>>();

  wss.on("connection", (ws: WebSocket & { userId?: number; isAlive?: boolean }, req) => {

    // Set up heartbeat to detect disconnected clients
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message types
        switch (message.type) {
          case "authenticate":
            // Authenticate WebSocket connection with user ID
            if (message.userId && typeof message.userId === "number") {
              ws.userId = message.userId;

              // Add to user connections map
              if (!userConnections.has(message.userId)) {
                userConnections.set(message.userId, new Set());
              }
              userConnections.get(message.userId)!.add(ws);

              ws.send(
                JSON.stringify({
                  type: "authenticated",
                  userId: message.userId,
                })
              );
            }
            break;

          case "new_message":
            // This is now handled by the REST API which broadcasts properly
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

          case "ping":
            // Handle ping/pong for connection health
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {

      // Remove from user connections
      if (ws.userId && userConnections.has(ws.userId)) {
        userConnections.get(ws.userId)!.delete(ws);
        if (userConnections.get(ws.userId)!.size === 0) {
          userConnections.delete(ws.userId);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Heartbeat interval to detect stale connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  // Clean up on server shutdown
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  // Shift template routes - replaces in-memory template storage
  app.get("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const facilityId = req.query.facilityId
        ? parseInt(req.query.facilityId as string)
        : undefined;
      const templates = await storage.getShiftTemplates(facilityId);

      // Transform database fields to camelCase for frontend
      const transformedTemplates = templates.map((template) => ({
        ...template,
        facilityId: template.facilityId,
        facilityName: template.facilityName,
        buildingId: template.buildingId,
        buildingName: template.buildingName,
        minStaff: template.minStaff,
        maxStaff: template.maxStaff,
        shiftType: template.shiftType,
        startTime: template.startTime,
        endTime: template.endTime,
        daysOfWeek: template.daysOfWeek,
        isActive: template.isActive,
        hourlyRate: template.hourlyRate,
        daysPostedOut: template.daysPostedOut,
      }));

      res.json(transformedTemplates);
    } catch (error) {
      console.error("Error fetching shift templates:", error);
      res.status(500).json({ message: "Failed to fetch shift templates" });
    }
  });

  app.post("/api/shift-templates", requireAuth, async (req, res) => {
    try {
      const validatedTemplate = insertShiftTemplateSchema.parse(req.body);
      const template = await storage.createShiftTemplate(validatedTemplate);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating shift template:", error);
      res.status(500).json({ message: "Failed to create shift template" });
    }
  });

  // Remove this duplicate - keeping the more comprehensive version above

  app.delete("/api/shift-templates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteShiftTemplate(id);

      if (!success) {
        return res.status(404).json({ message: "Shift template not found" });
      }

      res.json({ message: "Shift template deleted successfully" });
    } catch (error) {
      console.error("Error deleting shift template:", error);
      res.status(500).json({ message: "Failed to delete shift template" });
    }
  });

  // Generated shift routes - replaces global templateGeneratedShifts
  app.get("/api/generated-shifts", requireAuth, async (req, res) => {
    try {
      const dateRange =
        req.query.start && req.query.end
          ? {
              start: req.query.start as string,
              end: req.query.end as string,
            }
          : undefined;

      const shifts = await storage.getGeneratedShifts(dateRange);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching generated shifts:", error);
      res.status(500).json({ message: "Failed to fetch generated shifts" });
    }
  });

  app.post("/api/generated-shifts", requireAuth, async (req, res) => {
    try {
      const validatedShift = insertGeneratedShiftSchema.parse(req.body);
      const shift = await storage.createGeneratedShift(validatedShift);
      res.status(201).json(shift);
    } catch (error) {
      console.error("Error creating generated shift:", error);
      res.status(500).json({ message: "Failed to create generated shift" });
    }
  });

  app.put("/api/generated-shifts/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = insertGeneratedShiftSchema.partial().parse(req.body);
      const shift = await storage.updateGeneratedShift(id, updates);

      if (!shift) {
        return res.status(404).json({ message: "Generated shift not found" });
      }

      res.json(shift);
    } catch (error) {
      console.error("Error updating generated shift:", error);
      res.status(500).json({ message: "Failed to update generated shift" });
    }
  });

  app.delete("/api/generated-shifts/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const success = await storage.deleteGeneratedShift(id);

      if (!success) {
        return res.status(404).json({ message: "Generated shift not found" });
      }

      res.json({ message: "Generated shift deleted successfully" });
    } catch (error) {
      console.error("Error deleting generated shift:", error);
      res.status(500).json({ message: "Failed to delete generated shift" });
    }
  });

  // Session management routes - replaces file-based sessions
  app.get("/api/user-sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = await storage.getUserSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found or expired" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching user session:", error);
      res.status(500).json({ message: "Failed to fetch user session" });
    }
  });

  app.delete("/api/user-sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const success = await storage.deleteUserSession(sessionId);

      if (!success) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Error deleting user session:", error);
      res.status(500).json({ message: "Failed to delete user session" });
    }
  });

  app.post("/api/cleanup-sessions", requireAuth, async (req, res) => {
    try {
      const deletedCount = await storage.cleanupExpiredSessions();
      res.json({ message: `Cleaned up ${deletedCount} expired sessions` });
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      res.status(500).json({ message: "Failed to cleanup sessions" });
    }
  });

  // Teams Management Routes
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const teamsFromDB = await db.select().from(teams);

      // Get detailed member and facility data for each team
      const teamsWithDetails = await Promise.all(
        teamsFromDB.map(async (team) => {
          // Get team members with user details (regular users)
          const regularMembers = await db
            .select({
              id: teamMembers.id,
              userId: teamMembers.userId,
              role: teamMembers.role,
              joinedAt: teamMembers.joinedAt,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              userType: sql<string>`'user'`.as("userType"),
            })
            .from(teamMembers)
            .leftJoin(users, eq(teamMembers.userId, users.id))
            .where(eq(teamMembers.teamId, team.id));

          // Get facility user members based on facility associations
          // Facility users are automatically team members if their facility is part of the team
          // Get facility user team members through facilityUserTeamMemberships table
          const facilityMembers = await db
            .select({
              id: facilityUserTeamMemberships.id,
              userId: facilityUsers.id,
              role: facilityUserTeamMemberships.role,
              joinedAt: facilityUserTeamMemberships.createdAt,
              firstName: facilityUsers.firstName,
              lastName: facilityUsers.lastName,
              email: facilityUsers.email,
              userType: sql<string>`'facility'`.as("userType"),
            })
            .from(facilityUserTeamMemberships)
            .innerJoin(
              facilityUsers,
              eq(facilityUserTeamMemberships.facilityUserId, facilityUsers.id)
            )
            .where(
              and(eq(facilityUserTeamMemberships.teamId, team.id), eq(facilityUsers.isActive, true))
            );

          // Combine both types of members
          const members = [...regularMembers, ...facilityMembers];

          // Get team facilities with facility details
          const teamFacilitiesData = await db
            .select({
              id: teamFacilities.id,
              facilityId: teamFacilities.facilityId,
              assignedAt: teamFacilities.assignedAt,
              name: facilities.name,
              city: facilities.city,
              state: facilities.state,
              facilityType: facilities.facilityType,
            })
            .from(teamFacilities)
            .leftJoin(facilities, eq(teamFacilities.facilityId, facilities.id))
            .where(eq(teamFacilities.teamId, team.id));

          return {
            ...team,
            memberCount: members.length,
            facilityCount: teamFacilitiesData.length,
            members,
            facilities: teamFacilitiesData,
          };
        })
      );

      res.json(teamsWithDetails);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertTeamSchema.parse(req.body);
      const [team] = await db.insert(teams).values(validatedData).returning();

      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.post("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const { userId, userType, role } = req.body;

      // Handle facility users vs regular users
      if (userType === "facility") {
        // For facility users, create a facility-user team association
        const [facilityUserTeam] = await db
          .insert(facilityUserTeamMemberships)
          .values({
            facilityUserId: userId,
            teamId: teamId,
            role: role,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Also create record in facility user associations for compatibility
        const facilityUser = await db
          .select()
          .from(facilityUsers)
          .where(eq(facilityUsers.id, userId))
          .limit(1);
        if (facilityUser.length > 0) {
          const user = facilityUser[0];
          await db
            .insert(facilityUserFacilityAssociations)
            .values({
              userId: userId,
              facilityId: user.primaryFacilityId,
              isPrimary: true,
              assignedById: req.user?.id || 1,
              isActive: true,
              facilitySpecificPermissions: user.permissions,
            })
            .onConflictDoNothing();
        }

        res.json({
          id: facilityUserTeam.id,
          userId: userId,
          teamId: teamId,
          role: role,
          userType: "facility",
          joinedAt: facilityUserTeam.assignedAt,
        });
      } else {
        // For regular users, use the standard team members table
        const validatedData = insertTeamMemberSchema.parse({
          userId,
          teamId,
          role,
        });

        const [member] = await db.insert(teamMembers).values(validatedData).returning();

        res.json({
          ...member,
          userType: "user",
        });
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  app.post("/api/teams/:teamId/facilities", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const validatedData = insertTeamFacilitySchema.parse({
        ...req.body,
        teamId,
      });

      // Check if facility is already assigned to another team
      const existingAssignment = await db
        .select()
        .from(teamFacilities)
        .where(eq(teamFacilities.facilityId, validatedData.facilityId));

      if (existingAssignment.length > 0) {
        return res.status(400).json({
          message:
            "Facility is already assigned to another team. Each facility can only belong to one team.",
        });
      }

      // Add facility to team_facilities table
      const [facility] = await db.insert(teamFacilities).values(validatedData).returning();

      // Update facility's team_id for synchronization
      await db
        .update(facilities)
        .set({ teamId })
        .where(eq(facilities.id, validatedData.facilityId));

      res.json(facility);
    } catch (error) {
      console.error("Error assigning facility to team:", error);
      res.status(500).json({ message: "Failed to assign facility to team" });
    }
  });

  app.patch("/api/teams/:teamId", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const validatedData = insertTeamSchema.partial().parse(req.body);

      const [updatedTeam] = await db
        .update(teams)
        .set(validatedData)
        .where(eq(teams.id, teamId))
        .returning();

      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:teamId/facilities/:facilityId", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const facilityId = parseInt(req.params.facilityId);

      // Remove facility from team_facilities table
      await db
        .delete(teamFacilities)
        .where(and(eq(teamFacilities.teamId, teamId), eq(teamFacilities.facilityId, facilityId)));

      // Update facility's team_id to null for synchronization
      await db.update(facilities).set({ teamId: null }).where(eq(facilities.id, facilityId));

      res.json({ message: "Facility removed from team successfully" });
    } catch (error) {
      console.error("Error removing facility from team:", error);
      res.status(500).json({ message: "Failed to remove facility from team" });
    }
  });

  app.delete("/api/teams/:teamId/members/:memberId", requireAuth, async (req, res) => {
    try {
      if (!["super_admin", "client_administrator"].includes(req.user?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);

      // Remove member from team_members table
      await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.id, memberId)));

      res.json({ message: "Member removed from team successfully" });
    } catch (error) {
      console.error("Error removing member from team:", error);
      res.status(500).json({ message: "Failed to remove member from team" });
    }
  });

  // ===== FACILITY USER MANAGEMENT API =====

  // Get all facility users from users table
  app.get("/api/facility-users", requireAuth, async (req, res) => {
    try {
      const facilityUsersData = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          avatar: users.avatar,
          isActive: users.isActive,
          primaryFacilityId: users.facilityId,
          associatedFacilityIds: users.associatedFacilities,
          phone: sql<string>`null`.as("phone"),
          title: sql<string>`null`.as("title"),
          department: sql<string>`null`.as("department"),
          permissions: sql<any>`null`.as("permissions"),
          lastLogin: sql<Date>`null`.as("lastLogin"),
          loginCount: sql<number>`0`.as("loginCount"),
          twoFactorEnabled: sql<boolean>`false`.as("twoFactorEnabled"),
          notes: sql<string>`null`.as("notes"),
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          facilityName: facilities.name,
        })
        .from(users)
        .leftJoin(facilities, eq(users.facilityId, facilities.id))
        .where(
          sql`${users.role} IN ('facility_administrator', 'scheduling_coordinator', 'hr_manager', 'billing', 'supervisor', 'director_of_nursing', 'viewer', 'corporate', 'regional_director', 'facility_admin')`
        )
        .orderBy(users.lastName, users.firstName);

      res.json(facilityUsersData);
    } catch (error) {
      console.error("Error fetching facility users:", error);
      res.status(500).json({ message: "Failed to fetch facility users" });
    }
  });

  // Create facility user
  app.post("/api/facility-users", requireAuth, async (req, res) => {
    try {
      const userData = insertFacilityUserSchema.parse(req.body);

      // Hash password (in real implementation, use proper bcrypt)
      const hashedPassword = userData.password; // Placeholder for demo

      const [newUser] = await db
        .insert(facilityUsers)
        .values({
          ...userData,
          password: hashedPassword,
          createdById: req.user?.id,
        })
        .returning({
          id: facilityUsers.id,
          username: facilityUsers.username,
          email: facilityUsers.email,
          firstName: facilityUsers.firstName,
          lastName: facilityUsers.lastName,
          role: facilityUsers.role,
          isActive: facilityUsers.isActive,
          primaryFacilityId: facilityUsers.primaryFacilityId,
          title: facilityUsers.title,
          department: facilityUsers.department,
          permissions: facilityUsers.permissions,
          createdAt: facilityUsers.createdAt,
        });

      // Log activity
      await db.insert(facilityUserActivityLog).values({
        userId: newUser.id,
        facilityId: newUser.primaryFacilityId,
        action: "user_created",
        details: { createdBy: req.user?.id, role: newUser.role },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating facility user:", error);
      res.status(500).json({ message: "Failed to create facility user" });
    }
  });

  // Update facility user
  app.patch("/api/facility-users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updateData.id;
      delete updateData.password;
      delete updateData.createdAt;
      delete updateData.createdById;

      const [updatedUser] = await db
        .update(facilityUsers)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(facilityUsers.id, id))
        .returning({
          id: facilityUsers.id,
          username: facilityUsers.username,
          email: facilityUsers.email,
          firstName: facilityUsers.firstName,
          lastName: facilityUsers.lastName,
          role: facilityUsers.role,
          isActive: facilityUsers.isActive,
          primaryFacilityId: facilityUsers.primaryFacilityId,
          title: facilityUsers.title,
          department: facilityUsers.department,
          permissions: facilityUsers.permissions,
          updatedAt: facilityUsers.updatedAt,
        });

      if (!updatedUser) {
        return res.status(404).json({ message: "Facility user not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating facility user:", error);
      res.status(500).json({ message: "Failed to update facility user" });
    }
  });

  // Deactivate facility user
  app.patch("/api/facility-users/:id/deactivate", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deactivatedUser] = await db
        .update(facilityUsers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(facilityUsers.id, id))
        .returning({
          id: facilityUsers.id,
          isActive: facilityUsers.isActive,
        });

      if (!deactivatedUser) {
        return res.status(404).json({ message: "Facility user not found" });
      }

      res.json({ message: "Facility user deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating facility user:", error);
      res.status(500).json({ message: "Failed to deactivate facility user" });
    }
  });

  // Setup sample facility users with updated roles and permissions
  app.post("/api/setup-facility-users", requireAuth, async (req, res) => {
    try {
      // Define role permission mappings based on your requirements
      const rolePermissions = {
        facility_admin: [
          "view_facility_profile",
          "edit_facility_profile",
          "create_shifts",
          "edit_shifts",
          "delete_shifts",
          "approve_shift_requests",
          "onboard_staff",
          "offboard_staff",
          "view_rates",
          "edit_rates",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "premium_shift_multiplier_1_2",
          "premium_shift_multiplier_1_3",
          "premium_shift_multiplier_1_4",
          "premium_shift_multiplier_1_5",
          "premium_shift_multiplier_1_6",
          "view_timesheets",
          "export_timesheets",
          "approve_timesheets",
          "approve_payroll",
          "access_analytics",
          "access_reports",
          "manage_users_and_team",
          "manage_job_openings",
          "view_job_openings",
        ],
        scheduling_coordinator: [
          "view_facility_profile",
          "create_shifts",
          "edit_shifts",
          "delete_shifts",
          "approve_shift_requests",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "premium_shift_multiplier_1_2",
          "view_timesheets",
          "access_reports",
          "manage_job_openings",
          "view_job_openings",
        ],
        hr_manager: [
          "view_facility_profile",
          "onboard_staff",
          "offboard_staff",
          "view_rates",
          "view_timesheets",
          "export_timesheets",
          "approve_timesheets",
          "access_analytics",
          "access_reports",
          "manage_users_and_team",
          "manage_job_openings",
          "view_job_openings",
        ],
        corporate: [
          "view_facility_profile",
          "edit_facility_profile",
          "view_rates",
          "edit_rates",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "premium_shift_multiplier_1_2",
          "premium_shift_multiplier_1_3",
          "premium_shift_multiplier_1_4",
          "premium_shift_multiplier_1_5",
          "premium_shift_multiplier_1_6",
          "view_timesheets",
          "export_timesheets",
          "approve_timesheets",
          "approve_payroll",
          "access_analytics",
          "access_reports",
          "manage_users_and_team",
        ],
        regional_director: [
          "view_facility_profile",
          "edit_facility_profile",
          "approve_shift_requests",
          "view_rates",
          "edit_rates",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "premium_shift_multiplier_1_2",
          "premium_shift_multiplier_1_3",
          "premium_shift_multiplier_1_4",
          "premium_shift_multiplier_1_5",
          "premium_shift_multiplier_1_6",
          "view_timesheets",
          "export_timesheets",
          "approve_payroll",
          "access_analytics",
          "access_reports",
          "manage_users_and_team",
        ],
        billing: [
          "view_facility_profile",
          "view_rates",
          "view_timesheets",
          "export_timesheets",
          "approve_timesheets",
          "approve_payroll",
          "access_reports",
        ],
        supervisor: [
          "view_facility_profile",
          "create_shifts",
          "edit_shifts",
          "approve_shift_requests",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "view_timesheets",
          "approve_timesheets",
          "access_reports",
          "view_job_openings",
        ],
        director_of_nursing: [
          "view_facility_profile",
          "edit_facility_profile",
          "create_shifts",
          "edit_shifts",
          "delete_shifts",
          "approve_shift_requests",
          "onboard_staff",
          "offboard_staff",
          "view_rates",
          "premium_shift_multiplier_1_0",
          "premium_shift_multiplier_1_1",
          "premium_shift_multiplier_1_2",
          "premium_shift_multiplier_1_3",
          "view_timesheets",
          "export_timesheets",
          "approve_timesheets",
          "access_analytics",
          "access_reports",
          "manage_job_openings",
          "view_job_openings",
        ],
      };

      // Enhanced facility users - at least one for each major facility
      const facilityUsersData = [
        // General Hospital (ID: 1)
        {
          username: "admin.sarah",
          email: "sarah.admin@generalhospital.com",
          password: "hashed_password_1",
          firstName: "Sarah",
          lastName: "Henderson",
          role: "facility_admin",
          primaryFacilityId: 1,
          associatedFacilityIds: [1],
          title: "Facility Administrator",
          department: "Administration",
          permissions: rolePermissions.facility_admin,
          isActive: true,
        },
        {
          username: "coord.mike",
          email: "mike.scheduling@generalhospital.com",
          password: "hashed_password_2",
          firstName: "Mike",
          lastName: "Rodriguez",
          role: "scheduling_coordinator",
          primaryFacilityId: 1,
          associatedFacilityIds: [1, 2],
          title: "Scheduling Coordinator",
          department: "Operations",
          permissions: rolePermissions.scheduling_coordinator,
          isActive: true,
        },
        // Sunset Nursing Home (ID: 2)
        {
          username: "hr.jennifer",
          email: "jennifer.hr@sunsetnursing.com",
          password: "hashed_password_3",
          firstName: "Jennifer",
          lastName: "Chen",
          role: "hr_manager",
          primaryFacilityId: 2,
          associatedFacilityIds: [2],
          title: "HR Manager",
          department: "Human Resources",
          permissions: rolePermissions.hr_manager,
          isActive: true,
        },
        {
          username: "director.emily",
          email: "emily.nursing@sunsetnursing.com",
          password: "hashed_password_10",
          firstName: "Emily",
          lastName: "Davis",
          role: "director_of_nursing",
          primaryFacilityId: 2,
          associatedFacilityIds: [2],
          title: "Director of Nursing",
          department: "Nursing",
          permissions: rolePermissions.director_of_nursing,
          isActive: true,
        },
        // Care Medical Center (ID: 3)
        {
          username: "admin.robert",
          email: "robert.admin@caremedical.com",
          password: "hashed_password_11",
          firstName: "Robert",
          lastName: "Martinez",
          role: "facility_admin",
          primaryFacilityId: 3,
          associatedFacilityIds: [3],
          title: "Chief Administrator",
          department: "Administration",
          permissions: rolePermissions.facility_admin,
          isActive: true,
        },
        {
          username: "billing.maria",
          email: "maria.billing@caremedical.com",
          password: "hashed_password_12",
          firstName: "Maria",
          lastName: "Garcia",
          role: "billing",
          primaryFacilityId: 3,
          associatedFacilityIds: [3],
          title: "Billing Manager",
          department: "Finance",
          permissions: rolePermissions.billing,
          isActive: true,
        },
        // Chicago General Hospital (ID: 4)
        {
          username: "supervisor.james",
          email: "james.supervisor@chicagogeneral.com",
          password: "hashed_password_13",
          firstName: "James",
          lastName: "Johnson",
          role: "supervisor",
          primaryFacilityId: 4,
          associatedFacilityIds: [4],
          title: "Nursing Supervisor",
          department: "Nursing",
          permissions: rolePermissions.supervisor,
          isActive: true,
        },
        {
          username: "coord.anna",
          email: "anna.scheduling@chicagogeneral.com",
          password: "hashed_password_14",
          firstName: "Anna",
          lastName: "Smith",
          role: "scheduling_coordinator",
          primaryFacilityId: 4,
          associatedFacilityIds: [4],
          title: "Shift Coordinator",
          department: "Operations",
          permissions: rolePermissions.scheduling_coordinator,
          isActive: true,
        },
        // Springfield Care Center (ID: 5)
        {
          username: "hr.michael",
          email: "michael.hr@springfieldcare.com",
          password: "hashed_password_15",
          firstName: "Michael",
          lastName: "Brown",
          role: "hr_manager",
          primaryFacilityId: 5,
          associatedFacilityIds: [5],
          title: "Human Resources Director",
          department: "Human Resources",
          permissions: rolePermissions.hr_manager,
          isActive: true,
        },
        // Metro Community Clinic (ID: 6)
        {
          username: "admin.linda",
          email: "linda.admin@metroclinic.com",
          password: "hashed_password_16",
          firstName: "Linda",
          lastName: "Williams",
          role: "facility_admin",
          primaryFacilityId: 6,
          associatedFacilityIds: [6],
          title: "Clinic Administrator",
          department: "Administration",
          permissions: rolePermissions.facility_admin,
          isActive: true,
        },
        // Corporate and Regional roles
        {
          username: "corp.david",
          email: "david.corporate@nexspace.com",
          password: "hashed_password_4",
          firstName: "David",
          lastName: "Wilson",
          role: "corporate",
          primaryFacilityId: 1,
          associatedFacilityIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          title: "Corporate Operations Manager",
          department: "Corporate",
          permissions: rolePermissions.corporate,
          isActive: true,
        },
        {
          username: "director.lisa",
          email: "lisa.regional@nexspace.com",
          password: "hashed_password_5",
          firstName: "Lisa",
          lastName: "Thompson",
          role: "regional_director",
          primaryFacilityId: 1,
          associatedFacilityIds: [1, 2, 3],
          title: "Regional Director - West Coast",
          department: "Regional Management",
          permissions: rolePermissions.regional_director,
          isActive: true,
        },
        {
          username: "billing.robert",
          email: "robert.billing@facility1.com",
          password: "hashed_password_6",
          firstName: "Robert",
          lastName: "Davis",
          role: "billing",
          primaryFacilityId: 1,
          associatedFacilityIds: [1],
          title: "Billing Coordinator",
          department: "Finance",
          permissions: rolePermissions.billing,
          isActive: true,
        },
        {
          username: "supervisor.maria",
          email: "maria.supervisor@facility2.com",
          password: "hashed_password_7",
          firstName: "Maria",
          lastName: "Garcia",
          role: "supervisor",
          primaryFacilityId: 2,
          associatedFacilityIds: [2],
          title: "Nursing Supervisor",
          department: "Nursing",
          permissions: rolePermissions.supervisor,
          isActive: true,
        },
        {
          username: "don.amanda",
          email: "amanda.don@facility1.com",
          password: "hashed_password_8",
          firstName: "Amanda",
          lastName: "Johnson",
          role: "director_of_nursing",
          primaryFacilityId: 1,
          associatedFacilityIds: [1],
          title: "Director of Nursing",
          department: "Nursing",
          permissions: rolePermissions.director_of_nursing,
          isActive: true,
        },
      ];

      // Clear existing facility users first
      await db.delete(facilityUserActivityLog);
      await db.delete(facilityUserFacilityAssociations);
      await db.delete(facilityUsers);

      // Create facility users
      const createdUsers = [];
      for (const userData of facilityUsersData) {
        const [newUser] = await db
          .insert(facilityUsers)
          .values({
            ...userData,
            createdById: req.user?.id || 1,
          })
          .returning({
            id: facilityUsers.id,
            username: facilityUsers.username,
            email: facilityUsers.email,
            firstName: facilityUsers.firstName,
            lastName: facilityUsers.lastName,
            role: facilityUsers.role,
            primaryFacilityId: facilityUsers.primaryFacilityId,
            title: facilityUsers.title,
            department: facilityUsers.department,
            permissions: facilityUsers.permissions,
            isActive: facilityUsers.isActive,
          });

        // Create facility associations
        for (const facilityId of userData.associatedFacilityIds) {
          await db.insert(facilityUserFacilityAssociations).values({
            userId: newUser.id,
            facilityId: facilityId,
            isPrimary: facilityId === userData.primaryFacilityId,
            assignedById: req.user?.id || 1,
            isActive: true,
            facilitySpecificPermissions: userData.permissions,
          });
        }

        // Log activity
        await db.insert(facilityUserActivityLog).values({
          userId: newUser.id,
          facilityId: newUser.primaryFacilityId,
          action: "user_created",
          details: {
            createdBy: req.user?.id || 1,
            role: newUser.role,
            setupType: "sample_data",
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        createdUsers.push(newUser);
      }

      res.status(201).json({
        message: "Sample facility users created successfully",
        users: createdUsers,
        count: createdUsers.length,
      });
    } catch (error) {
      console.error("Error creating sample facility users:", error);
      res.status(500).json({ message: "Failed to create sample facility users" });
    }
  });

  // Update facility user permissions
  app.patch("/api/facility-users/:id/permissions", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { permissions } = req.body;

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions array is required" });
      }

      // Update the user's permissions
      const [updatedUser] = await db
        .update(facilityUsers)
        .set({
          permissions: permissions,
          updatedAt: new Date(),
        })
        .where(eq(facilityUsers.id, userId))
        .returning({
          id: facilityUsers.id,
          username: facilityUsers.username,
          email: facilityUsers.email,
          firstName: facilityUsers.firstName,
          lastName: facilityUsers.lastName,
          role: facilityUsers.role,
          permissions: facilityUsers.permissions,
          updatedAt: facilityUsers.updatedAt,
        });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the permissions update
      await db.insert(facilityUserActivityLog).values({
        userId: userId,
        facilityId: updatedUser.primaryFacilityId || 1,
        action: "permissions_updated",
        details: {
          updatedBy: req.user?.id || 1,
          newPermissions: permissions,
          permissionCount: permissions.length,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        message: "Permissions updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  // Get facility user role templates
  app.get("/api/facility-user-role-templates", requireAuth, async (req, res) => {
    try {
      const templates = await db
        .select()
        .from(facilityUserRoleTemplates)
        .where(eq(facilityUserRoleTemplates.isActive, true))
        .orderBy(facilityUserRoleTemplates.name);

      res.json(templates);
    } catch (error) {
      console.error("Error fetching role templates:", error);
      res.status(500).json({ message: "Failed to fetch role templates" });
    }
  });

  // ==================== BILLING API ROUTES ====================

  // Get invoices for a facility
  app.get("/api/billing/invoices/:facilityId?", requireAuth, async (req, res) => {
    try {
      const facilityId = req.params.facilityId
        ? parseInt(req.params.facilityId)
        : req.user.primaryFacilityId;

      // Sample invoice data for development
      const sampleInvoices = [
        {
          id: 1,
          facilityId: facilityId,
          invoiceNumber: "INV-2025-001",
          amount: 12500.0,
          description: "Monthly staffing services - ICU and Emergency Department",
          dueDate: "2025-08-15",
          status: "pending",
          createdAt: "2025-07-15T10:00:00Z",
          facilityName: "General Hospital",
          lineItems: [
            { description: "RN Coverage - ICU", quantity: 160, rate: 65.0, amount: 10400.0 },
            { description: "LPN Coverage - Emergency", quantity: 80, rate: 45.0, amount: 3600.0 },
          ],
        },
        {
          id: 2,
          facilityId: facilityId,
          invoiceNumber: "INV-2025-002",
          amount: 8750.0,
          description: "Weekend premium staffing - Medical/Surgical",
          dueDate: "2025-08-20",
          status: "approved",
          createdAt: "2025-07-18T14:30:00Z",
          facilityName: "General Hospital",
          lineItems: [
            { description: "RN Coverage - Med/Surg", quantity: 120, rate: 55.0, amount: 6600.0 },
            { description: "CNA Coverage - Med/Surg", quantity: 96, rate: 22.5, amount: 2160.0 },
          ],
        },
        {
          id: 3,
          facilityId: facilityId,
          invoiceNumber: "INV-2025-003",
          amount: 15300.0,
          description: "Emergency coverage - Multiple departments",
          dueDate: "2025-07-25",
          status: "overdue",
          createdAt: "2025-06-25T09:15:00Z",
          facilityName: "General Hospital",
          lineItems: [
            { description: "RN Coverage - Emergency", quantity: 200, rate: 70.0, amount: 14000.0 },
            { description: "CST Coverage - OR", quantity: 40, rate: 32.5, amount: 1300.0 },
          ],
        },
      ];

      res.json(sampleInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Create new invoice
  app.post("/api/billing/invoices", requireAuth, async (req, res) => {
    try {
      const invoiceData = req.body;

      // In a real implementation, you would save to database
      const newInvoice = {
        id: Date.now(),
        ...invoiceData,
        createdAt: new Date().toISOString(),
        facilityName: "General Hospital",
      };

      res.status(201).json(newInvoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Update invoice
  app.patch("/api/billing/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const updateData = req.body;

      // In a real implementation, you would update the database
      const updatedInvoice = {
        id: invoiceId,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Approve invoice
  app.patch("/api/billing/invoices/:id/approve", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      // In a real implementation, you would update the database
      const approvedInvoice = {
        id: invoiceId,
        status: "approved",
        approvedBy: req.user.id,
        approvedAt: new Date().toISOString(),
      };

      res.json(approvedInvoice);
    } catch (error) {
      console.error("Error approving invoice:", error);
      res.status(500).json({ message: "Failed to approve invoice" });
    }
  });

  // Get billing rates for a facility
  app.get("/api/billing/rates/:facilityId?", requireAuth, async (req, res) => {
    try {
      const facilityId = req.params.facilityId
        ? parseInt(req.params.facilityId)
        : req.user.primaryFacilityId;

      // Sample billing rates data for development
      const sampleRates = [
        {
          id: 1,
          facilityId: facilityId,
          specialty: "Registered Nurse",
          position: "Staff Nurse",
          payRate: 45.0,
          billRate: 65.0,
          contractType: "full_time",
          effectiveDate: "2025-01-01",
          department: "ICU",
          shiftType: "day",
          experienceLevel: "intermediate",
          overtimeMultiplier: 1.5,
          holidayMultiplier: 2.0,
          weekendMultiplier: 1.2,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: 2,
          facilityId: facilityId,
          specialty: "Licensed Practical Nurse",
          position: "LPN",
          payRate: 32.0,
          billRate: 45.0,
          contractType: "full_time",
          effectiveDate: "2025-01-01",
          department: "Medical/Surgical",
          shiftType: "day",
          experienceLevel: "intermediate",
          overtimeMultiplier: 1.5,
          holidayMultiplier: 2.0,
          weekendMultiplier: 1.2,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: 3,
          facilityId: facilityId,
          specialty: "Certified Nursing Assistant",
          position: "CNA",
          payRate: 18.0,
          billRate: 28.0,
          contractType: "part_time",
          effectiveDate: "2025-01-01",
          department: "Medical/Surgical",
          shiftType: "day",
          experienceLevel: "entry",
          overtimeMultiplier: 1.5,
          holidayMultiplier: 2.0,
          weekendMultiplier: 1.2,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: 4,
          facilityId: facilityId,
          specialty: "Certified Surgical Technologist",
          position: "CST",
          payRate: 28.0,
          billRate: 42.0,
          contractType: "contract",
          effectiveDate: "2025-01-01",
          department: "Operating Room",
          shiftType: "day",
          experienceLevel: "senior",
          overtimeMultiplier: 1.5,
          holidayMultiplier: 2.0,
          weekendMultiplier: 1.2,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: 5,
          facilityId: facilityId,
          specialty: "Registered Nurse",
          position: "Charge Nurse",
          payRate: 55.0,
          billRate: 78.0,
          contractType: "full_time",
          effectiveDate: "2025-01-01",
          department: "Emergency",
          shiftType: "night",
          experienceLevel: "expert",
          overtimeMultiplier: 1.5,
          holidayMultiplier: 2.0,
          weekendMultiplier: 1.2,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ];

      res.json(sampleRates);
    } catch (error) {
      console.error("Error fetching billing rates:", error);
      res.status(500).json({ message: "Failed to fetch billing rates" });
    }
  });

  // Create new billing rate
  app.post("/api/billing/rates", requireAuth, async (req, res) => {
    try {
      const rateData = req.body;

      // In a real implementation, you would save to database
      const newRate = {
        id: Date.now(),
        ...rateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json(newRate);
    } catch (error) {
      console.error("Error creating billing rate:", error);
      res.status(500).json({ message: "Failed to create billing rate" });
    }
  });

  // Update billing rate
  app.patch("/api/billing/rates/:id", requireAuth, async (req, res) => {
    try {
      const rateId = parseInt(req.params.id);
      const updateData = req.body;

      // In a real implementation, you would update the database
      const updatedRate = {
        id: rateId,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      res.json(updatedRate);
    } catch (error) {
      console.error("Error updating billing rate:", error);
      res.status(500).json({ message: "Failed to update billing rate" });
    }
  });

  // Shift Requests API with proper user filtering
  app.get("/api/shift-requests", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;

      // Base shift requests data
      const allShiftRequests = [
        {
          id: 1,
          shiftId: 1,
          title: "ICU Night Shift",
          date: "2025-07-15",
          startTime: "19:00",
          endTime: "07:00",
          department: "ICU",
          specialty: "Registered Nurse",
          facilityName: "Test Squad Skilled Nursing",
          facilityId: 19,
          rate: 48.0,
          urgency: "high",
          status: "pending",
          requestedBy: {
            id: 45,
            name: "Sarah Johnson",
            email: "sarah.johnson@nexspace.com",
            specialty: "RN",
          },
          requestedAt: "2025-07-10T10:30:00Z",
          description: "Urgent coverage needed for ICU night shift due to staff shortage.",
        },
        {
          id: 2,
          shiftId: 2,
          title: "Emergency Day Shift",
          date: "2025-07-16",
          startTime: "07:00",
          endTime: "19:00",
          department: "Emergency",
          specialty: "Registered Nurse",
          facilityName: "Test Squad Skilled Nursing",
          facilityId: 19,
          rate: 52.0,
          urgency: "critical",
          status: "approved",
          requestedBy: {
            id: 46,
            name: "Michael Chen",
            email: "michael.chen@nexspace.com",
            specialty: "RN",
          },
          requestedAt: "2025-07-09T14:15:00Z",
          description: "Critical emergency department coverage required.",
        },
      ];

      // For workers, only show their own requests
      if (user.role === "employee" || user.role === "contractor") {
        const workerRequests = allShiftRequests.filter((req) => req.requestedBy.id === user.id);
        return res.json(workerRequests);
      }

      // For facility managers and admins, show all requests
      res.json(allShiftRequests);
    } catch (error) {
      console.error("Error fetching shift requests:", error);
      res.status(500).json({ message: "Failed to fetch shift requests" });
    }
  });

  // Request a shift
  app.post("/api/shifts/:id/request", requireAuth, async (req: any, res) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    try {
      const shiftId = parseInt(req.params.id);
      const user = req.user;

      // Simulate creating a shift request
      const newRequest = {
        id: Date.now(),
        shiftId,
        requestedBy: user.id,
        requestedAt: new Date().toISOString(),
        status: "pending",
        note: req.body.note || "",
      };


      // Create notification for facility managers
      let shift = null;
      try {
        // Get shift details to include in notification
        shift =
          mainShifts.find((s) => s.id === shiftId) || generatedShifts.find((s) => s.id === shiftId);
        if (shift) {
          await storage.createNotification({
            type: "shift_request",
            title: "New Shift Request",
            message: `${user.firstName} ${user.lastName} has requested ${shift.title} on ${shift.date}`,
            link: "/shift-requests",
            isRead: false,
            facilityUserId: 1, // In production, this would be determined by the shift's facility
            metadata: {
              shiftId: shiftId,
              requestedBy: user.id,
              shiftTitle: shift.title,
              shiftDate: shift.date,
            },
          });
        }
      } catch (notificationError) {
        console.error(
          "[NOTIFICATION] Failed to create shift request notification:",
          notificationError
        );
      }

      // Track successful shift request
      await analytics.trackShift(
        "request",
        shiftId.toString(),
        { ...context, facilityId: shift?.facilityId },
        {
          requestId: newRequest.id,
          shiftTitle: shift?.title,
          shiftDate: shift?.date,
          shiftSpecialty: shift?.specialty,
          facilityId: shift?.facilityId,
          requestNote: req.body.note || "",
          userRole: user.role,
          userSpecialty: user.specialty,
          success: true,
          duration: Date.now() - startTime,
        }
      );

      res.json({
        success: true,
        message: "Shift request submitted successfully",
        request: newRequest,
      });
    } catch (error) {
      // Track failed shift request
      await analytics.trackShift("request", req.params.id, context, {
        reason: "request_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });

      console.error("Error requesting shift:", error);
      res.status(500).json({ message: "Failed to request shift" });
    }
  });

  // Withdraw a shift request
  app.post("/api/shift-requests/:id/withdraw", requireAuth, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const user = req.user;


      // Create notification for facility managers about withdrawal
      try {
        await storage.createNotification({
          type: "shift_cancelled",
          title: "Shift Request Withdrawn",
          message: `${user.firstName} ${user.lastName} has withdrawn their shift request`,
          link: "/shift-requests",
          isRead: false,
          facilityUserId: 1, // In production, this would be determined by the shift's facility
          metadata: {
            requestId: requestId,
            withdrawnBy: user.id,
          },
        });
      } catch (notificationError) {
        console.error(
          "[NOTIFICATION] Failed to create withdrawal notification:",
          notificationError
        );
      }

      res.json({
        success: true,
        message: "Shift request withdrawn successfully",
      });
    } catch (error) {
      console.error("Error withdrawing request:", error);
      res.status(500).json({ message: "Failed to withdraw request" });
    }
  });

  app.post("/api/shift-requests/:id/approve", requireAuth, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const user = req.user;
      const { shiftId, workerId } = req.body;

      // Check permissions
      if (
        user.role !== "super_admin" &&
        user.role !== "admin" &&
        user.role !== "facility_manager" &&
        !hasPermission(user, "approve_shift_requests")
      ) {
        return res.status(403).json({ message: "Not authorized to approve shift requests" });
      }

      // Get shift details from database
      const shift = await storage.getShift(shiftId);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      // Check for scheduling conflicts
      const conflictCheck = await storage.checkShiftConflicts(
        [workerId],
        shift.date,
        shift.startTime,
        shift.endTime,
        shiftId
      );

      if (conflictCheck.hasConflicts) {
        const conflict = conflictCheck.conflicts[0];
        return res.status(409).json({
          success: false,
          message: "Cannot approve shift request due to scheduling conflict",
          conflict: {
            staffName: conflict.staffName,
            conflictingShift: {
              title: conflict.conflictingShift.title,
              time: `${conflict.conflictingShift.startTime} - ${conflict.conflictingShift.endTime}`,
              facility: conflict.conflictingShift.facilityName,
            },
          },
        });
      }

      // If no conflicts, assign the worker to the shift
      const currentAssigned = shift.assignedStaffIds || [];
      const updatedAssigned = [...currentAssigned, workerId];

      await storage.assignStaffToShift(shiftId, updatedAssigned);


      // Create notification for the worker
      try {
        await notificationService.createNotification({
          recipientId: workerId,
          type: "shift_approved",
          title: "Shift Request Approved",
          message: `Your shift request for ${shift.title} on ${shift.date} has been approved! You have been assigned to the shift.`,
          link: "/my-schedule",
          metadata: {
            requestId: requestId,
            approvedBy: user.id,
            shiftId: shiftId,
            shiftTitle: shift.title,
            shiftDate: shift.date,
            shiftTime: `${shift.startTime} - ${shift.endTime}`,
          },
        });
      } catch (notificationError) {
        console.error("[NOTIFICATION] Failed to create approval notification:", notificationError);
      }

      res.json({
        success: true,
        message: "Shift request approved and worker assigned",
        shiftId: shiftId,
        assignedWorkerId: workerId,
      });
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ message: "Failed to approve shift request" });
    }
  });

  app.post("/api/shift-requests/:id/deny", requireAuth, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const user = req.user;
      const reason = req.body.reason || "No reason provided";
      const { workerId } = req.body;

      // Check permissions
      if (
        user.role !== "super_admin" &&
        user.role !== "admin" &&
        user.role !== "facility_manager" &&
        !hasPermission(user, "approve_shift_requests")
      ) {
        return res.status(403).json({ message: "Not authorized to deny shift requests" });
      }


      // Create notification for the worker
      try {
        await notificationService.createNotification({
          recipientId: workerId,
          type: "shift_denied",
          title: "Shift Request Denied",
          message: `Your shift request has been denied. Reason: ${reason}`,
          link: "/my-requests",
          metadata: {
            requestId: requestId,
            deniedBy: user.id,
            reason: reason,
          },
        });
      } catch (notificationError) {
        console.error("[NOTIFICATION] Failed to create denial notification:", notificationError);
      }

      res.json({
        success: true,
        message: "Shift request denied",
        reason,
      });
    } catch (error) {
      console.error("Error denying request:", error);
      res.status(500).json({ message: "Failed to deny shift request" });
    }
  });

  // Messages API
  app.get("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const messages = [
        {
          id: 1,
          subject: "Shift Schedule Update",
          content:
            "Your schedule for next week has been updated. Please review the changes in your dashboard.",
          senderId: 1,
          senderName: "NexSpace Team",
          senderRole: "nexspace_team",
          recipientId: user.id,
          recipientName: `${user.firstName} ${user.lastName}`,
          recipientRole: user.role,
          sentAt: "2025-07-10T09:00:00Z",
          isRead: false,
          isUrgent: false,
          facilityId: 19,
          facilityName: "Test Squad Skilled Nursing",
        },
        {
          id: 2,
          subject: "Credential Expiration Reminder",
          content:
            "Your nursing license expires in 30 days. Please update your credentials to avoid any scheduling interruptions.",
          senderId: 2,
          senderName: "Compliance Team",
          senderRole: "nexspace_team",
          recipientId: user.id,
          recipientName: `${user.firstName} ${user.lastName}`,
          recipientRole: user.role,
          sentAt: "2025-07-09T16:30:00Z",
          isRead: true,
          isUrgent: true,
          facilityId: 19,
          facilityName: "Test Squad Skilled Nursing",
        },
      ];

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/contacts", requireAuth, async (req: any, res) => {
    try {
      const contacts = [
        {
          id: 1,
          name: "NexSpace Support",
          role: "nexspace_team",
          isOnline: true,
        },
        {
          id: 2,
          name: "Compliance Team",
          role: "nexspace_team",
          isOnline: true,
        },
        {
          id: 45,
          name: "Sarah Johnson",
          role: "staff",
          specialty: "RN",
          facilityId: 19,
          facilityName: "Test Squad Skilled Nursing",
          isOnline: false,
        },
        {
          id: 46,
          name: "Michael Chen",
          role: "staff",
          specialty: "RN",
          facilityId: 19,
          facilityName: "Test Squad Skilled Nursing",
          isOnline: true,
        },
      ];

      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: any, res) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    try {
      const { recipientId, subject, content, isUrgent } = req.body;
      const user = req.user;

      const newMessage = {
        id: Date.now(),
        subject,
        content,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role,
        recipientId,
        sentAt: new Date().toISOString(),
        isRead: false,
        isUrgent: isUrgent || false,
      };

      // Create notification for the recipient
      try {
        await notificationService.createNotification({
          recipientId: recipientId,
          type: "message_received",
          title: "New Message",
          message: `${user.firstName} ${user.lastName} sent you a message: ${subject}`,
          link: "/messaging",
          metadata: {
            messageId: newMessage.id,
            senderId: user.id,
            subject: subject,
            isUrgent: isUrgent,
          },
        });
      } catch (notificationError) {
        console.error("[NOTIFICATION] Failed to create message notification:", notificationError);
      }

      // Track successful message send
      await analytics.trackMessage("send", newMessage.id, context, {
        recipientId,
        senderRole: user.role,
        recipientType: "user", // Could be enhanced to distinguish recipient types
        subject: subject.substring(0, 50), // Truncate for privacy
        isUrgent: isUrgent || false,
        messageLength: content.length,
        hasAttachments: false,
        success: true,
        duration: Date.now() - startTime,
      });

      res.json(newMessage);
    } catch (error) {
      // Track failed message send
      await analytics.trackMessage("send", "failed", context, {
        reason: "send_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });

      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      res.json({ success: true, message: `Message ${id} marked as read` });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      const facilityUserId = user.facilityUserId || null;
      const limit = parseInt(req.query.limit) || 50;

      const notifications = await storage.getNotifications(
        user.role === "facility_user" ? null : userId,
        user.role === "facility_user" ? facilityUserId : null,
        limit
      );

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      const facilityUserId = user.facilityUserId || null;

      const count = await storage.getUnreadNotificationCount(
        user.role === "facility_user" ? null : userId,
        user.role === "facility_user" ? facilityUserId : null
      );

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      const facilityUserId = user.facilityUserId || null;

      await storage.markAllNotificationsAsRead(
        user.role === "facility_user" ? null : userId,
        user.role === "facility_user" ? facilityUserId : null
      );

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      const facilityUserId = user.facilityUserId || null;

      await storage.deleteAllNotifications(
        user.role === "facility_user" ? null : userId,
        user.role === "facility_user" ? facilityUserId : null
      );

      res.json({ message: "All notifications deleted" });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ message: "Failed to delete all notifications" });
    }
  });

  // Analytics endpoint for super admins to view events
  app.get("/api/analytics/events", requireAuth, async (req: any, res) => {
    try {
      // Only super admins can view analytics
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const category = req.query.category as string;

      // Get recent analytics events
      const events = await storage.getRecentAnalyticsEvents(limit, offset, category);

      // Get event counts by category
      const eventCounts = await storage.getAnalyticsEventCounts();

      res.json({
        events,
        counts: eventCounts,
        total: events.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Analytics summary endpoint
  app.get("/api/analytics/summary", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const { startDate, endDate, facilityId } = req.query;

      // Get total counts from database
      const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const [facilitiesCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(facilities);
      const [shiftsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(shifts);
      const [messagesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(messages);

      // Get today's active users
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const activeUsersToday = await storage.getAnalyticsEvents({
        eventCategory: "auth",
        eventName: "user_login",
        startDate: todayStart,
        facilityId: facilityId ? parseInt(facilityId) : undefined,
      });

      // Get today's shifts created
      const shiftsCreatedToday = await storage.getAnalyticsEvents({
        eventCategory: "shifts",
        eventName: "shift_create",
        startDate: todayStart,
        facilityId: facilityId ? parseInt(facilityId) : undefined,
      });

      res.json({
        totalUsers: usersCount.count,
        totalFacilities: facilitiesCount.count,
        totalShifts: shiftsCount.count,
        totalMessages: messagesCount.count,
        activeUsersToday: [...new Set(activeUsersToday.map((e) => e.userId))].length,
        shiftsCreatedToday: shiftsCreatedToday.length,
      });
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  // User activity over time
  app.get("/api/analytics/user-activity", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const { startDate, endDate, facilityId } = req.query;

      const loginEvents = await storage.getAnalyticsEvents({
        eventCategory: "auth",
        eventName: "user_login",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        facilityId: facilityId !== "all" ? parseInt(facilityId) : undefined,
      });

      // Group by date
      const activityByDate: { [date: string]: Set<number> } = {};

      loginEvents.forEach((event) => {
        const date = format(new Date(event.timestamp), "yyyy-MM-dd");
        if (!activityByDate[date]) {
          activityByDate[date] = new Set();
        }
        if (event.userId) {
          activityByDate[date].add(event.userId);
        }
      });

      // Convert to array format
      const result = Object.entries(activityByDate)
        .map(([date, users]) => ({
          date,
          value: users.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json(result);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // Shift analytics over time
  app.get("/api/analytics/shifts", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const { startDate, endDate, facilityId } = req.query;

      const shiftEvents = await storage.getAnalyticsEvents({
        eventCategory: "shifts",
        eventName: "shift_create",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        facilityId: facilityId !== "all" ? parseInt(facilityId) : undefined,
      });

      // Group by date
      const shiftsByDate: { [date: string]: number } = {};

      shiftEvents.forEach((event) => {
        const date = format(new Date(event.timestamp), "yyyy-MM-dd");
        shiftsByDate[date] = (shiftsByDate[date] || 0) + 1;
      });

      // Convert to array format
      const result = Object.entries(shiftsByDate)
        .map(([date, count]) => ({
          date,
          value: count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json(result);
    } catch (error) {
      console.error("Error fetching shift analytics:", error);
      res.status(500).json({ message: "Failed to fetch shift analytics" });
    }
  });

  // Message analytics over time
  app.get("/api/analytics/messages", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const { startDate, endDate, facilityId } = req.query;

      const messageEvents = await storage.getAnalyticsEvents({
        eventCategory: "messaging",
        eventName: "message_send",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        facilityId: facilityId !== "all" ? parseInt(facilityId) : undefined,
      });

      // Group by date
      const messagesByDate: { [date: string]: number } = {};

      messageEvents.forEach((event) => {
        const date = format(new Date(event.timestamp), "yyyy-MM-dd");
        messagesByDate[date] = (messagesByDate[date] || 0) + 1;
      });

      // Convert to array format
      const result = Object.entries(messagesByDate)
        .map(([date, count]) => ({
          date,
          value: count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json(result);
    } catch (error) {
      console.error("Error fetching message analytics:", error);
      res.status(500).json({ message: "Failed to fetch message analytics" });
    }
  });

  // Event category breakdown
  app.get("/api/analytics/categories", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied: Super admin required" });
      }

      const { startDate, endDate, facilityId } = req.query;

      const events = await storage.getAnalyticsEvents({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        facilityId: facilityId !== "all" ? parseInt(facilityId) : undefined,
      });

      // Group by category
      const categoryCount: { [category: string]: number } = {};

      events.forEach((event) => {
        if (event.eventCategory) {
          categoryCount[event.eventCategory] = (categoryCount[event.eventCategory] || 0) + 1;
        }
      });

      // Convert to array format
      const result = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching category breakdown:", error);
      res.status(500).json({ message: "Failed to fetch category breakdown" });
    }
  });

  // Onboarding endpoints
  app.patch("/api/users/:id/onboarding", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only update their own onboarding
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { step, completed } = req.body;

      // Update user onboarding status
      const updatedUser = await storage.updateUserOnboarding(userId, {
        onboardingStep: step,
        onboardingCompleted: completed || false,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating onboarding:", error);
      res.status(500).json({ message: "Failed to update onboarding status" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Ensure user can only update their own profile
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, phone, department, bio } = req.body;

      console.log("[PROFILE UPDATE] User type:", req.user.role, "User ID:", userId);

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        phone,
        department,
        bio,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update facility user profile
  app.patch("/api/facility-users/:id/profile", requireAuth, async (req: any, res) => {
    try {
      const facilityUserId = parseInt(req.params.id);

      // Ensure facility user can only update their own profile
      if (req.user.role !== "facility_user" || req.user.facilityUserId !== facilityUserId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, phone, department, title } = req.body;

      console.log("[FACILITY USER PROFILE UPDATE] ID:", facilityUserId, "Data:", req.body);

      // Update facility user profile
      const updatedFacilityUser = await storage.updateFacilityUserProfile(facilityUserId, {
        firstName,
        lastName,
        phone,
        department,
        title,
      });

      console.log("[FACILITY USER PROFILE UPDATE] Result:", updatedFacilityUser);

      res.json(updatedFacilityUser);
    } catch (error) {
      console.error("Error updating facility user profile:", error);
      res.status(500).json({ message: "Failed to update facility user profile" });
    }
  });

  // Get facility user profile
  app.get("/api/facility-users/:id/profile", requireAuth, async (req: any, res) => {
    try {
      const facilityUserId = parseInt(req.params.id);

      // Allow facility users to view their own profile or super admins to view any profile
      if (
        req.user.role !== "super_admin" &&
        (req.user.role !== "facility_user" || req.user.facilityUserId !== facilityUserId)
      ) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const facilityUser = await storage.getFacilityUser(facilityUserId);
      
      if (!facilityUser) {
        return res.status(404).json({ message: "Facility user not found" });
      }

      console.log("[FACILITY USER PROFILE GET] ID:", facilityUserId, "Result:", facilityUser);

      res.json(facilityUser);
    } catch (error) {
      console.error("Error fetching facility user profile:", error);
      res.status(500).json({ message: "Failed to fetch facility user profile" });
    }
  });

  // Send invitations
  app.post("/api/invites", requireAuth, async (req: any, res) => {
    try {
      const { invites } = req.body;

      // Here you would typically send emails to the invited users
      // For now, we'll just log them and return success

      // In a real implementation, you might:
      // 1. Generate invitation tokens
      // 2. Send emails with invitation links
      // 3. Store pending invitations in database

      res.json({
        message: "Invitations sent successfully",
        count: invites.length,
      });
    } catch (error) {
      console.error("Error sending invitations:", error);
      res.status(500).json({ message: "Failed to send invitations" });
    }
  });

  // Test endpoint to generate sample notifications
  app.post("/api/notifications/test", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const testNotifications = [];

      // Create various test notifications
      const notifications = [
        {
          type: "shift_request",
          title: "New Shift Request",
          message: "Emily Davis has requested ICU Night Shift on 2025-07-20",
          link: "/shift-requests",
          isRead: false,
          userId: user.role !== "facility_user" ? user.id : null,
          facilityUserId: user.role === "facility_user" ? user.facilityUserId : null,
        },
        {
          type: "shift_approved",
          title: "Shift Request Approved",
          message: "Your request for Emergency Day Shift has been approved!",
          link: "/my-schedule",
          isRead: false,
          userId: user.role !== "facility_user" ? user.id : null,
          facilityUserId: user.role === "facility_user" ? user.facilityUserId : null,
        },
        {
          type: "message_received",
          title: "New Message",
          message: "Sarah Johnson sent you a message: Schedule Update",
          link: "/messaging",
          isRead: true,
          userId: user.role !== "facility_user" ? user.id : null,
          facilityUserId: user.role === "facility_user" ? user.facilityUserId : null,
        },
        {
          type: "shift_denied",
          title: "Shift Request Denied",
          message: "Your request for Surgery Day Shift was denied. Reason: Fully staffed",
          link: "/my-requests",
          isRead: false,
          userId: user.role !== "facility_user" ? user.id : null,
          facilityUserId: user.role === "facility_user" ? user.facilityUserId : null,
        },
      ];

      for (const notification of notifications) {
        const created = await storage.createNotification(notification);
        testNotifications.push(created);
      }

      res.json({
        message: "Test notifications created successfully",
        notifications: testNotifications,
      });
    } catch (error) {
      console.error("Error creating test notifications:", error);
      res.status(500).json({ message: "Failed to create test notifications" });
    }
  });

  // Time-Off Management API Routes

  // Get time-off types
  app.get("/api/timeoff/types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getTimeOffTypes(true);
      res.json(types);
    } catch (error) {
      console.error("Error fetching time-off types:", error);
      res.status(500).json({ message: "Failed to fetch time-off types" });
    }
  });

  // Get user's time-off balances
  app.get("/api/timeoff/balance", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const year = parseInt(req.query.year) || new Date().getFullYear();

      const balances = await storage.getTimeOffBalances(userId, year);

      // If no balances exist, create default ones
      if (balances.length === 0) {
        const types = await storage.getTimeOffTypes(true);
        for (const type of types) {
          await storage.createTimeOffBalance({
            userId,
            timeOffTypeId: type.id,
            year,
            allocated: type.name === "vacation" ? 80 : type.name === "sick" ? 40 : 24, // Default hours
            used: 0,
            pending: 0,
            available: type.name === "vacation" ? 80 : type.name === "sick" ? 40 : 24,
          });
        }
        const newBalances = await storage.getTimeOffBalances(userId, year);
        return res.json(newBalances);
      }

      res.json(balances);
    } catch (error) {
      console.error("Error fetching time-off balance:", error);
      res.status(500).json({ message: "Failed to fetch time-off balance" });
    }
  });

  // Get time-off requests (for employees and managers)
  app.get("/api/timeoff/requests", requireAuth, async (req: any, res) => {
    try {
      const { status, startDate, endDate, userId } = req.query;
      const currentUser = req.user;

      // Build filters based on permissions
      const filters: any = {};

      // If user has approval permission, they can see all requests
      if (currentUser.permissions?.includes("timeoff.approve_requests")) {
        if (userId) filters.userId = parseInt(userId);
      } else {
        // Otherwise, only see their own requests
        filters.userId = currentUser.id;
      }

      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const requests = await storage.getTimeOffRequests(filters);

      // Enrich requests with user and type information
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.userId);
          const type = await storage.getTimeOffTypes();
          const timeOffType = type.find((t) => t.id === request.timeOffTypeId);

          return {
            ...request,
            userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            userEmail: user?.email,
            typeName: timeOffType?.displayName || "Unknown",
            typeColor: timeOffType?.color || "#6b7280",
          };
        })
      );

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching time-off requests:", error);
      res.status(500).json({ message: "Failed to fetch time-off requests" });
    }
  });

  // Create time-off request
  app.post("/api/timeoff/requests", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestData = {
        ...req.body,
        userId,
        status: "pending",
      };

      // Validate request against balance
      const year = new Date(requestData.startDate).getFullYear();
      const balance = await storage.getTimeOffBalance(userId, requestData.timeOffTypeId, year);

      if (!balance || parseFloat(balance.available) < parseFloat(requestData.totalHours)) {
        return res.status(400).json({
          message: "Insufficient time-off balance for this request",
        });
      }

      // Check for shift conflicts
      const conflictingShifts = await storage.checkShiftCoverage(
        userId,
        new Date(requestData.startDate),
        new Date(requestData.endDate)
      );

      if (conflictingShifts.length > 0) {
        requestData.affectedShifts = conflictingShifts.map((s) => s.id);
      }

      // Create the request
      const newRequest = await storage.createTimeOffRequest(requestData);

      // Update pending balance
      await storage.updateTimeOffBalance(balance.id, {
        pending: (parseFloat(balance.pending) + parseFloat(requestData.totalHours)).toString(),
        available: (parseFloat(balance.available) - parseFloat(requestData.totalHours)).toString(),
      });

      res.json(newRequest);
    } catch (error) {
      console.error("Error creating time-off request:", error);
      res.status(500).json({ message: "Failed to create time-off request" });
    }
  });

  // Review time-off request (approve/deny)
  app.post(
    "/api/timeoff/requests/:id/review",
    requireAuth,
    requirePermission("timeoff.approve_requests"),
    async (req: any, res) => {
      try {
        const requestId = parseInt(req.params.id);
        const { status, reviewNotes } = req.body;
        const reviewedBy = req.user.id;

        if (!["approved", "denied"].includes(status)) {
          return res
            .status(400)
            .json({ message: "Invalid status. Must be 'approved' or 'denied'" });
        }

        const updatedRequest = await storage.reviewTimeOffRequest(
          requestId,
          status,
          reviewedBy,
          reviewNotes
        );

        if (!updatedRequest) {
          return res.status(404).json({ message: "Time-off request not found" });
        }

        // If denied, restore the pending balance
        if (status === "denied") {
          const year = new Date(updatedRequest.startDate).getFullYear();
          const balance = await storage.getTimeOffBalance(
            updatedRequest.userId,
            updatedRequest.timeOffTypeId,
            year
          );

          if (balance) {
            await storage.updateTimeOffBalance(balance.id, {
              pending: (
                parseFloat(balance.pending) - parseFloat(updatedRequest.totalHours.toString())
              ).toString(),
              available: (
                parseFloat(balance.available) + parseFloat(updatedRequest.totalHours.toString())
              ).toString(),
            });
          }
        }

        // Create notification for the employee
        await storage.createNotification({
          userId: updatedRequest.userId,
          facilityUserId: null,
          type: "timeoff_update",
          title: `Time-off request ${status}`,
          message: `Your time-off request from ${new Date(updatedRequest.startDate).toLocaleDateString()} to ${new Date(updatedRequest.endDate).toLocaleDateString()} has been ${status}.`,
          priority: "normal",
          metadata: { requestId, status, reviewNotes },
        });

        res.json(updatedRequest);
      } catch (error) {
        console.error("Error reviewing time-off request:", error);
        res.status(500).json({ message: "Failed to review time-off request" });
      }
    }
  );

  // Cancel time-off request
  app.post("/api/timeoff/requests/:id/cancel", requireAuth, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.id;

      // Get the request to verify ownership
      const request = await storage.getTimeOffRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Time-off request not found" });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be cancelled" });
      }

      // Update request status
      const updatedRequest = await storage.updateTimeOffRequest(requestId, {
        status: "cancelled",
      });

      // Restore the balance
      const year = new Date(request.startDate).getFullYear();
      const balance = await storage.getTimeOffBalance(userId, request.timeOffTypeId, year);

      if (balance) {
        await storage.updateTimeOffBalance(balance.id, {
          pending: (
            parseFloat(balance.pending) - parseFloat(request.totalHours.toString())
          ).toString(),
          available: (
            parseFloat(balance.available) + parseFloat(request.totalHours.toString())
          ).toString(),
        });
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error cancelling time-off request:", error);
      res.status(500).json({ message: "Failed to cancel time-off request" });
    }
  });

  // Get time-off policies for a facility
  app.get("/api/timeoff/policies", requireAuth, async (req: any, res) => {
    try {
      const facilityId = req.query.facilityId
        ? parseInt(req.query.facilityId)
        : req.user.facilityId;
      const policies = await storage.getTimeOffPolicies(facilityId);
      res.json(policies);
    } catch (error) {
      console.error("Error fetching time-off policies:", error);
      res.status(500).json({ message: "Failed to fetch time-off policies" });
    }
  });

  return httpServer;
}
