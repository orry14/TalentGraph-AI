export interface Skill {
  name: string;
  proficiency: number;
  source?: 'self_reported' | 'github_verified' | 'admin_assigned';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  experienceYears: number;
  performanceRating: number;
  technicalSkills: Skill[];
  softSkills: string[];
  certifications: string[];
  resumeText?: string;
  currentProjects: string[];
  profileSummary: string;
  learningRecommendations?: LearningRecommendation[];
  promotionEvaluation?: PromotionEvaluation;
  
  // Graph Extensions
  managerId?: string;
  mentorId?: string;
  clients?: string[];
  pastExperience?: string[];
  learningHistory?: string[];
  
  // Git Extensions
  github_username?: string;
  gitlab_username?: string;
  
  // Financial & Cost Intelligence
  billing_rate?: number;
  cost_rate?: number;
  allocationPercentage?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  teamSize: number;
  durationMonths: number;
  budget?: number;
  priority?: 'High' | 'Medium' | 'Low';
  projectCode?: string;
  client?: string;
  industry?: string;
  businessUnit?: string;
  projectManager?: string;
  technicalLead?: string;
  deliveryLead?: string;
  startDate?: string;
  endDate?: string;
  status?: 'Planning' | 'Active' | 'Completed' | 'Delayed' | 'On Hold' | 'Archived';
  healthScore?: number;
  healthLevel?: 'Excellent' | 'Healthy' | 'Warning' | 'High Risk' | 'Critical';
  healthExplanation?: string;
  deliveryConfidence?: number;
  onTimeProbability?: number;
  budgetOverrunProbability?: number;
  estimatedCompletionDate?: string;
  healthTrendWeek?: number;
  healthTrendMonth?: number;
  tags?: string[];
}

export interface LearningRecommendation {
  courseName: string;
  type: 'course' | 'certification' | 'project';
  roadmap: string[];
  timeline: string;
  description: string;
}

export interface PromotionEvaluation {
  promotionScore: number;
  reasoning: string;
  areasToImprove: string[];
  evaluatedAt?: string;
}

export interface DashboardStats {
  capabilityScore: number;
  totalEmployees: number;
  avgExperience: number;
  avgPerformance: number;
  skillDistribution: { name: string; avgProficiency: number; count: number }[];
  departmentExpertise: {
    department: string;
    headcount: number;
    avgExperience: number;
    avgPerformance: number;
    avgSkillProficiency: number;
  }[];
  techAdoption: { name: string; value: number }[];
  topExperts: {
    id: string;
    name: string;
    role: string;
    department: string;
    expertSkill: string;
    proficiency: number;
    rating: number;
  }[];
  predictiveAnalytics?: {
    skillDecayRisk: number;
    benchUtilizationForecast: number;
    attritionRisk: number;
    projectSuccessProbability: number;
    hiringPipelineHealth: string;
  };
  portfolioHealth?: number;
  projectStats?: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    delayedProjects: number;
    onHoldProjects: number;
    totalBudget: number;
    budgetUsed: number;
    averageDeliveryHealth: number;
    averageTeamUtilization: number;
    highRiskProjects: { id: string; name: string; healthScore: number; healthLevel: string }[];
  };
  healthDistribution?: {
    excellent: number;
    healthy: number;
    warning: number;
    highRisk: number;
    critical: number;
  };
  upcomingMilestones?: {
    id: string;
    projectId: string;
    projectName: string;
    name: string;
    dueDate: string;
    ownerId: string;
    ownerName: string;
    status: string;
  }[];
}

export interface StaffingRecommendation {
  projectName: string;
  requiredSkills: string[];
  teamSize: number;
  durationMonths: number;
  recommendedTeam: {
    employee: Employee;
    matchPercentage: number;
    matchingSkills: string[];
    roleInProject: string;
  }[];
  overallMatchScore: number;
  skillOverlap: { skill: string; employeesCovering: string[] }[];
  missingSkills: string[];
  backupCandidates: {
    employee: Employee;
    matchPercentage: number;
    matchingSkills: string[];
  }[];
}

export interface SkillGapReport {
  currentSkills: { name: string; avgProficiency: number; count: number }[];
  targetSkills: { name: string; requiredProficiency: number }[];
  gaps: {
    skillName: string;
    status: 'critical' | 'moderate' | 'healthy';
    currentAvg: number;
    target: number;
    difference: number;
  }[];
  weaknesses: string[];
  hiringRecommendations: string[];
  upskillingSuggestions: {
    skill: string;
    suggestedCourse: string;
    candidates: string[];
  }[];
}

export interface CapabilityRisk {
  skill: string;
  employee: Employee;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  capabilityImpact: number;
  recommendedAction: string;
  alternativeCandidates: string[];
  flightRiskScore: number;
  isGitVerified?: boolean;
}

