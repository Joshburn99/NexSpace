CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"event_category" text NOT NULL,
	"user_id" integer,
	"facility_id" integer,
	"entity_type" text,
	"entity_id" text,
	"action" text,
	"metadata" jsonb,
	"user_agent" text,
	"ip_address" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "block_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"facility_id" integer NOT NULL,
	"facility_name" text,
	"department" text NOT NULL,
	"specialty" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"rate" numeric(6, 2) NOT NULL,
	"premium_multiplier" numeric(3, 2) DEFAULT '1.00',
	"status" text DEFAULT 'open' NOT NULL,
	"urgency" text DEFAULT 'medium',
	"description" text,
	"special_requirements" text[],
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_read_at" timestamp,
	"unread_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'direct' NOT NULL,
	"subject" text,
	"shift_id" integer,
	"facility_id" integer,
	"created_by_id" integer NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"credential_type" text NOT NULL,
	"credential_number" text,
	"issuing_authority" text,
	"issue_date" timestamp,
	"expiration_date" timestamp,
	"document_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"verified_at" timestamp,
	"verified_by_id" integer
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"facility_type" text NOT NULL,
	"cms_id" text,
	"npi_number" text,
	"bed_count" integer,
	"private_rooms" integer,
	"semi_private_rooms" integer,
	"overall_rating" integer,
	"health_inspection_rating" integer,
	"quality_measure_rating" integer,
	"staffing_rating" integer,
	"rn_staffing_rating" integer,
	"ownership_type" text,
	"certification_date" timestamp,
	"participates_medicare" boolean DEFAULT false,
	"participates_medicaid" boolean DEFAULT false,
	"specialty_services" jsonb,
	"languages_spoken" jsonb,
	"last_inspection_date" timestamp,
	"deficiency_count" integer,
	"complaints_count" integer,
	"fines_total" numeric(10, 2),
	"auto_imported" boolean DEFAULT false,
	"last_data_update" timestamp,
	"data_source" text,
	"timezone" text DEFAULT 'America/New_York',
	"emr_system" text,
	"is_active" boolean DEFAULT true,
	"team_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facilities_cms_id_unique" UNIQUE("cms_id")
);
--> statement-breakpoint
CREATE TABLE "facility_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"address_type" text DEFAULT 'primary',
	"street" text NOT NULL,
	"street_2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facility_addresses_facility_id_unique" UNIQUE("facility_id")
);
--> statement-breakpoint
CREATE TABLE "facility_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"contact_type" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"phone" text,
	"email" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"expiration_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"specialty" text NOT NULL,
	"bill_rate" numeric(10, 2),
	"pay_rate" numeric(10, 2),
	"float_pool_margin" numeric(10, 2),
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"auto_assignment_enabled" boolean DEFAULT false,
	"net_terms" text DEFAULT 'Net 30',
	"contract_start_date" timestamp,
	"payroll_provider_id" integer,
	"workflow_automation_config" jsonb,
	"shift_management_settings" jsonb,
	"custom_rules" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facility_settings_facility_id_unique" UNIQUE("facility_id")
);
--> statement-breakpoint
CREATE TABLE "facility_staffing_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"department" text NOT NULL,
	"target_hours" integer NOT NULL,
	"min_staff" integer NOT NULL,
	"max_staff" integer NOT NULL,
	"preferred_staff_mix" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_user_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"action" text NOT NULL,
	"resource" text,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_user_facility_associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"team_id" integer,
	"assigned_by_id" integer,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"facility_specific_permissions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"permission" text NOT NULL,
	"granted_by_id" integer NOT NULL,
	"granted_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"constraints" jsonb,
	"expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_user_role_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"role" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by_id" integer NOT NULL,
	"facility_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_user_team_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text,
	"is_active" boolean DEFAULT true,
	"primary_facility_id" integer NOT NULL,
	"associated_facility_ids" jsonb DEFAULT '[]'::jsonb,
	"phone" text,
	"title" text,
	"department" text,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"custom_permissions" jsonb DEFAULT '{}'::jsonb,
	"last_login" timestamp,
	"login_count" integer DEFAULT 0,
	"password_reset_required" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"created_by_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facility_users_username_unique" UNIQUE("username"),
	CONSTRAINT "facility_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "generated_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" text NOT NULL,
	"template_id" integer NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"department" text NOT NULL,
	"specialty" text NOT NULL,
	"facility_id" integer NOT NULL,
	"facility_name" text NOT NULL,
	"building_id" text,
	"building_name" text,
	"status" text DEFAULT 'open' NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"urgency" text DEFAULT 'medium',
	"description" text,
	"required_staff" integer DEFAULT 1,
	"shift_position" integer DEFAULT 0 NOT NULL,
	"assigned_staff_ids" jsonb DEFAULT '[]'::jsonb,
	"min_staff" integer DEFAULT 1,
	"max_staff" integer DEFAULT 1,
	"total_hours" integer DEFAULT 8,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "generated_shifts_unique_id_unique" UNIQUE("unique_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"contractor_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"work_period_start" timestamp NOT NULL,
	"work_period_end" timestamp NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by_id" integer,
	"paid_at" timestamp,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cover_letter" text,
	"resume_url" text,
	"applied_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by_id" integer
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"department" text,
	"facility_id" integer NOT NULL,
	"pay_rate_min" numeric(10, 2),
	"pay_rate_max" numeric(10, 2),
	"job_type" text NOT NULL,
	"requirements" text[],
	"is_active" boolean DEFAULT true,
	"posted_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"priority" text DEFAULT 'normal',
	"attachment_url" text,
	"attachment_name" text,
	"attachment_size" integer,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"facility_user_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"timesheet_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"payroll_provider_id" integer NOT NULL,
	"external_payment_id" text,
	"gross_amount" numeric(10, 2) NOT NULL,
	"federal_tax" numeric(10, 2) DEFAULT '0',
	"state_tax" numeric(10, 2) DEFAULT '0',
	"social_security" numeric(10, 2) DEFAULT '0',
	"medicare" numeric(10, 2) DEFAULT '0',
	"other_deductions" numeric(10, 2) DEFAULT '0',
	"net_amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"payment_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"configuration" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"external_employee_id" text,
	"payroll_provider_id" integer NOT NULL,
	"employee_type" text NOT NULL,
	"hourly_rate" numeric(10, 2),
	"salary_amount" numeric(10, 2),
	"overtime_rate" numeric(10, 2),
	"tax_information" jsonb,
	"direct_deposit_info" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"api_endpoint" text NOT NULL,
	"auth_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"supported_features" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"sync_type" text NOT NULL,
	"status" text NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_succeeded" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_details" jsonb,
	"sync_data" jsonb,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" text NOT NULL,
	"worker_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by_id" integer NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"performed_by_id" integer,
	"notes" text,
	"previous_status" text,
	"new_status" text
);
--> statement-breakpoint
CREATE TABLE "shift_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"processed_by_id" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"specialty" text NOT NULL,
	"facility_id" integer NOT NULL,
	"facility_name" text,
	"building_id" text,
	"building_name" text,
	"min_staff" integer NOT NULL,
	"max_staff" integer NOT NULL,
	"shift_type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"days_of_week" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"hourly_rate" numeric(6, 2),
	"days_posted_out" integer DEFAULT 14,
	"notes" text,
	"generated_shifts_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"facility_id" integer NOT NULL,
	"facility_name" text,
	"department" text NOT NULL,
	"specialty" text NOT NULL,
	"shift_type" text DEFAULT 'Day' NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"rate" numeric(6, 2) NOT NULL,
	"premium_multiplier" numeric(3, 2) DEFAULT '1.00',
	"status" text DEFAULT 'open' NOT NULL,
	"urgency" text DEFAULT 'medium',
	"description" text,
	"required_staff" integer DEFAULT 1,
	"assigned_staff_ids" integer[],
	"special_requirements" text[],
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"profile_photo" text,
	"bio" text,
	"specialty" text NOT NULL,
	"department" text NOT NULL,
	"employment_type" text NOT NULL,
	"hourly_rate" numeric(6, 2),
	"is_active" boolean DEFAULT true,
	"account_status" text DEFAULT 'active',
	"availability_status" text DEFAULT 'available',
	"license_number" text,
	"license_expiration_date" timestamp,
	"home_address" text,
	"home_city" text,
	"home_state" text,
	"home_zip_code" text,
	"current_location" jsonb,
	"background_check_date" timestamp,
	"drug_test_date" timestamp,
	"covid_vaccination_status" jsonb,
	"total_worked_shifts" integer DEFAULT 0,
	"reliability_score" numeric(3, 2) DEFAULT '0.00',
	"late_arrival_count" integer DEFAULT 0,
	"no_call_no_show_count" integer DEFAULT 0,
	"last_work_date" timestamp,
	"preferred_shift_types" jsonb,
	"weekly_availability" jsonb,
	"languages" text[],
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"emergency_contact_email" text,
	"direct_deposit_bank_name" text,
	"direct_deposit_routing_number" text,
	"direct_deposit_account_number" text,
	"direct_deposit_account_type" text,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "staff_email_unique" UNIQUE("email"),
	CONSTRAINT "staff_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"credential_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_facility_associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"leader_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_clock_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shift_id" integer,
	"clock_in" timestamp,
	"clock_out" timestamp,
	"location" jsonb,
	"device_fingerprint" text,
	"total_hours" numeric(5, 2),
	"is_approved" boolean DEFAULT false,
	"approved_by_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"allocated" numeric(8, 2) DEFAULT '0' NOT NULL,
	"used" numeric(8, 2) DEFAULT '0' NOT NULL,
	"pending" numeric(8, 2) DEFAULT '0' NOT NULL,
	"available" numeric(8, 2) DEFAULT '0' NOT NULL,
	"carryover" numeric(8, 2) DEFAULT '0',
	"expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer,
	"name" text NOT NULL,
	"description" text,
	"accrual_method" text NOT NULL,
	"accrual_rate" numeric(8, 2),
	"max_accrual" numeric(8, 2),
	"yearly_allocation" numeric(8, 2),
	"carryover_allowed" boolean DEFAULT false,
	"carryover_max_days" numeric(8, 2),
	"minimum_service_days" integer DEFAULT 0,
	"employment_types" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"start_time" text,
	"end_time" text,
	"total_hours" numeric(8, 2) NOT NULL,
	"reason" text NOT NULL,
	"coverage_notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"attachments" jsonb,
	"affected_shifts" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_off_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"color" text NOT NULL,
	"requires_approval" boolean DEFAULT true,
	"requires_documentation" boolean DEFAULT false,
	"max_consecutive_days" integer,
	"advance_notice_required" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"timesheet_id" integer NOT NULL,
	"shift_id" integer,
	"work_date" timestamp NOT NULL,
	"clock_in" timestamp,
	"clock_out" timestamp,
	"break_start" timestamp,
	"break_end" timestamp,
	"hours_worked" numeric(8, 2) NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"entry_type" text NOT NULL,
	"is_approved" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"pay_period_start" timestamp NOT NULL,
	"pay_period_end" timestamp NOT NULL,
	"total_hours" numeric(8, 2) NOT NULL,
	"regular_hours" numeric(8, 2) NOT NULL,
	"overtime_hours" numeric(8, 2) DEFAULT '0',
	"holiday_hours" numeric(8, 2) DEFAULT '0',
	"sick_hours" numeric(8, 2) DEFAULT '0',
	"vacation_hours" numeric(8, 2) DEFAULT '0',
	"gross_pay" numeric(10, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by" integer,
	"processed_at" timestamp,
	"payroll_sync_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_dashboard_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"widget_configuration" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_data" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text,
	"is_active" boolean DEFAULT true,
	"facility_id" integer,
	"specialty" text,
	"associated_facilities" jsonb,
	"availability_status" text DEFAULT 'available',
	"dashboard_preferences" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shift_id" integer,
	"description" text NOT NULL,
	"hours_worked" numeric(5, 2) NOT NULL,
	"work_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" integer,
	"reviewed_at" timestamp,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_addresses" ADD CONSTRAINT "facility_addresses_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_contacts" ADD CONSTRAINT "facility_contacts_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_rates" ADD CONSTRAINT "facility_rates_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_settings" ADD CONSTRAINT "facility_settings_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_staffing_targets" ADD CONSTRAINT "facility_staffing_targets_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_facility_user_id_facility_users_id_fk" FOREIGN KEY ("facility_user_id") REFERENCES "public"."facility_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_facility_associations" ADD CONSTRAINT "staff_facility_associations_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_facility_associations" ADD CONSTRAINT "staff_facility_associations_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;