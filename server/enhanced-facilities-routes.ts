// Enhanced Facilities API Routes with Complete Field Support
import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import { facilities, payrollProviders, type Facility, type InsertFacility } from "@shared/schema";
import { eq, and, desc, asc, ilike } from "drizzle-orm";
import { 
  enhancedFacilitySchema, 
  enhancedFacilityUpdateSchema,
  validateFacilityRates,
  validateStaffingTargets,
  validateTimezone 
} from "./enhanced-facility-validation";

export function createEnhancedFacilitiesRoutes(
  requireAuth: any, 
  requirePermission: any, 
  auditLog: any
) {
  const router = Router();

  // GET /api/facilities - Get all facilities with enhanced data
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { state, facilityType, active, search } = req.query;
      
      let query = db.select().from(facilities);
      
      // Apply filters
      const conditions = [];
      if (state) conditions.push(eq(facilities.state, state as string));
      if (facilityType) conditions.push(eq(facilities.facilityType, facilityType as string));
      if (active !== undefined) conditions.push(eq(facilities.isActive, active === 'true'));
      if (search) {
        conditions.push(ilike(facilities.name, `%${search}%`));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const facilitiesData = await query.orderBy(asc(facilities.name));
      res.json(facilitiesData);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // GET /api/facilities/:id - Get single facility with enhanced data
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, id));

      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  // POST /api/facilities - Create new facility with enhanced fields
  router.post("/", 
    requireAuth, 
    requirePermission("facilities.create"),
    auditLog("CREATE", "facility"),
    async (req: any, res) => {
      try {
        console.log("Creating facility with data:", req.body);
        
        // Validate the enhanced facility data
        const facilityData = enhancedFacilitySchema.parse(req.body);
        
        // Additional business rule validations
        const ratesValidation = validateFacilityRates(facilityData.billRates, facilityData.payRates);
        if (!ratesValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid rates configuration", 
            errors: ratesValidation.errors 
          });
        }

        const staffingValidation = validateStaffingTargets(facilityData.staffingTargets);
        if (!staffingValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid staffing targets", 
            errors: staffingValidation.errors 
          });
        }

        if (facilityData.timezone && !validateTimezone(facilityData.timezone)) {
          return res.status(400).json({ 
            message: "Invalid timezone" 
          });
        }

        // Verify payroll provider exists if specified
        if (facilityData.payrollProviderId) {
          const [payrollProvider] = await db
            .select()
            .from(payrollProviders)
            .where(eq(payrollProviders.id, facilityData.payrollProviderId));
          
          if (!payrollProvider) {
            return res.status(400).json({ 
              message: "Invalid payroll provider ID" 
            });
          }
        }

        const [newFacility] = await db
          .insert(facilities)
          .values(facilityData as any)
          .returning();

        console.log("Facility created successfully:", newFacility);
        res.status(201).json(newFacility);
      } catch (error) {
        console.error("Error creating facility:", error);
        
        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }));
          
          return res.status(400).json({ 
            message: "Validation failed", 
            fieldErrors,
            details: error.errors
          });
        }
        
        res.status(500).json({ message: "Failed to create facility" });
      }
    }
  );

  // PUT /api/facilities/:id - Update facility (full replace)
  router.put("/:id", 
    requireAuth, 
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        console.log(`Updating facility ${id} with data:`, req.body);

        // Check if facility exists
        const [existingFacility] = await db
          .select()
          .from(facilities)
          .where(eq(facilities.id, id));

        if (!existingFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        // Validate the enhanced facility data
        const facilityData = enhancedFacilitySchema.parse({
          ...existingFacility,
          ...req.body,
          updatedAt: new Date()
        });

        // Business rule validations
        const ratesValidation = validateFacilityRates(facilityData.billRates, facilityData.payRates);
        if (!ratesValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid rates configuration", 
            errors: ratesValidation.errors 
          });
        }

        const staffingValidation = validateStaffingTargets(facilityData.staffingTargets);
        if (!staffingValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid staffing targets", 
            errors: staffingValidation.errors 
          });
        }

        if (facilityData.timezone && !validateTimezone(facilityData.timezone)) {
          return res.status(400).json({ message: "Invalid timezone" });
        }

        // Verify payroll provider exists if specified
        if (facilityData.payrollProviderId) {
          const [payrollProvider] = await db
            .select()
            .from(payrollProviders)
            .where(eq(payrollProviders.id, facilityData.payrollProviderId));
          
          if (!payrollProvider) {
            return res.status(400).json({ message: "Invalid payroll provider ID" });
          }
        }

        const [updatedFacility] = await db
          .update(facilities)
          .set(facilityData as any)
          .where(eq(facilities.id, id))
          .returning();

        console.log("Facility updated successfully:", updatedFacility);
        res.json(updatedFacility);
      } catch (error) {
        console.error("Error updating facility:", error);
        
        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }));
          
          return res.status(400).json({ 
            message: "Validation failed", 
            fieldErrors,
            details: error.errors
          });
        }
        
        res.status(500).json({ message: "Failed to update facility" });
      }
    }
  );

  // PATCH /api/facilities/:id - Partial update facility
  router.patch("/:id", 
    requireAuth, 
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        console.log(`Partially updating facility ${id} with data:`, req.body);

        // Check if facility exists
        const [existingFacility] = await db
          .select()
          .from(facilities)
          .where(eq(facilities.id, id));

        if (!existingFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        // Validate partial update data
        const updateData = enhancedFacilityUpdateSchema.parse({
          ...req.body,
          updatedAt: new Date()
        });

        // Business rule validations for fields being updated
        if (updateData.billRates || updateData.payRates) {
          const billRates = updateData.billRates || existingFacility.billRates;
          const payRates = updateData.payRates || existingFacility.payRates;
          
          const ratesValidation = validateFacilityRates(billRates, payRates);
          if (!ratesValidation.valid) {
            return res.status(400).json({ 
              message: "Invalid rates configuration", 
              errors: ratesValidation.errors 
            });
          }
        }

        if (updateData.staffingTargets) {
          const staffingValidation = validateStaffingTargets(updateData.staffingTargets);
          if (!staffingValidation.valid) {
            return res.status(400).json({ 
              message: "Invalid staffing targets", 
              errors: staffingValidation.errors 
            });
          }
        }

        if (updateData.timezone && !validateTimezone(updateData.timezone)) {
          return res.status(400).json({ message: "Invalid timezone" });
        }

        // Verify payroll provider exists if being updated
        if (updateData.payrollProviderId) {
          const [payrollProvider] = await db
            .select()
            .from(payrollProviders)
            .where(eq(payrollProviders.id, updateData.payrollProviderId));
          
          if (!payrollProvider) {
            return res.status(400).json({ message: "Invalid payroll provider ID" });
          }
        }

        const [updatedFacility] = await db
          .update(facilities)
          .set(updateData as any)
          .where(eq(facilities.id, id))
          .returning();

        console.log("Facility partially updated successfully:", updatedFacility);
        res.json(updatedFacility);
      } catch (error) {
        console.error("Error partially updating facility:", error);
        
        if (error instanceof z.ZodError) {
          const fieldErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }));
          
          return res.status(400).json({ 
            message: "Validation failed", 
            fieldErrors,
            details: error.errors
          });
        }
        
        res.status(500).json({ message: "Failed to update facility" });
      }
    }
  );

  // DELETE /api/facilities/:id - Soft delete facility
  router.delete("/:id", 
    requireAuth, 
    requirePermission("facilities.delete"),
    auditLog("DELETE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);

        const [updatedFacility] = await db
          .update(facilities)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({ message: "Facility deactivated successfully" });
      } catch (error) {
        console.error("Error deactivating facility:", error);
        res.status(500).json({ message: "Failed to deactivate facility" });
      }
    }
  );

  // POST /api/facilities/:id/rates - Update facility rates
  router.post("/:id/rates", 
    requireAuth, 
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_rates"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { billRates, payRates, floatPoolMargins } = req.body;

        // Validate rates
        const ratesValidation = validateFacilityRates(billRates, payRates);
        if (!ratesValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid rates configuration", 
            errors: ratesValidation.errors 
          });
        }

        const updateData: any = { updatedAt: new Date() };
        if (billRates) updateData.billRates = billRates;
        if (payRates) updateData.payRates = payRates;
        if (floatPoolMargins) updateData.floatPoolMargins = floatPoolMargins;

        const [updatedFacility] = await db
          .update(facilities)
          .set(updateData)
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Rates updated successfully",
          billRates: updatedFacility.billRates,
          payRates: updatedFacility.payRates,
          floatPoolMargins: updatedFacility.floatPoolMargins
        });
      } catch (error) {
        console.error("Error updating facility rates:", error);
        res.status(500).json({ message: "Failed to update rates" });
      }
    }
  );

  // POST /api/facilities/:id/staffing-targets - Update staffing targets
  router.post("/:id/staffing-targets", 
    requireAuth, 
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_staffing"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { staffingTargets } = req.body;

        const staffingValidation = validateStaffingTargets(staffingTargets);
        if (!staffingValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid staffing targets", 
            errors: staffingValidation.errors 
          });
        }

        const [updatedFacility] = await db
          .update(facilities)
          .set({ 
            staffingTargets,
            updatedAt: new Date() 
          })
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Staffing targets updated successfully",
          staffingTargets: updatedFacility.staffingTargets
        });
      } catch (error) {
        console.error("Error updating staffing targets:", error);
        res.status(500).json({ message: "Failed to update staffing targets" });
      }
    }
  );

  // POST /api/facilities/:id/workflow-config - Update workflow automation
  router.post("/:id/workflow-config", 
    requireAuth, 
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility_workflow"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { workflowAutomationConfig } = req.body;

        const [updatedFacility] = await db
          .update(facilities)
          .set({ 
            workflowAutomationConfig,
            updatedAt: new Date() 
          })
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Workflow configuration updated successfully",
          workflowAutomationConfig: updatedFacility.workflowAutomationConfig
        });
      } catch (error) {
        console.error("Error updating workflow configuration:", error);
        res.status(500).json({ message: "Failed to update workflow configuration" });
      }
    }
  );

  return router;
}

export default createEnhancedFacilitiesRoutes;