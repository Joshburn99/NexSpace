--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.analytics_events (
    id integer NOT NULL,
    event_name character varying(255) NOT NULL,
    event_category character varying(100) NOT NULL,
    user_id integer,
    facility_id integer,
    user_agent text,
    ip_address character varying(50),
    session_id character varying(255),
    entity_type character varying(100),
    entity_id character varying(255),
    action character varying(100),
    metadata jsonb,
    duration integer,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics_events OWNER TO neondb_owner;

--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.analytics_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytics_events_id_seq OWNER TO neondb_owner;

--
-- Name: analytics_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    original_user_id integer,
    is_impersonated boolean DEFAULT false,
    impersonation_context jsonb
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: COLUMN audit_logs.original_user_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.audit_logs.original_user_id IS 'ID of the super admin who initiated impersonation';


--
-- Name: COLUMN audit_logs.is_impersonated; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.audit_logs.is_impersonated IS 'Whether this action was performed during impersonation';


--
-- Name: COLUMN audit_logs.impersonation_context; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.audit_logs.impersonation_context IS 'Additional context about the impersonation (userType, etc)';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO neondb_owner;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: block_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.block_shifts (
    id integer NOT NULL,
    title text NOT NULL,
    facility_id integer NOT NULL,
    facility_name text,
    department text NOT NULL,
    specialty text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    rate numeric(6,2) NOT NULL,
    premium_multiplier numeric(3,2) DEFAULT 1.00,
    status text DEFAULT 'open'::text NOT NULL,
    urgency text DEFAULT 'medium'::text,
    description text,
    special_requirements text[],
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.block_shifts OWNER TO neondb_owner;

--
-- Name: block_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.block_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.block_shifts_id_seq OWNER TO neondb_owner;

--
-- Name: block_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.block_shifts_id_seq OWNED BY public.block_shifts.id;


--
-- Name: credentials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.credentials (
    id integer NOT NULL,
    user_id integer NOT NULL,
    credential_type text NOT NULL,
    credential_number text,
    issuing_authority text,
    issue_date timestamp without time zone,
    expiration_date timestamp without time zone,
    document_url text,
    status text DEFAULT 'active'::text NOT NULL,
    verified_at timestamp without time zone,
    verified_by_id integer
);


ALTER TABLE public.credentials OWNER TO neondb_owner;

--
-- Name: credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credentials_id_seq OWNER TO neondb_owner;

--
-- Name: credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.credentials_id_seq OWNED BY public.credentials.id;


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facilities (
    id integer NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    facility_type text,
    city text,
    state text,
    zip_code text,
    cms_id text,
    bed_count integer,
    private_rooms integer,
    semi_private_rooms integer,
    overall_rating integer,
    health_inspection_rating integer,
    quality_measure_rating integer,
    staffing_rating integer,
    rn_staffing_rating integer,
    ownership_type text,
    certification_date timestamp without time zone,
    participates_medicare boolean,
    participates_medicaid boolean,
    admin_name text,
    admin_title text,
    medical_director text,
    last_inspection_date timestamp without time zone,
    deficiency_count integer,
    complaints_count integer,
    fines_total text,
    auto_imported boolean,
    last_data_update timestamp without time zone,
    data_source text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    website text,
    npi_number text,
    specialty_services jsonb,
    languages_spoken jsonb,
    auto_assignment_enabled boolean DEFAULT false,
    team_id integer,
    net_terms text DEFAULT 'Net 30'::text,
    float_pool_margins jsonb,
    bill_rates jsonb,
    pay_rates jsonb,
    workflow_automation_config jsonb,
    timezone text DEFAULT 'America/New_York'::text,
    shift_management_settings jsonb,
    billing_contact_name text,
    billing_contact_email text,
    staffing_targets jsonb,
    emr_system text,
    contract_start_date timestamp without time zone,
    payroll_provider_id integer,
    custom_rules jsonb,
    regulatory_docs jsonb
);


ALTER TABLE public.facilities OWNER TO neondb_owner;

--
-- Name: facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facilities_id_seq OWNER TO neondb_owner;

--
-- Name: facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facilities_id_seq OWNED BY public.facilities.id;


--
-- Name: facility_addresses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_addresses (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    street character varying(255),
    city character varying(100),
    state character varying(2),
    zip_code character varying(10),
    country character varying(100) DEFAULT 'US'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    address_type text DEFAULT 'primary'::text
);


ALTER TABLE public.facility_addresses OWNER TO neondb_owner;

--
-- Name: facility_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_addresses_id_seq OWNER TO neondb_owner;

--
-- Name: facility_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_addresses_id_seq OWNED BY public.facility_addresses.id;


--
-- Name: facility_contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_contacts (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    contact_type character varying(50) NOT NULL,
    name character varying(100),
    title character varying(100),
    phone character varying(20),
    email character varying(255),
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.facility_contacts OWNER TO neondb_owner;

--
-- Name: facility_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_contacts_id_seq OWNER TO neondb_owner;

--
-- Name: facility_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_contacts_id_seq OWNED BY public.facility_contacts.id;


--
-- Name: facility_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_documents (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    document_type character varying(100) NOT NULL,
    document_name character varying(255) NOT NULL,
    document_url text,
    expiry_date date,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.facility_documents OWNER TO neondb_owner;

--
-- Name: facility_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_documents_id_seq OWNER TO neondb_owner;

--
-- Name: facility_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_documents_id_seq OWNED BY public.facility_documents.id;


--
-- Name: facility_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_rates (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    rate_type character varying(50) NOT NULL,
    specialty character varying(100) NOT NULL,
    base_rate numeric(10,2) NOT NULL,
    overtime_rate numeric(10,2),
    holiday_rate numeric(10,2),
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.facility_rates OWNER TO neondb_owner;

--
-- Name: facility_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_rates_id_seq OWNER TO neondb_owner;

--
-- Name: facility_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_rates_id_seq OWNED BY public.facility_rates.id;


--
-- Name: facility_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_settings (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.facility_settings OWNER TO neondb_owner;

--
-- Name: facility_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_settings_id_seq OWNER TO neondb_owner;

--
-- Name: facility_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_settings_id_seq OWNED BY public.facility_settings.id;


--
-- Name: facility_staffing_targets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_staffing_targets (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    department character varying(100) NOT NULL,
    shift_type character varying(50) NOT NULL,
    target_count integer NOT NULL,
    min_count integer NOT NULL,
    max_count integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.facility_staffing_targets OWNER TO neondb_owner;

--
-- Name: facility_staffing_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_staffing_targets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_staffing_targets_id_seq OWNER TO neondb_owner;

--
-- Name: facility_staffing_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_staffing_targets_id_seq OWNED BY public.facility_staffing_targets.id;


--
-- Name: facility_user_activity_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_user_activity_log (
    id integer NOT NULL,
    user_id integer NOT NULL,
    facility_id integer NOT NULL,
    action text NOT NULL,
    resource text,
    details jsonb,
    ip_address text,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.facility_user_activity_log OWNER TO neondb_owner;

--
-- Name: facility_user_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_user_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_user_activity_log_id_seq OWNER TO neondb_owner;

--
-- Name: facility_user_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_user_activity_log_id_seq OWNED BY public.facility_user_activity_log.id;


--
-- Name: facility_user_role_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_user_role_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    role text NOT NULL,
    permissions jsonb NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by_id integer NOT NULL,
    facility_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.facility_user_role_templates OWNER TO neondb_owner;

--
-- Name: facility_user_role_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_user_role_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_user_role_templates_id_seq OWNER TO neondb_owner;

--
-- Name: facility_user_role_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_user_role_templates_id_seq OWNED BY public.facility_user_role_templates.id;


--
-- Name: facility_user_team_memberships; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_user_team_memberships (
    id integer NOT NULL,
    facility_user_id integer NOT NULL,
    team_id integer NOT NULL,
    role text DEFAULT 'member'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.facility_user_team_memberships OWNER TO neondb_owner;

--
-- Name: facility_user_team_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_user_team_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_user_team_memberships_id_seq OWNER TO neondb_owner;

--
-- Name: facility_user_team_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_user_team_memberships_id_seq OWNED BY public.facility_user_team_memberships.id;


--
-- Name: facility_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.facility_users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL,
    avatar text,
    is_active boolean DEFAULT true,
    primary_facility_id integer NOT NULL,
    associated_facility_ids jsonb DEFAULT '[]'::jsonb,
    phone text,
    title text,
    department text,
    permissions jsonb DEFAULT '[]'::jsonb,
    custom_permissions jsonb DEFAULT '{}'::jsonb,
    last_login timestamp without time zone,
    login_count integer DEFAULT 0,
    password_reset_required boolean DEFAULT false,
    two_factor_enabled boolean DEFAULT false,
    created_by_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.facility_users OWNER TO neondb_owner;

--
-- Name: facility_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.facility_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facility_users_id_seq OWNER TO neondb_owner;

--
-- Name: facility_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.facility_users_id_seq OWNED BY public.facility_users.id;


--
-- Name: generated_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.generated_shifts (
    id text NOT NULL,
    template_id integer NOT NULL,
    title text NOT NULL,
    date text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    department text NOT NULL,
    specialty text NOT NULL,
    facility_id integer NOT NULL,
    facility_name text NOT NULL,
    building_id text,
    building_name text,
    status text DEFAULT 'open'::text NOT NULL,
    rate numeric(10,2) NOT NULL,
    urgency text DEFAULT 'medium'::text,
    description text,
    required_workers integer DEFAULT 1,
    min_staff integer DEFAULT 1,
    max_staff integer DEFAULT 1,
    total_hours integer DEFAULT 8,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    shift_position integer DEFAULT 0 NOT NULL,
    assigned_staff_ids jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.generated_shifts OWNER TO neondb_owner;

--
-- Name: interview_schedules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.interview_schedules (
    id integer NOT NULL,
    application_id integer NOT NULL,
    start timestamp without time zone NOT NULL,
    "end" timestamp without time zone NOT NULL,
    meeting_url text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.interview_schedules OWNER TO neondb_owner;

--
-- Name: interview_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.interview_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interview_schedules_id_seq OWNER TO neondb_owner;

--
-- Name: interview_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.interview_schedules_id_seq OWNED BY public.interview_schedules.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    contractor_id integer NOT NULL,
    facility_id integer NOT NULL,
    invoice_number text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    work_period_start timestamp without time zone NOT NULL,
    work_period_end timestamp without time zone NOT NULL,
    submitted_at timestamp without time zone DEFAULT now(),
    approved_at timestamp without time zone,
    approved_by_id integer,
    paid_at timestamp without time zone
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_applications (
    id integer NOT NULL,
    job_id integer NOT NULL,
    applicant_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    cover_letter text,
    resume_url text,
    applied_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    reviewed_by_id integer
);


ALTER TABLE public.job_applications OWNER TO neondb_owner;

--
-- Name: job_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.job_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_applications_id_seq OWNER TO neondb_owner;

--
-- Name: job_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.job_applications_id_seq OWNED BY public.job_applications.id;


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.job_postings (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    requirements jsonb,
    schedule_type text NOT NULL,
    pay_rate numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.job_postings OWNER TO neondb_owner;

--
-- Name: job_postings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.job_postings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_postings_id_seq OWNER TO neondb_owner;

--
-- Name: job_postings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.job_postings_id_seq OWNED BY public.job_postings.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    department text,
    facility_id integer NOT NULL,
    pay_rate_min numeric(10,2),
    pay_rate_max numeric(10,2),
    job_type text NOT NULL,
    requirements text[],
    is_active boolean DEFAULT true,
    posted_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jobs OWNER TO neondb_owner;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO neondb_owner;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    recipient_id integer,
    conversation_id text,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    is_read boolean DEFAULT false,
    shift_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO neondb_owner;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notification_preferences (
    id integer NOT NULL,
    user_id integer,
    facility_user_id integer,
    email_notifications boolean DEFAULT true NOT NULL,
    shift_assignments boolean DEFAULT true NOT NULL,
    shift_changes boolean DEFAULT true NOT NULL,
    new_messages boolean DEFAULT true NOT NULL,
    approvals boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO neondb_owner;

--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_preferences_id_seq OWNER TO neondb_owner;

--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    facility_user_id integer,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone,
    metadata jsonb
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    timesheet_id integer NOT NULL,
    user_id integer NOT NULL,
    facility_id integer NOT NULL,
    payroll_provider_id integer NOT NULL,
    external_payment_id text,
    gross_amount numeric(10,2) NOT NULL,
    federal_tax numeric(10,2) DEFAULT '0'::numeric,
    state_tax numeric(10,2) DEFAULT '0'::numeric,
    social_security numeric(10,2) DEFAULT '0'::numeric,
    medicare numeric(10,2) DEFAULT '0'::numeric,
    other_deductions numeric(10,2) DEFAULT '0'::numeric,
    net_amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_date timestamp without time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    failure_reason text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: payroll_configurations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payroll_configurations (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    provider_id integer NOT NULL,
    configuration jsonb NOT NULL,
    is_active boolean DEFAULT true,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payroll_configurations OWNER TO neondb_owner;

--
-- Name: payroll_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payroll_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_configurations_id_seq OWNER TO neondb_owner;

--
-- Name: payroll_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payroll_configurations_id_seq OWNED BY public.payroll_configurations.id;


--
-- Name: payroll_employees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payroll_employees (
    id integer NOT NULL,
    user_id integer NOT NULL,
    facility_id integer NOT NULL,
    external_employee_id text,
    payroll_provider_id integer NOT NULL,
    employee_type text NOT NULL,
    hourly_rate numeric(10,2),
    salary_amount numeric(10,2),
    overtime_rate numeric(10,2),
    tax_information jsonb,
    direct_deposit_info jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payroll_employees OWNER TO neondb_owner;

--
-- Name: payroll_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payroll_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_employees_id_seq OWNER TO neondb_owner;

--
-- Name: payroll_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payroll_employees_id_seq OWNED BY public.payroll_employees.id;


--
-- Name: payroll_providers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payroll_providers (
    id integer NOT NULL,
    name text NOT NULL,
    api_endpoint text NOT NULL,
    auth_type text NOT NULL,
    is_active boolean DEFAULT true,
    supported_features jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payroll_providers OWNER TO neondb_owner;

--
-- Name: payroll_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payroll_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_providers_id_seq OWNER TO neondb_owner;

--
-- Name: payroll_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payroll_providers_id_seq OWNED BY public.payroll_providers.id;


--
-- Name: payroll_sync_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payroll_sync_logs (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    provider_id integer NOT NULL,
    sync_type text NOT NULL,
    status text NOT NULL,
    records_processed integer DEFAULT 0,
    records_succeeded integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_details jsonb,
    sync_data jsonb,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    created_by integer
);


ALTER TABLE public.payroll_sync_logs OWNER TO neondb_owner;

--
-- Name: payroll_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payroll_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payroll_sync_logs_id_seq OWNER TO neondb_owner;

--
-- Name: payroll_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payroll_sync_logs_id_seq OWNED BY public.payroll_sync_logs.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL
);


ALTER TABLE public.permissions OWNER TO neondb_owner;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO neondb_owner;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role text NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO neondb_owner;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO neondb_owner;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: shift_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shift_assignments (
    id integer NOT NULL,
    shift_id text NOT NULL,
    worker_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    assigned_by_id integer NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL
);


ALTER TABLE public.shift_assignments OWNER TO neondb_owner;

--
-- Name: shift_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.shift_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shift_assignments_id_seq OWNER TO neondb_owner;

--
-- Name: shift_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.shift_assignments_id_seq OWNED BY public.shift_assignments.id;


--
-- Name: shift_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shift_templates (
    id integer NOT NULL,
    name text NOT NULL,
    department text NOT NULL,
    specialty text NOT NULL,
    facility_id integer NOT NULL,
    facility_name text NOT NULL,
    min_staff integer DEFAULT 1 NOT NULL,
    max_staff integer DEFAULT 1 NOT NULL,
    shift_type text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    days_of_week jsonb NOT NULL,
    is_active boolean DEFAULT true,
    hourly_rate numeric(10,2) NOT NULL,
    notes text,
    building_id text,
    building_name text,
    generated_shifts_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    days_posted_out integer DEFAULT 7
);


ALTER TABLE public.shift_templates OWNER TO neondb_owner;

--
-- Name: shift_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.shift_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shift_templates_id_seq OWNER TO neondb_owner;

--
-- Name: shift_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.shift_templates_id_seq OWNED BY public.shift_templates.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    department text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    required_staff integer DEFAULT 1,
    assigned_staff_ids integer[],
    status text DEFAULT 'open'::text NOT NULL,
    shift_type text NOT NULL,
    special_requirements text[],
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    title text DEFAULT 'Untitled Shift'::text NOT NULL,
    facility_name text,
    specialty text DEFAULT 'General'::text NOT NULL,
    date text DEFAULT '2025-01-01'::text NOT NULL,
    rate numeric(6,2) DEFAULT 25.00 NOT NULL,
    premium_multiplier numeric(3,2) DEFAULT 1.00,
    urgency text DEFAULT 'medium'::text,
    description text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shifts OWNER TO neondb_owner;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO neondb_owner;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.staff (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    specialty text NOT NULL,
    department text NOT NULL,
    license_number text,
    license_expiry timestamp without time zone,
    is_active boolean DEFAULT true,
    employment_type text NOT NULL,
    hourly_rate numeric(6,2),
    location text,
    availability_status text DEFAULT 'available'::text,
    profile_photo text,
    bio text,
    certifications text[],
    languages text[],
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    associated_facilities jsonb DEFAULT '[]'::jsonb,
    reliability_score numeric(3,2) DEFAULT 0.00,
    first_name text,
    last_name text,
    account_status text DEFAULT 'active'::text,
    home_address text,
    home_city text,
    home_state text,
    home_zip_code text,
    current_location jsonb,
    background_check_date date,
    drug_test_date date,
    covid_vaccination_status character varying(50),
    total_worked_shifts integer DEFAULT 0,
    late_arrival_count integer DEFAULT 0,
    no_call_no_show_count integer DEFAULT 0
);


ALTER TABLE public.staff OWNER TO neondb_owner;

--
-- Name: staff_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_id_seq OWNER TO neondb_owner;

--
-- Name: staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.staff_id_seq OWNED BY public.staff.id;


--
-- Name: team_facilities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_facilities (
    id integer NOT NULL,
    team_id integer NOT NULL,
    facility_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.team_facilities OWNER TO neondb_owner;

--
-- Name: team_facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.team_facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_facilities_id_seq OWNER TO neondb_owner;

--
-- Name: team_facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.team_facilities_id_seq OWNED BY public.team_facilities.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    team_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.team_members OWNER TO neondb_owner;

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_id_seq OWNER TO neondb_owner;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    leader_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO neondb_owner;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO neondb_owner;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: time_clock_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_clock_entries (
    id integer NOT NULL,
    user_id integer NOT NULL,
    shift_id integer,
    clock_in timestamp without time zone,
    clock_out timestamp without time zone,
    location jsonb,
    device_fingerprint text,
    total_hours numeric(5,2),
    is_approved boolean DEFAULT false,
    approved_by_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_clock_entries OWNER TO neondb_owner;

--
-- Name: time_clock_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_clock_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_clock_entries_id_seq OWNER TO neondb_owner;

--
-- Name: time_clock_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_clock_entries_id_seq OWNED BY public.time_clock_entries.id;


--
-- Name: time_off_balances; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_off_balances (
    id integer NOT NULL,
    user_id integer NOT NULL,
    time_off_type_id integer NOT NULL,
    year integer NOT NULL,
    allocated numeric(8,2) DEFAULT 0 NOT NULL,
    used numeric(8,2) DEFAULT 0 NOT NULL,
    pending numeric(8,2) DEFAULT 0 NOT NULL,
    available numeric(8,2) DEFAULT 0 NOT NULL,
    carryover numeric(8,2) DEFAULT 0,
    expires_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_off_balances OWNER TO neondb_owner;

--
-- Name: time_off_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_off_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_off_balances_id_seq OWNER TO neondb_owner;

--
-- Name: time_off_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_off_balances_id_seq OWNED BY public.time_off_balances.id;


--
-- Name: time_off_policies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_off_policies (
    id integer NOT NULL,
    facility_id integer,
    name text NOT NULL,
    description text,
    accrual_method text NOT NULL,
    accrual_rate numeric(8,2),
    max_accrual numeric(8,2),
    yearly_allocation numeric(8,2),
    carryover_allowed boolean DEFAULT false,
    carryover_max_days numeric(8,2),
    minimum_service_days integer DEFAULT 0,
    employment_types jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_off_policies OWNER TO neondb_owner;

--
-- Name: time_off_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_off_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_off_policies_id_seq OWNER TO neondb_owner;

--
-- Name: time_off_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_off_policies_id_seq OWNED BY public.time_off_policies.id;


--
-- Name: time_off_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_off_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    time_off_type_id integer NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    start_time text,
    end_time text,
    total_hours numeric(8,2) NOT NULL,
    reason text NOT NULL,
    coverage_notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_notes text,
    attachments jsonb,
    affected_shifts jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_off_requests OWNER TO neondb_owner;

--
-- Name: time_off_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_off_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_off_requests_id_seq OWNER TO neondb_owner;

--
-- Name: time_off_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_off_requests_id_seq OWNED BY public.time_off_requests.id;


--
-- Name: time_off_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.time_off_types (
    id integer NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    color text NOT NULL,
    requires_approval boolean DEFAULT true,
    requires_documentation boolean DEFAULT false,
    max_consecutive_days integer,
    advance_notice_required integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.time_off_types OWNER TO neondb_owner;

--
-- Name: time_off_types_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.time_off_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_off_types_id_seq OWNER TO neondb_owner;

--
-- Name: time_off_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.time_off_types_id_seq OWNED BY public.time_off_types.id;


--
-- Name: timesheet_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.timesheet_entries (
    id integer NOT NULL,
    timesheet_id integer NOT NULL,
    shift_id integer,
    work_date timestamp without time zone NOT NULL,
    clock_in timestamp without time zone,
    clock_out timestamp without time zone,
    break_start timestamp without time zone,
    break_end timestamp without time zone,
    hours_worked numeric(8,2) NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    entry_type text NOT NULL,
    is_approved boolean DEFAULT false,
    approved_by integer,
    approved_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.timesheet_entries OWNER TO neondb_owner;

--
-- Name: timesheet_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.timesheet_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timesheet_entries_id_seq OWNER TO neondb_owner;

--
-- Name: timesheet_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.timesheet_entries_id_seq OWNED BY public.timesheet_entries.id;


--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.timesheets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    facility_id integer NOT NULL,
    pay_period_start timestamp without time zone NOT NULL,
    pay_period_end timestamp without time zone NOT NULL,
    total_hours numeric(8,2) NOT NULL,
    regular_hours numeric(8,2) NOT NULL,
    overtime_hours numeric(8,2) DEFAULT '0'::numeric,
    holiday_hours numeric(8,2) DEFAULT '0'::numeric,
    sick_hours numeric(8,2) DEFAULT '0'::numeric,
    vacation_hours numeric(8,2) DEFAULT '0'::numeric,
    gross_pay numeric(10,2),
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp without time zone,
    approved_at timestamp without time zone,
    approved_by integer,
    processed_at timestamp without time zone,
    payroll_sync_id text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.timesheets OWNER TO neondb_owner;

--
-- Name: timesheets_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.timesheets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timesheets_id_seq OWNER TO neondb_owner;

--
-- Name: timesheets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.timesheets_id_seq OWNED BY public.timesheets.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    session_data jsonb NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL,
    avatar text,
    is_active boolean DEFAULT true,
    facility_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    specialty text,
    associated_facilities jsonb,
    availability_status text DEFAULT 'available'::text,
    dashboard_preferences jsonb,
    onboarding_completed boolean DEFAULT false,
    onboarding_step integer DEFAULT 0,
    calendar_feed_token character varying(255),
    phone text,
    department text,
    bio text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.work_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    shift_id integer,
    description text NOT NULL,
    hours_worked numeric(5,2) NOT NULL,
    work_date timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by_id integer,
    reviewed_at timestamp without time zone,
    submitted_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.work_logs OWNER TO neondb_owner;

--
-- Name: work_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.work_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_logs_id_seq OWNER TO neondb_owner;

--
-- Name: work_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.work_logs_id_seq OWNED BY public.work_logs.id;


--
-- Name: analytics_events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: block_shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.block_shifts ALTER COLUMN id SET DEFAULT nextval('public.block_shifts_id_seq'::regclass);


--
-- Name: credentials id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credentials ALTER COLUMN id SET DEFAULT nextval('public.credentials_id_seq'::regclass);


--
-- Name: facilities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facilities ALTER COLUMN id SET DEFAULT nextval('public.facilities_id_seq'::regclass);


--
-- Name: facility_addresses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_addresses ALTER COLUMN id SET DEFAULT nextval('public.facility_addresses_id_seq'::regclass);


--
-- Name: facility_contacts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_contacts ALTER COLUMN id SET DEFAULT nextval('public.facility_contacts_id_seq'::regclass);


--
-- Name: facility_documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_documents ALTER COLUMN id SET DEFAULT nextval('public.facility_documents_id_seq'::regclass);


--
-- Name: facility_rates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_rates ALTER COLUMN id SET DEFAULT nextval('public.facility_rates_id_seq'::regclass);


--
-- Name: facility_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_settings ALTER COLUMN id SET DEFAULT nextval('public.facility_settings_id_seq'::regclass);


--
-- Name: facility_staffing_targets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_staffing_targets ALTER COLUMN id SET DEFAULT nextval('public.facility_staffing_targets_id_seq'::regclass);


--
-- Name: facility_user_activity_log id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_activity_log ALTER COLUMN id SET DEFAULT nextval('public.facility_user_activity_log_id_seq'::regclass);


--
-- Name: facility_user_role_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_role_templates ALTER COLUMN id SET DEFAULT nextval('public.facility_user_role_templates_id_seq'::regclass);


--
-- Name: facility_user_team_memberships id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_team_memberships ALTER COLUMN id SET DEFAULT nextval('public.facility_user_team_memberships_id_seq'::regclass);


--
-- Name: facility_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_users ALTER COLUMN id SET DEFAULT nextval('public.facility_users_id_seq'::regclass);


--
-- Name: interview_schedules id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.interview_schedules ALTER COLUMN id SET DEFAULT nextval('public.interview_schedules_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: job_applications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_applications ALTER COLUMN id SET DEFAULT nextval('public.job_applications_id_seq'::regclass);


--
-- Name: job_postings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_postings ALTER COLUMN id SET DEFAULT nextval('public.job_postings_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: payroll_configurations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_configurations ALTER COLUMN id SET DEFAULT nextval('public.payroll_configurations_id_seq'::regclass);


--
-- Name: payroll_employees id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_employees ALTER COLUMN id SET DEFAULT nextval('public.payroll_employees_id_seq'::regclass);


--
-- Name: payroll_providers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_providers ALTER COLUMN id SET DEFAULT nextval('public.payroll_providers_id_seq'::regclass);


--
-- Name: payroll_sync_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.payroll_sync_logs_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: shift_assignments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shift_assignments ALTER COLUMN id SET DEFAULT nextval('public.shift_assignments_id_seq'::regclass);


--
-- Name: shift_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shift_templates ALTER COLUMN id SET DEFAULT nextval('public.shift_templates_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: staff id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff ALTER COLUMN id SET DEFAULT nextval('public.staff_id_seq'::regclass);


--
-- Name: team_facilities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_facilities ALTER COLUMN id SET DEFAULT nextval('public.team_facilities_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: time_clock_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_clock_entries ALTER COLUMN id SET DEFAULT nextval('public.time_clock_entries_id_seq'::regclass);


--
-- Name: time_off_balances id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_balances ALTER COLUMN id SET DEFAULT nextval('public.time_off_balances_id_seq'::regclass);


--
-- Name: time_off_policies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_policies ALTER COLUMN id SET DEFAULT nextval('public.time_off_policies_id_seq'::regclass);


--
-- Name: time_off_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_requests ALTER COLUMN id SET DEFAULT nextval('public.time_off_requests_id_seq'::regclass);


--
-- Name: time_off_types id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_types ALTER COLUMN id SET DEFAULT nextval('public.time_off_types_id_seq'::regclass);


--
-- Name: timesheet_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timesheet_entries ALTER COLUMN id SET DEFAULT nextval('public.timesheet_entries_id_seq'::regclass);


--
-- Name: timesheets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timesheets ALTER COLUMN id SET DEFAULT nextval('public.timesheets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.work_logs ALTER COLUMN id SET DEFAULT nextval('public.work_logs_id_seq'::regclass);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: block_shifts block_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.block_shifts
    ADD CONSTRAINT block_shifts_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: facility_addresses facility_addresses_facility_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_addresses
    ADD CONSTRAINT facility_addresses_facility_id_key UNIQUE (facility_id);


--
-- Name: facility_addresses facility_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_addresses
    ADD CONSTRAINT facility_addresses_pkey PRIMARY KEY (id);


--
-- Name: facility_contacts facility_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_contacts
    ADD CONSTRAINT facility_contacts_pkey PRIMARY KEY (id);


--
-- Name: facility_documents facility_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_documents
    ADD CONSTRAINT facility_documents_pkey PRIMARY KEY (id);


--
-- Name: facility_rates facility_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_rates
    ADD CONSTRAINT facility_rates_pkey PRIMARY KEY (id);


--
-- Name: facility_settings facility_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_settings
    ADD CONSTRAINT facility_settings_pkey PRIMARY KEY (id);


--
-- Name: facility_staffing_targets facility_staffing_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_staffing_targets
    ADD CONSTRAINT facility_staffing_targets_pkey PRIMARY KEY (id);


--
-- Name: facility_user_activity_log facility_user_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_activity_log
    ADD CONSTRAINT facility_user_activity_log_pkey PRIMARY KEY (id);


--
-- Name: facility_user_role_templates facility_user_role_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_role_templates
    ADD CONSTRAINT facility_user_role_templates_pkey PRIMARY KEY (id);


--
-- Name: facility_user_team_memberships facility_user_team_memberships_facility_user_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_team_memberships
    ADD CONSTRAINT facility_user_team_memberships_facility_user_id_team_id_key UNIQUE (facility_user_id, team_id);


--
-- Name: facility_user_team_memberships facility_user_team_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_user_team_memberships
    ADD CONSTRAINT facility_user_team_memberships_pkey PRIMARY KEY (id);


--
-- Name: facility_users facility_users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_users
    ADD CONSTRAINT facility_users_email_key UNIQUE (email);


--
-- Name: facility_users facility_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_users
    ADD CONSTRAINT facility_users_pkey PRIMARY KEY (id);


--
-- Name: facility_users facility_users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_users
    ADD CONSTRAINT facility_users_username_key UNIQUE (username);


--
-- Name: generated_shifts generated_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_shifts
    ADD CONSTRAINT generated_shifts_pkey PRIMARY KEY (id);


--
-- Name: interview_schedules interview_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.interview_schedules
    ADD CONSTRAINT interview_schedules_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_facility_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_facility_user_id_key UNIQUE (facility_user_id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payroll_configurations payroll_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_configurations
    ADD CONSTRAINT payroll_configurations_pkey PRIMARY KEY (id);


--
-- Name: payroll_employees payroll_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_employees
    ADD CONSTRAINT payroll_employees_pkey PRIMARY KEY (id);


--
-- Name: payroll_providers payroll_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_providers
    ADD CONSTRAINT payroll_providers_pkey PRIMARY KEY (id);


--
-- Name: payroll_sync_logs payroll_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payroll_sync_logs
    ADD CONSTRAINT payroll_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_unique UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: shift_assignments shift_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shift_assignments
    ADD CONSTRAINT shift_assignments_pkey PRIMARY KEY (id);


--
-- Name: shift_templates shift_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shift_templates
    ADD CONSTRAINT shift_templates_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: team_facilities team_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_facilities
    ADD CONSTRAINT team_facilities_pkey PRIMARY KEY (id);


--
-- Name: team_facilities team_facilities_team_id_facility_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_facilities
    ADD CONSTRAINT team_facilities_team_id_facility_id_key UNIQUE (team_id, facility_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: time_clock_entries time_clock_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_clock_entries
    ADD CONSTRAINT time_clock_entries_pkey PRIMARY KEY (id);


--
-- Name: time_off_balances time_off_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_balances
    ADD CONSTRAINT time_off_balances_pkey PRIMARY KEY (id);


--
-- Name: time_off_policies time_off_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_policies
    ADD CONSTRAINT time_off_policies_pkey PRIMARY KEY (id);


--
-- Name: time_off_requests time_off_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_requests
    ADD CONSTRAINT time_off_requests_pkey PRIMARY KEY (id);


--
-- Name: time_off_types time_off_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.time_off_types
    ADD CONSTRAINT time_off_types_pkey PRIMARY KEY (id);


--
-- Name: timesheet_entries timesheet_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timesheet_entries
    ADD CONSTRAINT timesheet_entries_pkey PRIMARY KEY (id);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: work_logs work_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT work_logs_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_facility_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_facility_user_id ON public.notifications USING btree (facility_user_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: facility_addresses facility_addresses_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_addresses
    ADD CONSTRAINT facility_addresses_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_contacts facility_contacts_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_contacts
    ADD CONSTRAINT facility_contacts_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_documents facility_documents_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_documents
    ADD CONSTRAINT facility_documents_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_rates facility_rates_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_rates
    ADD CONSTRAINT facility_rates_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: facility_staffing_targets facility_staffing_targets_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.facility_staffing_targets
    ADD CONSTRAINT facility_staffing_targets_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: interview_schedules interview_schedules_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.interview_schedules
    ADD CONSTRAINT interview_schedules_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;


--
-- Name: job_postings job_postings_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_facility_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_facility_user_id_fkey FOREIGN KEY (facility_user_id) REFERENCES public.facility_users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_facility_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_facility_user_id_fkey FOREIGN KEY (facility_user_id) REFERENCES public.facility_users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_facilities team_facilities_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_facilities
    ADD CONSTRAINT team_facilities_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: team_facilities team_facilities_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_facilities
    ADD CONSTRAINT team_facilities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

