import express from 'express';
// Trigger reload comment
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

import { db } from './db/dbClient.js';
import { aiService } from './services/aiService.js';
import { analytics } from './services/analytics.js';
import { riskService } from './services/riskService.js';
import { simulationEngine } from './services/simulationEngine.js';
import { conflictResolver } from './services/conflictResolver.js';
import { optimizationService } from './services/optimizationService.js';
import { predictiveService } from './services/predictiveService.js';
import { projectHealthService } from './services/projectHealthService.js';
import { groqService, chatCompletion, streamChatCompletion, analyzeFileContent, GROQ_MODELS } from './services/groqService.js';
import type { GroqModelId, ChatMessage } from './services/groqService.js';
import { employeeFromParsedResume, extractZipResumeFiles, processResumeFile } from './services/resumeProcessor.js';
import { analyzeCandidateForDrive, createDefaultDrive, generateInterviewQuestions } from './services/recruitmentService.js';
import type { HiringDrive, RecruitmentCandidate } from './services/recruitmentService.js';
import { requireRole } from './middleware/rbac.js';
import { logAudit } from './utils/auditLogger.js';
import { initScheduler } from './services/scheduler.js';
import { generateCSV, generatePDF, fetchExportData } from './utils/exporter.js';
import { fetchGitHubMetrics, fetchGitLabMetrics, mapGitMetricsToSkills } from './utils/githubService.js';
import { analyzeRepository, getOrgRepositories } from './utils/codeMaat.js';
import { initNeo4j, isNeo4jEnabled } from './db/neo4jClient.js';
import { syncAllToGraph } from './services/graphSyncService.js';
import { findSPOFs, getTalentNetworkGraph, findPathToCoverage } from './services/graphQueryService.js';

// Configure dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());

// Set up file uploading using Multer (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 150 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|txt|docx|png|jpg|jpeg|webp|zip)$/i.test(file.originalname);
    if (!allowed) {
      cb(new Error('Unsupported resume format. Upload PDF, DOCX, TXT, image, or ZIP files.'));
      return;
    }
    cb(null, true);
  }
});

// --- API Endpoints ---

/**
 * Reset Database
 */
app.post('/api/reset', requireRole('admin'), async (req, res) => {
  try {
    await db.resetDatabase();
    res.status(200).json({ message: 'Database reset to initial seed data successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset database: ' + err.message });
  }
});

/**
 * Authentication login route (mock authentication)
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Simulate successful login for workspace platform
  // Real implementation can query Supabase auth client: db.supabaseClient.auth.signInWithPassword(...)
  if (email.endsWith('@workforce.ai') && password === 'admin123') {
    return res.status(200).json({
      user: {
        id: 'usr-admin',
        email,
        name: 'Workspace Administrator',
        role: 'Manager'
      },
      token: 'jwt-mock-session-token-998877'
    });
  }

  // Fallback for user demo login
  if (password === 'demo') {
    return res.status(200).json({
      user: {
        id: 'usr-demo',
        email,
        name: 'Demo Account',
        role: 'Viewer'
      },
      token: 'jwt-mock-demo-token-112233'
    });
  }

  return res.status(401).json({ error: 'Invalid credentials. Hint: use any email and password "demo", or standard admin login.' });
});

/**
 * Get all employees
 */
