export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  experienceYears: number;
  performanceRating: number;
  technicalSkills: { name: string; proficiency: number; source?: 'self_reported' | 'github_verified' | 'admin_assigned' }[]; // proficiency: 1-5
  softSkills: string[];
  certifications: string[];
  resumeText: string;
  currentProjects: string[];
  profileSummary: string;
  
  // Enterprise Graph Extensions
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

export const seedEmployees: Employee[] = [
  {
    id: "emp-01",
    name: "Alex Rivera",
    email: "alex.rivera@workforce.ai",
    department: "Engineering",
    role: "Staff Engineer (Cloud & AI)",
    experienceYears: 10,
    performanceRating: 4.8,
    technicalSkills: [
      { name: "React", proficiency: 5 },
      { name: "TypeScript", proficiency: 5 },
      { name: "Node.js", proficiency: 5 },
      { name: "AWS", proficiency: 4 },
      { name: "Docker", proficiency: 4 },
      { name: "Kubernetes", proficiency: 4 },
      { name: "Terraform", proficiency: 4 },
      { name: "Python", proficiency: 3 }
    ],
    softSkills: ["Mentorship", "Leadership", "Architecture Design", "Strategic Planning"],
    certifications: ["AWS Certified Solutions Architect - Professional", "Certified Kubernetes Administrator (CKA)"],
    currentProjects: ["NextGen Core API", "AI Workforce Graphs"],
    billing_rate: 9000,
    cost_rate: 4000,
    allocationPercentage: 100,
    profileSummary: "Experienced software architect specializing in building scalable cloud-native architectures, microservices, and AI-enabled API integrations. Passionate about mentoring junior developers and establishing robust DevOps pipelines.",
    resumeText: "ALEX RIVERA\nStaff Engineer (Cloud & AI)\nSUMMARY:\nHighly accomplished Staff Engineer with 10 years of experience designing and building high-performance web applications and cloud architectures. Expert in React, Node.js, and container orchestration with Kubernetes.\nEXPERIENCE:\n- Staff Engineer at TechCorp (2022-Present)\n  Architected microservices processing 1M+ requests/day. Mentored 15+ engineers.\n- Lead Dev at DevSolutions (2018-2022)\n  Built React dashboard and migrated server infrastructure to AWS.\nSKILLS:\nReact, TypeScript, Node.js, AWS, Docker, Kubernetes, Terraform, Python.",
    managerId: undefined,
    mentorId: undefined,
    clients: ["Banking Group", "GovTech Solutions"],
    pastExperience: ["Banking", "SaaS", "E-commerce"],
    learningHistory: ["Deep Learning Fundamentals", "Advanced System Design"]
  },
  {
    id: "emp-02",
    name: "Sarah Chen",
    email: "sarah.chen@workforce.ai",
    department: "Data Science",
    role: "Senior ML Researcher",
    experienceYears: 7,
    performanceRating: 4.9,
    technicalSkills: [
      { name: "Python", proficiency: 5 },
      { name: "PyTorch", proficiency: 5 },
      { name: "TensorFlow", proficiency: 4 },
      { name: "SQL", proficiency: 4 },
      { name: "Pandas", proficiency: 5 },
      { name: "LLMs", proficiency: 5 },
      { name: "TypeScript", proficiency: 2 }
    ],
    softSkills: ["Scientific Research", "Technical Writing", "Analytical Thinking", "Cross-functional Collaboration"],
    certifications: ["DeepLearning.AI TensorFlow Developer", "Google Professional Machine Learning Engineer"],
    currentProjects: ["AI Talent Extractor", "Enterprise Chatbot Integration"],
    billing_rate: 11000,
    cost_rate: 5000,
    allocationPercentage: 100,
    profileSummary: "Machine learning specialist focused on Natural Language Processing (NLP) and Large Language Model (LLM) fine-tuning. Proven track rate of deploying deep learning models in production systems to drive automation and data intelligence.",
    resumeText: "SARAH CHEN\nSenior ML Researcher\nSUMMARY:\nSenior Data Scientist and Machine Learning Researcher with 7 years of experience. Specialist in deep learning, natural language processing, and integrating Large Language Models (LLMs) into SaaS platforms.\nEXPERIENCE:\n- Senior ML Researcher at NeuralInsights (2021-Present)\n  Fine-tuned LLM architectures to automate document analysis, improving accuracy by 35%.\n- Data Scientist at AnalyticsCorp (2019-2021)\n  Created predictive analytics models for customer behavior tracking.\nSKILLS:\nPython, PyTorch, TensorFlow, LLMs, SQL, Pandas, NLP.",
    managerId: "emp-01",
    mentorId: undefined,
    clients: ["Fintech Corp", "AI Labs"],
    pastExperience: ["Healthcare AI", "Predictive Analytics"],
    learningHistory: ["Transformers in NLP", "Generative AI Systems"]
  },
  {
    id: "emp-03",
    name: "Marcus Vance",
    email: "marcus.vance@workforce.ai",
    department: "Design",
    role: "Lead Product Designer",
    experienceYears: 8,
    performanceRating: 4.6,
    technicalSkills: [
      { name: "Figma", proficiency: 5 },
      { name: "UX/UI Design", proficiency: 5 },
      { name: "Prototyping", proficiency: 5 },
      { name: "CSS", proficiency: 4 },
      { name: "Tailwind CSS", proficiency: 4 },
      { name: "HTML", proficiency: 4 },
      { name: "React", proficiency: 3 }
    ],
    softSkills: ["Design Thinking", "User Empathy", "Creative Problem Solving", "Visual Communication"],
    certifications: ["Figma Certified Professional", "NN/g UX Master Certified"],
    currentProjects: ["Design System 2.0", "AI Workforce Graphs"],
    billing_rate: 15000,
    cost_rate: 7000,
    allocationPercentage: 100,
    profileSummary: "User-centric designer with 8 years of experience building comprehensive design systems, high-fidelity prototypes, and fluid interactive experiences. Combines artistic creativity with frontend code knowledge for pixel-perfect implementations.",
    resumeText: "MARCUS VANCE\nLead Product Designer\nSUMMARY:\nCreative Lead Product Designer with 8 years of experience. Expert in Figma, designing modular design systems, and conducting qualitative user research. Strong background in HTML/CSS and React implementations.\nEXPERIENCE:\n- Lead Designer at PixelPerfect (2020-Present)\n  Redesigned enterprise dashboard, reducing user bounce rates by 40%.\n- Product Designer at StudioB (2018-2020)\n  Created end-to-end user flows for consumer finance mobile application.\nSKILLS:\nFigma, UI/UX, CSS, Tailwind CSS, Prototyping, User Research.",
    managerId: "emp-05",
    mentorId: "emp-01",
    clients: ["MediaCorp", "Retail Giant"],
    pastExperience: ["B2B SaaS Design", "Consumer Design"],
    learningHistory: ["Figma Design Systems", "Web Accessibility WCAG"]
  },
  {
    id: "emp-04",
    name: "Elena Rostova",
    email: "elena.rostova@workforce.ai",
    department: "Engineering",
    role: "Senior Frontend Engineer",
    experienceYears: 6,
    performanceRating: 4.5,
    technicalSkills: [
      { name: "React", proficiency: 5 },
      { name: "TypeScript", proficiency: 5 },
      { name: "Next.js", proficiency: 4 },
      { name: "Tailwind CSS", proficiency: 5 },
      { name: "Redux", proficiency: 4 },
      { name: "Cypress", proficiency: 4 },
      { name: "GraphQL", proficiency: 3 }
    ],
    softSkills: ["Team Collaboration", "Attention to Detail", "Agile Methodologies", "User Experience Focus"],
    certifications: ["Meta Certified Front-End Developer"],
    currentProjects: ["Customer Portal Redesign", "AI Workforce Graphs"],
    billing_rate: 14000,
    cost_rate: 7000,
    allocationPercentage: 100,
    profileSummary: "Frontend engineer dedicated to crafting performant, accessible, and responsive user interfaces. Specializes in modern React patterns, state management, and end-to-end automated UI testing.",
    resumeText: "ELENA ROSTOVA\nSenior Frontend Engineer\nSUMMARY:\nSenior Frontend Engineer with 6 years of experience building complex React web applications. Expert in TypeScript, Next.js, and CSS frameworks like Tailwind. Passionate about accessibility (WCAG) and unit testing.\nEXPERIENCE:\n- Senior Frontend Developer at CloudPortal (2021-Present)\n  Developed responsive user portals in TypeScript, increasing page speed by 50%.\n- Frontend Engineer at WebDev Co (2018-2021)\n  Created modular UI components in React and integrated REST APIs.\nSKILLS:\nReact, TypeScript, Next.js, Tailwind CSS, Redux, Cypress, HTML/CSS.",
    managerId: "emp-01",
    mentorId: "emp-01",
    clients: ["Global Bank", "Retail Services"],
    pastExperience: ["E-commerce", "SaaS Frontend"],
    learningHistory: ["Advanced React & Next.js", "Performance Web Audits"]
  },
  {
    id: "emp-05",
    name: "David Kim",
    email: "david.kim@workforce.ai",
    department: "Product",
    role: "Senior Product Manager",
    experienceYears: 9,
    performanceRating: 4.7,
    technicalSkills: [
      { name: "Product Strategy", proficiency: 5 },
      { name: "Agile/Scrum", proficiency: 5 },
      { name: "SQL", proficiency: 3 },
      { name: "JIRA/Confluence", proficiency: 5 },
      { name: "Data Analytics", proficiency: 4 },
      { name: "A/B Testing", proficiency: 4 }
    ],
    softSkills: ["Leadership", "Stakeholder Management", "Negotiation", "Public Speaking"],
    certifications: ["Pragmatic Institute Certified Product Manager", "Certified Scrum Product Owner (CSPO)"],
    currentProjects: ["AI Talent Extractor", "NextGen Core API"],
    billing_rate: 14000,
    cost_rate: 7000,
    allocationPercentage: 100,
    profileSummary: "Strategic product leader who bridges engineering, design, and business. Experienced in managing cross-functional teams to launch enterprise SaaS features. Focused on data-driven prioritization and growth loops.",
    resumeText: "DAVID KIM\nSenior Product Manager\nSUMMARY:\nSenior Product Manager with 9 years of experience managing complex SaaS software products. Strong track record of defining product visions, executing roadmaps, and coordinating engineering teams.\nEXPERIENCE:\n- Senior PM at EnterpriseFlow (2021-Present)\n  Led the roadmap for AI analytics features, contributing to $2M ARR growth.\n- Product Manager at SaaSify (2017-2021)\n  Managed search and recommendations teams, increasing conversion by 25%.\nSKILLS:\nProduct Strategy, Agile, Scrum, JIRA, A/B Testing, User Research.",
    managerId: "emp-01",
    mentorId: undefined,
    clients: ["Banking Group", "Enterprise Flow"],
    pastExperience: ["B2B SaaS Product", "Growth Hacking"],
    learningHistory: ["Enterprise Product Strategy", "AI Product Integration"]
  },
  {
    id: "emp-06",
    name: "Aisha Rahman",
    email: "aisha.rahman@workforce.ai",
    department: "Engineering",
    role: "Senior DevOps Engineer",
    experienceYears: 5,
    performanceRating: 4.4,
    technicalSkills: [
      { name: "AWS", proficiency: 5 },
      { name: "Docker", proficiency: 5 },
      { name: "Kubernetes", proficiency: 5 },
      { name: "CI/CD", proficiency: 5 },
      { name: "Terraform", proficiency: 4 },
      { name: "Python", proficiency: 3 },
      { name: "Bash", proficiency: 4 }
    ],
    softSkills: ["Problem Solving", "Resilience", "Incident Management", "Communication"],
    certifications: ["AWS Certified DevOps Engineer - Professional", "HashiCorp Certified Terraform Associate"],
    currentProjects: ["NextGen Core API"],
    billing_rate: 12000,
    cost_rate: 6000,
    allocationPercentage: 100,
    profileSummary: "DevOps engineer specializing in infrastructure-as-code, high-availability setups, and zero-downtime deployment pipelines. Passionate about automating repetitive manual operations and scaling security standards.",
    resumeText: "AISHA RAHMAN\nDevOps Engineer\nSUMMARY:\nFocused DevOps Engineer with 5 years of experience deploying and hosting scalable applications. Certified AWS Professional and Kubernetes expert. Automation champion.\nEXPERIENCE:\n- DevOps Engineer at CloudOps (2022-Present)\n  Automated cloud resource creation with Terraform, cutting infrastructure provisioning time by 80%.\n- Infrastructure Engineer at StartupHub (2019-2022)\n  Configured Gitlab CI/CD pipelines and managed Docker containers in production.\nSKILLS:\nAWS, Kubernetes, Docker, CI/CD, Terraform, Python, Linux, Bash.",
    managerId: "emp-01",
    mentorId: "emp-01",
    clients: ["GovTech Solutions", "Logistics Inc"],
    pastExperience: ["Cloud Infrastructure", "CI/CD Pipelines"],
    learningHistory: ["Kubernetes Security Specialist", "AWS Serverless Architectures"]
  },
  {
    id: "emp-07",
    name: "James O'Connor",
    email: "james.oconnor@workforce.ai",
    department: "Engineering",
    role: "Backend Software Engineer",
    experienceYears: 4,
    performanceRating: 4.2,
    technicalSkills: [
      { name: "Node.js", proficiency: 4 },
      { name: "TypeScript", proficiency: 4 },
      { name: "PostgreSQL", proficiency: 4 },
      { name: "Redis", proficiency: 3 },
      { name: "GraphQL", proficiency: 3 },
      { name: "Docker", proficiency: 3 },
      { name: "React", proficiency: 2 }
    ],
    softSkills: ["Active Listening", "Collaboration", "Critical Thinking", "Adaptability"],
    certifications: ["Node.js Application Developer (LFW211)"],
    currentProjects: ["Customer Portal Redesign", "NextGen Core API"],
    billing_rate: 12000,
    cost_rate: 6000,
    allocationPercentage: 100,
    profileSummary: "Backend engineer focused on database optimization, cache architectures, and clean API design. Enjoys writing robust test coverage and tackling complex data synchronization problems.",
    resumeText: "JAMES O'CONNOR\nBackend Software Engineer\nSUMMARY:\nBackend Engineer with 4 years of experience specializing in Node.js, TypeScript, and SQL database optimizations. Proficient in designing secure and performant REST and GraphQL APIs.\nEXPERIENCE:\n- Backend Developer at CoreSystems (2021-Present)\n  Optimized PostgreSQL queries, reducing database read latency by 45%.\n- Software Developer at WebBuilders (2020-2021)\n  Built node-based microservices and managed Redis caching layers.\nSKILLS:\nNode.js, TypeScript, PostgreSQL, Redis, GraphQL, Docker.",
    managerId: "emp-01",
    mentorId: "emp-01",
    clients: ["Global Bank", "Retail Solutions"],
    pastExperience: ["Monolith Migration", "Redis Caching Layers"],
    learningHistory: ["NestJS Enterprise Development", "GraphQL Federation Models"]
  },
  {
    id: "emp-08",
    name: "Sofia Martinez",
    email: "sofia.martinez@workforce.ai",
    department: "Data Science",
    role: "Data Analyst",
    experienceYears: 3,
    performanceRating: 4.3,
    technicalSkills: [
      { name: "Python", proficiency: 4 },
      { name: "SQL", proficiency: 4 },
      { name: "Tableau", proficiency: 5 },
      { name: "Pandas", proficiency: 4 },
      { name: "Excel", proficiency: 5 },
      { name: "R", proficiency: 3 }
    ],
    softSkills: ["Data Storytelling", "Presentation Skills", "Teamwork", "Curiosity"],
    certifications: ["Tableau Desktop Specialist", "Google Data Analytics Professional Certificate"],
    currentProjects: ["AI Talent Extractor", "Design System 2.0"],
    billing_rate: 15000,
    cost_rate: 7000,
    allocationPercentage: 100,
    profileSummary: "Data analyst dedicated to turning complex datasets into clear, interactive business dashboards. Skilled in data cleaning, exploratory data analysis (EDA), and presenting findings to stakeholders.",
    resumeText: "SOFIA MARTINEZ\nData Analyst\nSUMMARY:\nAnalytical Data Analyst with 3 years of experience. Expert in writing advanced SQL queries, data wrangling with Python (Pandas), and building interactive dashboards in Tableau.\nEXPERIENCE:\n- Data Analyst at RetailMetrics (2022-Present)\n  Built customer segments dashboard, driving a 15% increase in marketing campaign conversion.\n- Junior Analyst at FinData (2021-2022)\n  Conducted daily data QA and compiled financial performance reports.\nSKILLS:\nPython, SQL, Tableau, Pandas, R, Microsoft Excel.",
    managerId: "emp-02",
    mentorId: "emp-02",
    clients: ["Fintech Corp", "Market Insights Ltd"],
    pastExperience: ["Marketing Analytics", "Data Operations"],
    learningHistory: ["Advanced Tableau Mapping", "Exploratory Data Analysis with Pandas"]
  }
];