export interface SimulationResult {
  action: 'promotion' | 'departure' | 'transfer';
  targetEmployeeId: string;
  beforeStats: { capabilityScore: number; headcount: number; };
  afterStats: { capabilityScore: number; headcount: number; };
  impactedProjects: string[];
  recommendedSuccessors: {
    employee: Employee;
    matchScore: number;
    readiness: 'Ready Now' | 'Ready 1-2 Yrs' | 'Needs Upskilling';
  }[];
  deltaCapability: number;
  missingSkills: string[];
  financialImpact?: string;
}

export interface ResolutionOption {
  optionType: 'Split Allocation' | 'Alternative Employee' | 'Upskill Replacement' | 'Delay Project';
  description: string;
  businessImpact: 'High' | 'Medium' | 'Low';
  deliveryRisk: 'High' | 'Medium' | 'Low';
  skillMatchScore: number;
  cost: 'High' | 'Medium' | 'Low';
  rank: number;
  suggestedEmployee?: { id: string; name: string };
}

export interface StaffingConflict {
  employee: Employee;
  allocationPercentage: number;
  conflictingProjects: {
    project: Project;
    priorityScore: number;
  }[];
  resolutionOptions: ResolutionOption[];
}

export interface HiringDrive {
  id: string;
  hiringName: string;
  description: string;
  company: string;
  department: string;
  role: string;
  source: string;
  employmentType: string;
  location: string;
  salary: string;
  experience: string;
  hiringDeadline: string;
  maximumCandidates: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumCgpa: number;
  degree: string;
  branches: string[];
  graduationYear: string;
  preferredColleges: string[];
  requiredCertifications: string[];
  projectKeywords: string[];
  portfolioRequired: boolean;
  githubRequired: boolean;
  languages: string[];
  interviewRounds: string[];
  priority: 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Open' | 'Paused' | 'Closed';
  createdAt: string;
}

export interface RecruitmentCandidate {
  id: string;
  driveId: string;
  fileName: string;
  status: string;
  parsedProfile: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    education: { college: string; university: string; degree: string; cgpa: number | null; graduationYear: string };
    skills: { programmingLanguages: string[]; frameworks: string[]; tools: string[]; databases: string[]; cloud: string[]; all: string[] };
    certifications: string[];
    experience: string[];
    projects: string[];
    achievements: string[];
    internships: string[];
    publications: string[];
    languages: string[];
    profileSummary: string;
    rawText: string;
  };
  aiScore: {
    skillMatch: number;
    cgpaMatch: number;
    projectMatch: number;
    experienceMatch: number;
    educationMatch: number;
    keywordMatch: number;
    certificationMatch: number;
    communicationScore: number;
    overallMatchScore: number;
    classification: string;
    reasons: string[];
    matchingSkills: string[];
    missingSkills: string[];
    recommendedInterviewQuestions: string[];
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
    careerPotential: string;
    hiringRecommendation: string;
    overallRating: number;
  };
  interviewNotes: string[];
  appliedAt: string;
}

export interface RecruitmentDashboard {
  activeHiringDrives: number;
  candidatesApplied: number;
  shortlisted: number;
  rejected: number;
  interviewScheduled: number;
  offerSent: number;
  offerAccepted: number;
  averageMatchScore: number;
  topColleges: { name: string; count: number }[];
  skillDistribution: { name: string; count: number }[];
  hiringFunnel: { status: string; count: number }[];
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: any;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  user_id: string;
  report_type: string;
  filters: any;
  frequency: 'weekly' | 'monthly';
  recipient_emails: string[];
  next_run_at: string;
  created_at?: string;
}

const API_BASE = '/api';

import { mockEmployees, mockProjects, mockDashboardStats, mockGapAnalysis } from './mockData';

