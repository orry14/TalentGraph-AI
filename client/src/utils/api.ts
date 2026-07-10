export interface Skill {
  name: string;
  proficiency: number;
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
}

export interface Project {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  teamSize: number;
  durationMonths: number;
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

const API_BASE = 'http://127.0.0.1:5000/api';

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
    const res = await fetch(`${API_BASE}/employees`);
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },

  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`);
    if (!res.ok) throw new Error('Failed to fetch employee details');
    return res.json();
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getGapAnalysis(): Promise<SkillGapReport> {
    const res = await fetch(`${API_BASE}/gap-analysis`);
    if (!res.ok) throw new Error('Failed to fetch gap analysis');
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
  }
};
