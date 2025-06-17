import { db } from './db';
import { users, facilities, jobs, shifts, credentials, messages, invoices, workLogs } from '@shared/schema';
import { UserRole } from '@shared/schema';

export async function seedDatabase() {
  console.log('Seeding database with demo data...');

  try {
    // Create facilities - 100-bed skilled nursing facility
    const facilitiesData = [
      {
        name: 'Willowbrook Skilled Nursing & Rehabilitation',
        address: '1234 Healthcare Drive, Meadowbrook, FL 33157',
        phone: '(305) 555-0100',
        email: 'admin@willowbrooksnf.com',
        licenseNumber: 'FL-SNF-12345',
        capacity: 100,
        currentCensus: 90
      }
    ];

    const insertedFacilities = await db.insert(facilities).values(facilitiesData).returning();

    // Create comprehensive healthcare staff for 100-bed facility
    const usersData = [
      // Facility Management
      {
        username: 'admin',
        email: 'admin@willowbrooksnf.com',
        password: '$2b$10$hashedpassword1',
        firstName: 'Jennifer',
        lastName: 'Martinez',
        role: UserRole.FACILITY_MANAGER,
        facilityId: insertedFacilities[0].id
      },
      // ICU Staff - Employees
      {
        username: 'sarah.johnson',
        email: 'sarah.johnson@willowbrooksnf.com',
        password: '$2b$10$hashedpassword2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@willowbrooksnf.com',
        password: '$2b$10$hashedpassword3',
        firstName: 'Michael',
        lastName: 'Chen',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id
      },
      // ICU Staff - Contractors
      {
        username: 'david.thompson',
        email: 'david.thompson@contractornurse.com',
        password: '$2b$10$hashedpassword4',
        firstName: 'David',
        lastName: 'Thompson',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[0].id
      },
      // Med-Surg Staff - Employees
      {
        username: 'emily.rodriguez',
        email: 'emily.rodriguez@willowbrooksnf.com',
        password: '$2b$10$hashedpassword5',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id
      },
      {
        username: 'robert.davis',
        email: 'robert.davis@willowbrooksnf.com',
        password: '$2b$10$hashedpassword6',
        firstName: 'Robert',
        lastName: 'Davis',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id
      },
      // Med-Surg Staff - Contractors
      {
        username: 'kevin.lee',
        email: 'kevin.lee@healthcaretemps.com',
        password: '$2b$10$hashedpassword7',
        firstName: 'Kevin',
        lastName: 'Lee',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[0].id
      },
      // Memory Care Staff - Employees
      {
        username: 'rachel.kim',
        email: 'rachel.kim@willowbrooksnf.com',
        password: '$2b$10$hashedpassword8',
        firstName: 'Rachel',
        lastName: 'Kim',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id
      },
      // Rehabilitation Staff - Employees
      {
        username: 'nicole.adams',
        email: 'nicole.adams@willowbrooksnf.com',
        password: '$2b$10$hashedpassword9',
        firstName: 'Nicole',
        lastName: 'Adams',
        role: UserRole.INTERNAL_EMPLOYEE,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'michael.chen',
        email: 'michael.chen@nexspace.com',
        password: '$2b$10$hashedpassword2',
        firstName: 'Michael',
        lastName: 'Chen',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[1].id,
        isActive: true
      },
      {
        username: 'emily.rodriguez',
        email: 'emily.rodriguez@nexspace.com',
        password: '$2b$10$hashedpassword3',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        role: UserRole.CONTRACTOR_1099,
        facilityId: insertedFacilities[2].id,
        isActive: true
      },
      {
        username: 'david.thompson',
        email: 'david.thompson@nexspace.com',
        password: '$2b$10$hashedpassword4',
        firstName: 'David',
        lastName: 'Thompson',
        role: UserRole.FACILITY_MANAGER,
        facilityId: insertedFacilities[0].id,
        isActive: true
      },
      {
        username: 'lisa.williams',
        email: 'lisa.williams@nexspace.com',
        password: '$2b$10$hashedpassword5',
        firstName: 'Lisa',
        lastName: 'Williams',
        role: UserRole.CLIENT_ADMINISTRATOR,
        facilityId: insertedFacilities[1].id,
        isActive: true
      }
    ];

    const insertedUsers = await db.insert(users).values(usersData).returning();

    // Create jobs
    const jobsData = [
      {
        title: 'Registered Nurse - Night Shift',
        description: 'Seeking experienced RN for overnight shifts in memory care unit',
        facilityId: insertedFacilities[0].id,
        position: 'Registered Nurse',
        department: 'Memory Care',
        shiftType: 'Night',
        hourlyRate: 45.00,
        requirements: 'Current RN license, 2+ years experience, CPR certification',
        isActive: true,
        postedById: insertedUsers[3].id
      },
      {
        title: 'Licensed Practical Nurse - Day Shift',
        description: 'LPN needed for day shift in assisted living facility',
        facilityId: insertedFacilities[1].id,
        position: 'Licensed Practical Nurse',
        department: 'Assisted Living',
        shiftType: 'Day',
        hourlyRate: 32.00,
        requirements: 'Current LPN license, medication administration certification',
        isActive: true,
        postedById: insertedUsers[4].id
      },
      {
        title: 'Certified Nursing Assistant',
        description: 'CNA position available for weekend shifts',
        facilityId: insertedFacilities[2].id,
        position: 'Certified Nursing Assistant',
        department: 'Long Term Care',
        shiftType: 'Weekend',
        hourlyRate: 22.00,
        requirements: 'Current CNA license, excellent communication skills',
        isActive: true,
        postedById: insertedUsers[3].id
      }
    ];

    const insertedJobs = await db.insert(jobs).values(jobsData).returning();

    // Create shifts
    const shiftsData = [
      {
        facilityId: insertedFacilities[0].id,
        position: 'Registered Nurse',
        department: 'ICU',
        startTime: new Date('2025-06-18T06:00:00Z'),
        endTime: new Date('2025-06-18T18:00:00Z'),
        requiredStaff: 2,
        hourlyRate: 48.00,
        notes: 'High acuity patients, ICU experience required'
      },
      {
        facilityId: insertedFacilities[1].id,
        position: 'Licensed Practical Nurse',
        department: 'Memory Care',
        startTime: new Date('2025-06-18T18:00:00Z'),
        endTime: new Date('2025-06-19T06:00:00Z'),
        requiredStaff: 1,
        hourlyRate: 35.00,
        notes: 'Memory care unit, dementia experience preferred'
      },
      {
        facilityId: insertedFacilities[2].id,
        position: 'Certified Nursing Assistant',
        department: 'Assisted Living',
        startTime: new Date('2025-06-19T14:00:00Z'),
        endTime: new Date('2025-06-19T22:00:00Z'),
        requiredStaff: 3,
        hourlyRate: 24.00,
        notes: 'Evening shift, medication pass assistance needed'
      }
    ];

    const insertedShifts = await db.insert(shifts).values(shiftsData).returning();

    // Create credentials
    const credentialsData = [
      {
        userId: insertedUsers[0].id,
        type: 'license',
        name: 'Registered Nurse License',
        issuingAuthority: 'Florida Board of Nursing',
        licenseNumber: 'RN-FL-123456',
        issueDate: new Date('2023-01-15'),
        expiryDate: new Date('2025-01-15'),
        status: 'verified',
        verifiedAt: new Date('2023-01-20'),
        verifierId: insertedUsers[3].id
      },
      {
        userId: insertedUsers[1].id,
        type: 'certification',
        name: 'CPR Certification',
        issuingAuthority: 'American Heart Association',
        licenseNumber: 'CPR-AHA-789012',
        issueDate: new Date('2024-03-10'),
        expiryDate: new Date('2026-03-10'),
        status: 'verified',
        verifiedAt: new Date('2024-03-15'),
        verifierId: insertedUsers[4].id
      },
      {
        userId: insertedUsers[2].id,
        type: 'license',
        name: 'CNA License',
        issuingAuthority: 'Florida Department of Health',
        licenseNumber: 'CNA-FL-345678',
        issueDate: new Date('2023-05-01'),
        expiryDate: new Date('2025-05-01'),
        status: 'pending',
        verifiedAt: null,
        verifierId: null
      }
    ];

    const insertedCredentials = await db.insert(credentials).values(credentialsData).returning();

    // Create messages
    const messagesData = [
      {
        senderId: insertedUsers[0].id,
        recipientId: insertedUsers[3].id,
        conversationId: 'conv-1',
        content: 'Hi David, I wanted to discuss the upcoming shift schedule for next week.',
        isRead: false
      },
      {
        senderId: insertedUsers[3].id,
        recipientId: insertedUsers[0].id,
        conversationId: 'conv-1',
        content: 'Of course Sarah! What specific concerns do you have about the schedule?',
        isRead: true
      },
      {
        senderId: insertedUsers[1].id,
        recipientId: insertedUsers[4].id,
        conversationId: 'conv-2',
        content: 'Lisa, I need to update my availability for the memory care unit.',
        isRead: false
      }
    ];

    const insertedMessages = await db.insert(messages).values(messagesData).returning();

    // Create invoices
    const invoicesData = [
      {
        contractorId: insertedUsers[1].id,
        facilityId: insertedFacilities[1].id,
        periodStart: new Date('2025-06-01'),
        periodEnd: new Date('2025-06-15'),
        hoursWorked: 72,
        hourlyRate: 32.00,
        totalAmount: 2304.00,
        status: 'pending',
        notes: 'Bi-weekly invoice for memory care shifts'
      },
      {
        contractorId: insertedUsers[2].id,
        facilityId: insertedFacilities[2].id,
        periodStart: new Date('2025-05-16'),
        periodEnd: new Date('2025-05-31'),
        hoursWorked: 88,
        hourlyRate: 22.00,
        totalAmount: 1936.00,
        status: 'approved',
        approvedById: insertedUsers[3].id,
        approvedAt: new Date('2025-06-02T10:00:00Z'),
        notes: 'End of month invoice, includes weekend differential'
      }
    ];

    const insertedInvoices = await db.insert(invoices).values(invoicesData).returning();

    // Create work logs
    const workLogsData = [
      {
        userId: insertedUsers[0].id,
        shiftId: insertedShifts[0].id,
        facilityId: insertedFacilities[0].id,
        clockIn: new Date('2025-06-17T06:00:00Z'),
        clockOut: new Date('2025-06-17T18:15:00Z'),
        totalHours: 12.25,
        notes: 'Covered extra 15 minutes for patient handoff',
        status: 'approved',
        reviewerId: insertedUsers[3].id,
        reviewedAt: new Date('2025-06-18T08:00:00Z')
      },
      {
        userId: insertedUsers[1].id,
        shiftId: insertedShifts[1].id,
        facilityId: insertedFacilities[1].id,
        clockIn: new Date('2025-06-17T18:00:00Z'),
        clockOut: new Date('2025-06-18T06:00:00Z'),
        totalHours: 12.0,
        notes: 'Night shift in memory care unit',
        status: 'pending',
        reviewerId: null,
        reviewedAt: null
      }
    ];

    const insertedWorkLogs = await db.insert(workLogs).values(workLogsData).returning();

    console.log('Database seeded successfully!');
    console.log(`Created ${insertedFacilities.length} facilities`);
    console.log(`Created ${insertedUsers.length} users`);
    console.log(`Created ${insertedJobs.length} jobs`);
    console.log(`Created ${insertedShifts.length} shifts`);
    console.log(`Created ${insertedCredentials.length} credentials`);
    console.log(`Created ${insertedMessages.length} messages`);
    console.log(`Created ${insertedInvoices.length} invoices`);
    console.log(`Created ${insertedWorkLogs.length} work logs`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}