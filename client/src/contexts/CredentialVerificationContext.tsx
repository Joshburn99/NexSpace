import React, { createContext, useContext, ReactNode } from 'react';

export interface VerifiedCredential {
  id: number;
  staffId: number;
  credentialType: string;
  licenseNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expirationDate: string;
  verificationStatus: 'verified' | 'pending' | 'expired' | 'rejected';
  verifiedBy: string;
  verifiedDate: string;
}

interface CredentialVerificationContextType {
  getVerifiedCredentials: (staffId: number) => VerifiedCredential[];
  hasVerifiedCredential: (staffId: number, credentialType: string) => boolean;
  getCredentialsByType: (credentialType: string) => VerifiedCredential[];
}

const CredentialVerificationContext = createContext<CredentialVerificationContextType | undefined>(undefined);

// Comprehensive verified credentials for workers
const verifiedCredentials: VerifiedCredential[] = [
  // Alice Smith (RN) - ICU
  {
    id: 1,
    staffId: 1,
    credentialType: 'Registered Nurse',
    licenseNumber: 'RN123456',
    issuingAuthority: 'Oregon State Board of Nursing',
    issueDate: '2020-01-15',
    expirationDate: '2026-01-15',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 2,
    staffId: 1,
    credentialType: 'BLS',
    licenseNumber: 'BLS789012',
    issuingAuthority: 'American Heart Association',
    issueDate: '2024-03-01',
    expirationDate: '2026-03-01',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 3,
    staffId: 1,
    credentialType: 'ACLS',
    licenseNumber: 'ACLS345678',
    issuingAuthority: 'American Heart Association',
    issueDate: '2024-01-15',
    expirationDate: '2026-01-15',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 4,
    staffId: 1,
    credentialType: 'Critical Care Experience',
    licenseNumber: 'ICU2024-001',
    issuingAuthority: 'Portland General Hospital',
    issueDate: '2020-06-01',
    expirationDate: '2025-12-31',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },

  // Bob Johnson (LPN) - Emergency
  {
    id: 5,
    staffId: 2,
    credentialType: 'Licensed Practical Nurse',
    licenseNumber: 'LPN654321',
    issuingAuthority: 'Oregon State Board of Nursing',
    issueDate: '2019-09-01',
    expirationDate: '2025-09-01',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 6,
    staffId: 2,
    credentialType: 'BLS',
    licenseNumber: 'BLS456789',
    issuingAuthority: 'American Heart Association',
    issueDate: '2024-02-01',
    expirationDate: '2026-02-01',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 7,
    staffId: 2,
    credentialType: 'Med/Surg Experience',
    licenseNumber: 'MS2023-002',
    issuingAuthority: 'Mercy Medical Center',
    issueDate: '2019-01-01',
    expirationDate: '2025-12-31',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },

  // Carol Lee (CNA) - Med/Surg
  {
    id: 8,
    staffId: 3,
    credentialType: 'Certified Nursing Assistant',
    licenseNumber: 'CNA987654',
    issuingAuthority: 'Oregon State Board of Nursing',
    issueDate: '2021-05-01',
    expirationDate: '2025-05-01',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 9,
    staffId: 3,
    credentialType: 'BLS',
    licenseNumber: 'BLS123789',
    issuingAuthority: 'American Heart Association',
    issueDate: '2024-01-01',
    expirationDate: '2026-01-01',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  },
  {
    id: 10,
    staffId: 3,
    credentialType: 'Patient Care Experience',
    licenseNumber: 'PC2023-003',
    issuingAuthority: 'St. Mary\'s Hospital',
    issueDate: '2021-01-01',
    expirationDate: '2025-12-31',
    verificationStatus: 'verified',
    verifiedBy: 'Sarah Johnson',
    verifiedDate: '2025-06-01'
  }
];

export const CredentialVerificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getVerifiedCredentials = (staffId: number): VerifiedCredential[] => {
    return verifiedCredentials.filter(cred => cred.staffId === staffId && cred.verificationStatus === 'verified');
  };

  const hasVerifiedCredential = (staffId: number, credentialType: string): boolean => {
    return verifiedCredentials.some(
      cred => cred.staffId === staffId && 
               cred.credentialType === credentialType && 
               cred.verificationStatus === 'verified'
    );
  };

  const getCredentialsByType = (credentialType: string): VerifiedCredential[] => {
    return verifiedCredentials.filter(
      cred => cred.credentialType === credentialType && cred.verificationStatus === 'verified'
    );
  };

  const value: CredentialVerificationContextType = {
    getVerifiedCredentials,
    hasVerifiedCredential,
    getCredentialsByType
  };

  return (
    <CredentialVerificationContext.Provider value={value}>
      {children}
    </CredentialVerificationContext.Provider>
  );
};

export const useCredentialVerification = (): CredentialVerificationContextType => {
  const context = useContext(CredentialVerificationContext);
  if (!context) {
    throw new Error('useCredentialVerification must be used within a CredentialVerificationProvider');
  }
  return context;
};