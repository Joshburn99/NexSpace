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
router.post("/api/impersonate/start", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Superuser access required" });
    }

    const { targetUserId, userType = "user" } = req.body;
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

    // Store original user in session
    (req.session as any).originalUser = req.user;
    (req.session as any).isImpersonating = true;
    (req.session as any).impersonatedUserType = userType;
    (req.session as any).impersonatedUserId = targetUserId;

    // Set impersonated user as current user
    (req.session as any).user = {
      ...targetUser,
      isActive: true,
      canImpersonate: true,
    };

    // Save session and return success
    res.json({
      success: true,
      message: "Impersonation started successfully",
      user: targetUser
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    res.status(500).json({ message: "Failed to start impersonation" });
  }
});

router.post("/api/impersonate/stop", requireAuth, async (req, res) => {
  try {
    if (!(req.session as any).isImpersonating) {
      return res.status(400).json({ message: "Not currently impersonating" });
    }

    // Restore original user
    const originalUser = (req.session as any).originalUser;
    if (originalUser) {
      (req.session as any).user = originalUser;
      delete (req.session as any).originalUser;
      delete (req.session as any).isImpersonating;
      delete (req.session as any).impersonatedUserType;
      delete (req.session as any).impersonatedUserId;

      res.json({
        success: true,
        message: "Impersonation stopped successfully",
        user: originalUser
      });
    } else {
      res.status(500).json({ message: "Failed to restore original user" });
    }
  } catch (error) {
    console.error("Stop impersonation error:", error);
    res.status(500).json({ message: "Failed to stop impersonation" });
  }
});

export default router;