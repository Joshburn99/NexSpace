import { Router, Request, Response } from "express";
import { db } from "../db";
import { facilityUsers, facilities } from "@shared/schema";
import { eq, or, ilike, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "../middleware/structured-logger";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Schema validation
const createFacilityUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string(),
  primaryFacilityId: z.number(),
  associatedFacilityIds: z.array(z.number()).optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const updateFacilityUserSchema = createFacilityUserSchema.partial().omit({ password: true });

// GET /api/facility-users - List with search and pagination
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { q, facilityId, page = "1", limit = "25" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select({
      id: facilityUsers.id,
      username: facilityUsers.username,
      email: facilityUsers.email,
      firstName: facilityUsers.firstName,
      lastName: facilityUsers.lastName,
      role: facilityUsers.role,
      avatar: facilityUsers.avatar,
      isActive: facilityUsers.isActive,
      primaryFacilityId: facilityUsers.primaryFacilityId,
      associatedFacilityIds: facilityUsers.associatedFacilityIds,
      phone: facilityUsers.phone,
      title: facilityUsers.title,
      department: facilityUsers.department,
      permissions: facilityUsers.permissions,
      lastLogin: facilityUsers.lastLogin,
      createdAt: facilityUsers.createdAt,
      facilityName: facilities.name,
    })
    .from(facilityUsers)
    .leftJoin(facilities, eq(facilityUsers.primaryFacilityId, facilities.id));

    // Build WHERE conditions
    const conditions = [];
    
    // Search filter
    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(
        or(
          ilike(facilityUsers.firstName, searchTerm),
          ilike(facilityUsers.lastName, searchTerm),
          ilike(facilityUsers.username, searchTerm),
          ilike(facilityUsers.email, searchTerm)
        )
      );
    }

    // Facility filter
    if (facilityId) {
      const facId = parseInt(facilityId as string, 10);
      conditions.push(
        or(
          eq(facilityUsers.primaryFacilityId, facId),
          sql`${facilityUsers.associatedFacilityIds}::jsonb @> ${JSON.stringify([facId])}`
        )
      );
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(facilityUsers)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const totalCount = Number(countResult[0]?.count || 0);

    // Apply pagination
    const results = await query
      .limit(limitNum)
      .offset(offset);

    res.json({
      users: results.map(user => ({
        ...user,
        name: `${user.firstName} ${user.lastName}`,
        primaryFacility: user.facilityName,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    logger.error("Error fetching facility users", { error });
    res.status(500).json({ error: "Failed to fetch facility users" });
  }
});

// GET /api/facility-users/:id - Get single user
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    const result = await db.select({
      id: facilityUsers.id,
      username: facilityUsers.username,
      email: facilityUsers.email,
      firstName: facilityUsers.firstName,
      lastName: facilityUsers.lastName,
      role: facilityUsers.role,
      avatar: facilityUsers.avatar,
      isActive: facilityUsers.isActive,
      primaryFacilityId: facilityUsers.primaryFacilityId,
      associatedFacilityIds: facilityUsers.associatedFacilityIds,
      phone: facilityUsers.phone,
      title: facilityUsers.title,
      department: facilityUsers.department,
      permissions: facilityUsers.permissions,
      customPermissions: facilityUsers.customPermissions,
      lastLogin: facilityUsers.lastLogin,
      createdAt: facilityUsers.createdAt,
      updatedAt: facilityUsers.updatedAt,
      facilityName: facilities.name,
    })
    .from(facilityUsers)
    .leftJoin(facilities, eq(facilityUsers.primaryFacilityId, facilities.id))
    .where(eq(facilityUsers.id, userId))
    .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Facility user not found" });
    }

    res.json({
      ...result[0],
      name: `${result[0].firstName} ${result[0].lastName}`,
      primaryFacility: result[0].facilityName,
    });
  } catch (error) {
    logger.error("Error fetching facility user", { error });
    res.status(500).json({ error: "Failed to fetch facility user" });
  }
});

// POST /api/facility-users - Create new user
router.post("/", authenticate, authorize("super_admin"), async (req: Request, res: Response) => {
  try {
    const validatedData = createFacilityUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const [newUser] = await db.insert(facilityUsers).values({
      ...validatedData,
      password: hashedPassword,
      associatedFacilityIds: validatedData.associatedFacilityIds || [validatedData.primaryFacilityId],
      permissions: validatedData.permissions || [],
      createdById: req.user?.id,
    }).returning();

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      primaryFacilityId: newUser.primaryFacilityId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    logger.error("Error creating facility user", { error });
    res.status(500).json({ error: "Failed to create facility user" });
  }
});

// PATCH /api/facility-users/:id - Update user
router.patch("/:id", authenticate, authorize("super_admin"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const validatedData = updateFacilityUserSchema.parse(req.body);

    // If password is being updated, hash it
    let updateData: any = { ...validatedData };
    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    const [updated] = await db.update(facilityUsers)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(facilityUsers.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Facility user not found" });
    }

    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    logger.error("Error updating facility user", { error });
    res.status(500).json({ error: "Failed to update facility user" });
  }
});

// DELETE /api/facility-users/:id - Soft delete (deactivate)
router.delete("/:id", authenticate, authorize("super_admin"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const [deactivated] = await db.update(facilityUsers)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(facilityUsers.id, userId))
      .returning();

    if (!deactivated) {
      return res.status(404).json({ error: "Facility user not found" });
    }

    res.json({ message: "Facility user deactivated successfully" });
  } catch (error) {
    logger.error("Error deactivating facility user", { error });
    res.status(500).json({ error: "Failed to deactivate facility user" });
  }
});

export default router;