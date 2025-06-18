import { db } from './db';
import { 
  users, facilities, jobs, shifts, credentials, messages, invoices, workLogs,
  payrollProviders, payrollConfigurations, payrollEmployees, timesheets, 
  timesheetEntries, payments, auditLogs
} from '@shared/schema';
import { UserRole } from '@shared/schema';

export async function seedDatabase() {
  console.log('Seeding database with comprehensive healthcare staffing data...');

  try {
    // Clear existing data
    await db.delete(payments);
    await db.delete(timesheetEntries);
    await db.delete(timesheets);
    await db.delete(payrollEmployees);
    await db.delete(payrollConfigurations);
    await db.delete(payrollProviders);
    await db.delete(workLogs);
    await db.delete(invoices);
    await db.delete(messages);
    await db.delete(credentials);
    await db.delete(shifts);
    await db.delete(jobs);
    await db.delete(users);
    await db.delete(facilities);

    // Create facilities - Multi-building healthcare campus
    const facilitiesData = [
      {
        name: 'Willowbrook Skilled Nursing & Rehabilitation',
        address: '1234 Healthcare Drive, Meadowbrook, FL 33157',
        phone: '(305) 555-0100',
        email: 'admin@willowbrooksnf.com',
        isActive: true
      },
      {
        name: 'Maple Grove Memory Care',
        address: '5678 Memory Lane, Meadowbrook, FL 33158',
        phone: '(305) 555-0200',
        email: 'admin@maplegrove.com',
        isActive: true
      },
      {
        name: 'Sunrise Assisted Living',
        address: '9012 Sunrise Boulevard, Meadowbrook, FL 33159',
        phone: '(305) 555-0300',
        email: 'admin@sunriseassisted.com',
        isActive: true
      }
    ];

    const insertedFacilities = await db.insert(facilities).values(facilitiesData).returning();

    // Create comprehensive healthcare staff
    const usersData = [
      // System Admin
      {
        username: 'JoshBurn',
        email: 'joshburn99@gmail.com',
        password: '$2b$10$hashedpassword1',
        firstName: 'Josh',
        lastName: 'Burn',
        role: UserRole.SUPER_ADMIN,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      // Facility Managers
      {
        username: 'jennifer.martinez',
        email: 'jennifer.martinez@willowbrooksnf.com',
        password: '$2b$10$hashedpassword2',
        firstName: 'Jennifer',
        lastName: 'Martinez',
        role: UserRole.FACILITY_MANAGER,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'david.thompson',
        email: 'david.thompson@maplegrove.com',
        password: '$2b$10$hashedpassword3',
        firstName: 'David',
        lastName: 'Thompson',
        role: UserRole.FACILITY_MANAGER,
        facilityId: insertedFacilities[1].id,
        isActive: true
      },
      // Registered Nurses (RN) - Staff Employees
      {
        username: 'sarah.johnson',
        email: 'sarah.johnson@willowbrooksnf.com',
        password: '$2b$10$hashedpassword4',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@willowbrooksnf.com',
        password: '$2b$10$hashedpassword5',
        firstName: 'Michael',
        lastName: 'Chen',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'jessica.davis',
        email: 'jessica.davis@willowbrooksnf.com',
        password: '$2b$10$hashedpassword6',
        firstName: 'Jessica',
        lastName: 'Davis',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      // Licensed Practical Nurses (LPN) - Staff Employees
      {
        username: 'robert.wilson',
        email: 'robert.wilson@willowbrooksnf.com',
        password: '$2b$10$hashedpassword7',
        firstName: 'Robert',
        lastName: 'Wilson',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'amanda.brown',
        email: 'amanda.brown@willowbrooksnf.com',
        password: '$2b$10$hashedpassword8',
        firstName: 'Amanda',
        lastName: 'Brown',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      // Certified Nursing Assistants (CNA) - Staff Employees
      {
        username: 'carlos.rodriguez',
        email: 'carlos.rodriguez@willowbrooksnf.com',
        password: '$2b$10$hashedpassword9',
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'maria.garcia',
        email: 'maria.garcia@willowbrooksnf.com',
        password: '$2b$10$hashedpassword10',
        firstName: 'Maria',
        lastName: 'Garcia',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      // Physical Therapists (PT) - Staff Employees
      {
        username: 'james.taylor',
        email: 'james.taylor@willowbrooksnf.com',
        password: '$2b$10$hashedpassword11',
        firstName: 'James',
        lastName: 'Taylor',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      // Contractors
      {
        username: 'lisa.anderson',
        email: 'lisa.anderson@contractor.com',
        password: '$2b$10$hashedpassword12',
        firstName: 'Lisa',
        lastName: 'Anderson',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'kevin.murphy',
        email: 'kevin.murphy@contractor.com',
        password: '$2b$10$hashedpassword13',
        firstName: 'Kevin',
        lastName: 'Murphy',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[0].id,
        isActive: true
      }
    ];

    const insertedUsers = await db.insert(users).values(usersData).returning();

    // Create realistic jobs
    const jobsData = [
      {
        facilityId: insertedFacilities[0].id,
        title: 'Registered Nurse - ICU Night Shift',
        description: 'Full-time RN position in our Intensive Care Unit. Responsible for critical patient care during night shifts.',
        jobType: 'full_time',
        position: 'RN',
        department: 'ICU',
        shiftType: 'Night',
        hourlyRate: 42.50,
        requirements: ['Current RN license', 'BLS certification', 'ACLS preferred', '2+ years ICU experience'],
        isActive: true,
        postedById: insertedUsers[1].id
      },
      {
        facilityId: insertedFacilities[0].id,
        title: 'Licensed Practical Nurse - Med-Surg',
        description: 'Day shift LPN position in Medical-Surgical unit. Experience with post-operative care preferred.',
        jobType: 'part_time',
        position: 'LPN',
        department: 'Med-Surg',
        shiftType: 'Day',
        hourlyRate: 28.75,
        requirements: ['Current LPN license', 'BLS certification', 'Med-Surg experience'],
        isActive: true,
        postedById: insertedUsers[1].id
      },
      {
        facilityId: insertedFacilities[1].id,
        title: 'CNA - Memory Care Specialist',
        description: 'Certified Nursing Assistant specializing in dementia and Alzheimer\'s care.',
        jobType: 'full_time',
        position: 'CNA',
        department: 'Memory Care',
        shiftType: 'Day',
        hourlyRate: 18.50,
        requirements: ['CNA certification', 'Dementia care training', 'Compassionate patient care'],
        isActive: true,
        postedById: insertedUsers[2].id
      },
      {
        facilityId: insertedFacilities[0].id,
        title: 'Physical Therapist - Rehabilitation',
        description: 'Physical Therapist for our rehabilitation department. Work with post-surgical and stroke patients.',
        jobType: 'contract',
        position: 'PT',
        department: 'Rehabilitation',
        shiftType: 'Day',
        hourlyRate: 55.00,
        requirements: ['DPT or Master\'s in PT', 'State PT license', 'Geriatric experience preferred'],
        isActive: true,
        postedById: insertedUsers[1].id
      }
    ];

    const insertedJobs = await db.insert(jobs).values(jobsData).returning();

    // Create comprehensive shift data with realistic scheduling scenarios
    const shiftsData = [
      // TODAY'S SHIFTS (June 18, 2025) - Mix of assigned and open positions
      
      // ICU Day Shift - RN fully staffed
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-18T07:00:00Z'),
        endTime: new Date('2025-06-18T19:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'filled',
        specialRequirements: ['RN', 'BLS', 'Critical Care'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[3].id, insertedUsers[4].id] // Sarah & Emily RNs
      },
      
      // ICU Night Shift - OPEN (needs coverage)
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-18T19:00:00Z'),
        endTime: new Date('2025-06-19T07:00:00Z'),
        requiredStaff: 1,
        shiftType: 'night',
        status: 'open',
        specialRequirements: ['RN', 'BLS', 'Night Differential'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: []
      },
      
      // Med-Surg Day - LPN partially staffed (needs 1 more)
      {
        facilityId: insertedFacilities[0].id,
        department: 'Med-Surg',
        startTime: new Date('2025-06-18T07:00:00Z'),
        endTime: new Date('2025-06-18T15:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'open',
        specialRequirements: ['LPN', 'Med Administration'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[6].id] // Robert LPN
      },
      
      // Med-Surg Evening - LPN fully staffed
      {
        facilityId: insertedFacilities[0].id,
        department: 'Med-Surg',
        startTime: new Date('2025-06-18T15:00:00Z'),
        endTime: new Date('2025-06-18T23:00:00Z'),
        requiredStaff: 2,
        shiftType: 'evening',
        status: 'filled',
        specialRequirements: ['LPN', 'Med Administration'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[7].id, insertedUsers[12].id] // Amanda LPN + Kevin contractor
      },
      
      // Memory Care Day - CNA mix of staff and contractor
      {
        facilityId: insertedFacilities[0].id,
        department: 'Memory Care',
        startTime: new Date('2025-06-18T07:00:00Z'),
        endTime: new Date('2025-06-18T15:00:00Z'),
        requiredStaff: 3,
        shiftType: 'day',
        status: 'filled',
        specialRequirements: ['CNA', 'Dementia Care', 'Patient Lifting'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[8].id, insertedUsers[9].id, insertedUsers[11].id] // Carlos, Maria + Lisa contractor
      },
      
      // Memory Care Evening - CNA (OPEN shift)
      {
        facilityId: insertedFacilities[0].id,
        department: 'Memory Care',
        startTime: new Date('2025-06-18T15:00:00Z'),
        endTime: new Date('2025-06-18T23:00:00Z'),
        requiredStaff: 2,
        shiftType: 'evening',
        status: 'open',
        specialRequirements: ['CNA', 'Dementia Care'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: []
      },
      
      // Rehabilitation Day - PT assigned
      {
        facilityId: insertedFacilities[0].id,
        department: 'Rehabilitation',
        startTime: new Date('2025-06-18T09:00:00Z'),
        endTime: new Date('2025-06-18T17:00:00Z'),
        requiredStaff: 1,
        shiftType: 'day',
        status: 'filled',
        specialRequirements: ['PT', 'State License', 'Geriatric Experience'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[10].id] // James PT
      },
      
      // TOMORROW'S SHIFTS (June 19, 2025) - Planning ahead
      
      // ICU Day - RN (requesting coverage)
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-19T07:00:00Z'),
        endTime: new Date('2025-06-19T19:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'open',
        specialRequirements: ['RN', 'BLS', 'Critical Care'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[3].id] // Sarah requesting backup
      },
      
      // Med-Surg Day - LPN open positions
      {
        facilityId: insertedFacilities[0].id,
        department: 'Med-Surg',
        startTime: new Date('2025-06-19T07:00:00Z'),
        endTime: new Date('2025-06-19T15:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'open',
        specialRequirements: ['LPN', 'Med Administration'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: []
      },
      
      // PAST SHIFTS (June 16-17, 2025) - Historical data
      
      // Yesterday - ICU fully covered
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-17T07:00:00Z'),
        endTime: new Date('2025-06-17T19:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'filled',
        specialRequirements: ['RN', 'BLS'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[3].id, insertedUsers[4].id]
      },
      
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-17T19:00:00Z'),
        endTime: new Date('2025-06-18T07:00:00Z'),
        requiredStaff: 1,
        shiftType: 'night',
        status: 'filled',
        specialRequirements: ['RN', 'BLS', 'Night Differential'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[11].id] // Lisa contractor covered
      },
      
      // Day before yesterday - Mix of completed shifts
      {
        facilityId: insertedFacilities[0].id,
        department: 'Med-Surg',
        startTime: new Date('2025-06-16T07:00:00Z'),
        endTime: new Date('2025-06-16T15:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'filled',
        specialRequirements: ['LPN', 'Med Administration'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[6].id, insertedUsers[7].id]
      },
      
      {
        facilityId: insertedFacilities[0].id,
        department: 'Memory Care',
        startTime: new Date('2025-06-16T15:00:00Z'),
        endTime: new Date('2025-06-16T23:00:00Z'),
        requiredStaff: 3,
        shiftType: 'evening',
        status: 'filled',
        specialRequirements: ['CNA', 'Dementia Care'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[8].id, insertedUsers[9].id, insertedUsers[12].id]
      },
      
      // NEXT WEEK SHIFTS (June 20-24, 2025) - Future planning
      
      // Friday - PT coverage needed
      {
        facilityId: insertedFacilities[0].id,
        department: 'Rehabilitation',
        startTime: new Date('2025-06-20T09:00:00Z'),
        endTime: new Date('2025-06-20T17:00:00Z'),
        requiredStaff: 2,
        shiftType: 'day',
        status: 'open',
        specialRequirements: ['PT', 'State License', 'Weekend Rate'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: []
      },
      
      // Weekend shifts - Higher rates for weekend coverage
      {
        facilityId: insertedFacilities[0].id,
        department: 'ICU',
        startTime: new Date('2025-06-21T07:00:00Z'),
        endTime: new Date('2025-06-21T19:00:00Z'),
        requiredStaff: 2,
        shiftType: 'weekend',
        status: 'open',
        specialRequirements: ['RN', 'BLS', 'Weekend Differential'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: []
      },
      
      {
        facilityId: insertedFacilities[0].id,
        department: 'Memory Care',
        startTime: new Date('2025-06-22T07:00:00Z'),
        endTime: new Date('2025-06-22T19:00:00Z'),
        requiredStaff: 4, // Weekend minimum staffing
        shiftType: 'weekend',
        status: 'open',
        specialRequirements: ['CNA', 'Dementia Care', 'Weekend Rate'],
        createdById: insertedUsers[1].id,
        assignedStaffIds: [insertedUsers[8].id, insertedUsers[9].id] // Need 2 more CNAs
      }
    ];

    const insertedShifts = await db.insert(shifts).values(shiftsData).returning();

    // Create credentials
    const credentialsData = [
      {
        userId: insertedUsers[3].id,
        credentialType: 'RN License',
        name: 'Registered Nurse License',
        issuingAuthority: 'Florida Board of Nursing',
        licenseNumber: 'RN-FL-123456',
        issueDate: new Date('2020-01-15'),
        expiryDate: new Date('2026-01-15'),
        status: 'verified',
        verifiedAt: new Date(),
        verifiedById: insertedUsers[1].id
      },
      {
        userId: insertedUsers[3].id,
        credentialType: 'BLS Certification',
        name: 'Basic Life Support',
        issuingAuthority: 'American Heart Association',
        licenseNumber: 'BLS-2024-7891',
        issueDate: new Date('2024-03-10'),
        expiryDate: new Date('2026-03-10'),
        status: 'verified',
        verifiedAt: new Date(),
        verifiedById: insertedUsers[1].id
      },
      {
        userId: insertedUsers[4].id,
        credentialType: 'RN License',
        name: 'Registered Nurse License',
        issuingAuthority: 'Florida Board of Nursing',
        licenseNumber: 'RN-FL-789012',
        issueDate: new Date('2019-05-20'),
        expiryDate: new Date('2025-05-20'),
        status: 'pending',
        verifiedAt: null,
        verifiedById: null
      },
      {
        userId: insertedUsers[6].id,
        credentialType: 'LPN License',
        name: 'Licensed Practical Nurse License',
        issuingAuthority: 'Florida Board of Nursing',
        licenseNumber: 'LPN-FL-345678',
        issueDate: new Date('2021-08-12'),
        expiryDate: new Date('2025-08-12'),
        status: 'verified',
        verifiedAt: new Date(),
        verifiedById: insertedUsers[1].id
      }
    ];

    const insertedCredentials = await db.insert(credentials).values(credentialsData).returning();

    // Create invoices
    const invoicesData = [
      {
        facilityId: insertedFacilities[0].id,
        contractorId: insertedUsers[11].id,
        invoiceNumber: 'INV-2025-001',
        amount: 2240.00,
        workPeriodStart: new Date('2025-06-01'),
        workPeriodEnd: new Date('2025-06-07'),
        status: 'pending',
        notes: 'Week 1 - ICU coverage'
      },
      {
        facilityId: insertedFacilities[0].id,
        contractorId: insertedUsers[12].id,
        invoiceNumber: 'INV-2025-002',
        amount: 1980.00,
        workPeriodStart: new Date('2025-06-08'),
        workPeriodEnd: new Date('2025-06-14'),
        status: 'approved',
        approvedById: insertedUsers[1].id,
        approvedAt: new Date(),
        notes: 'Week 2 - PT services'
      }
    ];

    const insertedInvoices = await db.insert(invoices).values(invoicesData).returning();

    // Create work logs
    const workLogsData = [
      {
        userId: insertedUsers[3].id,
        description: 'ICU shift - patient care and medication administration',
        hoursWorked: '12.0',
        workDate: new Date('2025-06-17'),
        status: 'approved',
        reviewedById: insertedUsers[1].id,
        shiftId: insertedShifts[0].id
      },
      {
        userId: insertedUsers[4].id,
        description: 'ICU shift - critical patient monitoring',
        hoursWorked: '12.0',
        workDate: new Date('2025-06-17'),
        status: 'approved',
        reviewedById: insertedUsers[1].id,
        shiftId: insertedShifts[0].id
      },
      {
        userId: insertedUsers[11].id,
        description: 'Contract RN - emergency coverage',
        hoursWorked: '8.0',
        workDate: new Date('2025-06-16'),
        status: 'pending',
        reviewedById: null,
        shiftId: null
      }
    ];

    const insertedWorkLogs = await db.insert(workLogs).values(workLogsData).returning();

    // Create payroll providers
    const payrollProvidersData = [
      {
        name: 'ADP Workforce Now',
        apiEndpoint: 'https://api.adp.com/payroll/v1',
        isActive: true,
        configuration: { clientId: 'adp_client_123', environment: 'production' }
      },
      {
        name: 'QuickBooks Payroll',
        apiEndpoint: 'https://sandbox-quickbooks.api.intuit.com/v3',
        isActive: false,
        configuration: { companyId: 'qb_company_456', sandbox: true }
      }
    ];

    const insertedProviders = await db.insert(payrollProviders).values(payrollProvidersData).returning();

    // Create payroll configurations
    const payrollConfigsData = [
      {
        facilityId: insertedFacilities[0].id,
        providerId: insertedProviders[0].id,
        payFrequency: 'bi_weekly',
        overtimeThreshold: 40.0,
        federalTaxRate: 0.22,
        stateTaxRate: 0.06,
        socialSecurityRate: 0.062,
        medicareRate: 0.0145,
        isActive: true
      }
    ];

    const insertedConfigs = await db.insert(payrollConfigurations).values(payrollConfigsData).returning();

    // Create payroll employees
    const payrollEmployeesData = insertedUsers
      .filter(user => user.role === UserRole.INTERNAL_EMPLOYEE)
      .map((user, index) => ({
        userId: user.id,
        facilityId: user.facilityId,
        employeeType: 'hourly',
        hourlyRate: [38.50, 42.50, 35.00, 28.75, 26.50, 18.50, 55.00][index % 7].toFixed(2),
        overtimeRate: ([38.50, 42.50, 35.00, 28.75, 26.50, 18.50, 55.00][index % 7] * 1.5).toFixed(2),
        isActive: true
      }));

    const insertedPayrollEmployees = await db.insert(payrollEmployees).values(payrollEmployeesData).returning();

    // Create timesheets
    const timesheetsData = [
      {
        userId: insertedUsers[3].id,
        facilityId: insertedFacilities[0].id,
        payPeriodStart: new Date('2025-06-01'),
        payPeriodEnd: new Date('2025-06-14'),
        totalHours: '84.0',
        regularHours: '80.0',
        overtimeHours: '4.0',
        grossPay: '3234.00',
        status: 'approved',
        approvedBy: insertedUsers[1].id,
        approvedAt: new Date()
      },
      {
        userId: insertedUsers[4].id,
        facilityId: insertedFacilities[0].id,
        payPeriodStart: new Date('2025-06-01'),
        payPeriodEnd: new Date('2025-06-14'),
        totalHours: '80.0',
        regularHours: '80.0',
        overtimeHours: '0.0',
        grossPay: '3400.00',
        status: 'submitted',
        submittedAt: new Date()
      }
    ];

    const insertedTimesheets = await db.insert(timesheets).values(timesheetsData).returning();

    // Create payments
    const paymentsData = [
      {
        timesheetId: insertedTimesheets[0].id,
        userId: insertedUsers[3].id,
        facilityId: insertedFacilities[0].id,
        grossAmount: '3234.00',
        federalTax: '711.48',
        stateTax: '194.04',
        socialSecurity: '200.51',
        medicare: '46.89',
        netAmount: '2081.08',
        paymentMethod: 'direct_deposit',
        status: 'completed',
        paymentDate: new Date()
      }
    ];

    const insertedPayments = await db.insert(payments).values(paymentsData).returning();

    // Create audit logs for recent activities
    const auditLogsData = [
      {
        userId: insertedUsers[1].id,
        action: 'CREATE',
        resource: 'shift',
        resourceId: insertedShifts[0].id,
        newValues: { department: 'ICU', shiftType: 'Day' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: insertedUsers[1].id,
        action: 'APPROVE',
        resource: 'timesheet',
        resourceId: insertedTimesheets[0].id,
        oldValues: { status: 'submitted' },
        newValues: { status: 'approved' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    ];

    await db.insert(auditLogs).values(auditLogsData);

    console.log('✅ Database seeded successfully with comprehensive healthcare staffing data!');
    console.log(`📊 Created:`);
    console.log(`   - ${insertedFacilities.length} facilities`);
    console.log(`   - ${insertedUsers.length} users (staff, contractors, managers)`);
    console.log(`   - ${insertedJobs.length} job postings`);
    console.log(`   - ${insertedShifts.length} shifts`);
    console.log(`   - ${insertedCredentials.length} professional credentials`);
    console.log(`   - ${insertedInvoices.length} contractor invoices`);
    console.log(`   - ${insertedWorkLogs.length} work log entries`);
    console.log(`   - ${insertedProviders.length} payroll providers`);
    console.log(`   - ${insertedConfigs.length} payroll configurations`);
    console.log(`   - ${insertedPayrollEmployees.length} payroll employee records`);
    console.log(`   - ${insertedTimesheets.length} timesheets`);
    console.log(`   - ${insertedPayments.length} payments`);
    console.log(`   - Complete audit trail and activity logs`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}