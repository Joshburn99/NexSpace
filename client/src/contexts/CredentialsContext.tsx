import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type CredentialStatus = "active" | "expiring_soon" | "expired" | "pending" | "suspended";
export type CredentialType = "nursing_license" | "cpr_certification" | "background_check" | "drug_screening" | "tb_test" | "physical_exam" | "training_certification" | "specialty_certification";

export interface Credential {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  credentialType: CredentialType;
  credentialName: string;
  issuingAuthority: string;
  licenseNumber: string;
  issueDate: string;
  expirationDate: string;
  status: CredentialStatus;
  documentUrl?: string;
  notes?: string;
  reminderSent?: boolean;
  renewalInProgress?: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
}

export interface CredentialAlert {
  id: number;
  credentialId: number;
  userId: number;
  userName: string;
  credentialType: CredentialType;
  alertType: "expiring" | "expired" | "missing" | "renewal_required";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  daysUntilExpiration?: number;
  actionRequired: boolean;
  createdAt: string;
}

interface CredentialsContextType {
  credentials: Credential[];
  alerts: CredentialAlert[];
  isLoading: boolean;
  getActiveCredentials: () => Credential[];
  getExpiringCredentials: (days?: number) => Credential[];
  getExpiredCredentials: () => Credential[];
  getUserCredentials: (userId: number) => Credential[];
  getCredentialsByType: (type: CredentialType) => Credential[];
  getComplianceRate: () => number;
  addCredential: (credential: Omit<Credential, "id">) => void;
  updateCredential: (id: number, updates: Partial<Credential>) => void;
  deleteCredential: (id: number) => void;
}

const CredentialsContext = createContext<CredentialsContextType | null>(null);

