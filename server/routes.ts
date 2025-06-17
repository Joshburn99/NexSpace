import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertJobSchema, insertJobApplicationSchema, insertShiftSchema,
  insertInvoiceSchema, insertWorkLogSchema, insertCredentialSchema,
  insertMessageSchema, UserRole
} from "@shared/schema";

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
