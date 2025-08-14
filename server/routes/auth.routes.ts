import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { facilityUsers, staff } from "@shared/schema";

const router = Router();

// Middleware to check authentication
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Impersonation middleware
export const handleImpersonation = async (req: any, res: any, next: any) => {
  if ((req.session as any).impersonatedUserId) {
    const impersonatedId = (req.session as any).impersonatedUserId;
    const userType = (req.session as any).impersonatedUserType || 'user';

    try {
      let impersonatedUser;
      
      if (userType === 'facility_user') {
        // Get facility user
        const [facilityUser] = await db
          .select()
          .from(facilityUsers)
          .where(eq(facilityUsers.id, impersonatedId))
          .limit(1);
          
        if (facilityUser) {
          impersonatedUser = {
            ...facilityUser,
            userType: 'facility_user',
            associatedFacilityIds: facilityUser.associatedFacilityIds || [],
            associatedFacilities: facilityUser.associatedFacilityIds || [],
            onboardingCompleted: true, // Facility users don't need onboarding
          };
          
          // Get role template permissions
          const roleTemplate = await storage.getFacilityUserRoleTemplate(facilityUser.role);
          if (roleTemplate && roleTemplate.permissions) {
            impersonatedUser.permissions = roleTemplate.permissions;
          }
        }
      } else if (userType === 'staff') {
        // Get staff member
        const [staffMember] = await db
          .select()
          .from(staff)
          .where(eq(staff.id, impersonatedId))
          .limit(1);
          
        if (staffMember) {
          impersonatedUser = {
            id: staffMember.id,
            username: `${(staffMember.firstName || 'staff').toLowerCase()}${(staffMember.lastName || staffMember.id).toString().toLowerCase()}`,
            email: staffMember.email,
            password: "",
            firstName: staffMember.firstName,
            lastName: staffMember.lastName,
            role: staffMember.employmentType || "staff",
            avatar: staffMember.profilePhoto || null,
            isActive: staffMember.isActive ?? true,
            facilityId: staffMember.primaryFacilityId || null,
            associatedFacilityIds: (staffMember as any).associatedFacilities || [],
            associatedFacilities: (staffMember as any).associatedFacilities || [],
            permissions: ["view_schedules", "view_staff"], // Basic staff permissions
            userType: "staff",
            onboardingCompleted: true, // Staff members don't need onboarding
          };
        }
      } else {
        // Regular user
        impersonatedUser = await storage.getUser(impersonatedId);
        if (impersonatedUser) {
          (impersonatedUser as any).userType = 'user';
        }
      }
      
      if (impersonatedUser) {
        req.user = impersonatedUser;
      }
    } catch (error) {
      // Silent fail - continue with original user
    }
  }
  next();
};

// Impersonation routes
router.post("/api/impersonation/start", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Superuser access required" });
    }

    const { userId, type = "facility" } = req.body;
    const targetUserId = userId;
    const userType = type;
    let targetUser: any = null;

    // Handle different user types
    if (userType === "facility_user") {
      // Get facility user from facility_users table
      const [facilityUser] = await db
        .select()
        .from(facilityUsers)
        .where(eq(facilityUsers.id, targetUserId))
        .limit(1);

      if (!facilityUser) {
        return res.status(404).json({ message: "Facility user not found" });
      }

      targetUser = {
        id: facilityUser.id,
        username: facilityUser.username,
        email: facilityUser.email,
        password: facilityUser.password,
        firstName: facilityUser.firstName,
        lastName: facilityUser.lastName,
        role: facilityUser.role,
        avatar: facilityUser.avatar,
        isActive: facilityUser.isActive,
        facilityId: facilityUser.primaryFacilityId,
        permissions: facilityUser.permissions || [],
        associatedFacilityIds: facilityUser.associatedFacilityIds || [],
        associatedFacilities: facilityUser.associatedFacilityIds || [],
        phone: facilityUser.phone,
        title: facilityUser.title,
        department: facilityUser.department,
        userType: "facility_user",
        createdAt: facilityUser.createdAt,
        updatedAt: facilityUser.updatedAt,
      };
    } else if (userType === "staff") {
      // Get staff member from staff table
      const [staffMember] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, targetUserId))
        .limit(1);

      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      targetUser = {
        id: staffMember.id,
        username: `${(staffMember.firstName || 'staff').toLowerCase()}${(staffMember.lastName || staffMember.id).toString().toLowerCase()}`,
        email: staffMember.email,
        password: "",
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: staffMember.employmentType || "staff",
        avatar: staffMember.profilePhoto || null,
        isActive: staffMember.isActive ?? true,
        facilityId: staffMember.primaryFacilityId || null,
        associatedFacilityIds: [],
        associatedFacilities: [],
        permissions: ["view_schedules", "view_staff"],
        phone: staffMember.phone,
        title: staffMember.role,
        department: staffMember.department,
        userType: "staff",
        createdAt: staffMember.createdAt,
        updatedAt: staffMember.updatedAt,
      };
    } else {
      // Get regular user from users table
      targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      targetUser.userType = "user";
    }

    // Store original user ID if not already set
    if (!(req.session as any).originalUserId) {
      (req.session as any).originalUserId = req.user?.id;
    }
    
    // Set impersonation session flags
    (req.session as any).impersonatedUserId = targetUserId;
    (req.session as any).impersonatedUserType = userType;

    // Save session and return success
    req.session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session" });
      }
      
      res.json({
        ok: true,
        impersonatedUserId: targetUserId,
        message: "Impersonation started successfully"
      });
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    res.status(500).json({ message: "Failed to start impersonation" });
  }
});

router.post("/api/impersonation/stop", requireAuth, async (req, res) => {
  try {
    if (!(req.session as any).impersonatedUserId) {
      return res.status(400).json({ message: "Not currently impersonating" });
    }

    // Clear impersonation flags but keep originalUserId
    delete (req.session as any).impersonatedUserId;
    delete (req.session as any).impersonatedUserType;
    
    // Save session and return success
    req.session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Failed to save session" });
      }
      
      res.json({
        ok: true,
        message: "Impersonation stopped successfully"
      });
    });
  } catch (error) {
    console.error("Stop impersonation error:", error);
    res.status(500).json({ message: "Failed to stop impersonation" });
  }
});

// Get impersonation status
router.get("/api/impersonation/status", requireAuth, async (req, res) => {
  try {
    const impersonatedUserId = (req.session as any).impersonatedUserId;
    
    if (!impersonatedUserId) {
      return res.json({ 
        impersonating: false, 
        target: null 
      });
    }
    
    // Get the impersonated user details
    const userType = (req.session as any).impersonatedUserType || 'facility';
    let targetUser = null;
    
    if (userType === 'facility' || userType === 'facility_user') {
      const [facilityUser] = await db
        .select()
        .from(facilityUsers)
        .where(eq(facilityUsers.id, impersonatedUserId))
        .limit(1);
        
      if (facilityUser) {
        targetUser = {
          id: facilityUser.id,
          name: `${facilityUser.firstName} ${facilityUser.lastName}`,
          role: facilityUser.role
        };
      }
    } else if (userType === 'staff') {
      const [staffMember] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, impersonatedUserId))
        .limit(1);
        
      if (staffMember) {
        targetUser = {
          id: staffMember.id,
          name: `${staffMember.firstName} ${staffMember.lastName}`,
          role: staffMember.employmentType || 'staff'
        };
      }
    }
    
    res.json({
      impersonating: true,
      target: targetUser
    });
  } catch (error) {
    console.error("Get impersonation status error:", error);
    res.status(500).json({ message: "Failed to get impersonation status" });
  }
});

export default router;