// Sample credentials data for 100-bed facility staff
const sampleCredentials: Credential[] = [
  // Active nursing licenses
  {
    id: 1,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    credentialType: "nursing_license",
    credentialName: "Registered Nurse License",
    issuingAuthority: "Oregon State Board of Nursing",
    licenseNumber: "RN-123456",
    issueDate: "2023-01-15",
    expirationDate: "2025-01-15",
    status: "active",
    documentUrl: "/documents/rn-license-sarah.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-12-01"
  },
  {
    id: 2,
    userId: 2,
    userName: "Michael Chen",
    userRole: "CNA",
    credentialType: "nursing_license",
    credentialName: "Certified Nursing Assistant License",
    issuingAuthority: "Oregon Health Authority",
    licenseNumber: "CNA-789012",
    issueDate: "2024-03-01",
    expirationDate: "2026-03-01",
    status: "active",
    documentUrl: "/documents/cna-license-michael.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-11-15"
  },
  {
    id: 3,
    userId: 3,
    userName: "Emily Rodriguez",
    userRole: "LPN",
    credentialType: "nursing_license",
    credentialName: "Licensed Practical Nurse License",
    issuingAuthority: "Oregon State Board of Nursing",
    licenseNumber: "LPN-345678",
    issueDate: "2023-06-01",
    expirationDate: "2025-06-01",
    status: "active",
    documentUrl: "/documents/lpn-license-emily.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-10-20"
  },
  
  // CPR Certifications
  {
    id: 4,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    credentialType: "cpr_certification",
    credentialName: "BLS for Healthcare Providers",
    issuingAuthority: "American Heart Association",
    licenseNumber: "BLS-2024-001",
    issueDate: "2024-02-15",
    expirationDate: "2025-02-15",
    status: "active",
    documentUrl: "/documents/bls-sarah.pdf",
    verifiedBy: "Training Coordinator",
    verifiedDate: "2024-02-16"
  },
  {
    id: 5,
    userId: 4,
    userName: "David Thompson",
    userRole: "PT",
    credentialType: "cpr_certification",
    credentialName: "Basic Life Support",
    issuingAuthority: "American Red Cross",
    licenseNumber: "ARC-BLS-2023-456",
    issueDate: "2023-08-10",
    expirationDate: "2025-08-10",
    status: "active",
    documentUrl: "/documents/bls-david.pdf",
    verifiedBy: "Training Coordinator",
    verifiedDate: "2023-08-11"
  },

  // Expiring credentials
  {
    id: 6,
    userId: 6,
    userName: "Robert Kim",
    userRole: "RN",
    credentialType: "nursing_license",
    credentialName: "Registered Nurse License",
    issuingAuthority: "Oregon State Board of Nursing",
    licenseNumber: "RN-654321",
    issueDate: "2023-07-01",
    expirationDate: "2025-07-15",
    status: "expiring_soon",
    documentUrl: "/documents/rn-license-robert.pdf",
    reminderSent: true,
    renewalInProgress: true,
    notes: "Renewal application submitted",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-06-01"
  },
  {
    id: 7,
    userId: 7,
    userName: "Amanda Foster",
    userRole: "CNA",
    credentialType: "cpr_certification",
    credentialName: "CPR/AED Certification",
    issuingAuthority: "American Heart Association",
    licenseNumber: "AHA-CPR-2023-789",
    issueDate: "2023-06-20",
    expirationDate: "2025-06-20",
    status: "expiring_soon",
    documentUrl: "/documents/cpr-amanda.pdf",
    reminderSent: true,
    notes: "Renewal class scheduled for next week",
    verifiedBy: "Training Coordinator",
    verifiedDate: "2023-06-21"
  },

  // Expired credentials
  {
    id: 8,
    userId: 8,
    userName: "Jennifer Liu",
    userRole: "CNA",
    credentialType: "tb_test",
    credentialName: "Tuberculosis Screening",
    issuingAuthority: "Portland Health Department",
    licenseNumber: "TB-2023-101",
    issueDate: "2023-05-01",
    expirationDate: "2024-05-01",
    status: "expired",
    documentUrl: "/documents/tb-test-jennifer.pdf",
    notes: "Follow-up required immediately",
    verifiedBy: "Occupational Health",
    verifiedDate: "2023-05-02"
  },
  {
    id: 9,
    userId: 9,
    userName: "Kevin Brown",
    userRole: "Maintenance",
    credentialType: "background_check",
    credentialName: "Criminal Background Check",
    issuingAuthority: "Oregon State Police",
    licenseNumber: "BGC-2022-567",
    issueDate: "2022-12-01",
    expirationDate: "2024-12-01",
    status: "expired",
    documentUrl: "/documents/background-kevin.pdf",
    notes: "Renewal in progress",
    renewalInProgress: true,
    verifiedBy: "HR Manager",
    verifiedDate: "2022-12-02"
  },

  // Specialty certifications
  {
    id: 10,
    userId: 5,
    userName: "Lisa Wang",
    userRole: "OT",
    credentialType: "specialty_certification",
    credentialName: "Occupational Therapy License",
    issuingAuthority: "Oregon Board of Occupational Therapy",
    licenseNumber: "OT-2024-123",
    issueDate: "2024-01-01",
    expirationDate: "2026-01-01",
    status: "active",
    documentUrl: "/documents/ot-license-lisa.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-01-05"
  },
  {
    id: 11,
    userId: 10,
    userName: "Mark Davis",
    userRole: "Social Worker",
    credentialType: "specialty_certification",
    credentialName: "Licensed Clinical Social Worker",
    issuingAuthority: "Oregon Board of Licensed Social Workers",
    licenseNumber: "LCSW-2023-456",
    issueDate: "2023-09-01",
    expirationDate: "2025-09-01",
    status: "active",
    documentUrl: "/documents/lcsw-mark.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2023-09-05"
  },

  // Physical exams and drug screenings
  {
    id: 12,
    userId: 1,
    userName: "Sarah Johnson",
    userRole: "RN",
    credentialType: "physical_exam",
    credentialName: "Annual Physical Examination",
    issuingAuthority: "Sunrise Medical Center",
    licenseNumber: "PE-2024-001",
    issueDate: "2024-01-10",
    expirationDate: "2025-01-10",
    status: "active",
    documentUrl: "/documents/physical-sarah.pdf",
    verifiedBy: "Occupational Health",
    verifiedDate: "2024-01-11"
  },
  {
    id: 13,
    userId: 2,
    userName: "Michael Chen",
    userRole: "CNA",
    credentialType: "drug_screening",
    credentialName: "Pre-Employment Drug Test",
    issuingAuthority: "LabCorp",
    licenseNumber: "DS-2024-002",
    issueDate: "2024-02-15",
    expirationDate: "2025-02-15",
    status: "active",
    documentUrl: "/documents/drug-test-michael.pdf",
    verifiedBy: "HR Manager",
    verifiedDate: "2024-02-16"
  },

  // Training certifications
  {
    id: 14,
    userId: 3,
    userName: "Emily Rodriguez",
    userRole: "LPN",
    credentialType: "training_certification",
    credentialName: "Dementia Care Training",
    issuingAuthority: "Alzheimer's Association",
    licenseNumber: "DCT-2024-003",
    issueDate: "2024-03-01",
    expirationDate: "2026-03-01",
    status: "active",
    documentUrl: "/documents/dementia-training-emily.pdf",
    verifiedBy: "Training Coordinator",
    verifiedDate: "2024-03-02"
  },
  {
    id: 15,
    userId: 4,
    userName: "David Thompson",
    userRole: "PT",
    credentialType: "training_certification",
    credentialName: "Fall Prevention Certification",
    issuingAuthority: "National Safety Council",
    licenseNumber: "FPC-2024-004",
    issueDate: "2024-04-01",
    expirationDate: "2026-04-01",
    status: "active",
    documentUrl: "/documents/fall-prevention-david.pdf",
    verifiedBy: "Training Coordinator",
    verifiedDate: "2024-04-02"
  }
];

