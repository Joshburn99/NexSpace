// Enhanced Facilities API Routes with Complete Field Support
import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import {
  facilities,
  facilityAddresses,
  facilityContacts,
  facilitySettings,
  facilityRates,
  facilityStaffingTargets,
  facilityDocuments,
  payrollProviders,
  teams,
  teamFacilities,
  type Facility,
  type InsertFacility,
  type InsertFacilityAddress,
  type InsertFacilityContact,
  type InsertFacilitySettings,
  type InsertFacilityRates,
  type InsertFacilityStaffingTargets,
  type InsertFacilityDocuments,
} from "@shared/schema";
import { eq, and, or, desc, asc, ilike, sql } from "drizzle-orm";
import {
  enhancedFacilitySchema,
  enhancedFacilityUpdateSchema,
  validateFacilityRates,
  validateStaffingTargets,
  validateTimezone,
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

      let query = db
        .select({
          facility: facilities,
          address: facilityAddresses,
          settings: facilitySettings,
        })
        .from(facilities)
        .leftJoin(facilityAddresses, eq(facilities.id, facilityAddresses.facilityId))
        .leftJoin(facilitySettings, eq(facilities.id, facilitySettings.facilityId));

      // Apply filters
      const conditions = [];
      if (state && facilityAddresses) conditions.push(eq(facilityAddresses.state, state as string));
      if (facilityType) conditions.push(eq(facilities.facilityType, facilityType as string));
      if (active !== undefined) conditions.push(eq(facilities.isActive, active === "true"));
      if (search) {
        conditions.push(
          or(
            ilike(facilities.name, `%${search}%`),
            facilityAddresses ? ilike(facilityAddresses.city, `%${search}%`) : sql`false`
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query.orderBy(asc(facilities.name));

      // Combine the data into a single facility object with nested properties
      const facilitiesData = results.map((result) => ({
        ...result.facility,
        address: result.address,
        settings: result.settings,
      }));

      res.json(facilitiesData);
    } catch (error) {

      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // GET /api/facilities/:id - Get single facility with enhanced data
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));

      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Fetch all related normalized data
      const [address] = await db
        .select()
        .from(facilityAddresses)
        .where(eq(facilityAddresses.facilityId, id));

      const contacts = await db
        .select()
        .from(facilityContacts)
        .where(eq(facilityContacts.facilityId, id))
        .orderBy(desc(facilityContacts.isPrimary), asc(facilityContacts.contactType));

      const [settings] = await db
        .select()
        .from(facilitySettings)
        .where(eq(facilitySettings.facilityId, id));

      const rates = await db
        .select()
        .from(facilityRates)
        .where(eq(facilityRates.facilityId, id))
        .orderBy(desc(facilityRates.effectiveDate));

      const staffingTargets = await db
        .select()
        .from(facilityStaffingTargets)
        .where(eq(facilityStaffingTargets.facilityId, id))
        .orderBy(asc(facilityStaffingTargets.department));

      const documents = await db
        .select()
        .from(facilityDocuments)
        .where(eq(facilityDocuments.facilityId, id))
        .orderBy(desc(facilityDocuments.uploadDate));

      // Combine all data into a comprehensive facility object
      const facilityData = {
        ...facility,
        address,
        contacts,
        settings,
        rates,
        staffingTargets,
        documents,
      };

      res.json(facilityData);
    } catch (error) {

      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  // POST /api/facilities - Create new facility with enhanced fields
  router.post(
    "/",
    requireAuth,
    requirePermission("facilities.create"),
    auditLog("CREATE", "facility"),
    async (req: any, res) => {
      try {

        // Extract different parts of the request
        const {
          name,
          facilityType,
          operationalStatus,
          cmsId,
          npiNumber,
          bedCount,
          isActive,
          address,
          contacts,
          settings,
          rates,
          staffingTargets,
          documents,
          teamId,
          ...otherFields
        } = req.body;

        // Start a transaction for creating facility and all related data
        await db.transaction(async (tx) => {
          // 1. Create the core facility record
          const [newFacility] = await tx
            .insert(facilities)
            .values({
              name,
              facilityType,
              operationalStatus: operationalStatus || "active",
              cmsId,
              npiNumber,
              bedCount: bedCount || 0,
              isActive: isActive !== undefined ? isActive : true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          const facilityId = newFacility.id;

          // 2. Create facility address if provided
          if (address) {
            await tx.insert(facilityAddresses).values({
              facilityId,
              streetAddress: address.streetAddress,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode,
              country: address.country || "USA",
              latitude: address.latitude,
              longitude: address.longitude,
            });
          }

          // 3. Create facility contacts if provided
          if (contacts && Array.isArray(contacts)) {
            for (const contact of contacts) {
              await tx.insert(facilityContacts).values({
                facilityId,
                contactType: contact.contactType,
                name: contact.name,
                title: contact.title,
                phone: contact.phone,
                email: contact.email,
                isPrimary: contact.isPrimary || false,
              });
            }
          }

          // 4. Create facility settings if provided
          if (settings) {
            await tx.insert(facilitySettings).values({
              facilityId,
              autoAssignmentEnabled: settings.autoAssignmentEnabled || false,
              netTerms: settings.netTerms || "Net 30",
              contractStartDate: settings.contractStartDate,
              payrollProviderId: settings.payrollProviderId,
              workflowAutomationConfig: settings.workflowAutomationConfig,
              shiftManagementSettings: settings.shiftManagementSettings,
              customRules: settings.customRules,
            });
          }

          // 5. Create facility rates if provided
          if (rates && Array.isArray(rates)) {
            for (const rate of rates) {
              await tx.insert(facilityRates).values({
                facilityId,
                specialty: rate.specialty,
                billRate: rate.billRate,
                payRate: rate.payRate,
                floatPoolMargin: rate.floatPoolMargin,
                effectiveDate: rate.effectiveDate || new Date(),
                endDate: rate.endDate,
              });
            }
          }

          // 6. Create staffing targets if provided
          if (staffingTargets && Array.isArray(staffingTargets)) {
            for (const target of staffingTargets) {
              await tx.insert(facilityStaffingTargets).values({
                facilityId,
                department: target.department,
                shiftType: target.shiftType,
                minStaff: target.minStaff,
                idealStaff: target.idealStaff,
                maxStaff: target.maxStaff,
              });
            }
          }

          // 7. Handle team assignment if teamId is provided
          if (teamId) {
            await tx.insert(teamFacilities).values({
              teamId,
              facilityId,
            });
          }

          // 8. Fetch and return the complete facility data
          const [createdFacility] = await tx
            .select()
            .from(facilities)
            .where(eq(facilities.id, facilityId));

          const [createdAddress] = await tx
            .select()
            .from(facilityAddresses)
            .where(eq(facilityAddresses.facilityId, facilityId));

          const createdContacts = await tx
            .select()
            .from(facilityContacts)
            .where(eq(facilityContacts.facilityId, facilityId));

          const [createdSettings] = await tx
            .select()
            .from(facilitySettings)
            .where(eq(facilitySettings.facilityId, facilityId));

          const createdRates = await tx
            .select()
            .from(facilityRates)
            .where(eq(facilityRates.facilityId, facilityId));

          const createdStaffingTargets = await tx
            .select()
            .from(facilityStaffingTargets)
            .where(eq(facilityStaffingTargets.facilityId, facilityId));

          const completeData = {
            ...createdFacility,
            address: createdAddress,
            contacts: createdContacts,
            settings: createdSettings,
            rates: createdRates,
            staffingTargets: createdStaffingTargets,
            documents: [],
          };

          res.status(201).json(completeData);
        });
      } catch (error) {

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

  // PUT /api/facilities/:id - Update facility (full replace)
  router.put(
    "/:id",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);

        // Check if facility exists
        const [existingFacility] = await db.select().from(facilities).where(eq(facilities.id, id));

        if (!existingFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        // Validate the enhanced facility data
        const facilityData = enhancedFacilitySchema.parse({
          ...existingFacility,
          ...req.body,
          updatedAt: new Date(),
        });

        // Business rule validations
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

        res.json(updatedFacility);
      } catch (error) {

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

  // GET /api/facilities/:id/settings - Get facility settings
  router.get("/:id/settings", requireAuth, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      
      const [settings] = await db
        .select()
        .from(facilitySettings)
        .where(eq(facilitySettings.facilityId, facilityId));
      
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          shiftManagementSettings: {
            autoApproveShifts: false,
            requireManagerApproval: true,
            allowSelfCancellation: true,
            cancellationDeadlineHours: 24,
            defaultShiftDurationHours: 8,
            overtimeThresholdHours: 40,
          }
        });
      }
      
      res.json(settings);
    } catch (error) {

      res.status(500).json({ message: "Failed to fetch facility settings" });
    }
  });

  // PATCH /api/facilities/:id/settings - Update facility settings
  router.patch("/:id/settings", requireAuth, requirePermission("manage_teams"), async (req: any, res) => {
    try {
      const facilityId = parseInt(req.params.id);
      const { shiftManagementSettings } = req.body;
      
      // Check if facility exists
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, facilityId));
      
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      // Check if settings exist
      const [existingSettings] = await db
        .select()
        .from(facilitySettings)
        .where(eq(facilitySettings.facilityId, facilityId));
      
      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db
          .update(facilitySettings)
          .set({
            shiftManagementSettings,
            updatedAt: new Date(),
          })
          .where(eq(facilitySettings.facilityId, facilityId))
          .returning();
        
        res.json(updatedSettings);
      } else {
        // Create new settings
        const [newSettings] = await db
          .insert(facilitySettings)
          .values({
            facilityId,
            shiftManagementSettings,
            autoAssignmentEnabled: false,
            netTerms: "Net 30",
          })
          .returning();
        
        res.json(newSettings);
      }
    } catch (error) {

      res.status(500).json({ message: "Failed to update facility settings" });
    }
  });

  // PATCH /api/facilities/:id - Partial update facility
  router.patch(
    "/:id",
    requireAuth,
    requirePermission("facilities.update"),
    auditLog("UPDATE", "facility"),
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);

        // Check if facility exists
        const [existingFacility] = await db.select().from(facilities).where(eq(facilities.id, id));

        if (!existingFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        // Extract different parts of the request
        const {
          name,
          facilityType,
          operationalStatus,
          cmsId,
          npiNumber,
          bedCount,
          isActive,
          address,
          contacts,
          settings,
          rates,
          staffingTargets,
          documents,
          ...otherFields
        } = req.body;

        // Start a transaction for updating facility and all related data
        await db.transaction(async (tx) => {
          // 1. Update core facility fields if provided
          const facilityUpdates: any = {};
          if (name !== undefined) facilityUpdates.name = name;
          if (facilityType !== undefined) facilityUpdates.facilityType = facilityType;
          if (operationalStatus !== undefined)
            facilityUpdates.operationalStatus = operationalStatus;
          if (cmsId !== undefined) facilityUpdates.cmsId = cmsId;
          if (npiNumber !== undefined) facilityUpdates.npiNumber = npiNumber;
          if (bedCount !== undefined) facilityUpdates.bedCount = bedCount;
          if (isActive !== undefined) facilityUpdates.isActive = isActive;

          if (Object.keys(facilityUpdates).length > 0) {
            facilityUpdates.updatedAt = new Date();
            await tx.update(facilities).set(facilityUpdates).where(eq(facilities.id, id));
          }

          // 2. Update facility address if provided
          if (address) {
            const [existingAddress] = await tx
              .select()
              .from(facilityAddresses)
              .where(eq(facilityAddresses.facilityId, id));

            if (existingAddress) {
              await tx
                .update(facilityAddresses)
                .set({
                  ...address,
                  updatedAt: new Date(),
                })
                .where(eq(facilityAddresses.facilityId, id));
            } else {
              await tx.insert(facilityAddresses).values({
                facilityId: id,
                ...address,
              });
            }
          }

          // 3. Update facility settings if provided
          if (settings) {
            const [existingSettings] = await tx
              .select()
              .from(facilitySettings)
              .where(eq(facilitySettings.facilityId, id));

            if (existingSettings) {
              await tx
                .update(facilitySettings)
                .set({
                  ...settings,
                  updatedAt: new Date(),
                })
                .where(eq(facilitySettings.facilityId, id));
            } else {
              await tx.insert(facilitySettings).values({
                facilityId: id,
                ...settings,
              });
            }
          }

          // 4. Update facility rates if provided
          if (rates && Array.isArray(rates)) {
            // For rates, we might want to replace all existing rates
            await tx.delete(facilityRates).where(eq(facilityRates.facilityId, id));
            for (const rate of rates) {
              await tx.insert(facilityRates).values({
                facilityId: id,
                ...rate,
                effectiveDate: rate.effectiveDate || new Date(),
              });
            }
          }

          // 5. Update staffing targets if provided
          if (staffingTargets && Array.isArray(staffingTargets)) {
            // For staffing targets, we might want to replace all existing targets
            await tx
              .delete(facilityStaffingTargets)
              .where(eq(facilityStaffingTargets.facilityId, id));
            for (const target of staffingTargets) {
              await tx.insert(facilityStaffingTargets).values({
                facilityId: id,
                ...target,
              });
            }
          }

          // 6. Fetch and return the complete updated facility data
          const [updatedFacility] = await tx.select().from(facilities).where(eq(facilities.id, id));

          const [updatedAddress] = await tx
            .select()
            .from(facilityAddresses)
            .where(eq(facilityAddresses.facilityId, id));

          const updatedContacts = await tx
            .select()
            .from(facilityContacts)
            .where(eq(facilityContacts.facilityId, id));

          const [updatedSettings] = await tx
            .select()
            .from(facilitySettings)
            .where(eq(facilitySettings.facilityId, id));

          const updatedRates = await tx
            .select()
            .from(facilityRates)
            .where(eq(facilityRates.facilityId, id));

          const updatedStaffingTargets = await tx
            .select()
            .from(facilityStaffingTargets)
            .where(eq(facilityStaffingTargets.facilityId, id));

          const updatedDocuments = await tx
            .select()
            .from(facilityDocuments)
            .where(eq(facilityDocuments.facilityId, id));

          const completeData = {
            ...updatedFacility,
            address: updatedAddress,
            contacts: updatedContacts,
            settings: updatedSettings,
            rates: updatedRates,
            staffingTargets: updatedStaffingTargets,
            documents: updatedDocuments,
          };

          res.json(completeData);
        });
      } catch (error) {

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

  // DELETE /api/facilities/:id - Soft delete facility
  router.delete(
    "/:id",
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

        res.status(500).json({ message: "Failed to deactivate facility" });
      }
    }
  );

  // POST /api/facilities/:id/rates - Update facility rates
  router.post(
    "/:id/rates",
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
            errors: ratesValidation.errors,
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
          floatPoolMargins: updatedFacility.floatPoolMargins,
        });
      } catch (error) {

        res.status(500).json({ message: "Failed to update rates" });
      }
    }
  );

  // POST /api/facilities/:id/staffing-targets - Update staffing targets
  router.post(
    "/:id/staffing-targets",
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
            errors: staffingValidation.errors,
          });
        }

        const [updatedFacility] = await db
          .update(facilities)
          .set({
            staffingTargets,
            updatedAt: new Date(),
          })
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Staffing targets updated successfully",
          staffingTargets: updatedFacility.staffingTargets,
        });
      } catch (error) {

        res.status(500).json({ message: "Failed to update staffing targets" });
      }
    }
  );

  // POST /api/facilities/:id/workflow-config - Update workflow automation
  router.post(
    "/:id/workflow-config",
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
            updatedAt: new Date(),
          })
          .where(eq(facilities.id, id))
          .returning();

        if (!updatedFacility) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json({
          message: "Workflow configuration updated successfully",
          workflowAutomationConfig: updatedFacility.workflowAutomationConfig,
        });
      } catch (error) {

        res.status(500).json({ message: "Failed to update workflow configuration" });
      }
    }
  );

  return router;
}

export default createEnhancedFacilitiesRoutes;