export interface Project {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  teamSize: number;
  durationMonths: number;
  budget?: number; // Added budget for staffing optimizer
  priority?: 'High' | 'Medium' | 'Low'; // Added priority for staffing optimizer
  
  // Enterprise Project Management additions
  client?: string;
  industry?: string;
  businessUnit?: string;
  status?: 'Planning' | 'Active' | 'Completed' | 'Delayed' | 'On Hold' | 'Archived';
  currency?: string;
  startDate?: string;
  endDate?: string;
  expectedDelivery?: string;
  projectManager?: string;
  deliveryLead?: string;
  technicalLead?: string;
  projectCode?: string;
  tags?: string[];

  // AI Health scoring metrics (persisted in DB for history/trend updates)
  healthScore?: number;
  healthLevel?: 'Excellent' | 'Healthy' | 'Warning' | 'High Risk' | 'Critical';
  healthExplanation?: string;
  healthTrendWeek?: number;
  healthTrendMonth?: number;
  deliveryConfidence?: number;
  onTimeProbability?: number;
  budgetOverrunProbability?: number;
  estimatedCompletionDate?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  employeeId: string;
  role: 'Technical Lead' | 'Backend' | 'Frontend' | 'QA' | 'DevOps' | 'Designer' | 'Business Analyst' | 'Project Manager';
  skillMatch: number;
  allocation: number;
  performance: number;
  availability: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  assigneeId: string | null;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  ownerId: string | null;
  dueDate: string;
  status: 'Planning' | 'Design' | 'Development' | 'Testing' | 'Deployment' | 'Maintenance' | 'Completed';
  dependencies: string[];
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: 'Overview' | 'Team' | 'Milestones' | 'Documents' | 'Meeting Notes' | 'Architecture' | 'Risks' | 'Activity';
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProjectActivity {
  id: number;
  projectId: string;
  description: string;
  userId: string;
  timestamp: string;
}

export interface ProjectRisk {
  id: number;
  projectId: string;
  type: 'Budget Overrun' | 'Schedule Delay' | 'Missing Skills' | 'Resource Conflict' | 'Overallocated Employee' | 'Low Performance' | 'SPOF' | 'Low Capability' | 'Missed Milestone';
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
  expectedImprovement: string;
}

export const seedProjects: Project[] = [
  {
    id: "proj-01",
    name: "NextGen Core API",
    description: "Re-architecting the central core API layer to use GraphQL and a distributed Redis cache, enabling faster mobile client requests and sub-50ms data retrievals.",
    requiredSkills: ["Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS", "Redis"],
    teamSize: 4,
    durationMonths: 6,
    budget: 150000,
    priority: "High",
    client: "Fintech Corp",
    industry: "Financial Services",
    businessUnit: "Core Platforms",
    status: "Active",
    currency: "USD",
    startDate: "2026-01-15",
    endDate: "2026-07-15",
    expectedDelivery: "2026-07-10",
    projectManager: "Alex Rivera",
    deliveryLead: "David Kim",
    technicalLead: "Alex Rivera",
    projectCode: "PRJ-NGC-01",
    tags: ["API", "Backend", "Cloud-Native"],
    healthScore: 88,
    healthLevel: "Healthy",
    healthExplanation: "The project has good skill coverage and task progress. Slight warning on resource allocation as Alex Rivera is shared with AI Workforce Graphs.",
    healthTrendWeek: 2,
    healthTrendMonth: 4,
    deliveryConfidence: 90,
    onTimeProbability: 92,
    budgetOverrunProbability: 5,
    estimatedCompletionDate: "2026-07-10"
  },
  {
    id: "proj-02",
    name: "AI Talent Extractor",
    description: "Developing custom NLP parsers and LLM embeddings to automatically ingest and classify resumes, extract skills, and predict employee project compatibility.",
    requiredSkills: ["Python", "PyTorch", "LLMs", "SQL", "Pandas", "Product Strategy"],
    teamSize: 3,
    durationMonths: 4,
    budget: 90000,
    priority: "Medium",
    client: "Enterprise HR Solutions",
    industry: "Human Resources",
    businessUnit: "AI Labs",
    status: "Active",
    currency: "USD",
    startDate: "2026-03-01",
    endDate: "2026-07-01",
    expectedDelivery: "2026-07-05",
    projectManager: "Sarah Chen",
    deliveryLead: "David Kim",
    technicalLead: "Sarah Chen",
    projectCode: "PRJ-ATE-02",
    tags: ["AI/ML", "LLM", "NLP"],
    healthScore: 72,
    healthLevel: "Warning",
    healthExplanation: "Warning: Sarah Chen is currently overallocated at 200% across multiple tasks. Schedule delay risk detected on the core ingestion module.",
    healthTrendWeek: -5,
    healthTrendMonth: -3,
    deliveryConfidence: 75,
    onTimeProbability: 68,
    budgetOverrunProbability: 15,
    estimatedCompletionDate: "2026-07-05"
  },
  {
    id: "proj-03",
    name: "Design System 2.0",
    description: "Establishing a unified, accessible, and responsive component library based on Tailwind CSS and Figma tokens to unify all external SaaS dashboards.",
    requiredSkills: ["Figma", "UX/UI Design", "Tailwind CSS", "React", "TypeScript"],
    teamSize: 3,
    durationMonths: 5,
    budget: 60000,
    priority: "Low",
    client: "Internal Products",
    industry: "Software",
    businessUnit: "Product Design",
    status: "Planning",
    currency: "USD",
    startDate: "2026-08-01",
    endDate: "2027-01-01",
    expectedDelivery: "2027-01-01",
    projectManager: "Marcus Vance",
    deliveryLead: "Sarah Chen",
    technicalLead: "Marcus Vance",
    projectCode: "PRJ-DS2-03",
    tags: ["UI/UX", "Design System", "Tailwind"],
    healthScore: 95,
    healthLevel: "Excellent",
    healthExplanation: "Resources are fully available, milestones are planned, and required design skills are natively covered on the bench.",
    healthTrendWeek: 0,
    healthTrendMonth: 0,
    deliveryConfidence: 98,
    onTimeProbability: 97,
    budgetOverrunProbability: 2,
    estimatedCompletionDate: "2027-01-01"
  },
  {
    id: "proj-04",
    name: "Customer Portal Redesign",
    description: "Re-imagining the customer portal dashboard into a modern, real-time reactive workspace leveraging Next.js server components and WebSockets.",
    requiredSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
    teamSize: 3,
    durationMonths: 6,
    budget: 80000,
    priority: "Medium",
    client: "Retail Retailers Ltd",
    industry: "E-Commerce",
    businessUnit: "SaaS Apps",
    status: "Active",
    currency: "USD",
    startDate: "2026-02-01",
    endDate: "2026-08-01",
    expectedDelivery: "2026-08-15",
    projectManager: "Sofia Martinez",
    deliveryLead: "David Kim",
    technicalLead: "Elena Rostova",
    projectCode: "PRJ-CPR-04",
    tags: ["Web", "NextJS", "UI-Redesign"],
    healthScore: 54,
    healthLevel: "High Risk",
    healthExplanation: "High Risk: Significant delay in Phase 3 testing due to lack of a Senior QA engineer. Budget usage is at 85% with 2 months remaining.",
    healthTrendWeek: -12,
    healthTrendMonth: -18,
    deliveryConfidence: 50,
    onTimeProbability: 45,
    budgetOverrunProbability: 40,
    estimatedCompletionDate: "2026-08-15"
  }
];

export const seedProjectMembers: ProjectMember[] = [
  { id: "mem-01", projectId: "proj-01", employeeId: "emp-01", role: "Technical Lead", skillMatch: 100, allocation: 50, performance: 4.8, availability: "Available" },
  { id: "mem-02", projectId: "proj-01", employeeId: "emp-04", role: "Backend", skillMatch: 90, allocation: 100, performance: 4.5, availability: "Available" },
  { id: "mem-03", projectId: "proj-01", employeeId: "emp-06", role: "Frontend", skillMatch: 95, allocation: 100, performance: 4.2, availability: "Available" },
  { id: "mem-04", projectId: "proj-01", employeeId: "emp-05", role: "DevOps", skillMatch: 85, allocation: 50, performance: 4.6, availability: "Available" },

  { id: "mem-05", projectId: "proj-02", employeeId: "emp-02", role: "Technical Lead", skillMatch: 100, allocation: 100, performance: 4.9, availability: "Overallocated" },
  { id: "mem-06", projectId: "proj-02", employeeId: "emp-08", role: "Backend", skillMatch: 85, allocation: 100, performance: 4.0, availability: "Available" },
  { id: "mem-07", projectId: "proj-02", employeeId: "emp-09", role: "Business Analyst", skillMatch: 95, allocation: 100, performance: 4.3, availability: "Available" },

  { id: "mem-08", projectId: "proj-04", employeeId: "emp-07", role: "Technical Lead", skillMatch: 90, allocation: 100, performance: 4.4, availability: "Available" },
  { id: "mem-09", projectId: "proj-04", employeeId: "emp-06", role: "Frontend", skillMatch: 95, allocation: 100, performance: 4.2, availability: "Available" }
];

export const seedProjectTasks: ProjectTask[] = [
  { id: "tsk-01", projectId: "proj-01", name: "Setup GraphQL Servers", description: "Initialize apollo server configuration and schema mappings.", status: "Completed", assigneeId: "emp-01", dueDate: "2026-02-15", priority: "High" },
  { id: "tsk-02", projectId: "proj-01", name: "Configure Redis Cluster", description: "Provision AWS ElastiCache cluster and code caching adapter.", status: "Completed", assigneeId: "emp-05", dueDate: "2026-03-01", priority: "High" },
  { id: "tsk-03", projectId: "proj-01", name: "Create PostgreSQL Schema Migrations", description: "Design database relational structures and add constraints.", status: "Completed", assigneeId: "emp-04", dueDate: "2026-03-20", priority: "Medium" },
  { id: "tsk-04", projectId: "proj-01", name: "Build Frontend SDK API Clients", description: "Integrate queries and mutations on the user interface workspace.", status: "In Progress", assigneeId: "emp-06", dueDate: "2026-06-30", priority: "Medium" },

  { id: "tsk-05", projectId: "proj-02", name: "Ingest Resumes Engine", description: "Setup backend python script to read docx/pdf data files.", status: "In Progress", assigneeId: "emp-02", dueDate: "2026-04-15", priority: "High" },
  { id: "tsk-06", projectId: "proj-02", name: "LLM Embedding Classification", description: "Compute vector embeddings for skills taxonomy profiling.", status: "Pending", assigneeId: "emp-08", dueDate: "2026-05-15", priority: "High" },

  { id: "tsk-07", projectId: "proj-04", name: "NextJS Setup & Routing", description: "Establish next configuration and responsive navigation grids.", status: "Completed", assigneeId: "emp-06", dueDate: "2026-03-10", priority: "High" },
  { id: "tsk-08", projectId: "proj-04", name: "WebSocket Subscription Testing", description: "Perform QA unit checks on real-time messaging payloads.", status: "In Progress", assigneeId: "emp-07", dueDate: "2026-07-20", priority: "High" }
];

export const seedProjectMilestones: ProjectMilestone[] = [
  { id: "mls-01", projectId: "proj-01", name: "Architecture Validation", ownerId: "emp-01", dueDate: "2026-02-28", status: "Planning", dependencies: [] },
  { id: "mls-02", projectId: "proj-01", name: "Database Schema Migration", ownerId: "emp-04", dueDate: "2026-03-31", status: "Design", dependencies: ["mls-01"] },
  { id: "mls-03", projectId: "proj-01", name: "Core API Endpoint Testing", ownerId: "emp-06", dueDate: "2026-05-15", status: "Development", dependencies: ["mls-02"] },
  { id: "mls-04", projectId: "proj-01", name: "Production Deployment", ownerId: "emp-01", dueDate: "2026-07-15", status: "Deployment", dependencies: ["mls-03"] },

  { id: "mls-05", projectId: "proj-02", name: "Tokenizer & Parser Complete", ownerId: "emp-02", dueDate: "2026-04-30", status: "Development", dependencies: [] },
  { id: "mls-06", projectId: "proj-02", name: "Model Tuning & Ingestion", ownerId: "emp-08", dueDate: "2026-06-15", status: "Testing", dependencies: ["mls-05"] },

  { id: "mls-07", projectId: "proj-04", name: "Alpha Release UI/UX", ownerId: "emp-07", dueDate: "2026-04-10", status: "Development", dependencies: [] },
  { id: "mls-08", projectId: "proj-04", name: "Beta Release Realtime Portal", ownerId: "emp-07", dueDate: "2026-07-15", status: "Testing", dependencies: ["mls-07"] }
];

export const seedProjectDocuments: ProjectDocument[] = [
  { id: "doc-01", projectId: "proj-01", name: "GraphQL Architecture Schema Guidelines.pdf", url: "/docs/graphql-arch.pdf", type: "Architecture", uploadedAt: "2026-01-20", uploadedBy: "Alex Rivera" },
  { id: "doc-02", projectId: "proj-01", name: "Minutes of Kickoff Meeting.docx", url: "/docs/kickoff-notes.docx", type: "Meeting Notes", uploadedAt: "2026-01-16", uploadedBy: "Alex Rivera" },
  { id: "doc-03", projectId: "proj-02", name: "LLM Embeddings Classification Benchmarks.csv", url: "/docs/llm-benchmarks.csv", type: "Overview", uploadedAt: "2026-03-05", uploadedBy: "Sarah Chen" }
];

export const seedProjectActivities: ProjectActivity[] = [
  { id: 1, projectId: "proj-01", description: "Created NextGen Core API project", userId: "Alex Rivera", timestamp: "2026-01-15T09:30:00Z" },
  { id: 2, projectId: "proj-01", description: "Assigned member Alex Rivera as Technical Lead", userId: "Alex Rivera", timestamp: "2026-01-15T10:00:00Z" },
  { id: 3, projectId: "proj-01", description: "Uploaded 'GraphQL Architecture Schema Guidelines.pdf' document", userId: "Alex Rivera", timestamp: "2026-01-20T14:45:00Z" },
  { id: 4, projectId: "proj-01", description: "Completed task 'Setup GraphQL Servers'", userId: "Alex Rivera", timestamp: "2026-02-15T18:00:00Z" },

  { id: 5, projectId: "proj-02", description: "Created AI Talent Extractor project", userId: "Sarah Chen", timestamp: "2026-03-01T09:00:00Z" },
  { id: 6, projectId: "proj-02", description: "Assigned member Sarah Chen as Technical Lead", userId: "Sarah Chen", timestamp: "2026-03-01T09:15:00Z" }
];

export const seedProjectRisks: ProjectRisk[] = [
  { id: 1, projectId: "proj-01", type: "Resource Conflict", description: "Alex Rivera is assigned at 150% cumulative capacity across NextGen Core API and AI Workforce Graphs.", severity: "Medium", recommendation: "Delegate the AWS cloud configuration tasks to DevOps Lead Alex Rivera or split allocation.", expectedImprovement: "Reduces resource burnout probability by 35% and improves focus scores." },

  { id: 2, projectId: "proj-02", type: "Overallocated Employee", description: "Sarah Chen is allocated at 200% allocation representing a heavy bottleneck constraint.", severity: "High", recommendation: "Shift backend ingestion scripting to Backend Dev Marcus Vance or recruit an extra developer.", expectedImprovement: "Expected project delivery confidence improves by +18% and reduces schedule latency." },

  { id: 3, projectId: "proj-04", type: "Missing Skills", description: "The project lacks a qualified QA automation test suite specialist.", severity: "Critical", recommendation: "Recruit or assign an external Senior QA specialist immediately to handle Websocket tests.", expectedImprovement: "Expected bug prevention rate rises by 50% and raises health score to Healthy (80%)." }
];
