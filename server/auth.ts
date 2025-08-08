import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, staff, users, facilityUsers, facilityUserTeamMemberships, facilities } from "@shared/schema";
import { analytics } from "./analytics-tracker";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express, handleImpersonation?: any) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      // Temporary superuser bypass for Joshburn
      if (username === "joshburn" && password === "admin123") {
        const tempUser = {
          id: 1,
          username: "joshburn",
          email: "joshburn@nexspace.com",
          password: "dummy", // Not used for temp user
          firstName: "Josh",
          lastName: "Burn",
          role: "super_admin",
          isActive: true,
          facilityId: null,
          avatar: null,
          onboardingCompleted: true,
          onboardingStep: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
        return done(null, tempUser);
      }

      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {

        return done(null, false);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    // Handle temporary superuser
    if (id === 1) {
      const tempUser = {
        id: 1,
        username: "joshburn",
        email: "joshburn@nexspace.com",
        password: "dummy", // Not used for temp user
        firstName: "Josh",
        lastName: "Burn",
        role: "super_admin",
        isActive: true,
        facilityId: null,
        avatar: null,
        onboardingCompleted: true,
        onboardingStep: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      return done(null, tempUser);
    }

    try {
      const user = await storage.getUser(id);

      // If this is a facility user, fetch their permissions and facility associations
      if (user && user.role !== "super_admin") {
        try {
          const roleTemplate = await storage.getFacilityUserRoleTemplate(user.role);
          if (roleTemplate && roleTemplate.permissions) {
            (user as any).permissions = roleTemplate.permissions;
          }

          // Get facility associations for facility users
          const facilityAssociations = await storage.getStaffFacilityAssociations(id);
          if (facilityAssociations && facilityAssociations.length > 0) {
            (user as any).associatedFacilityIds = facilityAssociations.map((a: any) => a.facilityId);
            (user as any).associatedFacilities = facilityAssociations.map((a: any) => a.facilityId);
          }
        } catch (error) {

        }
      }

      done(null, user);
    } catch (error) {

      done(null, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      // Track failed registration attempt
      await analytics.trackAuth("signup", context, {
        reason: "username_exists",
        username: req.body.username,
        success: false,
      });
      return res.status(400).send("Username already exists");
    }

    try {
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, async (err) => {
        if (err) {
          // Track failed registration
          await analytics.trackAuth("signup", context, {
            reason: "login_after_register_failed",
            username: req.body.username,
            success: false,
            error: err.message,
          });
          return next(err);
        }

        // Track successful registration
        await analytics.trackAuth(
          "signup",
          { ...context, userId: user.id, facilityId: user.facilityId || undefined },
          {
            username: user.username,
            role: user.role,
            facilityId: user.facilityId,
            success: true,
            duration: Date.now() - startTime,
          }
        );

        res.status(201).json(user);
      });
    } catch (error) {
      // Track registration error
      await analytics.trackAuth("signup", context, {
        reason: "create_user_failed",
        username: req.body.username,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

  app.post("/api/login", (req, res, next) => {
    const startTime = Date.now();
    const context = analytics.getContextFromRequest(req);

    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        // Track authentication error
        await analytics.trackAuth("failed_login", context, {
          reason: "authentication_error",
          username: req.body.username,
          success: false,
          error: err.message,
        });
        return next(err);
      }

      if (!user) {
        // Track failed login
        await analytics.trackAuth("failed_login", context, {
          reason: "invalid_credentials",
          username: req.body.username,
          success: false,
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          // Track login session error
          await analytics.trackAuth("failed_login", context, {
            reason: "session_error",
            username: req.body.username,
            success: false,
            error: loginErr.message,
          });
          return next(loginErr);
        }

        // If this is a facility user, fetch their permissions and facility associations
        if (user && user.role !== "super_admin") {
          try {
            // Get permissions from the role template
            const roleTemplate = await storage.getFacilityUserRoleTemplate(user.role);
            if (roleTemplate && roleTemplate.permissions) {
              // Add permissions to user object
              (user as any).permissions = roleTemplate.permissions;
            }

            // Get facility user data to include associated facilities
            const facilityUser = await storage.getFacilityUserByEmail(user.email);
            if (facilityUser) {
              // Add facility user ID for profile updates
              (user as any).facilityUserId = facilityUser.id;
              
              if (facilityUser.associated_facility_ids) {
                (user as any).associatedFacilityIds = facilityUser.associated_facility_ids;
                (user as any).associatedFacilities = facilityUser.associated_facility_ids; // Keep both for compatibility
              }
            }
          } catch (error) {

          }
        }

        // Track successful login
        await analytics.trackAuth(
          "login",
          { ...context, userId: user.id, facilityId: user.facilityId },
          {
            username: user.username,
            role: user.role,
            facilityId: user.facilityId,
            hasPermissions: !!(user as any).permissions,
            hasFacilityAssociations: !!(user as any).associatedFacilities,
            success: true,
            duration: Date.now() - startTime,
          }
        );

        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res
          .status(200)
          .json({ message: "If the username exists, a temporary password has been set" });
      }

      // Generate a simple temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedTempPassword = await hashPassword(tempPassword);

      await storage.updateUser(user.id, { password: hashedTempPassword });

      res.status(200).json({
        message: "Temporary password set successfully",
        tempPassword: tempPassword, // In production, this would be sent via email
      });
    } catch (error) {

      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    const context = analytics.getContextFromRequest(req);
    const userId = req.user?.id;
    const username = req.user?.username;
    const role = req.user?.role;

    req.logout(async (err) => {
      if (err) {
        // Track logout error
        await analytics.trackAuth("logout", context, {
          username,
          role,
          success: false,
          error: err.message,
        });
        return next(err);
      }

      // Track successful logout
      await analytics.trackAuth(
        "logout",
        { ...context, userId },
        {
          username,
          role,
          success: true,
        }
      );

      res.sendStatus(200);
    });
  });

  // Create the route handler for /api/user
  const userHandler = async (req: any, res: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    console.log(`[/api/user] Session state:`, {
      impersonatedUserId: (req.session as any).impersonatedUserId,
      impersonatedUserType: (req.session as any).impersonatedUserType,
      isImpersonating: (req.session as any).isImpersonating,
    });
    
    // The handleImpersonation middleware should have already swapped req.user
    // with the impersonated user if we're in impersonation mode
    console.log(`[/api/user] Returning user:`, {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      isImpersonating: (req.user as any)?.isImpersonating,
      originalUserId: (req.user as any)?.originalUserId,
    });
    
    // If impersonating, add the impersonation flags to the response
    const userResponse = {
      ...req.user,
      isImpersonating: !!(req.session as any).isImpersonating || !!(req.session as any).impersonatedUserId,
      originalUserId: (req.session as any).originalUser?.id,
      userType: (req.user as any)?.userType || 'user'
    };

    res.json(userResponse);
  };
  
  // Apply middleware chain based on whether handleImpersonation is provided
  if (handleImpersonation) {
    app.get("/api/user", handleImpersonation, userHandler);
  } else {
    app.get("/api/user", userHandler);
  }

  // Temporary teams route to bypass modular routing issues
  app.get("/api/teams", async (req: any, res) => {
    try {
      // Check authentication manually since requireAuth is not in scope
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { teams } = await import("@shared/schema");
      const { db } = await import("./db");
      
      const teamsFromDB = await db.select().from(teams);
      
      // Simplified teams response to avoid complex join errors
      const teamsWithBasicDetails = teamsFromDB.map((team) => ({
        ...team,
        memberCount: 0, // Will be populated separately if needed
        facilityCount: 0, // Will be populated separately if needed
        members: [], // Simplified to avoid join errors
        facilities: [], // Simplified to avoid join errors
      }));
      
      res.json(teamsWithBasicDetails);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Temporary dashboard stats route to bypass modular routing issues
  if (handleImpersonation) {
    app.get("/api/dashboard/stats", async (req: any, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        await handleImpersonation(req, res, async () => {
          console.log('[TEMP dashboard/stats] Getting stats for user:', req.user?.role);
          
          // Import storage here to avoid circular imports
          const { storage } = await import("./storage");
          
          // Get facility IDs for filtering based on user role
          let facilityIds: number[] | undefined;

          if (req.user.role === "super_admin") {
            // Super admin sees all data (undefined = no filtering)
          } else {
            // For facility users, filter by their associated facilities
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
          console.log('[TEMP dashboard/stats] Returning stats:', stats);
          
          res.json(stats);
        });
      } catch (error) {
        console.error('[TEMP dashboard/stats] Error:', error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
      }
    });
  }

  // Debug endpoint to check session contents
  app.get("/api/debug/session", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const session = req.session as any;
    
    // Get all session keys
    const sessionKeys = Object.keys(session).filter(key => key !== 'cookie');
    const sessionData: any = {};
    
    sessionKeys.forEach(key => {
      if (key === 'originalUser' || key === 'user') {
        sessionData[key] = {
          id: session[key]?.id,
          username: session[key]?.username,
          role: session[key]?.role,
        };
      } else {
        sessionData[key] = session[key];
      }
    });
    
    res.json({
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      currentUserId: req.user?.id,
      currentUserEmail: req.user?.email,
      sessionData: sessionData,
      impersonatedUserId: session.impersonatedUserId,
      impersonatedUserType: session.impersonatedUserType,
      isImpersonating: session.isImpersonating,
    });
  });

  // Role switching endpoint for super admin
  app.post("/api/user/switch-role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { role } = req.body;
    const user = req.user;

    // Only super admin can switch roles
    if (user?.role !== "super_admin") {
      return res.status(403).json({ message: "Only super admin can switch roles" });
    }

    // Valid roles for switching
    const validRoles = [
      "super_admin",
      "facility_admin",
      "nurse_manager",
      "rn",
      "lpn",
      "cna",
      "contractor",
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // Update user role temporarily
      const updatedUser = await storage.updateUser(user.id, { role });
      if (updatedUser) {
        // Update session
        req.user = updatedUser;
        res.json(updatedUser);
      } else {
        res.status(500).json({ message: "Failed to switch role" });
      }
    } catch (error) {

      res.status(500).json({ message: "Failed to switch role" });
    }
  });
}
