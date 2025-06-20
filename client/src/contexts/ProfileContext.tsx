import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface UserProfile {
  userId: number;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  professional: {
    title: string;
    department: string;
    specialties: string[];
    skills: string[];
    certifications: string[];
    experience: number; // years
    availability: {
      preferredShifts: string[];
      maxHoursPerWeek: number;
      blackoutDates: string[];
    };
  };
  resume: {
    summary: string;
    education: {
      institution: string;
      degree: string;
      year: number;
    }[];
    workHistory: {
      employer: string;
      position: string;
      startDate: string;
      endDate?: string;
      description: string;
    }[];
    references: {
      name: string;
      title: string;
      organization: string;
      phone: string;
      email: string;
    }[];
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
  };
  documents: {
    id: string;
    name: string;
    type: 'resume' | 'certification' | 'license' | 'reference';
    url: string;
    uploadedAt: string;
    expiresAt?: string;
  }[];
  updatedAt: string;
}

const sampleProfile: UserProfile = {
  userId: 3,
  personalInfo: {
    firstName: 'Josh',
    lastName: 'Burnett',
    email: 'joshburn99@icloud.com',
    phone: '555-0123',
    address: {
      street: '123 Healthcare Dr',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201'
    },
    emergencyContact: {
      name: 'Sarah Burnett',
      relationship: 'Spouse',
      phone: '555-0124'
    }
  },
  professional: {
    title: 'Registered Nurse',
    department: 'ICU',
    specialties: ['Critical Care', 'Emergency Medicine'],
    skills: ['Patient Assessment', 'Medication Administration', 'Life Support', 'Documentation'],
    certifications: ['RN License', 'BLS', 'ACLS', 'PALS'],
    experience: 5,
    availability: {
      preferredShifts: ['Night', 'Weekend'],
      maxHoursPerWeek: 40,
      blackoutDates: []
    }
  },
  resume: {
    summary: 'Experienced ICU nurse with 5 years of critical care experience. Skilled in emergency response, patient advocacy, and interdisciplinary collaboration.',
    education: [
      {
        institution: 'Oregon Health & Science University',
        degree: 'Bachelor of Science in Nursing',
        year: 2019
      }
    ],
    workHistory: [
      {
        employer: 'Portland General Hospital',
        position: 'ICU Staff Nurse',
        startDate: '2020-06-01',
        description: 'Provide comprehensive nursing care for critically ill patients in a 24-bed ICU. Collaborate with multidisciplinary teams to ensure optimal patient outcomes.'
      }
    ],
    references: [
      {
        name: 'Dr. Maria Rodriguez',
        title: 'ICU Medical Director',
        organization: 'Portland General Hospital',
        phone: '555-0130',
        email: 'mrodriguez@pgh.org'
      }
    ]
  },
  preferences: {
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    language: 'en',
    timezone: 'America/Los_Angeles',
    theme: 'light'
  },
  documents: [
    {
      id: 'doc-1',
      name: 'Current Resume.pdf',
      type: 'resume',
      url: '/uploads/resume_josh_burnett.pdf',
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'doc-2',
      name: 'RN License.pdf',
      type: 'license',
      url: '/uploads/rn_license_josh_burnett.pdf',
      uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  updatedAt: new Date().toISOString()
};

interface ProfileContextType {
  profile: UserProfile | null;
  updatePersonalInfo: (info: Partial<UserProfile['personalInfo']>) => void;
  updateProfessionalInfo: (info: Partial<UserProfile['professional']>) => void;
  updateResume: (resume: Partial<UserProfile['resume']>) => void;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => void;
  uploadDocument: (file: File, type: UserProfile['documents'][0]['type']) => void;
  removeDocument: (documentId: string) => void;
  getExpiringDocuments: (daysAhead?: number) => UserProfile['documents'];
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(
    user?.id === 3 ? sampleProfile : null
  );
  const [isLoading, setIsLoading] = useState(false);

  const updatePersonalInfo = (info: Partial<UserProfile['personalInfo']>) => {
    setProfile(prev => prev ? {
      ...prev,
      personalInfo: { ...prev.personalInfo, ...info },
      updatedAt: new Date().toISOString()
    } : null);
  };

  const updateProfessionalInfo = (info: Partial<UserProfile['professional']>) => {
    setProfile(prev => prev ? {
      ...prev,
      professional: { ...prev.professional, ...info },
      updatedAt: new Date().toISOString()
    } : null);
  };

  const updateResume = (resume: Partial<UserProfile['resume']>) => {
    setProfile(prev => prev ? {
      ...prev,
      resume: { ...prev.resume, ...resume },
      updatedAt: new Date().toISOString()
    } : null);
  };

  const updatePreferences = (prefs: Partial<UserProfile['preferences']>) => {
    setProfile(prev => prev ? {
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
      updatedAt: new Date().toISOString()
    } : null);
  };

  const uploadDocument = (file: File, type: UserProfile['documents'][0]['type']) => {
    const newDocument = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString()
    };

    setProfile(prev => prev ? {
      ...prev,
      documents: [...prev.documents, newDocument],
      updatedAt: new Date().toISOString()
    } : null);
  };

  const removeDocument = (documentId: string) => {
    setProfile(prev => prev ? {
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId),
      updatedAt: new Date().toISOString()
    } : null);
  };

  const getExpiringDocuments = (daysAhead: number = 30): UserProfile['documents'] => {
    if (!profile) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return profile.documents.filter(doc => 
      doc.expiresAt && new Date(doc.expiresAt) <= cutoffDate
    );
  };

  const value: ProfileContextType = {
    profile,
    updatePersonalInfo,
    updateProfessionalInfo,
    updateResume,
    updatePreferences,
    uploadDocument,
    removeDocument,
    getExpiringDocuments,
    isLoading
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};