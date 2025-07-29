import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { jobPostings, jobs, jobApplications, interviewSchedules } from '../schema';

// Job schemas (existing jobs table)
export const jobSchema = createInsertSchema(jobs);
export type Job = typeof jobs.$inferSelect;

// Job Posting schemas (new job postings table)
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateJobPostingSchema = insertJobPostingSchema.partial();

export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type UpdateJobPosting = z.infer<typeof updateJobPostingSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;

// Job Application schemas (existing job applications table)
export const jobApplicationSchema = createInsertSchema(jobApplications);
export type JobApplication = typeof jobApplications.$inferSelect;

// Interview Schedule schemas (new interview schedules table)
export const insertInterviewScheduleSchema = createInsertSchema(interviewSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInterviewScheduleSchema = insertInterviewScheduleSchema.partial();

export type InsertInterviewSchedule = z.infer<typeof insertInterviewScheduleSchema>;
export type UpdateInterviewSchedule = z.infer<typeof updateInterviewScheduleSchema>;
export type InterviewSchedule = typeof interviewSchedules.$inferSelect;