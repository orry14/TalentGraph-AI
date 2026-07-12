import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  seedEmployees,
  seedProjects,
  seedProjectMembers,
  seedProjectTasks,
  seedProjectMilestones,
  seedProjectDocuments,
  seedProjectActivities,
  seedProjectRisks,
  Employee,
  Project,
  ProjectMember,
  ProjectTask,
  ProjectMilestone,
  ProjectDocument,
  ProjectActivity,
  ProjectRisk
} from './seedData.js';
import type { HiringDrive, RecruitmentCandidate } from '../services/recruitmentService.js';

export interface AuditLog {
  id?: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: any;
  created_at?: string;
}

export interface ScheduledReport {
  id?: string;
  user_id: string;
  report_type: string;
  filters: any;
  frequency: 'weekly' | 'monthly';
  recipient_emails: string[];
  next_run_at: string;
  created_at?: string;
}

// Setup __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for the local JSON database file
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');

// Interface for database structure
interface Schema {
  employees: Employee[];
  projects: Project[];
  learningRecommendations: Record<string, any[]>;
  promotionEvaluations: Record<string, any>;
  projectMembers: ProjectMember[];
  projectTasks: ProjectTask[];
  projectMilestones: ProjectMilestone[];
  projectDocuments: ProjectDocument[];
  projectActivities: ProjectActivity[];
  projectRisks: ProjectRisk[];
  hiringDrives: HiringDrive[];
  recruitmentCandidates: RecruitmentCandidate[];
  auditLogs: AuditLog[];
  scheduledReports: ScheduledReport[];
}

class DatabaseAdapter {
  private supabaseClient: SupabaseClient | null = null;
  private isSupabaseEnabled = false;
  private localData: Schema | null = null;

