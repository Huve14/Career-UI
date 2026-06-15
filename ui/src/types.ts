export interface Application {
  id: number
  date: string
  company: string
  role: string
  score: number
  status: ApplicationStatus
  pdf: boolean
  report: string
  notes: string
}

export type ApplicationStatus = 'Evaluated' | 'Applied' | 'Responded' | 'Interview' | 'Offer' | 'Rejected' | 'Discarded' | 'SKIP'

export interface PipelineItem {
  id: number
  url: string
  added: string
  company?: string
  role?: string
}

export interface FollowUp {
  id: number
  company: string
  role: string
  date: string
  type: string
  notes: string
  overdue: boolean
}

export interface Profile {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolioUrl: string
  visaStatus: string
  targetRoles: string
  salaryMin: string
  salaryMax: string
  narrative: string
  headline: string
  superpowers: string[]
}

export interface PortalConfig {
  positiveKeywords: string[]
  negativeKeywords: string[]
  companies: TrackedCompany[]
}

export interface TrackedCompany {
  id: number
  name: string
  url: string
  enabled: boolean
}

export interface ScanResult {
  id: number
  title: string
  company: string
  location: string
  score: number
  url: string
}

export interface CoverLetter {
  company: string
  role: string
  url: string
  generated: boolean
  content: string
}