export const api = {
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Authentication failed');
    }
    return res.json();
  },

  async getEmployees(): Promise<Employee[]> {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (!res.ok) throw new Error('Failed to fetch employees');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock employees');
      return mockEmployees;
    }
  },

  async getProjects(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock projects');
      return mockProjects;
    }
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`);
    if (!res.ok) throw new Error('Failed to fetch employee details');
    return res.json();
  },

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock dashboard stats');
      return mockDashboardStats;
    }
  },

  async getGapAnalysis(): Promise<SkillGapReport> {
    try {
      const res = await fetch(`${API_BASE}/gap-analysis`);
      if (!res.ok) throw new Error('Failed to fetch gap analysis');
      return await res.json();
    } catch (e) {
      console.warn('Backend unavailable, using mock gap analysis');
      return mockGapAnalysis;
    }
  },

  async getCapabilityRisks(): Promise<CapabilityRisk[]> {
    const res = await fetch(`${API_BASE}/analytics/capability-risks`);
    if (!res.ok) throw new Error('Failed to fetch capability risks');
    return res.json();
  },

  async runSimulation(params: {
    action: 'promotion' | 'departure' | 'transfer';
    targetEmployeeId: string;
    newRole?: string;
    newDepartment?: string;
  }): Promise<SimulationResult> {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to run simulation');
    return res.json();
  },

  async uploadResume(file: File): Promise<Employee> {

    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch(`${API_BASE}/employees/upload-resume`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process resume');
    }
    return res.json();
  },

  async uploadResumes(files: File[]): Promise<{ employees: Employee[]; failures: { fileName: string; error: string }[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('resumes', file));
    const res = await fetch(`${API_BASE}/employees/upload-resumes`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process resumes');
    }
    return res.json();
  },

  async getRecruitmentDashboard(): Promise<RecruitmentDashboard> {
    const res = await fetch(`${API_BASE}/recruitment/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch recruitment dashboard');
    return res.json();
  },

  async getHiringDrives(): Promise<HiringDrive[]> {
    const res = await fetch(`${API_BASE}/recruitment/drives`);
    if (!res.ok) throw new Error('Failed to fetch hiring drives');
    return res.json();
  },

  async createHiringDrive(drive: Partial<HiringDrive>): Promise<HiringDrive> {
    const res = await fetch(`${API_BASE}/recruitment/drives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drive),
    });
    if (!res.ok) throw new Error('Failed to create hiring drive');
    return res.json();
  },

  async getRecruitmentCandidates(driveId?: string): Promise<RecruitmentCandidate[]> {
    const url = driveId ? `${API_BASE}/recruitment/candidates?driveId=${encodeURIComponent(driveId)}` : `${API_BASE}/recruitment/candidates`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch recruitment candidates');
    return res.json();
  },

  async uploadRecruitmentResumes(driveId: string, files: File[]): Promise<{ candidates: RecruitmentCandidate[]; failures: { fileName: string; error: string }[] }> {
    const formData = new FormData();
    formData.append('driveId', driveId);
    files.forEach(file => formData.append('resumes', file));
    const res = await fetch(`${API_BASE}/recruitment/upload-resumes`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import recruitment resumes');
    }
    return res.json();
  },

  async searchRecruitmentCandidates(query: string, driveId?: string): Promise<RecruitmentCandidate[]> {
    const res = await fetch(`${API_BASE}/recruitment/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, driveId }),
    });
    if (!res.ok) throw new Error('Failed to search candidates');
    return res.json();
  },

  async updateCandidateStatus(id: string, status: string, note?: string): Promise<RecruitmentCandidate> {
    const res = await fetch(`${API_BASE}/recruitment/candidates/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error('Failed to update candidate status');
    return res.json();
  },

  async getStaffingRecommendations(params: {
    projectName: string;
    requiredSkills: string[];
    teamSize: number;
    durationMonths: number;
  }): Promise<StaffingRecommendation> {
    const res = await fetch(`${API_BASE}/staffing/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to fetch staffing recommendations');
    return res.json();
  },

  async optimizeStaffing(params: {
    projectId: string;
    weights?: {
      skillMatchWeight: number;
      deliveryRiskWeight: number;
      costWeight: number;
      benchImpactWeight: number;
      knowledgeDistWeight: number;
    }
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/staffing/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to run staffing optimization');
    return res.json();
  },

  async getStaffingConflicts(): Promise<StaffingConflict[]> {
    const res = await fetch(`${API_BASE}/staffing/conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch staffing conflicts');
    return res.json();
  },

  async getPredictiveReport(): Promise<any> {
    const res = await fetch(`${API_BASE}/predictive/workforce`);
    if (!res.ok) throw new Error('Failed to fetch predictive reports');
    return res.json();
  },

  async searchKnowledgeGraph(query: string): Promise<{ nodes: any[]; edges: any[] }> {
    const res = await fetch(`${API_BASE}/search/knowledge-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Failed to query knowledge graph');
    return res.json();
  },

  async semanticSearch(query: string): Promise<{ id: string; name: string; role: string; department: string; similarity: number }[]> {
    const res = await fetch(`${API_BASE}/search/semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('Failed to perform semantic search');
    return res.json();
  },

  async askChatBot(message: string): Promise<string> {

    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Chat assistant failed to respond');
    const data = await res.json();
    return data.response;
  },

  async regenerateRecommendations(employeeId: string): Promise<LearningRecommendation[]> {
    const res = await fetch(`${API_BASE}/employees/${employeeId}/recommendations`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to regenerate recommendations');
    return res.json();
  },

  async regeneratePromotion(employeeId: string): Promise<PromotionEvaluation> {
    const res = await fetch(`${API_BASE}/employees/${employeeId}/promotion`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to regenerate promotion evaluation');
    return res.json();
  },

  async resetDatabase(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  },

  // --- Project Management API Wrappers ---
  async getProjectDetails(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch project details');
    return res.json();
  },

  async createProject(proj: any): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proj),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async updateProject(id: string, proj: any): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proj),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
    return res.json();
  },

  async addProjectMember(projectId: string, member: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    if (!res.ok) throw new Error('Failed to add project member');
    return res.json();
  },

  async deleteProjectMember(projectId: string, memberId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove project member');
    return res.json();
  },

  async addProjectTask(projectId: string, task: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to add project task');
    return res.json();
  },

  async deleteProjectTask(projectId: string, taskId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove project task');
    return res.json();
  },

  async addProjectMilestone(projectId: string, milestone: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(milestone),
    });
    if (!res.ok) throw new Error('Failed to add project milestone');
    return res.json();
  },

  async deleteProjectMilestone(projectId: string, milestoneId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove project milestone');
    return res.json();
  },

  async addProjectDocument(projectId: string, doc: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to add project document');
    return res.json();
  },

  async deleteProjectDocument(projectId: string, docId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove project document');
    return res.json();
  },

  async addProjectActivity(projectId: string, activity: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });
    if (!res.ok) throw new Error('Failed to register project activity');
    return res.json();
  },

  // --- Audit Logs ---
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    actor?: string;
    action?: string;
    target?: string;
  }): Promise<{ total: number; page: number; limit: number; logs: AuditLog[] }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.actor) query.append('actor', params.actor);
    if (params?.action) query.append('action', params.action);
    if (params?.target) query.append('target', params.target);

    const res = await fetch(`${API_BASE}/audit-logs?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // --- Export and Scheduled Reports ---
  async exportReport(reportType: string, filters: any, format: 'csv' | 'pdf'): Promise<void> {
    const res = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reportType, filters, format })
    });
    if (!res.ok) throw new Error('Failed to export report');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_export_${Date.now()}.${format === 'csv' ? 'csv' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async getScheduledReports(): Promise<ScheduledReport[]> {
    const res = await fetch(`${API_BASE}/scheduled-reports`);
    if (!res.ok) throw new Error('Failed to fetch scheduled reports');
    return res.json();
  },

  async createScheduledReport(report: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const res = await fetch(`${API_BASE}/scheduled-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    });
    if (!res.ok) throw new Error('Failed to create scheduled report');
    return res.json();
  },

  async deleteScheduledReport(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/scheduled-reports/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete scheduled report');
    const data = await res.json();
    return data.success;
  },

  async connectGit(employeeId: string, platform: 'github' | 'gitlab', username: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${employeeId}/connect-git`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ platform, username })
    });
    if (!res.ok) throw new Error(`Failed to connect ${platform}`);
    return res.json();
  },

  async getOrgRepos(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/git-org/repos`);
    if (!res.ok) throw new Error('Failed to fetch org repositories');
    return res.json();
  },

  async analyzeOrgRepo(repoName: string, primarySkill: string, repoPath?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/git-org/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repoName, primarySkill, repoPath })
    });
    if (!res.ok) throw new Error('Failed to analyze repository');
    return res.json();
  },

  // ── Knowledge Graph APIs ──────────────────────────────────────

  async getGraphSPOFs(threshold?: number): Promise<{ spofs: any[]; isLive: boolean }> {
    const params = threshold ? `?threshold=${threshold}` : '';
    const res = await fetch(`${API_BASE}/graph/spof${params}`);
    if (!res.ok) throw new Error('Failed to fetch SPOF graph data');
    return res.json();
  },

  async getTalentNetworkGraph(filters?: { department?: string; minProficiency?: number }): Promise<{ nodes: any[]; edges: any[]; isLive: boolean }> {
    const params = new URLSearchParams();
    if (filters?.department) params.set('department', filters.department);
    if (filters?.minProficiency) params.set('minProficiency', String(filters.minProficiency));
    const query = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE}/graph/talent-network${query}`);
    if (!res.ok) throw new Error('Failed to fetch talent network graph');
    return res.json();
  },

  async getPathToCoverage(skillName: string): Promise<{ paths: any[]; isLive: boolean }> {
    const res = await fetch(`${API_BASE}/graph/path-to-coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillName })
    });
    if (!res.ok) throw new Error('Failed to get path to coverage');
    return res.json();
  },

  async triggerGraphSync(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/graph/sync`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger graph sync');
    return res.json();
  }
};

