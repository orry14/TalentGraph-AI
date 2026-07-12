import dotenv from 'dotenv';
dotenv.config();
import Anthropic from '@anthropic-ai/sdk';
import { Employee, Project } from '../db/seedData.js';
import { sanitizeForAI } from '../utils/biasGuard.js';

class AIService {
  private anthropic: Anthropic | null = null;
  private isAIEnabled = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey !== 'YOUR_ANTHROPIC_API_KEY') {
      try {
        this.anthropic = new Anthropic({ apiKey });
        this.isAIEnabled = true;
        console.log('✅ Anthropic Claude API client initialized successfully.');
      } catch (err) {
        console.error('❌ Failed to initialize Anthropic client:', err);
        this.isAIEnabled = false;
      }
    } else {
      console.log('ℹ️ ANTHROPIC_API_KEY not found or placeholder used. Running in Simulated AI mode.');
      this.isAIEnabled = false;
    }
  }

  // --- Real Claude Integration Helpers ---
  
  private async callClaude(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isAIEnabled || !this.anthropic) {
      throw new Error('Claude API is not enabled');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      // Handle content block return types
      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock && 'text' in textBlock ? textBlock.text : '';
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  // --- Core Features ---

  /**
   * 1. Resume Intelligence: Parse resume text and extract skills/experience
   */
  public async parseResume(resumeText: string): Promise<Partial<Employee>> {
    if (this.isAIEnabled) {
      const systemPrompt = `You are a resume parsing AI. Extract employee information in JSON format from the resume text. 
Return ONLY a valid JSON object matching this structure:
{
  "name": "string",
  "role": "string",
  "experienceYears": number,
  "technicalSkills": [{"name": "string", "proficiency": number}], // proficiency 1 to 5
  "softSkills": ["string"],
  "certifications": ["string"],
  "profileSummary": "string"
}`;
      try {
        const resultText = await this.callClaude(resumeText, systemPrompt);
        // Clean JSON formatting from Claude if any
        const cleanedJson = resultText.substring(
          resultText.indexOf('{'),
          resultText.lastIndexOf('}') + 1
        );
        return JSON.parse(cleanedJson);
      } catch (err) {
        console.warn('Real AI parsing failed. Falling back to simulator:', err);
      }
    }

    // --- Simulator Mode ---
    return this.simulateResumeParse(resumeText);
  }

  /**
   * 2. Learning Recommendations: Suggest certifications, roadmaps, estimated timelines
   */
  public async generateLearningRecommendations(employee: Employee): Promise<any[]> {
    if (this.isAIEnabled) {
      const systemPrompt = `You are an AI career coach. Generate 4 customized learning recommendations in JSON format based on the employee's current skills, experience, and role.
Return ONLY a valid JSON array of objects matching this structure:
[
  {
    "courseName": "string",
    "type": "course" | "certification" | "project",
    "roadmap": ["Step 1", "Step 2", "Step 3"],
    "timeline": "string (e.g. 3 months)",
    "description": "string"
  }
]`;
      try {
        const prompt = `Employee Profile:\n${JSON.stringify(employee, null, 2)}`;
        const resultText = await this.callClaude(prompt, systemPrompt);
        const cleanedJson = resultText.substring(
          resultText.indexOf('['),
          resultText.lastIndexOf(']') + 1
        );
        return JSON.parse(cleanedJson);
      } catch (err) {
        console.warn('Real AI learning generation failed. Falling back to simulator:', err);
      }
    }

    // --- Simulator Mode ---
    return this.simulateLearningRecs(employee);
  }

  /**
   * 3. Promotion Readiness: Analyze metrics, generate readiness scores
   */
  public async evaluatePromotionReadiness(employee: Employee): Promise<any> {
    const cleanEmployee = sanitizeForAI(employee) as Employee;
    if (this.isAIEnabled) {
      const systemPrompt = `You are an AI talent evaluation agent. Evaluate the employee's readiness for promotion.
Return ONLY a valid JSON object matching this structure:
{
  "promotionScore": number, // 0 to 100
  "reasoning": "string (detailed summary)",
  "areasToImprove": ["string"]
}`;
      try {
        const prompt = `Employee Profile:\n${JSON.stringify(cleanEmployee, null, 2)}`;
        const resultText = await this.callClaude(prompt, systemPrompt);
        const cleanedJson = resultText.substring(
          resultText.indexOf('{'),
          resultText.lastIndexOf('}') + 1
        );
        return JSON.parse(cleanedJson);
      } catch (err) {
        console.warn('Real AI promotion evaluation failed. Falling back to simulator:', err);
      }
    }

    // --- Simulator Mode ---
    return this.simulatePromotionReadiness(cleanEmployee);
  }

  /**
   * 4. AI Chat Assistant: Respond to workforce capability questions
   */
  public async askChatBot(
    message: string,
    context: { employees: Employee[]; projects: Project[] }
  ): Promise<string> {
    if (this.isAIEnabled) {
      const prompt = `You are Workforce Intelligence Chatbot, a helpful enterprise AI assistant.
Answer the user's questions based on the following employee and project data. 
Be concise, analytical, and structured (use lists and markdown where appropriate).

Employee Data:
${JSON.stringify(context.employees, null, 2)}

Project Data:
${JSON.stringify(context.projects, null, 2)}

User Question: "${message}"`;
      try {
        return await this.callClaude(prompt, 'You are an elite workforce planning analyst assistant.');
      } catch (err) {
        console.warn('Real AI chat failed. Falling back to simulator:', err);
      }
    }

    // --- Simulator Mode ---
    return this.simulateChatBot(message, context);
  }

  /**
   * 5. Generate Semantic Embedding (1536 dimensions)
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    // If real OpenAI/Voyage API is used, call it here.
    // For demo purposes, we create a deterministic mock vector based on keywords.
    const vec = new Array(1536).fill(0);
    const textLower = text.toLowerCase();
    
    // Map skills to specific indices to simulate semantic clustering
    const skillIndices: Record<string, number> = {
      'react': 0, 'typescript': 1, 'aws': 2, 'docker': 3, 'kubernetes': 4,
      'python': 5, 'node': 6, 'figma': 7, 'llm': 8, 'machine learning': 9,
      'frontend': 10, 'backend': 11, 'devops': 12, 'designer': 13, 'sql': 14,
      'graphql': 15, 'redis': 16, 'terraform': 17, 'next.js': 18, 'pytorch': 19,
      'engineer': 20, 'developer': 21, 'manager': 22, 'cloud': 23, 'data': 24
    };

    Object.entries(skillIndices).forEach(([skill, idx]) => {
      if (textLower.includes(skill)) {
        vec[idx] = 1.0;
      }
    });

    // Add slight noise to the rest for realism
    for(let i = 25; i < 1536; i++) {
      vec[i] = (Math.random() * 0.05); 
    }

    // Normalize
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(v => magnitude === 0 ? 0 : v / magnitude);
  }

  // ==========================================
  // --- Simulators for Out-of-box Run ---
  // ==========================================

  private simulateResumeParse(text: string): Partial<Employee> {
    const lines = text.split('\n');
    const nameLine = lines[0] || 'Jane Doe';
    
    // Guess a name
    let name = nameLine.trim();
    if (name.length > 50 || name.includes(':')) {
      name = 'Jane Doe';
    }

    // Look for keywords to identify roles
    let role = 'Software Engineer';
    let department = 'Engineering';
    const textLower = text.toLowerCase();
    
    if (textLower.includes('designer') || textLower.includes('figma') || textLower.includes('ux') || textLower.includes('ui')) {
      role = 'Product Designer';
      department = 'Design';
    } else if (textLower.includes('researcher') || textLower.includes('machine learning') || textLower.includes('data scientist') || textLower.includes('ml')) {
      role = 'Machine Learning Engineer';
      department = 'Data Science';
    } else if (textLower.includes('product manager') || textLower.includes('pm') || textLower.includes('scrum')) {
      role = 'Product Manager';
      department = 'Product';
    } else if (textLower.includes('devops') || textLower.includes('cloud') || textLower.includes('aws') || textLower.includes('kubernetes')) {
      role = 'DevOps Specialist';
      department = 'Engineering';
    } else if (textLower.includes('frontend') || textLower.includes('react') || textLower.includes('next.js')) {
      role = 'Frontend Engineer';
      department = 'Engineering';
    } else if (textLower.includes('backend') || textLower.includes('node') || textLower.includes('database')) {
      role = 'Backend Engineer';
      department = 'Engineering';
    }

    // Estimate experience
    let experienceYears = 3;
    const expMatch = textLower.match(/(\d+)\+?\s*years?/);
    if (expMatch && expMatch[1]) {
      experienceYears = parseInt(expMatch[1], 10);
    }

    // Extract skills
    const commonSkills = [
      'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes',
      'Terraform', 'SQL', 'PostgreSQL', 'Figma', 'UI/UX Design', 'Tailwind CSS',
      'Next.js', 'PyTorch', 'TensorFlow', 'LLMs', 'Git', 'Agile', 'Scrum',
      'Tableau', 'Redis', 'GraphQL', 'CI/CD'
    ];

    const technicalSkills: { name: string; proficiency: number }[] = [];
    commonSkills.forEach(skill => {
      if (textLower.includes(skill.toLowerCase())) {
        const prof = Math.floor(Math.random() * 3) + 3; // 3 to 5
        technicalSkills.push({ name: skill, proficiency: prof });
      }
    });

    if (technicalSkills.length === 0) {
      // Default fallback skills if none detected
      technicalSkills.push({ name: 'React', proficiency: 4 });
      technicalSkills.push({ name: 'TypeScript', proficiency: 4 });
      technicalSkills.push({ name: 'HTML/CSS', proficiency: 5 });
    }

    // Soft Skills
    const softs = ['Communication', 'Collaboration', 'Problem Solving', 'Creativity', 'Leadership', 'Analytical Thinking'];
    const softSkills: string[] = [];
    softs.forEach(s => {
      if (textLower.includes(s.toLowerCase()) || Math.random() > 0.5) {
        softSkills.push(s);
      }
    });
    if (softSkills.length > 4) softSkills.length = 4;

    // Certifications
    const certs = ['AWS Solutions Architect', 'Google Cloud Engineer', 'Figma Certified Professional', 'Scrum Master (PSM I)', 'Meta Frontend Developer'];
    const certifications: string[] = [];
    certs.forEach(c => {
      if (textLower.includes(c.toLowerCase()) || Math.random() > 0.7) {
        certifications.push(c);
      }
    });

    return {
      name,
      department,
      role,
      experienceYears,
      performanceRating: 4.0 + parseFloat((Math.random() * 0.9).toFixed(1)),
      technicalSkills,
      softSkills,
      certifications,
      profileSummary: `AI Parser Summary: Passionate and results-driven ${role} with ${experienceYears} years of experience. Demonstrated strength in ${technicalSkills.slice(0, 3).map(s => s.name).join(', ')}. Strong capability in ${softSkills.slice(0, 2).join(' and ')}.`,
      currentProjects: [],
    };
  }

  private simulateLearningRecs(employee: Employee): any[] {
    const role = employee.role.toLowerCase();
    const currentSkillNames = employee.technicalSkills.map(s => s.name.toLowerCase());

    const recs = [];

    // Course 1: Main role advancement
    if (role.includes('frontend') || role.includes('react') || role.includes('designer')) {
      recs.push({
        courseName: 'Advanced Next.js Architecture and SSR Optimization',
        type: 'course',
        roadmap: [
          'Master React Server Components (RSC) and Streaming',
          'Optimize image delivery, hydration payloads, and bundle splitting',
          'Deploy optimized Edge Middleware and caching configurations'
        ],
        timeline: '6 weeks',
        description: 'Deep dive into rendering paradigms, security headers, server components, and performance audits for modern Next.js deployments.'
      });
    } else if (role.includes('data') || role.includes('ml') || role.includes('researcher')) {
      recs.push({
        courseName: 'Large Language Model Ops (LLMOps) in Production',
        type: 'course',
        roadmap: [
          'Configure pipeline for LLM fine-tuning with LoRA/QLoRA',
          'Set up vector databases (Pinecone, Chroma) for RAG networks',
          'Implement evaluation frameworks (Ragas, TruLens) for prompt testing'
        ],
        timeline: '8 weeks',
        description: 'Learn the engineering principles required to deploy, monitor, and scale generative AI and Large Language Models inside enterprise applications.'
      });
    } else {
      recs.push({
        courseName: 'Microservices with Node.js, NestJS and Event-Driven Architecture',
        type: 'course',
        roadmap: [
          'Design distributed schemas and asynchronous communication via RabbitMQ',
          'Implement transactional outbox patterns for reliable events',
          'Configure centralized logging and OpenTelemetry tracing'
        ],
        timeline: '8 weeks',
        description: 'Transition from monoliths to highly decoupled systems using event streams, message brokers, and enterprise Node.js frameworks.'
      });
    }

    // Recommendation 2: Cloud / Infrastructure (highly valuable cross-skilling)
    if (!currentSkillNames.includes('aws') && !currentSkillNames.includes('kubernetes')) {
      recs.push({
        courseName: 'AWS Certified Solutions Architect - Associate',
        type: 'certification',
        roadmap: [
          'Master AWS networking (VPCs, Subnets, Route53, CloudFront)',
          'Implement secure auto-scaling compute groups (EC2, ECS, Fargate)',
          'Study identity IAM management, databases (RDS, DynamoDB), and S3 security'
        ],
        timeline: '3 months',
        description: 'Establish foundational expertise in cloud infrastructure design, storage services, security controls, and high-availability systems.'
      });
    } else {
      recs.push({
        courseName: 'Certified Kubernetes Administrator (CKA)',
        type: 'certification',
        roadmap: [
          'Study core orchestration components: scheduler, API server, Kubelet',
          'Build cluster networking, persistent volumes, and custom resources',
          'Practice scheduling pods, daemonsets, and troubleshooting nodes'
        ],
        timeline: '2 months',
        description: 'Master container orchestration, cluster deployments, scheduling, networking configurations, and system troubleshooting.'
      });
    }

    // Recommendation 3: Technical gap or modern tech
    if (!currentSkillNames.includes('typescript') && (role.includes('engineer') || role.includes('developer'))) {
      recs.push({
        courseName: 'TypeScript Enterprise Patterns & Type Safety',
        type: 'course',
        roadmap: [
          'Learn advanced generics, conditional types, and utility types',
          'Establish strict type linting and decorators in compiler configs',
          'Refactor existing JS APIs to TS with clean declarations'
        ],
        timeline: '4 weeks',
        description: 'Eliminate runtime bugs and maximize developer ergonomics by implementing strict type systems in application architectures.'
      });
    } else if (currentSkillNames.includes('react') && !currentSkillNames.includes('tailwind css')) {
      recs.push({
        courseName: 'Design Systems with Tailwind CSS & Component Libraries',
        type: 'course',
        roadmap: [
          'Build responsive UI tokens for spacing, typography, and dark-mode',
          'Implement accessible component interactions using Headless UI/Radix',
          'Optimize CSS bundle sizes and post-process layouts'
        ],
        timeline: '3 weeks',
        description: 'Master CSS orchestration for scale, allowing rapid UI development using utility-first styling patterns.'
      });
    } else {
      recs.push({
        courseName: 'GraphQL Federation & Gateway Routing at Scale',
        type: 'course',
        roadmap: [
          'Define structured schemas and subgraph specifications',
          'Configure Apollo Router with shared security policies',
          'Optimize resolvers using DataLoader caching to prevent N+1 queries'
        ],
        timeline: '5 weeks',
        description: 'Learn to merge multiple microservice schemas into a single unified API endpoint with federated graph routing.'
      });
    }

    // Recommendation 4: Practice project
    recs.push({
      courseName: 'Build an Event-Driven Task Scheduler Platform',
      type: 'project',
      roadmap: [
        'Write task queuing backend using Redis streams and Node/Python worker threads',
        'Build a real-time reactive monitoring dashboard with Server-Sent Events (SSE)',
        'Package in Docker-compose and write auto-deploy scripts'
      ],
      timeline: '4 weeks',
      description: 'Hands-on project to practice systems design, concurrency, redis caching, and real-time WebSockets/SSE channels.'
    });

    return recs;
  }

  private simulatePromotionReadiness(employee: Employee): any {
    // Base readiness on experience, performance, and skills count
    const rating = employee.performanceRating;
    const exp = employee.experienceYears;
    const skillCount = employee.technicalSkills.length;

    // Calculate a realistic readiness score
    let score = 50;
    score += (rating - 3.0) * 20; // 3.0 performance rating gives +0, 4.0 gives +20, 5.0 gives +40
    score += Math.min(exp * 3, 25); // up to +25 for experience
    score += Math.min(skillCount * 1.5, 15); // up to +15 for skillset breadth
    score = Math.min(Math.round(score), 100);

    // Draft reasoning based on role and score
    let reasoning = '';
    const improvements: string[] = [];

    if (score >= 85) {
      reasoning = `${employee.name} is demonstrating exceptional capability in their role as a ${employee.role}. With a performance rating of ${employee.performanceRating} and ${employee.experienceYears} years of experience, they consistently deliver high-quality outcomes. Their advanced knowledge of ${employee.technicalSkills.slice(0, 3).map(s => s.name).join(', ')} has been crucial in leading project success. They have shown leadership qualities by mentoring peers and driving technical architecture.`;
      improvements.push('Transition into high-level business stakeholder communication');
      improvements.push('Focus on cross-department alignment and tech-strategy planning');
    } else if (score >= 70) {
      reasoning = `${employee.name} shows solid competency and is in a strong progression state. They have high performance (${employee.performanceRating}/5.0) and are key contributors on projects like ${employee.currentProjects.join(' or ') || 'internal tasks'}. While technically strong in ${employee.technicalSkills.slice(0, 2).map(s => s.name).join(', ')}, they need slightly more exposure leading end-to-end project timelines and presenting architectural decisions before moving to the next level.`;
      improvements.push('Take ownership of architectural designs for new features');
      improvements.push('Lead cross-functional sprints and sprint planning sessions');
      improvements.push('Expand technical depth in advanced technologies like cloud infrastructure');
    } else {
      reasoning = `${employee.name} is a valuable team member but requires more time to build experience and deepen technical proficiency in key areas. Their experience (${employee.experienceYears} years) and performance rating (${employee.performanceRating}) indicate room for growth. They should focus on increasing execution independence and tackling complex backend/frontend features with less supervision.`;
      improvements.push('Enhance core proficiency in essential tech stack elements (e.g. TypeScript/React/SQL)');
      improvements.push('Proactively document code architectures and review team pull requests');
      improvements.push('Develop stronger independence in resolving backend bugs and issues');
    }

    return {
      promotionScore: score,
      reasoning,
      areasToImprove: improvements
    };
  }

  private simulateChatBot(
    message: string,
    context: { employees: Employee[]; projects: Project[] }
  ): string {
    const msg = message.toLowerCase();
    const emps = context.employees;
    const projs = context.projects;

    // 1. "Who reports to [Name]?"
    if (msg.includes('report') || msg.includes('manager') || msg.includes('subordinate')) {
      // Find the manager
      const manager = emps.find(e => msg.includes(e.name.toLowerCase()) || msg.includes(e.name.split(' ')[0].toLowerCase())) || emps[0]; // fallback to Alex Rivera
      const reports = emps.filter(e => e.managerId === manager.id);
      
      let reply = `### Reporting Hierarchy for **${manager.name}** (${manager.role})\n\n`;
      if (reports.length === 0) {
        reply += `Currently, no direct reports are registered for **${manager.name}** in the Org Digital Twin.\n`;
      } else {
        reply += `Here are the direct reports identified in the org chart:\n\n`;
        reply += `| Employee Name | Role | Department | Performance Rating |\n`;
        reply += `| :--- | :--- | :--- | :--- |\n`;
        reports.forEach(r => {
          reply += `| **${r.name}** | ${r.role} | ${r.department} | ${r.performanceRating} / 5.0 |\n`;
        });
        reply += `\n[ACTION: navigate | target: skill-graph | label: View Hierarchy in Digital Twin]`;
      }
      return reply;
    }

    // 2. "Who knows [Skill]?" / "Who has [Skill] experience?"
    if (msg.includes('knows') || msg.includes('has experience') || msg.includes('skills')) {
      const skillsToSearch = ['react', 'typescript', 'aws', 'docker', 'kubernetes', 'terraform', 'python', 'pytorch', 'tensorflow', 'llms', 'sql', 'figma', 'graphql', 'redis'];
      const matchedSkill = skillsToSearch.find(s => msg.includes(s)) || 'react';
      
      const experts = emps
        .filter(e => e.technicalSkills.some(s => s.name.toLowerCase() === matchedSkill))
        .map(e => ({
          name: e.name,
          role: e.role,
          prof: e.technicalSkills.find(s => s.name.toLowerCase() === matchedSkill)?.proficiency || 0
        }))
        .sort((a, b) => b.prof - a.prof);

      let reply = `### Skill Query: Expertise in **${matchedSkill.toUpperCase()}**\n\n`;
      if (experts.length === 0) {
        reply += `No employees are registered with direct **${matchedSkill}** skills in their expertise mapping.\n`;
      } else {
        reply += `Here are the matching resources sorted by proficiency rating:\n\n`;
        reply += `| Employee | Current Role | Proficiency Level |\n`;
        reply += `| :--- | :--- | :--- |\n`;
        experts.forEach(e => {
          reply += `| **${e.name}** | ${e.role} | ${'★'.repeat(e.prof)}${'☆'.repeat(5 - e.prof)} (${e.prof}/5) |\n`;
        });
        reply += `\n[ACTION: navigate | target: skill-graph | label: Open Knowledge Graph]`;
      }
      return reply;
    }

    // 3. "Who has worked with Banking + AWS?"
    if (msg.includes('banking') && msg.includes('aws')) {
      const matches = emps.filter(e => 
        (e.pastExperience?.some(p => p.toLowerCase().includes('banking')) || e.clients?.some(c => c.toLowerCase().includes('bank'))) &&
        e.technicalSkills.some(s => s.name.toLowerCase() === 'aws')
      );

      let reply = `### Experienced Talents: **Banking + AWS**\n\n`;
      reply += `Cross-matching client histories with technical capabilities found the following candidates:\n\n`;
      if (matches.length === 0) {
        reply += `No employees matched both Banking experience and AWS cloud certifications.\n`;
      } else {
        reply += `| Name | Role | Clients | AWS Certifications |\n`;
        reply += `| :--- | :--- | :--- | :--- |\n`;
        matches.forEach(m => {
          const cert = m.certifications.find(c => c.includes('AWS')) || 'AWS Certified';
          reply += `| **${m.name}** | ${m.role} | ${m.clients?.join(', ') || 'N/A'} | ${cert} |\n`;
        });
      }
      return reply;
    }

    // 4. "Who worked with Sarah Chen?"
    if (msg.includes('worked with sarah') || msg.includes('sarah chen')) {
      // Find Sarah Chen's active projects
      const sarah = emps.find(e => e.id === 'emp-02');
      const sarahProjs = sarah ? sarah.currentProjects : [];
      const coworkers = emps.filter(e => e.id !== 'emp-02' && e.currentProjects.some(p => sarahProjs.includes(p)));

      let reply = `### Network Connections: Collaborators with **Sarah Chen**\n\n`;
      reply += `Based on current assigned project workloads, Sarah Chen is collaborating on **${sarahProjs.join(', ')}** with:\n\n`;
      if (coworkers.length === 0) {
        reply += `No coworkers are currently sharing projects with Sarah.\n`;
      } else {
        reply += `| Collaborator | Role | Shared Project |\n`;
        reply += `| :--- | :--- | :--- |\n`;
        coworkers.forEach(c => {
          const shared = c.currentProjects.filter(p => sarahProjs.includes(p)).join(', ');
          reply += `| **${c.name}** | ${c.role} | ${shared} |\n`;
        });
      }
      return reply;
    }

    // 5. "Who can mentor React developers?"
    if (msg.includes('mentor') && msg.includes('react')) {
      const mentors = emps.filter(e => 
        e.technicalSkills.some(s => s.name.toLowerCase() === 'react' && s.proficiency >= 4) &&
        e.softSkills.includes('Mentorship')
      );

      let reply = `### Mentorship Recommendation: **React Mentors**\n\n`;
      reply += `Seniors with advanced React skills (proficiency >= 4/5) and registered mentorship capabilities:\n\n`;
      if (mentors.length === 0) {
        reply += `No high-proficiency React developers are currently designated as Mentors.\n`;
      } else {
        reply += `| Mentor Name | Current Role | Experience Years | React Level |\n`;
        reply += `| :--- | :--- | :--- | :--- |\n`;
        mentors.forEach(m => {
          const reactLvl = m.technicalSkills.find(s => s.name === 'React')?.proficiency || 4;
          reply += `| **${m.name}** | ${m.role} | ${m.experienceYears} Years | Level ${reactLvl}/5 |\n`;
        });
      }
      return reply;
    }

    // 6. "Who should replace [Name]?"
    if (msg.includes('replace')) {
      const targetName = msg.includes('alex') ? 'Alex Rivera' : 'Sarah Chen';
      const targetEmp = emps.find(e => e.name.toLowerCase().includes(targetName.split(' ')[0].toLowerCase())) || emps[0];
      
      // Look for candidates with similar skills
      const targetSkills = targetEmp.technicalSkills.map(s => s.name.toLowerCase());
      const alternates = emps
        .filter(e => e.id !== targetEmp.id)
        .map(e => {
          let score = 0;
          e.technicalSkills.forEach(s => {
            if (targetSkills.includes(s.name.toLowerCase())) {
              score += s.proficiency;
            }
          });
          return {
            employee: e,
            matchScore: Math.round((score / Math.max(1, targetSkills.length * 5)) * 100)
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);

      let reply = `### AI Succession Planning: Replacements for **${targetEmp.name}**\n\n`;
      reply += `Here are the top internal succession candidates ranked by skill coverage overlap:\n\n`;
      alternates.forEach((alt, idx) => {
        reply += `${idx + 1}. **${alt.employee.name}** - ${alt.employee.role} (${alt.matchScore}% skill match)\n`;
        reply += `   * *Performance:* ${alt.employee.performanceRating}/5.0 | *Current Projects:* ${alt.employee.currentProjects.length} active\n`;
      });
      reply += `\n**Succession Action:** We recommend running a Career Resignation Simulation for **${targetEmp.name}** to observe cascading project dependencies.\n\n`;
      reply += `[ACTION: simulate | employeeId: ${targetEmp.id} | type: departure | label: Run Career Simulation for ${targetEmp.name}]`;
      return reply;
    }

    // 7. "Can we take another banking project?"
    if (msg.includes('another banking project') || msg.includes('banking project')) {
      const bankingExperts = emps.filter(e => e.pastExperience?.includes('Banking') || e.clients?.includes('Banking Group'));
      const freeSeniors = emps.filter(e => e.currentProjects.length === 0 && e.experienceYears >= 6);

      let reply = `### Feasibility Analysis: **New Banking Project**\n\n`;
      reply += `**Feasibility Status: Yes, with Moderate Risk (Success Probability: 78%)**\n\n`;
      reply += `**Insights & Capitalization:**\n`;
      reply += `- **Domain Experts Available:** We have ${bankingExperts.length} domain experts (including Alex Rivera and David Kim).\n`;
      reply += `- **Unassigned Bandwidth:** We have ${freeSeniors.length} experienced developers currently on the bench.\n\n`;
      reply += `**Key Risk Factors:**\n`;
      reply += `1. **Resource Conflict:** Our top banking experts are already staffed on *NextGen Core API*.\n`;
      reply += `2. **Recruitment Requisition:** Initiating a new contract would require locking down an additional DevOps lead.\n\n`;
      reply += `[ACTION: navigate | target: staffing | label: Assemble New Staffing Layout]`;
      return reply;
    }

    // 8. "Who is overloaded?"
    if (msg.includes('overloaded') || msg.includes('overload') || msg.includes('busy')) {
      const overloaded = emps.filter(e => e.currentProjects.length >= 2);

      let reply = `### Resource Warning: Over-allocated Talents\n\n`;
      reply += `Employees currently assigned to **2 or more projects simultaneously**:\n\n`;
      if (overloaded.length === 0) {
        reply += `All employees are operating within normal capacity allocations (< 2 projects).\n`;
      } else {
        reply += `| Employee | Department | Role | Active Projects | Attrition Risk |\n`;
        reply += `| :--- | :--- | :--- | :--- | :--- |\n`;
        overloaded.forEach(o => {
          const risk = o.experienceYears > 8 ? 'High' : 'Medium';
          reply += `| **${o.name}** | ${o.department} | ${o.role} | ${o.currentProjects.join(', ')} | **${risk}** |\n`;
        });
        reply += `\nWe recommend using the **Cross Project Conflict Resolver** to balance workloads.\n\n`;
        reply += `[ACTION: navigate | target: staffing | label: Open Conflict Resolver]`;
      }
      return reply;
    }

    // 9. "Which department has AI gaps?"
    if (msg.includes('ai gaps') || msg.includes('ai gap') || msg.includes('skills gap')) {
      let reply = `### Capability Gap Analysis: **AI & Deep Learning**\n\n`;
      reply += `We mapped the density of advanced AI skills (LLMs, PyTorch, ML) across departments:\n\n`;
      reply += `| Department | AI Headcount | Average Proficiency | Gap Severity |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      reply += `| **Data Science** | 2 | 4.5 / 5.0 | Healthy |\n`;
      reply += `| **Engineering** | 1 | 3.0 / 5.0 | Moderate |\n`;
      reply += `| **Design** | 0 | 0.0 / 5.0 | Critical |\n`;
      reply += `| **Product** | 0 | 0.0 / 5.0 | Critical |\n`;
      reply += `\n**Key Gaps**: While Data Science is healthy, Engineering lacks native deployment capacity for ML systems. Marcus Vance (Design) needs training in basic Prompt/UX layout heuristics.\n\n`;
      reply += `[ACTION: navigate | target: gap-analysis | label: View Full Skill Gap Report]`;
      return reply;
    }

    // 10. "Which engineers are promotion ready?"
    if (msg.includes('promotion') || msg.includes('promotion ready')) {
      const ready = emps
        .map(e => {
          const rating = e.performanceRating;
          const exp = e.experienceYears;
          const score = Math.round(50 + (rating - 3.0) * 20 + Math.min(exp * 3, 25));
          return { e, score };
        })
        .filter(r => r.score >= 80)
        .sort((a, b) => b.score - a.score);

      let reply = `### Career Pathing: Promotion Readiness Assessment\n\n`;
      reply += `Top employees ranking high on leadership readiness, tenure, and performance benchmarks:\n\n`;
      reply += `| Candidate | Role | Performance Rating | Readiness Index |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      ready.forEach(r => {
        reply += `| **${r.e.name}** | ${r.e.role} | ${r.e.performanceRating} / 5.0 | **${r.score}% (Ready Now)** |\n`;
      });
      reply += `\nClick on the Employee Workspace to view detailed growth areas and customize their upskilling pathway.\n\n`;
      reply += `[ACTION: navigate | target: employees | label: Open Employee Workspace]`;
      return reply;
    }

    // 11. "Who is likely to resign?" / "attrition"
    if (msg.includes('resign') || msg.includes('attrition') || msg.includes('flight risk')) {
      let reply = `### Talent Retention: Flight Risk Predictions\n\n`;
      reply += `Based on disengagement indices, performance ratings, and workload assessments:\n\n`;
      reply += `| Employee | Department | Attrition Risk | Primary Disengagement Driver |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      reply += `| **Alex Rivera** | Engineering | **78% (High)** | High market demand / Seniority cap |\n`;
      reply += `| **Elena Rostova** | Engineering | **64% (Medium)** | Multi-project context switching overload |\n`;
      reply += `| **Sofia Martinez** | Data Science | **35% (Low)** | Entry-level mentorship alignment gaps |\n`;
      reply += `\n**AI Recommendation:** We suggest offering targeted retention bonuses or restructuring Alex Rivera's role before executing any structural changes.\n`;
      return reply;
    }

    // 12. "Which project is most risky?"
    if (msg.includes('risky') || msg.includes('project risk') || msg.includes('most risky')) {
      let reply = `### Risk Management: Project Delivery Success Assessments\n\n`;
      reply += `Project health indexes mapped against resource coverage:\n\n`;
      reply += `1. **Customer Portal Redesign**: **Health Score: 54 (High Risk)**\n`;
      reply += `   * *Reason:* Lacks a qualified QA Automation specialist and has a high budget consumption rate (85% used).\n`;
      reply += `2. **AI Talent Extractor**: **Health Score: 72 (Warning)**\n`;
      reply += `   * *Reason:* Sarah Chen is overallocated at 200% capacity, posing a severe bottlenecks risk.\n`;
      reply += `3. **NextGen Core API**: **Health Score: 88 (Healthy)**\n`;
      reply += `4. **Design System 2.0**: **Health Score: 95 (Excellent)**\n\n`;
      reply += `[ACTION: navigate | target: projects | label: View Project Health Dashboard]`;
      return reply;
    }

    // 12a. "Which project needs more engineers?"
    if (msg.includes('need more engineers') || msg.includes('needs more engineers') || msg.includes('need engineers') || msg.includes('needs engineers')) {
      let reply = `### Resource Deficit: Project Staffing Gaps\n\n`;
      reply += `Projects requiring resource reinforcement:\n\n`;
      reply += `- **Customer Portal Redesign**: Needs **1 QA Engineer** to resolve Phase 3 testing blockages.\n`;
      reply += `- **AI Talent Extractor**: Needs **1 Backend Engineer** to offload Sarah Chen (currently 200% allocated).\n`;
      reply += `- **NextGen Core API**: Needs **1 DevOps Engineer** backup to resolve Alex Rivera's multi-project workload.\n\n`;
      reply += `**Recommendation:** Use the Project Staffing Engine to select these seed projects and mathematically calculate optimal backups.\n\n`;
      reply += `[ACTION: navigate | target: staffing | label: Run Staffing Optimizer]`;
      return reply;
    }

    // 12b. "Why is [Project] unhealthy?"
    if (msg.includes('why is') && (msg.includes('unhealthy') || msg.includes('un-healthy') || msg.includes('risk') || msg.includes('warning'))) {
      const isCoreApi = msg.includes('nextgen') || msg.includes('core api');
      const isTalent = msg.includes('talent') || msg.includes('extractor');
      
      let reply = `### AI Health Diagnostic\n\n`;
      if (isCoreApi) {
        reply += `**NextGen Core API (Health Score: 88 - Healthy)**\n`;
        reply += `- **Timeline Progress:** On track (timeline progress at 50% vs. 6 months duration).\n`;
        reply += `- **Resource Warning:** Technical Lead Alex Rivera is allocated at 150% across two concurrent projects.\n`;
        reply += `- **SPOF:** AWS/Redis cloud configurations are siloed with Alex Rivera.\n`;
      } else if (isTalent) {
        reply += `**AI Talent Extractor (Health Score: 72 - Warning)**\n`;
        reply += `- **Timeline Progress:** Slight delay risk (ingestion module lagging).\n`;
        reply += `- **Resource Warning:** Sarah Chen is allocated at 200% capacity representing a critical single bottleneck.\n`;
        reply += `- **SPOF:** Custom NLP parsing knowledge resides entirely with Sarah Chen.\n`;
      } else {
        reply += `**Customer Portal Redesign (Health Score: 54 - High Risk)**\n`;
        reply += `- **Missing Skills:** Lacks a Senior QA engineer to validate WebSocket subscriptions.\n`;
        reply += `- **Budget Overrun:** Budget usage is at 85% with 2 months remaining (exceeds milestones progress by 35%).\n`;
        reply += `- **Schedule Delay:** 2 overdue tasks detected on the main timeline.\n`;
      }
      reply += `\n[ACTION: navigate | target: projects | label: Open Projects Dashboard]`;
      return reply;
    }

    // 12c. "Which project will likely miss its deadline?"
    if (msg.includes('miss its deadline') || msg.includes('miss deadline') || msg.includes('missed deadline') || msg.includes('delay')) {
      let reply = `### Delivery Forecast: Schedule Latency Predictions\n\n`;
      reply += `AI Forecast model predictions for deadline completion risk:\n\n`;
      reply += `1. **Customer Portal Redesign** - **On-Time Delivery: 45% (Critical Risk)**\n`;
      reply += `   * *Estimated Completion:* Delayed by 15 days (Expected: 2026-08-15 vs. Target: 2026-08-01).\n`;
      reply += `2. **AI Talent Extractor** - **On-Time Delivery: 68% (Moderate Risk)**\n`;
      reply += `   * *Estimated Completion:* Delayed by 4 days (Expected: 2026-07-05 vs. Target: 2026-07-01).\n`;
      reply += `3. **NextGen Core API** - **On-Time Delivery: 92% (Low Risk)**\n\n`;
      reply += `**Mitigation Recommendation:** Delegate WebSocket tasks to bench engineers or reduce scope of Phase 4 customer portal.\n`;
      return reply;
    }

    // 12d. "Suggest improvements for [Project]"
    if (msg.includes('suggest improvements') || msg.includes('improvements for') || msg.includes('improvement')) {
      const isCoreApi = msg.includes('nextgen') || msg.includes('core api');
      const isTalent = msg.includes('talent') || msg.includes('extractor');
      
      let reply = `### AI Delivery Stabilization Recommendations\n\n`;
      if (isCoreApi) {
        reply += `#### Recommendations for **NextGen Core API**:\n`;
        reply += `1. **Upskill DevOps Backups:** Enroll James O'Connor in *AWS Certified Solutions Architect* to resolve Alex Rivera's SPOF. (+8% Health Score Improvement)\n`;
        reply += `2. **Split Allocation:** Balance Alex Rivera's workload 50/50 using the Conflict Resolver. (+5% Health Score Improvement)\n`;
      } else if (isTalent) {
        reply += `#### Recommendations for **AI Talent Extractor**:\n`;
        reply += `1. **Assign Backend Support:** Assign Marcus Vance to assist with resume parsing schemas to offload Sarah Chen. (+15% Delivery Confidence Improvement)\n`;
        reply += `2. **Upskill in LLMs:** Enroll Sofia Martinez in *Generative AI & LLM Fine-Tuning Bootcamp* to assist Sarah. (+12% Health Score Improvement)\n`;
      } else {
        reply += `#### Recommendations for **Customer Portal Redesign**:\n`;
        reply += `1. **Assign QA Engineer:** Hire a Senior QA Specialist or assign Sofia Martinez to WebSocket test pipelines immediately. (**Health Score rises by +26% to Healthy**)\n`;
        reply += `2. **Increase Budget:** Request an additional $15,000 contingency buffer to cover overrun risks. (+18% On-Time Probability Improvement)\n`;
        reply += `3. **Delay Release by One Week:** Adjust target timeline to accommodate testing blockages. (+10% Confidence Score Improvement)\n`;
      }
      reply += `\n[ACTION: navigate | target: projects | label: View Project Insights]`;
      return reply;
    }

    // 13. "Summarize engineering health."
    if (msg.includes('engineering health') || msg.includes('engineering') && msg.includes('health')) {
      let reply = `### Department Health Index: **Engineering**\n\n`;
      reply += `*   **Total Headcount**: 4 Engineers (Alex, Elena, Aisha, James)\n`;
      reply += `*   **Average Capability Score**: 84.5% (High Competency)\n`;
      reply += `*   **Primary Bottleneck**: Kubernetes & Infrastructure deployment knowledge is highly siloed in Aisha Rahman.\n`;
      reply += `*   **Bench Strength**: 0% (All engineers are fully loaded on active projects).\n\n`;
      reply += `#### Key Recommendations:\n`;
      reply += `1. Enroll James O'Connor in a DevOps upskilling pathway to mitigate SPOF risks.\n`;
      reply += `2. Open a requisition for 1 additional DevOps specialist.\n`;
      return reply;
    }

    // Default reply
    return `### Executive AI Copilot\n\nHello! I am your workforce analytics executive assistant. I have full semantic access to all Employee, Project, and Skill datasets.\n\nHere are some advanced strategic queries you can ask me:\n- *"Who reports to Alex Rivera?"*\n- *"Who has worked with Banking + AWS?"*\n- *"Who should replace Alex Rivera?"*\n- *"Which engineers are promotion ready?"*\n- *"Which project is most risky?"*\n- *"Can we take another banking project?"*\n- *"Who is overloaded?"*\n- *"Summarize engineering health."*\n- *"Who is likely to resign?"*`;
  }

}

export const aiService = new AIService();
