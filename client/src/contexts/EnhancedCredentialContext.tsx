import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface CredentialDocument {
  id: string;
  userId: number;
  name: string;
  type: 'license' | 'certification' | 'training' | 'education' | 'other';
  authority: string;
  documentNumber?: string;
  issuedDate: string;
  expirationDate?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'ai_review';
  aiClassification?: {
    confidence: number;
    suggestedType: string;
    extractedData: {
      documentNumber?: string;
      issuedDate?: string;
      expirationDate?: string;
      authority?: string;
    };
    needsHumanReview: boolean;
    reviewReason?: string;
  };
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: number;
  notes?: string;
}

export interface CredentialAlert {
  id: string;
  userId: number;
  credentialId: string;
  type: 'expiring' | 'expired' | 'renewal_required' | 'verification_needed';
  message: string;
  daysUntilExpiration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  createdAt: string;
}

const sampleCredentials: CredentialDocument[] = [
  {
    id: 'cred-1',
    userId: 3,
    name: 'Registered Nurse License',
    type: 'license',
    authority: 'Oregon Board of Nursing',
    documentNumber: 'RN123456',
    issuedDate: '2020-05-15',
    expirationDate: '2026-05-15',
    fileUrl: '/uploads/rn_license_josh.pdf',
    fileName: 'RN_License_Josh_Burnett.pdf',
    fileSize: 2048576,
    mimeType: 'application/pdf',
    status: 'verified',
    uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedBy: 4
  },
  {
    id: 'cred-2',
    userId: 3,
    name: 'BLS Certification',
    type: 'certification',
    authority: 'American Heart Association',
    documentNumber: 'BLS789012',
    issuedDate: '2024-03-10',
    expirationDate: '2026-03-10',
    fileUrl: '/uploads/bls_cert_josh.pdf',
    fileName: 'BLS_Certification.pdf',
    fileSize: 1024768,
    mimeType: 'application/pdf',
    status: 'verified',
    uploadedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedBy: 4
  },
  {
    id: 'cred-3',
    userId: 3,
    name: 'ACLS Certificate',
    type: 'certification',
    authority: 'American Heart Association',
    issuedDate: '2024-01-15',
    expirationDate: '2025-01-15',
    fileUrl: '/uploads/acls_cert_josh.pdf',
    fileName: 'ACLS_Certificate_Scan.pdf',
    fileSize: 1536000,
    mimeType: 'application/pdf',
    status: 'ai_review',
    aiClassification: {
      confidence: 0.75,
      suggestedType: 'certification',
      extractedData: {
        authority: 'American Heart Association',
        issuedDate: '2024-01-15',
        expirationDate: '2025-01-15'
      },
      needsHumanReview: true,
      reviewReason: 'Document quality is low, expiration date needs verification'
    },
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const sampleAlerts: CredentialAlert[] = [
  {
    id: 'alert-1',
    userId: 3,
    credentialId: 'cred-3',
    type: 'expiring',
    message: 'Your ACLS certification expires in 30 days',
    daysUntilExpiration: 30,
    severity: 'medium',
    acknowledged: false,
    createdAt: new Date().toISOString()
  }
];

interface EnhancedCredentialContextType {
  credentials: CredentialDocument[];
  alerts: CredentialAlert[];
  userCredentials: CredentialDocument[];
  userAlerts: CredentialAlert[];
  uploadCredential: (file: File, type?: string) => Promise<string>;
  updateCredential: (id: string, updates: Partial<CredentialDocument>) => void;
  deleteCredential: (id: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  getExpiringCredentials: (daysAhead?: number) => CredentialDocument[];
  getCredentialsByType: (type: string) => CredentialDocument[];
  validateCredentialWithAI: (file: File) => Promise<CredentialDocument['aiClassification']>;
  isLoading: boolean;
}

const EnhancedCredentialContext = createContext<EnhancedCredentialContextType | null>(null);

export const EnhancedCredentialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<CredentialDocument[]>(sampleCredentials);
  const [alerts, setAlerts] = useState<CredentialAlert[]>(sampleAlerts);
  const [isLoading, setIsLoading] = useState(false);

  const userCredentials = credentials.filter(cred => cred.userId === user?.id);
  const userAlerts = alerts.filter(alert => alert.userId === user?.id);

  const validateCredentialWithAI = async (file: File): Promise<CredentialDocument['aiClassification']> => {
    // Simulate AI validation - in real implementation, this would call OpenAI API
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    
    const fileName = file.name.toLowerCase();
    let suggestedType = 'other';
    let confidence = 0.5;
    let needsHumanReview = true;
    let reviewReason = 'Unable to classify document type with high confidence';

    // Simple classification based on filename
    if (fileName.includes('license') || fileName.includes('rn') || fileName.includes('lpn')) {
      suggestedType = 'license';
      confidence = 0.9;
      needsHumanReview = false;
    } else if (fileName.includes('cert') || fileName.includes('bls') || fileName.includes('acls')) {
      suggestedType = 'certification';
      confidence = 0.85;
      needsHumanReview = false;
    } else if (fileName.includes('training') || fileName.includes('course')) {
      suggestedType = 'training';
      confidence = 0.8;
      needsHumanReview = false;
    }

    setIsLoading(false);

    return {
      confidence,
      suggestedType,
      extractedData: {
        // In real implementation, this would be extracted by AI
        authority: confidence > 0.8 ? 'Detected Authority' : undefined,
        issuedDate: confidence > 0.8 ? new Date().toISOString().split('T')[0] : undefined,
        expirationDate: confidence > 0.8 ? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
      },
      needsHumanReview,
      reviewReason: needsHumanReview ? reviewReason : undefined
    };
  };

  const uploadCredential = async (file: File, type?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const aiClassification = await validateCredentialWithAI(file);
    
    const newCredential: CredentialDocument = {
      id: `cred-${Date.now()}`,
      userId: user.id,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      type: (type || aiClassification.suggestedType) as CredentialDocument['type'],
      authority: aiClassification.extractedData.authority || '',
      issuedDate: aiClassification.extractedData.issuedDate || '',
      expirationDate: aiClassification.extractedData.expirationDate,
      fileUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: aiClassification.needsHumanReview ? 'ai_review' : 'pending',
      aiClassification,
      uploadedAt: new Date().toISOString()
    };

    setCredentials(prev => [newCredential, ...prev]);

    // Create alert if needs human review
    if (aiClassification.needsHumanReview) {
      const newAlert: CredentialAlert = {
        id: `alert-${Date.now()}`,
        userId: user.id,
        credentialId: newCredential.id,
        type: 'verification_needed',
        message: `Document "${file.name}" needs manual review: ${aiClassification.reviewReason}`,
        severity: 'medium',
        acknowledged: false,
        createdAt: new Date().toISOString()
      };
      setAlerts(prev => [newAlert, ...prev]);
    }

    return newCredential.id;
  };

  const updateCredential = (id: string, updates: Partial<CredentialDocument>) => {
    setCredentials(prev => prev.map(cred =>
      cred.id === id ? { ...cred, ...updates } : cred
    ));
  };

  const deleteCredential = (id: string) => {
    setCredentials(prev => prev.filter(cred => cred.id !== id));
    setAlerts(prev => prev.filter(alert => alert.credentialId !== id));
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const getExpiringCredentials = (daysAhead: number = 60): CredentialDocument[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return userCredentials.filter(cred =>
      cred.expirationDate && new Date(cred.expirationDate) <= cutoffDate
    );
  };

  const getCredentialsByType = (type: string): CredentialDocument[] => {
    return userCredentials.filter(cred => cred.type === type);
  };

  const value: EnhancedCredentialContextType = {
    credentials,
    alerts,
    userCredentials,
    userAlerts,
    uploadCredential,
    updateCredential,
    deleteCredential,
    acknowledgeAlert,
    getExpiringCredentials,
    getCredentialsByType,
    validateCredentialWithAI,
    isLoading
  };

  return (
    <EnhancedCredentialContext.Provider value={value}>
      {children}
    </EnhancedCredentialContext.Provider>
  );
};

export const useEnhancedCredentials = (): EnhancedCredentialContextType => {
  const context = useContext(EnhancedCredentialContext);
  if (!context) {
    throw new Error('useEnhancedCredentials must be used within an EnhancedCredentialProvider');
  }
  return context;
};