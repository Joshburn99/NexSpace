import { db } from "./db";
import { staff } from "@shared/schema";

export async function createEnhancedStaffProfiles() {
  // Create comprehensive staff database with all specialties from current schedule
  const enhancedStaff = [
    // Registered Nurses (RN) - ICU, Emergency, Medical-Surgical, etc.
    {
      firstName: "Sarah",
      lastName: "Johnson", 
      username: "sarah.johnson",
      email: "sarah.johnson@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Michael",
      lastName: "Chen",
      username: "michael.chen", 
      email: "michael.chen@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Jessica",
      lastName: "Rodriguez",
      username: "jessica.rodriguez",
      email: "jessica.rodriguez@nexspace.com", 
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1594824375302-179c7a1c8c60?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "David",
      lastName: "Kim",
      username: "david.kim",
      email: "david.kim@nexspace.com",
      password: "hashed_password", 
      role: "contractor_1099",
      facilityId: 1,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Amanda",
      lastName: "Williams",
      username: "amanda.williams",
      email: "amanda.williams@nexspace.com",
      password: "hashed_password",
      role: "internal_employee", 
      facilityId: 1,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Robert",
      lastName: "Garcia",
      username: "robert.garcia",
      email: "robert.garcia@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 1, 
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Lisa",
      lastName: "Thompson",
      username: "lisa.thompson",
      email: "lisa.thompson@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 2,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "James",
      lastName: "Anderson",
      username: "james.anderson", 
      email: "james.anderson@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 2,
      isActive: true,
      specialty: "RN",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face"
    },
    // Licensed Practical Nurses (LPN)
    {
      firstName: "Maria",
      lastName: "Lopez",
      username: "maria.lopez",
      email: "maria.lopez@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "LPN",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Christopher",
      lastName: "Davis",
      username: "christopher.davis",
      email: "christopher.davis@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 1,
      isActive: true,
      specialty: "LPN", 
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Rachel",
      lastName: "Brown",
      username: "rachel.brown",
      email: "rachel.brown@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 2,
      isActive: true,
      specialty: "LPN",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Kevin",
      lastName: "Wilson", 
      username: "kevin.wilson",
      email: "kevin.wilson@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 3,
      isActive: true,
      specialty: "LPN",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"
    },
    // Certified Surgical Technologists (CST)
    {
      firstName: "Jennifer",
      lastName: "Kim",
      username: "jennifer.kim",
      email: "jennifer.kim@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 1,
      isActive: true,
      specialty: "CST",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Brian",
      lastName: "Martinez",
      username: "brian.martinez",
      email: "brian.martinez@nexspace.com", 
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "CST",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Nicole",
      lastName: "Taylor",
      username: "nicole.taylor",
      email: "nicole.taylor@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 2,
      isActive: true,
      specialty: "CST",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    // Respiratory Therapists (RT)
    {
      firstName: "Daniel",
      lastName: "White",
      username: "daniel.white",
      email: "daniel.white@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "RT",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Emily",
      lastName: "Jackson",
      username: "emily.jackson",
      email: "emily.jackson@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 2,
      isActive: true,
      specialty: "RT",
      avatar: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=150&h=150&fit=crop&crop=face"
    },
    // Physical Therapists (PT)
    {
      firstName: "Mark",
      lastName: "Johnson",
      username: "mark.johnson",
      email: "mark.johnson@nexspace.com", 
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 2,
      isActive: true,
      specialty: "PT",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Stephanie",
      lastName: "Moore",
      username: "stephanie.moore",
      email: "stephanie.moore@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 3,
      isActive: true,
      specialty: "PT",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    // Occupational Therapists (OT)
    {
      firstName: "Thomas",
      lastName: "Clark",
      username: "thomas.clark",
      email: "thomas.clark@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 2,
      isActive: true,
      specialty: "OT",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Ashley",
      lastName: "Lewis",
      username: "ashley.lewis",
      email: "ashley.lewis@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 3,
      isActive: true,
      specialty: "OT",
      avatar: "https://images.unsplash.com/photo-1594824375302-179c7a1c8c60?w=150&h=150&fit=crop&crop=face"
    },
    // Pharmacy Technicians
    {
      firstName: "Matthew",
      lastName: "Walker", 
      username: "matthew.walker",
      email: "matthew.walker@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "PharmTech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Samantha",
      lastName: "Hall",
      username: "samantha.hall",
      email: "samantha.hall@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 2,
      isActive: true,
      specialty: "PharmTech",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    },
    // Laboratory Technologists
    {
      firstName: "Andrew",
      lastName: "Young",
      username: "andrew.young",
      email: "andrew.young@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "LabTech",
      avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Michelle",
      lastName: "Green",
      username: "michelle.green",
      email: "michelle.green@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 3,
      isActive: true,
      specialty: "LabTech",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    // Radiology Technologists
    {
      firstName: "Jonathan",
      lastName: "Adams",
      username: "jonathan.adams",
      email: "jonathan.adams@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "RadTech",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Laura",
      lastName: "Baker",
      username: "laura.baker",
      email: "laura.baker@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 2,
      isActive: true,
      specialty: "RadTech",
      avatar: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=150&h=150&fit=crop&crop=face"
    },
    // Certified Nursing Assistants (CNA)
    {
      firstName: "Steven",
      lastName: "Nelson",
      username: "steven.nelson",
      email: "steven.nelson@nexspace.com",
      password: "hashed_password",
      role: "internal_employee",
      facilityId: 1,
      isActive: true,
      specialty: "CNA",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      firstName: "Rebecca",
      lastName: "Carter",
      username: "rebecca.carter",
      email: "rebecca.carter@nexspace.com",
      password: "hashed_password",
      role: "contractor_1099",
      facilityId: 3,
      isActive: true,
      specialty: "CNA",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  // Insert staff members into database
  try {
    console.log('Creating enhanced staff profiles...');
    
    for (const staffMember of enhancedStaff) {
      // Map internal_employee to full_time, contractor_1099 to contract
      const employmentType = staffMember.role === "internal_employee" ? "full_time" : 
                            staffMember.role === "contractor_1099" ? "contract" : "full_time";
      
      await db.insert(staff).values({
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        email: staffMember.email,
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        specialty: staffMember.specialty,
        department: staffMember.specialty === "RN" ? "Nursing" : 
                   staffMember.specialty === "LPN" ? "Nursing" : 
                   staffMember.specialty === "CNA" ? "Nursing" :
                   staffMember.specialty === "CST" ? "Surgery" :
                   staffMember.specialty === "PharmTech" ? "Pharmacy" :
                   staffMember.specialty === "LabTech" ? "Laboratory" :
                   staffMember.specialty === "RadTech" ? "Radiology" : "General",
        employmentType: employmentType,
        isActive: staffMember.isActive,
        profilePhoto: staffMember.avatar,
        bio: `Experienced ${staffMember.specialty} with expertise in patient care.`,
        location: "Portland, OR",
        hourlyRate: staffMember.specialty === "RN" ? "48.00" : 
                   staffMember.specialty === "LPN" ? "35.00" : 
                   staffMember.specialty === "CNA" ? "28.00" : "42.00",
        associatedFacilities: JSON.stringify([staffMember.facilityId]),
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
    }
    
    console.log(`Successfully created ${enhancedStaff.length} staff profiles`);
  } catch (error) {
    console.error('Error creating staff profiles:', error);
  }
}