import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface JobPosting {
  id: string;
  facilityId: number;
  facilityName: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  qualifications: string[];
  shift: 'Day' | 'Evening' | 'Night' | 'Rotating';
  duration: string;
  payRate: {
    min: number;
    max: number;
    currency: 'USD';
    period: 'hour' | 'shift' | 'day';
  };
  benefits: string[];
  startDate: string;
  endDate?: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'filled' | 'cancelled';
  applicationsCount: number;
  postedBy: number;
  postedAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: number;
  applicantName: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';
  appliedAt: string;
  coverLetter?: string;
  resumeUrl?: string;
  availableStartDate: string;
  notes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
}

const sampleJobs: JobPosting[] = [
  {
    id: 'job-1',
    facilityId: 1,
    facilityName: 'Portland General Hospital',
    title: 'ICU Registered Nurse - Night Shift',
    department: 'Intensive Care Unit',
    description: 'Seeking experienced ICU nurse for night shift coverage. Responsible for providing comprehensive nursing care to critically ill patients.',
    requirements: ['Active RN License', 'ICU Experience', 'BLS Certification', 'ACLS Certification'],
    qualifications: ['BSN preferred', '2+ years ICU experience', 'Critical care certification'],
    shift: 'Night',
    duration: '12 hours',
    payRate: {
      min: 45,
      max: 55,
      currency: 'USD',
      period: 'hour'
    },
    benefits: ['Health Insurance', 'Dental', 'Vision', '401k Match', 'PTO'],
    startDate: '2025-07-01',
    urgency: 'high',
    status: 'open',
    applicationsCount: 12,
    postedBy: 4,
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'job-2',
    facilityId: 2,
    facilityName: 'Mercy Medical Center',
    title: 'Emergency Department Nurse',
    department: 'Emergency Department',
    description: 'Dynamic ED environment seeking experienced nurses for immediate coverage. Fast-paced setting with diverse patient population.',
    requirements: ['RN License', 'ED Experience Preferred', 'BLS', 'ACLS'],
    qualifications: ['1+ years ED experience', 'Triage certification', 'Trauma experience'],
    shift: 'Day',
    duration: '12 hours',
    payRate: {
      min: 42,
      max: 52,
      currency: 'USD',
      period: 'hour'
    },
    benefits: ['Health Insurance', 'Retirement Plan', 'Continuing Education'],
    startDate: '2025-06-25',
    urgency: 'medium',
    status: 'open',
    applicationsCount: 8,
    postedBy: 5,
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const sampleApplications: JobApplication[] = [
  {
    id: 'app-1',
    jobId: 'job-1',
    applicantId: 3,
    applicantName: 'Josh Burnett',
    status: 'pending',
    appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    coverLetter: 'I am excited to apply for the ICU Night Shift position. With 5 years of critical care experience...',
    availableStartDate: '2025-07-01'
  }
];

interface JobContextType {
  jobs: JobPosting[];
  applications: JobApplication[];
  userApplications: JobApplication[];
  applyToJob: (jobId: string, coverLetter?: string, availableStartDate?: string) => void;
  withdrawApplication: (applicationId: string) => void;
  getJobById: (jobId: string) => JobPosting | undefined;
  getApplicationById: (applicationId: string) => JobApplication | undefined;
  getJobsByFacility: (facilityId: number) => JobPosting[];
  getJobsByDepartment: (department: string) => JobPosting[];
  searchJobs: (query: string) => JobPosting[];
  isLoading: boolean;
}

const JobContext = createContext<JobContextType | null>(null);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>(sampleJobs);
  const [applications, setApplications] = useState<JobApplication[]>(sampleApplications);
  const [isLoading, setIsLoading] = useState(false);

  const userApplications = applications.filter(app => app.applicantId === user?.id);

  const applyToJob = (jobId: string, coverLetter?: string, availableStartDate?: string) => {
    if (!user) return;

    // Check if user already applied
    if (applications.some(app => app.jobId === jobId && app.applicantId === user.id)) {
      return;
    }

    const newApplication: JobApplication = {
      id: `app-${Date.now()}`,
      jobId,
      applicantId: user.id,
      applicantName: `${user.firstName} ${user.lastName}`,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      coverLetter,
      availableStartDate: availableStartDate || new Date().toISOString().split('T')[0]
    };

    setApplications(prev => [newApplication, ...prev]);

    // Increment application count for the job
    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, applicationsCount: job.applicationsCount + 1 }
        : job
    ));
  };

  const withdrawApplication = (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;

    setApplications(prev => prev.filter(app => app.id !== applicationId));

    // Decrement application count for the job
    setJobs(prev => prev.map(job =>
      job.id === application.jobId
        ? { ...job, applicationsCount: Math.max(0, job.applicationsCount - 1) }
        : job
    ));
  };

  const getJobById = (jobId: string): JobPosting | undefined => {
    return jobs.find(job => job.id === jobId);
  };

  const getApplicationById = (applicationId: string): JobApplication | undefined => {
    return applications.find(app => app.id === applicationId);
  };

  const getJobsByFacility = (facilityId: number): JobPosting[] => {
    return jobs.filter(job => job.facilityId === facilityId && job.status === 'open');
  };

  const getJobsByDepartment = (department: string): JobPosting[] => {
    return jobs.filter(job => 
      job.department.toLowerCase().includes(department.toLowerCase()) && 
      job.status === 'open'
    );
  };

  const searchJobs = (query: string): JobPosting[] => {
    const lowercaseQuery = query.toLowerCase();
    return jobs.filter(job =>
      job.status === 'open' && (
        job.title.toLowerCase().includes(lowercaseQuery) ||
        job.department.toLowerCase().includes(lowercaseQuery) ||
        job.facilityName.toLowerCase().includes(lowercaseQuery) ||
        job.description.toLowerCase().includes(lowercaseQuery)
      )
    );
  };

  const value: JobContextType = {
    jobs,
    applications,
    userApplications,
    applyToJob,
    withdrawApplication,
    getJobById,
    getApplicationById,
    getJobsByFacility,
    getJobsByDepartment,
    searchJobs,
    isLoading
  };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = (): JobContextType => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};