app.get('/api/employees', requireRole('admin', 'manager'), async (req, res) => {
  try {
    let employees = await db.getEmployees();
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    if (userRole === 'manager' && userId) {
      // Mock hierarchy: Manager sees employees in their department
      const me = employees.find(e => e.id === userId);
      if (me) {
        employees = employees.filter(e => e.department === me.department);
      }
    }
    res.status(200).json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all projects
 */
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.getProjects();
    res.status(200).json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get audit logs (Admin only)
 */
app.get('/api/audit-logs', requireRole('admin'), async (req, res) => {
  try {
    const filters = {
      dateRange: req.query.startDate && req.query.endDate 
        ? [req.query.startDate as string, req.query.endDate as string] as [string, string]
        : undefined,
      actor: req.query.actor as string,
      action: req.query.action as string,
      target: req.query.target as string
    };
    const logs = await db.getAuditLogs(filters);
    
    // Simple pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = logs.slice(startIndex, startIndex + limit);

    res.status(200).json({
      total: logs.length,
      page,
      limit,
      logs: paginatedLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get individual employee with their associated AI recommendations & evaluations
 */
app.get('/api/employees/:id', requireRole('admin', 'manager', 'employee'), async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    if (userRole === 'employee' && userId !== req.params.id) {
      return res.status(403).json({ error: 'Employees can only access their own profile.' });
    }
    
    const employee = await db.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Fetch recommendations and evaluations (creates them if not found)
    let learningRecs = await db.getLearningRecommendations(employee.id);
    if (learningRecs.length === 0) {
      learningRecs = await aiService.generateLearningRecommendations(employee);
      await db.saveLearningRecommendations(employee.id, learningRecs);
    }

    let promotionEval = await db.getPromotionEvaluation(employee.id);
    if (!promotionEval) {
      promotionEval = await aiService.evaluatePromotionReadiness(employee);
      await db.savePromotionEvaluation(employee.id, promotionEval);
    }

    logAudit({
      actorId: userId || (req.headers['x-mock-user-id'] as string),
      actorRole: userRole || (req.headers['x-mock-role'] as string),
      action: 'view_promotion_readiness',
      targetType: 'employee',
      targetId: employee.id
    });

    res.status(200).json({
      ...employee,
      learningRecommendations: learningRecs,
      promotionEvaluation: promotionEval
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Re-evaluate Learning Recommendations (force AI regeneration)
 */
app.post('/api/employees/:id/recommendations', async (req, res) => {
  try {
    const employee = await db.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const learningRecs = await aiService.generateLearningRecommendations(employee);
    await db.saveLearningRecommendations(employee.id, learningRecs);
    res.status(200).json(learningRecs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Re-evaluate Promotion Readiness (force AI regeneration)
 */
app.post('/api/employees/:id/promotion', async (req, res) => {
  try {
    const employee = await db.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const promotionEval = await aiService.evaluatePromotionReadiness(employee);
    await db.savePromotionEvaluation(employee.id, promotionEval);
    res.status(200).json(promotionEval);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Upload and parse resume to generate an employee profile
 */
app.post('/api/employees/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }
    const expandedFiles = extractZipResumeFiles(req.file);
    const firstResume = expandedFiles[0];
    if (!firstResume) {
      return res.status(400).json({ error: 'No supported resume files were found in the upload.' });
    }
    const parsedResume = await processResumeFile(firstResume);
    const newEmployee = employeeFromParsedResume(parsedResume);
    await db.saveEmployee(newEmployee);
    
    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'upload_resume',
      targetType: 'employee',
      targetId: newEmployee.id,
      metadata: { fileName: firstResume.originalname }
    });

    res.status(201).json({ ...newEmployee, parsedResume });
  } catch (err: any) {
    console.error('Error in upload-resume:', err);
    res.status(500).json({ error: 'Failed to process resume: ' + err.message });
  }
});

app.post('/api/employees/upload-resumes', upload.array('resumes', 150), async (req, res) => {
  try {
    const incoming = (req.files || []) as Express.Multer.File[];
    if (incoming.length === 0) return res.status(400).json({ error: 'No resume files uploaded' });
    const files = incoming.flatMap(file => extractZipResumeFiles(file));
    const employees = [];
    const failures = [];
    for (const file of files) {
      try {
        const parsedResume = await processResumeFile(file);
        const employee = employeeFromParsedResume(parsedResume);
        await db.saveEmployee(employee);
        employees.push({ ...employee, parsedResume });
      } catch (err: any) {
        failures.push({ fileName: file.originalname, error: err.message });
      }
    }

    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'upload_resumes_batch',
      targetType: 'employee',
      metadata: { successCount: employees.length, failureCount: failures.length }
    });

    res.status(201).json({ employees, failures });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process resumes: ' + err.message });
  }
});

app.get('/api/recruitment/dashboard', async (_req, res) => {
  try {
    let drives = await db.getHiringDrives();
    if (drives.length === 0) {
      const defaultDrive = createDefaultDrive();
      await db.saveHiringDrive(defaultDrive);
      drives = [defaultDrive];
    }
    const candidates = await db.getRecruitmentCandidates();
    const averageMatchScore = candidates.length
      ? Math.round(candidates.reduce((sum, c) => sum + c.aiScore.overallMatchScore, 0) / candidates.length)
      : 0;
    const topColleges = Object.entries(candidates.reduce<Record<string, number>>((acc, c) => {
      const college = c.parsedProfile.education.college || c.parsedProfile.education.university || 'Unknown';
      acc[college] = (acc[college] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const skillDistribution = Object.entries(candidates.reduce<Record<string, number>>((acc, c) => {
      c.parsedProfile.skills.all.forEach(skill => { acc[skill] = (acc[skill] || 0) + 1; });
      return acc;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12);
    const hiringFunnel = ['Applied', 'Strong Match', 'Good Match', 'Average', 'Weak Match', 'Rejected', 'Interview Scheduled', 'Offer Sent', 'Offer Accepted']
      .map(status => ({ status, count: candidates.filter(c => c.status === status || c.aiScore.classification === status).length }));
    res.status(200).json({
      activeHiringDrives: drives.filter(d => d.status === 'Open').length,
      candidatesApplied: candidates.length,
      shortlisted: candidates.filter(c => ['Strong Match', 'Good Match', 'Interview Scheduled', 'Offer Sent', 'Offer Accepted'].includes(c.status) || c.aiScore.overallMatchScore >= 65).length,
      rejected: candidates.filter(c => c.status === 'Rejected').length,
      interviewScheduled: candidates.filter(c => c.status === 'Interview Scheduled').length,
      offerSent: candidates.filter(c => c.status === 'Offer Sent').length,
      offerAccepted: candidates.filter(c => c.status === 'Offer Accepted').length,
      averageMatchScore,
      topColleges,
      skillDistribution,
      hiringFunnel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recruitment/drives', async (_req, res) => {
  try {
    let drives = await db.getHiringDrives();
    if (drives.length === 0) {
      const defaultDrive = createDefaultDrive();
      await db.saveHiringDrive(defaultDrive);
      drives = [defaultDrive];
    }
    res.status(200).json(drives);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recruitment/drives', async (req, res) => {
  try {
    const base = createDefaultDrive();
    const drive: HiringDrive = {
      ...base,
      ...req.body,
      id: req.body.id || `drive-${Date.now()}`,
      requiredSkills: Array.isArray(req.body.requiredSkills) ? req.body.requiredSkills : String(req.body.requiredSkills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      preferredSkills: Array.isArray(req.body.preferredSkills) ? req.body.preferredSkills : String(req.body.preferredSkills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      branches: Array.isArray(req.body.branches) ? req.body.branches : String(req.body.branches || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      preferredColleges: Array.isArray(req.body.preferredColleges) ? req.body.preferredColleges : String(req.body.preferredColleges || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      requiredCertifications: Array.isArray(req.body.requiredCertifications) ? req.body.requiredCertifications : String(req.body.requiredCertifications || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      projectKeywords: Array.isArray(req.body.projectKeywords) ? req.body.projectKeywords : String(req.body.projectKeywords || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      languages: Array.isArray(req.body.languages) ? req.body.languages : String(req.body.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      interviewRounds: Array.isArray(req.body.interviewRounds) ? req.body.interviewRounds : String(req.body.interviewRounds || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      createdAt: req.body.createdAt || new Date().toISOString(),
    };
    const saved = await db.saveHiringDrive(drive);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recruitment/candidates', async (req, res) => {
  try {
    const driveId = typeof req.query.driveId === 'string' ? req.query.driveId : undefined;
    const candidates = await db.getRecruitmentCandidates(driveId);
    res.status(200).json(candidates.sort((a, b) => b.aiScore.overallMatchScore - a.aiScore.overallMatchScore));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recruitment/upload-resumes', upload.array('resumes', 150), async (req, res) => {
  try {
    const driveId = String(req.body.driveId || '');
    const drives = await db.getHiringDrives();
    const drive = drives.find(d => d.id === driveId) || drives[0] || createDefaultDrive();
    if (!drives.find(d => d.id === drive.id)) await db.saveHiringDrive(drive);
    const incoming = (req.files || []) as Express.Multer.File[];
    if (incoming.length === 0) return res.status(400).json({ error: 'No resume files uploaded' });
    const files = incoming.flatMap(file => extractZipResumeFiles(file));
    const candidates: RecruitmentCandidate[] = [];
    const failures: { fileName: string; error: string }[] = [];
    for (const file of files) {
      try {
        const parsedProfile = await processResumeFile(file);
        const aiScore = analyzeCandidateForDrive(parsedProfile, drive);
        const candidate: RecruitmentCandidate = {
          id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          driveId: drive.id,
          fileName: file.originalname,
          status: aiScore.classification,
          parsedProfile,
          aiScore,
          interviewNotes: [],
          appliedAt: new Date().toISOString(),
        };
        candidates.push(candidate);
      } catch (err: any) {
        failures.push({ fileName: file.originalname, error: err.message });
      }
    }
    await db.saveRecruitmentCandidates(candidates);
    res.status(201).json({ candidates, failures });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to import recruitment resumes: ' + err.message });
  }
});

app.post('/api/recruitment/search', async (req, res) => {
  try {
    const query = String(req.body.query || '').toLowerCase();
    const candidates = await db.getRecruitmentCandidates(req.body.driveId);
    const minCgpa = Number(query.match(/above\s+(\d+(?:\.\d+)?)\s+cgpa/)?.[1] || query.match(/(\d+(?:\.\d+)?)\+?\s+cgpa/)?.[1] || 0);
    const filtered = candidates.filter(candidate => {
      const blob = JSON.stringify(candidate).toLowerCase();
      const cgpaOk = minCgpa ? (candidate.parsedProfile.education.cgpa || 0) >= minCgpa : true;
      return cgpaOk && query.split(/\s+/).filter(Boolean).every(token => {
        if (['find', 'show', 'candidates', 'with', 'from', 'developers', 'developer', 'above', 'cgpa'].includes(token)) return true;
        return blob.includes(token);
      });
    });
    res.status(200).json(filtered.sort((a, b) => b.aiScore.overallMatchScore - a.aiScore.overallMatchScore));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recruitment/candidates/:id/status', async (req, res) => {
  try {
    const candidates = await db.getRecruitmentCandidates();
    const candidate = candidates.find(c => c.id === req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    candidate.status = req.body.status || candidate.status;
    if (req.body.note) candidate.interviewNotes.push(String(req.body.note));
    const saved = await db.saveRecruitmentCandidate(candidate);
    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recruitment/candidates/:id/interview-kit', async (req, res) => {
  try {
    const candidates = await db.getRecruitmentCandidates();
    const candidate = candidates.find(c => c.id === req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    const drives = await db.getHiringDrives();
    const drive = drives.find(d => d.id === candidate.driveId) || createDefaultDrive();
    res.status(200).json({
      technical: generateInterviewQuestions(candidate.parsedProfile, drive).slice(0, 3),
      hr: ['Why are you interested in this role?', 'Describe your preferred team environment.', 'Tell us about a time you handled feedback.'],
      coding: [`Build a small feature using ${drive.requiredSkills[0] || 'JavaScript'} and explain tradeoffs.`, 'Debug a failing API response and describe your process.'],
      behavioral: ['Tell us about a conflict in a project team.', 'Describe a time you learned a new technology quickly.'],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recruitment/export.csv', async (_req, res) => {
  try {
    const candidates = await db.getRecruitmentCandidates();
    const esc = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Name', 'Email', 'Phone', 'College', 'CGPA', 'Skills', 'Status', 'Match Score'].map(esc).join(','),
      ...candidates.map(c => [
        c.parsedProfile.fullName,
        c.parsedProfile.email,
        c.parsedProfile.phone,
        c.parsedProfile.education.college || c.parsedProfile.education.university,
        c.parsedProfile.education.cgpa || '',
        c.parsedProfile.skills.all.join('; '),
        c.status,
        c.aiScore.overallMatchScore,
      ].map(esc).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shortlisted-candidates.csv"');
    res.send(rows.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get dashboard analytics stats
 */
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const baseStats = analytics.calculateDashboardStats(employees, projects);

    const members = await db.getProjectMembers();
    const milestones = await db.getProjectMilestones();
    
    // Calculate portfolio stats
    const healthReports = projects.map(proj => {
      const projMembers = members.filter(m => m.projectId === proj.id);
      const projMilestones = milestones.filter(m => m.projectId === proj.id);
      return projectHealthService.generateHealthReport(proj, projMembers, [], projMilestones, employees);
    });

    const portfolioHealth = healthReports.length > 0
      ? Math.round(healthReports.reduce((sum, hr) => sum + hr.healthScore, 0) / healthReports.length)
      : 100;

    const projectStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'Active').length,
      completedProjects: projects.filter(p => p.status === 'Completed').length,
      delayedProjects: projects.filter(p => p.status === 'Delayed').length,
      onHoldProjects: projects.filter(p => p.status === 'On Hold').length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      budgetUsed: healthReports.reduce((sum, hr) => {
        const proj = projects.find(p => p.id === hr.projectId);
        const b = proj ? (proj.budget || 0) : 0;
        return sum + Math.round((hr.metrics.budgetUsage / 100) * b);
      }, 0),
      averageDeliveryHealth: portfolioHealth,
      averageTeamUtilization: baseStats.predictiveAnalytics?.benchUtilizationForecast || 80,
      highRiskProjects: healthReports.filter(hr => hr.healthScore < 60).map(hr => ({
        id: hr.projectId,
        name: hr.projectName,
        healthScore: hr.healthScore,
        healthLevel: hr.healthLevel
      }))
    };

    res.status(200).json({
      ...baseStats,
      portfolioHealth,
      projectStats,
      healthDistribution: {
        excellent: healthReports.filter(hr => hr.healthScore >= 90).length,
        healthy: healthReports.filter(hr => hr.healthScore >= 75 && hr.healthScore < 90).length,
        warning: healthReports.filter(hr => hr.healthScore >= 60 && hr.healthScore < 75).length,
        highRisk: healthReports.filter(hr => hr.healthScore >= 40 && hr.healthScore < 60).length,
        critical: healthReports.filter(hr => hr.healthScore < 40).length
      },
      upcomingMilestones: milestones
        .filter(m => m.status !== 'Completed' && new Date(m.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)
        .map(m => {
          const proj = projects.find(p => p.id === m.projectId);
          const owner = employees.find(e => e.id === m.ownerId);
          return {
            ...m,
            projectName: proj ? proj.name : 'Unknown',
            ownerName: owner ? owner.name : 'Unassigned'
          };
        })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Capability Risks (SPOF)
 */
app.get('/api/analytics/capability-risks', async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const risks = riskService.calculateCapabilityRisks(employees);

    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'view_capability_risks',
      targetType: 'analytics'
    });

    res.status(200).json(risks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new project
 */
app.post('/api/projects', async (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData.id || !projectData.name) {
      return res.status(400).json({ error: 'Project id and name are required' });
    }
    const saved = await db.saveProject(projectData);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update project details
 */
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectData = req.body;
    const projects = await db.getProjects();
    const exists = projects.some(p => p.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const updated = await db.saveProject({ ...projectData, id: req.params.id });
    res.status(200).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete a project
 */
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await db.deleteProject(req.params.id);
    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get individual project details with all sub-resources and health reports
 */
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projects = await db.getProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const members = await db.getProjectMembers(project.id);
    const tasks = await db.getProjectTasks(project.id);
    const milestones = await db.getProjectMilestones(project.id);
    const documents = await db.getProjectDocuments(project.id);
    const activities = await db.getProjectActivities(project.id);
    const employees = await db.getEmployees();

    // Compute Health Report
    const healthReport = projectHealthService.generateHealthReport(project, members, tasks, milestones, employees);

    // Sync health variables back to project in DB
    const updatedProject = {
      ...project,
      healthScore: healthReport.healthScore,
      healthLevel: healthReport.healthLevel,
      healthExplanation: healthReport.healthExplanation,
      deliveryConfidence: healthReport.deliveryConfidence,
      onTimeProbability: healthReport.onTimeProbability,
      budgetOverrunProbability: healthReport.budgetOverrunProbability,
      estimatedCompletionDate: healthReport.estimatedCompletionDate
    };
    await db.saveProject(updatedProject);

    res.status(200).json({
      project: updatedProject,
      members,
      tasks,
      milestones,
      documents,
      activities,
      risks: healthReport.risks,
      forecast: healthReport.forecast,
      healthScore: healthReport.healthScore,
      healthLevel: healthReport.healthLevel,
      healthExplanation: healthReport.healthExplanation,
      deliveryConfidence: healthReport.deliveryConfidence,
      onTimeProbability: healthReport.onTimeProbability,
      budgetOverrunProbability: healthReport.budgetOverrunProbability,
      estimatedCompletionDate: healthReport.estimatedCompletionDate,
      metrics: healthReport.metrics
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member mappings
app.get('/api/projects/:id/members', async (req, res) => {
  try {
    const members = await db.getProjectMembers(req.params.id);
    res.status(200).json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/members', async (req, res) => {
  try {
    const member = req.body;
    member.projectId = req.params.id;
    if (!member.id) member.id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const saved = await db.saveProjectMember(member);

    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'add_project_member',
      targetType: 'project',
      targetId: member.projectId,
      metadata: { memberId: saved.id, employeeId: saved.employeeId, projectRole: saved.role }
    });

    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/members/:memberId', async (req, res) => {
  try {
    const deleted = await db.deleteProjectMember(req.params.memberId);
    
    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'remove_project_member',
      targetType: 'project',
      targetId: req.params.id,
      metadata: { memberId: req.params.memberId, success: deleted }
    });

    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Task mappings
app.get('/api/projects/:id/tasks', async (req, res) => {
  try {
    const tasks = await db.getProjectTasks(req.params.id);
    res.status(200).json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/tasks', async (req, res) => {
  try {
    const task = req.body;
    task.projectId = req.params.id;
    if (!task.id) task.id = `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const saved = await db.saveProjectTask(task);
    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/tasks/:taskId', async (req, res) => {
  try {
    const deleted = await db.deleteProjectTask(req.params.taskId);
    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Milestone mappings
app.get('/api/projects/:id/milestones', async (req, res) => {
  try {
    const milestones = await db.getProjectMilestones(req.params.id);
    res.status(200).json(milestones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/milestones', async (req, res) => {
  try {
    const milestone = req.body;
    milestone.projectId = req.params.id;
    if (!milestone.id) milestone.id = `mls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const saved = await db.saveProjectMilestone(milestone);
    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const deleted = await db.deleteProjectMilestone(req.params.milestoneId);
    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Document mappings
app.get('/api/projects/:id/documents', async (req, res) => {
  try {
    const docs = await db.getProjectDocuments(req.params.id);
    res.status(200).json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/documents', async (req, res) => {
  try {
    const doc = req.body;
    doc.projectId = req.params.id;
    if (!doc.id) doc.id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    if (!doc.uploadedAt) doc.uploadedAt = new Date().toISOString().split('T')[0];
    const saved = await db.saveProjectDocument(doc);
    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/documents/:docId', async (req, res) => {
  try {
    const deleted = await db.deleteProjectDocument(req.params.docId);
    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Activities
app.get('/api/projects/:id/activities', async (req, res) => {
  try {
    const activities = await db.getProjectActivities(req.params.id);
    res.status(200).json(activities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/activities', async (req, res) => {
  try {
    const act = req.body;
    act.projectId = req.params.id;
    act.id = Date.now();
    if (!act.timestamp) act.timestamp = new Date().toISOString();
    const saved = await db.saveProjectActivity(act);
    res.status(200).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Risks
app.get('/api/projects/:id/risks', async (req, res) => {
  try {
    const risks = await db.getProjectRisks(req.params.id);
    res.status(200).json(risks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Run AI Succession Simulator
 */
app.post('/api/simulation/run', async (req, res) => {
  try {
    const { action, targetEmployeeId, newRole, newDepartment } = req.body;
    if (!action || !targetEmployeeId) {
      return res.status(400).json({ error: 'Missing action or targetEmployeeId' });
    }

    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    
    const result = simulationEngine.runSimulation(action, targetEmployeeId, employees, projects, newRole, newDepartment);
    
    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'run_simulation',
      targetType: 'simulation',
      metadata: { action_type: action, targetEmployeeId, newRole, newDepartment }
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Staffing Conflicts
 */
app.post('/api/staffing/conflicts', async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const conflicts = conflictResolver.detectConflicts(employees, projects);
    res.status(200).json(conflicts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * Semantic Skill Search
 */
app.post('/api/search/semantic', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query text' });
    }

    const embedding = await aiService.generateEmbedding(query);
    const results = await db.searchEmployeesBySkill(embedding, 0.5, 10);
    
    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Post Project Staffing recommendations

 */
app.post('/api/staffing/recommend', async (req, res) => {
  try {
    const { projectName, requiredSkills, teamSize, durationMonths } = req.body;

    if (!projectName || !requiredSkills || !teamSize || !durationMonths) {
      return res.status(400).json({ error: 'Missing required parameters: projectName, requiredSkills, teamSize, durationMonths' });
    }

    const employees = await db.getEmployees();
    const staffingRec = analytics.recommendStaffing(
      projectName,
      requiredSkills,
      parseInt(teamSize, 10),
      parseInt(durationMonths, 10),
      employees
    );

    res.status(200).json(staffingRec);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Skill Gap Analysis
 */
app.get('/api/gap-analysis', async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const gapReport = analytics.runGapAnalysis(employees);
    res.status(200).json(gapReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generic Report Export Endpoint (CSV/PDF)
 */
app.post('/api/export', requireRole('admin', 'manager', 'employee'), async (req, res) => {
  try {
    const { reportType, filters, format } = req.body;
    const user = (req as any).user || {
      id: req.headers['x-mock-user-id'] as string,
      role: req.headers['x-mock-role'] as string
    };

    if (user.role === 'employee' && reportType !== 'employees') {
      return res.status(403).json({ error: 'Employees can only export their own directory details.' });
    }

    const { title, rows } = await fetchExportData(reportType, filters, user);
    
    logAudit({
      actorId: user.id || 'system',
      actorRole: user.role || 'system',
      action: 'export_report',
      targetType: 'report',
      targetId: reportType,
      metadata: { format, filters }
    });

    if (format === 'pdf') {
      const creatorInfo = `${user.id || 'system'} (${user.role || 'system'})`;
      const pdfBuffer = await generatePDF(title, creatorInfo, rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_export.pdf"`);
      return res.send(pdfBuffer);
    } else {
      const csvContent = generateCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_export.csv"`);
      return res.send(csvContent);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Scheduled Reports APIs
 */
app.get('/api/scheduled-reports', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const user = (req as any).user || {
      id: req.headers['x-mock-user-id'] as string,
      role: req.headers['x-mock-role'] as string
    };
    const reports = await db.getScheduledReports(user.id);
    res.status(200).json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scheduled-reports', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const user = (req as any).user || {
      id: req.headers['x-mock-user-id'] as string,
      role: req.headers['x-mock-role'] as string
    };
    const { report_type, filters, frequency, recipient_emails } = req.body;
    
    const nextRun = new Date();
    if (frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + 30);
    }

    const saved = await db.saveScheduledReport({
      user_id: user.id || 'system',
      report_type,
      filters: filters || {},
      frequency,
      recipient_emails: Array.isArray(recipient_emails) ? recipient_emails : [recipient_emails],
      next_run_at: nextRun.toISOString()
    });

    logAudit({
      actorId: user.id || 'system',
      actorRole: user.role || 'system',
      action: 'create_scheduled_report',
      targetType: 'scheduled_report',
      targetId: saved.id
    });

    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/scheduled-reports/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const user = (req as any).user || {
      id: req.headers['x-mock-user-id'] as string,
      role: req.headers['x-mock-role'] as string
    };
    const deleted = await db.deleteScheduledReport(req.params.id);
    
    logAudit({
      actorId: user.id || 'system',
      actorRole: user.role || 'system',
      action: 'delete_scheduled_report',
      targetType: 'scheduled_report',
      targetId: req.params.id,
      metadata: { success: deleted }
    });

    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function answerRecruitmentQuestion(question: string): Promise<string | null> {
  const lower = question.toLowerCase();
  if (!/(candidate|shortlist|recruit|hiring|interview|offer|resume)/i.test(question)) return null;
  const candidates = await db.getRecruitmentCandidates();
  if (candidates.length === 0) return 'No recruitment candidates have been imported yet. Open **Recruitment**, choose a hiring drive, and bulk upload resumes to start AI matching.';
  const sorted = [...candidates].sort((a, b) => b.aiScore.overallMatchScore - a.aiScore.overallMatchScore);
  const named = sorted.find(c => lower.includes(c.parsedProfile.fullName.toLowerCase().split(' ')[0]));
  if (/why|shortlisted|reason/.test(lower) && named) {
    return `**${named.parsedProfile.fullName}** was classified as **${named.status}** with an overall match of **${named.aiScore.overallMatchScore}%**.\n\n**Reasons**\n${named.aiScore.reasons.map(r => `- ${r}`).join('\n')}\n\n**Matching skills:** ${named.aiScore.matchingSkills.join(', ') || 'None detected'}\n\n**Missing skills:** ${named.aiScore.missingSkills.join(', ') || 'None'}`;
  }
  if (/question|interview/.test(lower)) {
    const target = named || sorted[0];
    return `Recommended interview questions for **${target.parsedProfile.fullName}**:\n\n${target.aiScore.recommendedInterviewQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  }
  if (/compare/.test(lower) && sorted.length >= 2) {
    const [a, b] = sorted;
    return `**Candidate Comparison**\n\n**${a.parsedProfile.fullName}**: ${a.aiScore.overallMatchScore}% match, strengths include ${a.aiScore.strengths.slice(0, 3).join(', ') || 'resume quality'}.\n\n**${b.parsedProfile.fullName}**: ${b.aiScore.overallMatchScore}% match, strengths include ${b.aiScore.strengths.slice(0, 3).join(', ') || 'resume quality'}.\n\nRecommendation: prioritize **${a.parsedProfile.fullName}** for the next interview round.`;
  }
  return `Top recruitment candidates:\n\n${sorted.slice(0, 5).map((c, index) => `${index + 1}. **${c.parsedProfile.fullName}** - ${c.aiScore.overallMatchScore}% (${c.status})\n   Matching: ${c.aiScore.matchingSkills.slice(0, 6).join(', ') || 'No direct skill match detected'}\n   Recommendation: ${c.aiScore.hiringRecommendation}`).join('\n\n')}\n\n[ACTION: navigate | target: recruitment | label: Open Recruitment Pipeline]`;
}

/**
 * AI Chatbot query
 */
/**
 * Groq AI Chat – non-streaming fallback (legacy compatibility)
 */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, messages, model, temperature, maxTokens } = req.body;
    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'message or messages array is required' });
    }
    const latestQuestion = message || messages[messages.length - 1]?.content || '';
    const recruitmentAnswer = await answerRecruitmentQuestion(latestQuestion);
    if (recruitmentAnswer) {
      return res.status(200).json({ response: recruitmentAnswer });
    }

    // Use Groq if key is configured, otherwise fall back to legacy rule-based engine
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'YOUR__API_KEY') {
      const history: ChatMessage[] = messages || [{ role: 'user', content: message }];
      const response = await chatCompletion(
        history,
        (model as GroqModelId) || 'llama-3.3-70b-versatile',
        temperature ?? 0.7,
        maxTokens ?? 2048,
      );
      return res.status(200).json({ response });
    }

    // Legacy fallback
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const response = await aiService.askChatBot(latestQuestion, { employees, projects });
    res.status(200).json({ response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Groq AI Chat – streaming SSE endpoint
 */
app.post('/api/ai/chat/stream', async (req, res) => {
  const { messages, model, temperature, maxTokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Handle client disconnection
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  try {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const recruitmentAnswer = await answerRecruitmentQuestion(lastMsg);
    if (recruitmentAnswer) {
      res.write(`data: ${JSON.stringify({ token: recruitmentAnswer })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR__API_KEY') {
      // Legacy fallback for missing Groq key
      const employees = await db.getEmployees();
      const projects = await db.getProjects();
      const response = await aiService.askChatBot(lastMsg, { employees, projects });
      res.write(`data: ${JSON.stringify({ token: response })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    await streamChatCompletion({
      messages: messages as ChatMessage[],
      model: (model as GroqModelId) || 'llama-3.3-70b-versatile',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2048,
      signal: abortController.signal,
      onToken: (token) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      },
      onDone: () => {
        if (!res.writableEnded) {
          res.write(`data: [DONE]\n\n`);
          res.end();
        }
      },
      onError: (err) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
        }
      },
    });
  } catch (err: any) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

/**
 * List available Groq AI models
 */
app.get('/api/ai/models', (_req, res) => {
  res.json(GROQ_MODELS);
});

/**
 * Analyze uploaded file with Groq AI
 */
app.post('/api/ai/analyze-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { model } = req.body;
    const fileContent = req.file.buffer.toString('utf-8');
    const analysis = await analyzeFileContent(
      fileContent,
      req.file.originalname,
      req.file.mimetype,
      (model as GroqModelId) || 'llama-3.3-70b-versatile',
    );
    res.json({ analysis, fileName: req.file.originalname });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * AI Staffing Optimizer
 */
app.post('/api/staffing/optimize', async (req, res) => {
  try {
    const { projectId, weights } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const projects = await db.getProjects();
    const employees = await db.getEmployees();
    
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const optimizationResult = optimizationService.optimizeStaffing(project, employees, weights);
    res.status(200).json(optimizationResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Predictive Workforce Intelligence
 */
app.get('/api/predictive/workforce', async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    
    const report = predictiveService.generateReport(employees, projects);
    res.status(200).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Workforce Knowledge Graph Query
 */
app.post('/api/search/knowledge-graph', async (req, res) => {
  try {
    const { query } = req.body;
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    
    const queryLower = (query || '').toLowerCase();
    
    const nodes: any[] = [];
    const edges: any[] = [];
    
    const addedNodeIds = new Set<string>();
    const addNode = (id: string, label: string, type: string, extra = {}) => {
      if (addedNodeIds.has(id)) return;
      addedNodeIds.add(id);
      nodes.push({ id, label, type, ...extra });
    };
    
    const addEdge = (source: string, target: string, label?: string) => {
      edges.push({ id: `edge-${source}-${target}`, source, target, label });
    };

    if (queryLower.includes('react') || queryLower.includes('frontend')) {
      addNode('skill-react', 'React', 'skill');
      employees.forEach(e => {
        if (e.technicalSkills.some(s => s.name.toLowerCase() === 'react')) {
          addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
          addEdge(e.id, 'skill-react', 'knows');
          if (e.managerId) {
            const mgr = employees.find(m => m.id === e.managerId);
            if (mgr) {
              addNode(mgr.id, mgr.name, 'employee', { role: mgr.role, dept: mgr.department });
              addEdge(e.id, mgr.id, 'reports_to');
            }
          }
        }
      });
    } else if (queryLower.includes('kubernetes') || queryLower.includes('aws') || queryLower.includes('cloud')) {
      addNode('skill-k8s', 'Kubernetes', 'skill');
      addNode('skill-aws', 'AWS', 'skill');
      employees.forEach(e => {
        if (e.technicalSkills.some(s => s.name.toLowerCase() === 'kubernetes' || s.name.toLowerCase() === 'aws')) {
          addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
          if (e.technicalSkills.some(s => s.name.toLowerCase() === 'kubernetes')) addEdge(e.id, 'skill-k8s', 'knows');
          if (e.technicalSkills.some(s => s.name.toLowerCase() === 'aws')) addEdge(e.id, 'skill-aws', 'knows');
        }
      });
      projects.forEach(p => {
        if (p.requiredSkills.some(s => s.toLowerCase() === 'aws' || s.toLowerCase() === 'kubernetes')) {
          addNode(p.id, p.name, 'project');
          if (p.requiredSkills.includes('AWS')) addEdge('skill-aws', p.id, 'required_for');
          if (p.requiredSkills.includes('Kubernetes')) addEdge('skill-k8s', p.id, 'required_for');
        }
      });
    } else if (queryLower.includes('sarah')) {
      const sarah = employees.find(e => e.name.toLowerCase().includes('sarah'));
      if (sarah) {
        addNode(sarah.id, sarah.name, 'employee', { role: sarah.role, dept: sarah.department });
        employees.forEach(e => {
          if (e.managerId === sarah.id) {
            addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
            addEdge(e.id, sarah.id, 'reports_to');
          }
          if (e.mentorId === sarah.id) {
            addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
            addEdge(e.id, sarah.id, 'mentored_by');
          }
        });
      }
    } else if (queryLower.includes('banking')) {
      addNode('client-banking', 'Banking Group', 'client');
      employees.forEach(e => {
        if (e.clients?.includes('Banking Group') || e.pastExperience?.includes('Banking')) {
          addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
          addEdge(e.id, 'client-banking', 'worked_with');
        }
      });
    } else if (queryLower.includes('graphql')) {
      addNode('skill-graphql', 'GraphQL', 'skill');
      employees.forEach(e => {
        if (e.technicalSkills.some(s => s.name.toLowerCase() === 'graphql')) {
          addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
          addEdge(e.id, 'skill-graphql', 'knows');
        }
      });
    } else {
      // Default org structure mapping
      employees.forEach(e => {
        addNode(e.id, e.name, 'employee', { role: e.role, dept: e.department });
        if (e.managerId) {
          const mgr = employees.find(m => m.id === e.managerId);
          if (mgr) {
            addNode(mgr.id, mgr.name, 'employee', { role: mgr.role, dept: mgr.department });
            addEdge(e.id, e.managerId, 'reports_to');
          }
        }
        if (e.mentorId) {
          const mtr = employees.find(m => m.id === e.mentorId);
          if (mtr) {
            addNode(mtr.id, mtr.name, 'employee', { role: mtr.role, dept: mtr.department });
            addEdge(e.id, e.mentorId, 'mentored_by');
          }
        }
      });
    }

    res.status(200).json({ nodes, edges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Connect Git account (GitHub or GitLab) for an employee
 */
app.post('/api/employees/:id/connect-git', async (req, res) => {
  const { id } = req.params;
  const { platform, username } = req.body;

  if (!platform || !username) {
    return res.status(400).json({ error: 'Platform and username are required.' });
  }

  try {
    const employee = await db.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    let metrics;
    if (platform === 'github') {
      metrics = await fetchGitHubMetrics(username);
      employee.github_username = username;
    } else if (platform === 'gitlab') {
      metrics = await fetchGitLabMetrics(username);
      employee.gitlab_username = username;
    } else {
      return res.status(400).json({ error: 'Invalid platform. Supported: github, gitlab' });
    }

    // Map metrics to employee technical skills
    employee.technicalSkills = mapGitMetricsToSkills(metrics, employee.technicalSkills);

    // Save updated employee
    const updated = await db.saveEmployee(employee);

    // Fire-and-forget Audit log
    logAudit({
      actorId: id,
      actorRole: 'employee',
      action: 'connect_git',
      targetType: 'employee',
      targetId: id,
      metadata: { platform, username, reposCount: Object.keys(metrics.languages).length }
    });

    res.status(200).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get organization repositories (with code-maat metrics)
 */
app.get('/api/git-org/repos', async (req, res) => {
  try {
    const repos = getOrgRepositories();
    res.status(200).json(repos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Analyze an organization repository using JS code-maat (cloned/simulated)
 */
app.post('/api/git-org/analyze', async (req, res) => {
  const { repoPath, repoName, primarySkill } = req.body;

  if (!repoName || !primarySkill) {
    return res.status(400).json({ error: 'repoName and primarySkill are required.' });
  }

  try {
    const pathToCheck = repoPath || '.';
    const analysis = await analyzeRepository(pathToCheck, repoName, primarySkill);

    // Fire-and-forget Audit log
    logAudit({
      actorId: 'admin',
      actorRole: 'admin',
      action: 'analyze_repo',
      targetType: 'project',
      targetId: repoName,
      metadata: { repoPath: pathToCheck, repoName, primarySkill, truckFactor: analysis.truckFactor }
    });

    res.status(200).json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// Graph API Routes
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/graph/spof
 * SPOF Detection — Cypher-powered if Neo4j enabled, else in-memory fallback.
 */
app.get('/api/graph/spof', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const threshold = parseInt(req.query.threshold as string) || 4;
    const spofs = await findSPOFs(employees, projects, threshold);
    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: (req as any).user?.role || (req.headers['x-mock-role'] as string),
      action: 'view_spof_graph',
      targetType: 'graph',
      metadata: { threshold, isLive: isNeo4jEnabled() }
    });
    res.json({ spofs, isLive: isNeo4jEnabled() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/graph/talent-network
 * Full graph data for visualization — employees, skills, projects, relationships.
 */
app.get('/api/graph/talent-network', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const dept = req.query.department as string | undefined;
    const minProf = parseInt(req.query.minProficiency as string) || 1;
    const graph = await getTalentNetworkGraph(employees, projects, { department: dept, minProficiency: minProf });
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/graph/path-to-coverage
 * Find the shortest upskill path from a skill gap to an internal candidate.
 */
app.post('/api/graph/path-to-coverage', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { skillName } = req.body;
    if (!skillName) return res.status(400).json({ error: 'skillName is required' });
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    const paths = await findPathToCoverage(skillName, employees, projects);
    res.json({ paths, isLive: isNeo4jEnabled() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/graph/sync
 * Admin-triggered manual resync from Postgres → Neo4j.
 */
app.post('/api/graph/sync', requireRole('admin'), async (req, res) => {
  try {
    if (!isNeo4jEnabled()) {
      return res.json({ message: 'Neo4j not configured — using in-memory graph fallback. Add NEO4J_* env vars to enable.' });
    }
    const employees = await db.getEmployees();
    const projects = await db.getProjects();
    await syncAllToGraph(employees, projects);
    logAudit({
      actorId: (req as any).user?.id || (req.headers['x-mock-user-id'] as string),
      actorRole: 'admin',
      action: 'manual_graph_sync',
      targetType: 'graph',
      metadata: { employeeCount: employees.length, projectCount: projects.length }
    });
    res.json({ message: `Synced ${employees.length} employees and ${projects.length} projects to Neo4j.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening if not running on Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`🚀 Workforce Intelligence Platform Server running on http://localhost:${PORT}`);
    initScheduler();
    // Initialize Neo4j and do initial graph sync
    initNeo4j();
    if (isNeo4jEnabled()) {
      try {
        const employees = await db.getEmployees();
        const projects = await db.getProjects();
        await syncAllToGraph(employees, projects);
      } catch (err: any) {
        console.error('[GraphSync] Initial sync failed:', err.message);
      }
    }
  });
} else {
  initScheduler();
  initNeo4j();
}

export default app;