// Generate credential alerts
const generateAlerts = (credentials: Credential[]): CredentialAlert[] => {
  const alerts: CredentialAlert[] = [];
  const today = new Date();

  credentials.forEach(credential => {
    const expirationDate = new Date(credential.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (credential.status === "expired") {
      alerts.push({
        id: alerts.length + 1,
        credentialId: credential.id,
        userId: credential.userId,
        userName: credential.userName,
        credentialType: credential.credentialType,
        alertType: "expired",
        message: `${credential.credentialName} has expired`,
        severity: "critical",
        daysUntilExpiration,
        actionRequired: true,
        createdAt: new Date().toISOString()
      });
    } else if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      alerts.push({
        id: alerts.length + 1,
        credentialId: credential.id,
        userId: credential.userId,
        userName: credential.userName,
        credentialType: credential.credentialType,
        alertType: "expiring",
        message: `${credential.credentialName} expires in ${daysUntilExpiration} days`,
        severity: daysUntilExpiration <= 7 ? "high" : daysUntilExpiration <= 14 ? "medium" : "low",
        daysUntilExpiration,
        actionRequired: daysUntilExpiration <= 14,
        createdAt: new Date().toISOString()
      });
    }
  });

  return alerts;
};

export const CredentialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<Credential[]>(sampleCredentials);
  const [alerts, setAlerts] = useState<CredentialAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAlerts(generateAlerts(credentials));
  }, [credentials]);

  const getActiveCredentials = (): Credential[] => {
    return credentials.filter(cred => cred.status === "active");
  };

  const getExpiringCredentials = (days: number = 30): Credential[] => {
    const today = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() + days);

    return credentials.filter(cred => {
      const expirationDate = new Date(cred.expirationDate);
      return expirationDate <= cutoffDate && expirationDate > today && cred.status !== "expired";
    });
  };

  const getExpiredCredentials = (): Credential[] => {
    return credentials.filter(cred => cred.status === "expired");
  };

  const getUserCredentials = (userId: number): Credential[] => {
    return credentials.filter(cred => cred.userId === userId);
  };

  const getCredentialsByType = (type: CredentialType): Credential[] => {
    return credentials.filter(cred => cred.credentialType === type);
  };

  const getComplianceRate = (): number => {
    const totalCredentials = credentials.length;
    const activeCredentials = credentials.filter(cred => cred.status === "active").length;
    return totalCredentials > 0 ? (activeCredentials / totalCredentials) * 100 : 0;
  };

  const addCredential = (credential: Omit<Credential, "id">) => {
    const newCredential: Credential = {
      ...credential,
      id: Math.max(...credentials.map(c => c.id), 0) + 1
    };
    setCredentials(prev => [...prev, newCredential]);
  };

  const updateCredential = (id: number, updates: Partial<Credential>) => {
    setCredentials(prev => 
      prev.map(cred => 
        cred.id === id ? { ...cred, ...updates } : cred
      )
    );
  };

  const deleteCredential = (id: number) => {
    setCredentials(prev => prev.filter(cred => cred.id !== id));
  };

  const value: CredentialsContextType = {
    credentials,
    alerts,
    isLoading,
    getActiveCredentials,
    getExpiringCredentials,
    getExpiredCredentials,
    getUserCredentials,
    getCredentialsByType,
    getComplianceRate,
    addCredential,
    updateCredential,
    deleteCredential
  };

  return (
    <CredentialsContext.Provider value={value}>
      {children}
    </CredentialsContext.Provider>
  );
};

export const useCredentials = (): CredentialsContextType => {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  return context;
};