  constructor() {
    this.initSupabase();
    this.initLocalDB();
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
      try {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        this.isSupabaseEnabled = true;
        console.log('✅ Supabase client initialized successfully.');
      } catch (err) {
        console.error('❌ Failed to initialize Supabase client:', err);
        this.isSupabaseEnabled = false;
      }
    } else {
      console.log('ℹ️ Supabase environment variables not found or placeholder used. Falling back to local database.');
      this.isSupabaseEnabled = false;
    }
  }

  private initLocalDB() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.localData = JSON.parse(raw);
        if (this.localData) {
          if (!this.localData.projectMembers) this.localData.projectMembers = [...seedProjectMembers];
          if (!this.localData.projectTasks) this.localData.projectTasks = [...seedProjectTasks];
          if (!this.localData.projectMilestones) this.localData.projectMilestones = [...seedProjectMilestones];
          if (!this.localData.projectDocuments) this.localData.projectDocuments = [...seedProjectDocuments];
          if (!this.localData.projectActivities) this.localData.projectActivities = [...seedProjectActivities];
          if (!this.localData.projectRisks) this.localData.projectRisks = [...seedProjectRisks];
          if (!this.localData.hiringDrives) this.localData.hiringDrives = [];
          if (!this.localData.recruitmentCandidates) this.localData.recruitmentCandidates = [];
          if (!this.localData.auditLogs) this.localData.auditLogs = [];
          if (!this.localData.scheduledReports) this.localData.scheduledReports = [];
          this.saveLocalDB();
        }
        console.log('✅ Loaded data from local JSON database.');
      } else {
        this.resetLocalDB();
      }
    } catch (err) {
      console.error('❌ Failed to initialize local database:', err);
      // Fallback to in-memory store if disk write fails
      this.localData = {
        employees: [...seedEmployees],
        projects: [...seedProjects],
        learningRecommendations: {},
        promotionEvaluations: {},
        projectMembers: [...seedProjectMembers],
        projectTasks: [...seedProjectTasks],
        projectMilestones: [...seedProjectMilestones],
        projectDocuments: [...seedProjectDocuments],
        projectActivities: [...seedProjectActivities],
        projectRisks: [...seedProjectRisks],
        hiringDrives: [],
        recruitmentCandidates: [],
        auditLogs: [],
        scheduledReports: []
      };
    }
  }

  public async resetDatabase() {
    // 1. Reset local DB
    this.localData = {
      employees: JSON.parse(JSON.stringify(seedEmployees)),
      projects: JSON.parse(JSON.stringify(seedProjects)),
      learningRecommendations: {},
      promotionEvaluations: {},
      projectMembers: JSON.parse(JSON.stringify(seedProjectMembers)),
      projectTasks: JSON.parse(JSON.stringify(seedProjectTasks)),
      projectMilestones: JSON.parse(JSON.stringify(seedProjectMilestones)),
      projectDocuments: JSON.parse(JSON.stringify(seedProjectDocuments)),
      projectActivities: JSON.parse(JSON.stringify(seedProjectActivities)),
      projectRisks: JSON.parse(JSON.stringify(seedProjectRisks)),
      hiringDrives: [],
      recruitmentCandidates: [],
      auditLogs: [],
      scheduledReports: []
    };
    this.saveLocalDB();
    console.log('✅ Local database reset to initial seed data.');

    // 2. Reset Supabase DB if enabled
    if (this.isSupabaseEnabled && this.supabaseClient) {
      console.log('ℹ️ Seeding Supabase database with dummy values...');
      try {
        // Clear child tables first to avoid foreign key violations
        await this.supabaseClient.from('learning_recommendations').delete().neq('id', 0);
        await this.supabaseClient.from('promotion_evaluations').delete().neq('id', 0);
        
        // Clear parent tables
        await this.supabaseClient.from('employees').delete().neq('id', '0');
        await this.supabaseClient.from('projects').delete().neq('id', '0');

        // Insert employees
        const { error: empErr } = await this.supabaseClient
          .from('employees')
          .insert(seedEmployees);
        if (empErr) {
          console.error('Error seeding Supabase employees:', empErr);
        } else {
          console.log('✅ Employees seeded to Supabase.');
        }

        // Insert projects
        const { error: projErr } = await this.supabaseClient
          .from('projects')
          .insert(seedProjects);
        if (projErr) {
          console.error('Error seeding Supabase projects:', projErr);
        } else {
          console.log('✅ Projects seeded to Supabase.');
        }

        console.log('✅ Supabase database successfully seeded with initial dummy values.');
      } catch (err) {
        console.error('❌ Failed to seed Supabase database:', err);
      }
    }
  }

  public resetLocalDB() {
    this.localData = {
      employees: JSON.parse(JSON.stringify(seedEmployees)),
      projects: JSON.parse(JSON.stringify(seedProjects)),
      learningRecommendations: {},
      promotionEvaluations: {},
      projectMembers: JSON.parse(JSON.stringify(seedProjectMembers)),
      projectTasks: JSON.parse(JSON.stringify(seedProjectTasks)),
      projectMilestones: JSON.parse(JSON.stringify(seedProjectMilestones)),
      projectDocuments: JSON.parse(JSON.stringify(seedProjectDocuments)),
      projectActivities: JSON.parse(JSON.stringify(seedProjectActivities)),
      projectRisks: JSON.parse(JSON.stringify(seedProjectRisks)),
      hiringDrives: [],
      recruitmentCandidates: [],
      auditLogs: [],
      scheduledReports: []
    };
    this.saveLocalDB();
    console.log('✅ Local database reset to initial seed data.');
  }

  private saveLocalDB() {
    if (this.localData) {
      try {
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.localData, null, 2), 'utf-8');
      } catch (err) {
        console.error('❌ Failed to write to local database file:', err);
      }
    }
  }

  // --- API Methods ---

  public async getScheduledReports(userId?: string): Promise<ScheduledReport[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('scheduled_reports').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) return data as ScheduledReport[];
      console.warn('Fallback to local: Supabase error fetching scheduled reports:', error);
    }
    const reports = this.localData?.scheduledReports || [];
    return userId ? reports.filter(r => r.user_id === userId) : reports;
  }

  public async saveScheduledReport(report: ScheduledReport): Promise<ScheduledReport> {
    const newReport = {
      ...report,
      id: report.id || crypto.randomUUID(),
      created_at: report.created_at || new Date().toISOString()
    };

    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('scheduled_reports')
        .upsert(newReport)
        .select()
        .single();
      if (!error && data) return data as ScheduledReport;
      console.warn('Fallback to local: Supabase error saving scheduled report:', error);
    }

    if (this.localData) {
      const idx = this.localData.scheduledReports.findIndex(r => r.id === newReport.id);
      if (idx >= 0) this.localData.scheduledReports[idx] = newReport;
      else this.localData.scheduledReports.push(newReport);
      this.saveLocalDB();
    }
    return newReport;
  }

  public async deleteScheduledReport(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('scheduled_reports').delete().eq('id', id);
      if (!error) return true;
      console.warn('Fallback to local: Supabase error deleting scheduled report:', error);
    }
    if (this.localData) {
      const originalLen = this.localData.scheduledReports.length;
      this.localData.scheduledReports = this.localData.scheduledReports.filter(r => r.id !== id);
      if (this.localData.scheduledReports.length < originalLen) {
        this.saveLocalDB();
        return true;
      }
    }
    return false;
  }

  public async getAuditLogs(filters?: { dateRange?: [string, string], actor?: string, action?: string, target?: string }): Promise<AuditLog[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('audit_logs').select('*');
      
      if (filters?.dateRange) {
        query = query.gte('created_at', filters.dateRange[0]).lte('created_at', filters.dateRange[1]);
      }
      if (filters?.actor) query = query.ilike('actor_user_id', `%${filters.actor}%`);
      if (filters?.action) query = query.eq('action', filters.action);
      if (filters?.target) query = query.eq('target_type', filters.target);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data as AuditLog[];
      console.warn('Fallback to local: Supabase error fetching audit logs:', error);
    }
    
    let logs = this.localData?.auditLogs || [];
    if (filters) {
      if (filters.dateRange) {
        const start = new Date(filters.dateRange[0]).getTime();
        const end = new Date(filters.dateRange[1]).getTime();
        logs = logs.filter(l => {
          const t = new Date(l.created_at || '').getTime();
          return t >= start && t <= end;
        });
      }
      if (filters.actor) logs = logs.filter(l => l.actor_user_id.toLowerCase().includes(filters.actor!.toLowerCase()));
      if (filters.action) logs = logs.filter(l => l.action === filters.action);
      if (filters.target) logs = logs.filter(l => l.target_type === filters.target);
    }
    // Return sorted newest first
    return logs.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }

  public async saveAuditLog(log: AuditLog): Promise<void> {
    const newLog = { 
      ...log, 
      id: log.id || crypto.randomUUID(),
      created_at: log.created_at || new Date().toISOString()
    };

    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('audit_logs').insert([newLog]);
      if (error) console.warn('Supabase error saving audit log:', error);
    }

    if (this.localData) {
      this.localData.auditLogs.unshift(newLog); // push to front for newest first
      // Keep only last 1000 logs in memory for performance
      if (this.localData.auditLogs.length > 1000) {
        this.localData.auditLogs.pop();
      }
      this.saveLocalDB();
    }
  }

  public async getEmployees(): Promise<Employee[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('employees')
        .select('*');
      if (!error && data) return data as Employee[];
      console.warn('Fallback to local: Supabase error fetching employees:', error);
    }
    return this.localData?.employees || [];
  }

  public async getEmployeeById(id: string): Promise<Employee | null> {
    const employees = await this.getEmployees();
    return employees.find(e => e.id === id) || null;
  }

  public async saveEmployee(employee: Employee): Promise<Employee> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('employees')
        .upsert(employee)
        .select()
        .single();
      if (!error && data) return data as Employee;
      console.warn('Fallback to local: Supabase error saving employee:', error);
    }

    if (this.localData) {
      const idx = this.localData.employees.findIndex(e => e.id === employee.id);
      if (idx !== -1) {
        this.localData.employees[idx] = employee;
      } else {
        this.localData.employees.push(employee);
      }
      this.saveLocalDB();
    }
    return employee;
  }

  public async getProjects(): Promise<Project[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('*');
      if (!error && data) return data as Project[];
      console.warn('Fallback to local: Supabase error fetching projects:', error);
    }
    return this.localData?.projects || [];
  }

  public async saveProject(project: Project): Promise<Project> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .upsert(project)
        .select()
        .single();
      if (!error && data) return data as Project;
      console.warn('Fallback to local: Supabase error saving project:', error);
    }

    if (this.localData) {
      const idx = this.localData.projects.findIndex(p => p.id === project.id);
      if (idx !== -1) {
        this.localData.projects[idx] = project;
      } else {
        this.localData.projects.push(project);
      }
      this.saveLocalDB();
    }
    return project;
  }

  public async getLearningRecommendations(employeeId: string): Promise<any[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('learning_recommendations')
        .select('*')
        .eq('employee_id', employeeId);
      if (!error && data) return data;
      console.warn('Fallback to local: Supabase error fetching learning recs:', error);
    }
    return this.localData?.learningRecommendations[employeeId] || [];
  }

  public async saveLearningRecommendations(employeeId: string, recs: any[]): Promise<any[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const dbRecs = recs.map(r => ({ ...r, employee_id: employeeId }));
      const { data, error } = await this.supabaseClient
        .from('learning_recommendations')
        .upsert(dbRecs)
        .select();
      if (!error && data) return data;
      console.warn('Fallback to local: Supabase error saving learning recs:', error);
    }

    if (this.localData) {
      this.localData.learningRecommendations[employeeId] = recs;
      this.saveLocalDB();
    }
    return recs;
  }

  public async getPromotionEvaluation(employeeId: string): Promise<any | null> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient
        .from('promotion_evaluations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) return data;
      console.warn('Fallback to local: Supabase error fetching promotion eval:', error);
    }
    return this.localData?.promotionEvaluations[employeeId] || null;
  }

  public async savePromotionEvaluation(employeeId: string, evaluation: any): Promise<any> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const dbEval = { ...evaluation, employee_id: employeeId, evaluated_at: new Date().toISOString() };
      const { data, error } = await this.supabaseClient
        .from('promotion_evaluations')
        .upsert(dbEval)
        .select()
        .single();
      if (!error && data) return data;
      console.warn('Fallback to local: Supabase error saving promotion eval:', error);
    }

    if (this.localData) {
      this.localData.promotionEvaluations[employeeId] = {
        ...evaluation,
        evaluatedAt: new Date().toISOString()
      };
      this.saveLocalDB();
    }
    return evaluation;
  }

  public async searchEmployeesBySkill(embedding: number[], matchThreshold = 0.5, matchCount = 10): Promise<any[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.rpc('match_skills', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });
      if (!error && data) return data;
      console.warn('Fallback to local: Supabase error semantic searching:', error);
    }

    // Local Mock Semantic Search
    if (!this.localData) return [];
    
    // We don't have embeddings in the local mock JSON by default, 
    // so we return a simulated response.
    return this.localData.employees.slice(0, matchCount).map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      department: e.department,
      similarity: 0.75 + (Math.random() * 0.2) // Mock 75%-95% similarity
    })).sort((a, b) => b.similarity - a.similarity);
  }

  public async getHiringDrives(): Promise<HiringDrive[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('hiring_drives').select('*');
      if (!error && data) return data as HiringDrive[];
      console.warn('Fallback to local: Supabase error fetching hiring drives:', error);
    }
    return this.localData?.hiringDrives || [];
  }

  public async saveHiringDrive(drive: HiringDrive): Promise<HiringDrive> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('hiring_drives').upsert(drive).select().single();
      if (!error && data) return data as HiringDrive;
      console.warn('Fallback to local: Supabase error saving hiring drive:', error);
    }
    if (this.localData) {
      const idx = this.localData.hiringDrives.findIndex(d => d.id === drive.id);
      if (idx >= 0) this.localData.hiringDrives[idx] = drive;
      else this.localData.hiringDrives.push(drive);
      this.saveLocalDB();
    }
    return drive;
  }

  public async getRecruitmentCandidates(driveId?: string): Promise<RecruitmentCandidate[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('recruitment_candidates').select('*');
      if (driveId) query = query.eq('driveId', driveId);
      const { data, error } = await query;
      if (!error && data) return data as RecruitmentCandidate[];
      console.warn('Fallback to local: Supabase error fetching candidates:', error);
    }
    const candidates = this.localData?.recruitmentCandidates || [];
    return driveId ? candidates.filter(c => c.driveId === driveId) : candidates;
  }

  public async saveRecruitmentCandidate(candidate: RecruitmentCandidate): Promise<RecruitmentCandidate> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('recruitment_candidates').upsert(candidate).select().single();
      if (!error && data) return data as RecruitmentCandidate;
      console.warn('Fallback to local: Supabase error saving candidate:', error);
    }
    if (this.localData) {
      const idx = this.localData.recruitmentCandidates.findIndex(c => c.id === candidate.id);
      if (idx >= 0) this.localData.recruitmentCandidates[idx] = candidate;
      else this.localData.recruitmentCandidates.push(candidate);
      this.saveLocalDB();
    }
    return candidate;
  }

  public async saveRecruitmentCandidates(candidates: RecruitmentCandidate[]): Promise<RecruitmentCandidate[]> {
    for (const candidate of candidates) {
      await this.saveRecruitmentCandidate(candidate);
    }
    return candidates;
  }

  // --- Enterprise Projects CRUD & Sub-resources ---

  public async deleteProject(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('projects').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projects = this.localData.projects.filter(p => p.id !== id);
      this.localData.projectMembers = this.localData.projectMembers.filter(m => m.projectId !== id);
      this.localData.projectTasks = this.localData.projectTasks.filter(t => t.projectId !== id);
      this.localData.projectMilestones = this.localData.projectMilestones.filter(m => m.projectId !== id);
      this.localData.projectDocuments = this.localData.projectDocuments.filter(d => d.projectId !== id);
      this.localData.projectActivities = this.localData.projectActivities.filter(a => a.projectId !== id);
      this.localData.projectRisks = this.localData.projectRisks.filter(r => r.projectId !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }

  // Members
  public async getProjectMembers(projectId?: string): Promise<ProjectMember[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_members').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectMember[];
    }
    const all = this.localData?.projectMembers || [];
    return projectId ? all.filter(m => m.projectId === projectId) : all;
  }

  public async saveProjectMember(member: ProjectMember): Promise<ProjectMember> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_members').upsert(member).select().single();
      if (!error && data) return data as ProjectMember;
    }
    if (this.localData) {
      const idx = this.localData.projectMembers.findIndex(m => m.id === member.id);
      if (idx !== -1) {
        this.localData.projectMembers[idx] = member;
      } else {
        this.localData.projectMembers.push(member);
      }
      this.saveLocalDB();
    }
    return member;
  }

  public async deleteProjectMember(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('project_members').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projectMembers = this.localData.projectMembers.filter(m => m.id !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }

  // Tasks
  public async getProjectTasks(projectId?: string): Promise<ProjectTask[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_tasks').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectTask[];
    }
    const all = this.localData?.projectTasks || [];
    return projectId ? all.filter(t => t.projectId === projectId) : all;
  }

  public async saveProjectTask(task: ProjectTask): Promise<ProjectTask> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_tasks').upsert(task).select().single();
      if (!error && data) return data as ProjectTask;
    }
    if (this.localData) {
      const idx = this.localData.projectTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        this.localData.projectTasks[idx] = task;
      } else {
        this.localData.projectTasks.push(task);
      }
      this.saveLocalDB();
    }
    return task;
  }

  public async deleteProjectTask(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('project_tasks').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projectTasks = this.localData.projectTasks.filter(t => t.id !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }

  // Milestones
  public async getProjectMilestones(projectId?: string): Promise<ProjectMilestone[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_milestones').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectMilestone[];
    }
    const all = this.localData?.projectMilestones || [];
    return projectId ? all.filter(m => m.projectId === projectId) : all;
  }

  public async saveProjectMilestone(milestone: ProjectMilestone): Promise<ProjectMilestone> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_milestones').upsert(milestone).select().single();
      if (!error && data) return data as ProjectMilestone;
    }
    if (this.localData) {
      const idx = this.localData.projectMilestones.findIndex(m => m.id === milestone.id);
      if (idx !== -1) {
        this.localData.projectMilestones[idx] = milestone;
      } else {
        this.localData.projectMilestones.push(milestone);
      }
      this.saveLocalDB();
    }
    return milestone;
  }

  public async deleteProjectMilestone(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('project_milestones').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projectMilestones = this.localData.projectMilestones.filter(m => m.id !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }

  // Documents
  public async getProjectDocuments(projectId?: string): Promise<ProjectDocument[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_documents').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectDocument[];
    }
    const all = this.localData?.projectDocuments || [];
    return projectId ? all.filter(d => d.projectId === projectId) : all;
  }

  public async saveProjectDocument(document: ProjectDocument): Promise<ProjectDocument> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_documents').upsert(document).select().single();
      if (!error && data) return data as ProjectDocument;
    }
    if (this.localData) {
      const idx = this.localData.projectDocuments.findIndex(d => d.id === document.id);
      if (idx !== -1) {
        this.localData.projectDocuments[idx] = document;
      } else {
        this.localData.projectDocuments.push(document);
      }
      this.saveLocalDB();
    }
    return document;
  }

  public async deleteProjectDocument(id: string): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('project_documents').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projectDocuments = this.localData.projectDocuments.filter(d => d.id !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }

  // Activity
  public async getProjectActivities(projectId?: string): Promise<ProjectActivity[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_activity').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectActivity[];
    }
    const all = this.localData?.projectActivities || [];
    return projectId ? all.filter(a => a.projectId === projectId) : all;
  }

  public async saveProjectActivity(activity: ProjectActivity): Promise<ProjectActivity> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_activity').upsert(activity).select().single();
      if (!error && data) return data as ProjectActivity;
    }
    if (this.localData) {
      this.localData.projectActivities.push(activity);
      this.saveLocalDB();
    }
    return activity;
  }

  // Risks
  public async getProjectRisks(projectId?: string): Promise<ProjectRisk[]> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      let query = this.supabaseClient.from('project_risks').select('*');
      if (projectId) query = query.eq('projectId', projectId);
      const { data, error } = await query;
      if (!error && data) return data as ProjectRisk[];
    }
    const all = this.localData?.projectRisks || [];
    return projectId ? all.filter(r => r.projectId === projectId) : all;
  }

  public async saveProjectRisk(risk: ProjectRisk): Promise<ProjectRisk> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.from('project_risks').upsert(risk).select().single();
      if (!error && data) return data as ProjectRisk;
    }
    if (this.localData) {
      const idx = this.localData.projectRisks.findIndex(r => r.id === risk.id);
      if (idx !== -1) {
        this.localData.projectRisks[idx] = risk;
      } else {
        this.localData.projectRisks.push(risk);
      }
      this.saveLocalDB();
    }
    return risk;
  }

  public async deleteProjectRisk(id: number): Promise<boolean> {
    if (this.isSupabaseEnabled && this.supabaseClient) {
      const { error } = await this.supabaseClient.from('project_risks').delete().eq('id', id);
      if (!error) return true;
    }
    if (this.localData) {
      this.localData.projectRisks = this.localData.projectRisks.filter(r => r.id !== id);
      this.saveLocalDB();
      return true;
    }
    return false;
  }
}

export const db = new DatabaseAdapter();
