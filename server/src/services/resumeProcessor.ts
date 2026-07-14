import * as zlib from 'zlib';
import type { Employee } from '../db/seedData.js';

export interface ParsedResumeProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  education: {
    college: string;
    university: string;
    degree: string;
    cgpa: number | null;
    graduationYear: string;
  };
  skills: {
    programmingLanguages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
    all: string[];
  };
  certifications: string[];
  experience: string[];
  projects: string[];
  achievements: string[];
  internships: string[];
  publications: string[];
  languages: string[];
  profileSummary: string;
  rawText: string;
}

export interface ResumeFileLike {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ZipEntry {
  name: string;
  buffer: Buffer;
}

const SKILL_LIBRARY = [
  'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Python', 'Java',
  'JavaScript', 'TypeScript', 'C', 'C++', 'C#', 'Go', 'Rust', 'SQL', 'PostgreSQL', 'MySQL',
  'MongoDB', 'Redis', 'GraphQL', 'REST', 'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'Figma', 'Linux',
  'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'ERP', 'CRM', 'AI', 'Data Analysis', 'Communication', 'Leadership', 'Problem Solving'
];

const PROGRAMMING = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#', 'Go', 'Rust', 'SQL'];
const FRAMEWORKS = ['React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'NestJS', 'TensorFlow', 'PyTorch', 'Tailwind CSS', 'Bootstrap'];
const TOOLS = ['Git', 'GitHub', 'Docker', 'Kubernetes', 'Figma', 'Linux', 'GraphQL', 'REST'];
const DATABASES = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQL'];
const CLOUD = ['AWS', 'Azure', 'GCP'];

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function cleanText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findSection(text: string, labels: string[]) {
  const joined = labels.join('|');
  const next = 'education|skills|experience|projects|achievements|certifications|internships|publications|languages|summary|profile';
  const re = new RegExp(`(?:^|\\n)\\s*(${joined})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:?\\s*\\n|$)`, 'i');
  return cleanText(text.match(re)?.[2] || '');
}

function linesFromSection(section: string) {
  return section
    .split('\n')
    .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(line => line.length > 2);
}

function findSkills(text: string) {
  const found = SKILL_LIBRARY.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(text);
  });
  return unique(found);
}

function classifySkills(all: string[]) {
  return {
    programmingLanguages: all.filter(s => PROGRAMMING.includes(s)),
    frameworks: all.filter(s => FRAMEWORKS.includes(s)),
    tools: all.filter(s => TOOLS.includes(s)),
    databases: all.filter(s => DATABASES.includes(s)),
    cloud: all.filter(s => CLOUD.includes(s)),
    all,
  };
}

function extractName(text: string, email: string) {
  const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8);
  const nameLine = firstLines.find(line =>
    /^[A-Za-z][A-Za-z .'-]{3,60}$/.test(line) &&
    !/resume|curriculum|developer|engineer|email|phone|mobile/i.test(line)
  );
  if (nameLine) return nameLine;
  if (email) {
    const local = email.split('@')[0].replace(/[._-]+/g, ' ');
    return local.replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'Parsed Candidate';
}

export function parseResumeText(text: string): ParsedResumeProfile {
  const rawText = cleanText(text);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = rawText.match(/(?:\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim() || '';
  const linkedin = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || '';
  const github = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0] || '';
  const portfolio = rawText.match(/https?:\/\/(?![^ ]*(linkedin|github))[\w.-]+\.[a-z]{2,}[^\s)]*/i)?.[0] || '';
  const cgpaMatch = rawText.match(/(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  const year = rawText.match(/\b(20[1-3]\d)\b/)?.[1] || '';
  const educationSection = findSection(rawText, ['education', 'academic background', 'academics']);
  const skills = findSkills(rawText);
  const projectLines = linesFromSection(findSection(rawText, ['projects', 'academic projects', 'personal projects']));
  const experienceLines = linesFromSection(findSection(rawText, ['experience', 'work experience', 'employment']));
  const certLines = linesFromSection(findSection(rawText, ['certifications', 'certificates']));
  const achievements = linesFromSection(findSection(rawText, ['achievements', 'awards']));
  const internships = linesFromSection(findSection(rawText, ['internships', 'internship']));
  const publications = linesFromSection(findSection(rawText, ['publications', 'research']));
  const languages = unique((findSection(rawText, ['languages']) || '').split(/[,|\n]/).map(s => s.trim()).filter(Boolean));
  const college = educationSection.match(/([A-Z][A-Za-z .&'-]*(College|Institute|School)[A-Za-z .&'-]*)/)?.[1] || '';
  const university = educationSection.match(/([A-Z][A-Za-z .&'-]*University[A-Za-z .&'-]*)/)?.[1] || '';
  const degree = rawText.match(/\b(B\.?Tech|M\.?Tech|B\.?E|M\.?E|BSc|MSc|Bachelor[^,\n]*|Master[^,\n]*)\b/i)?.[0] || '';
  const fullName = extractName(rawText, email);
  const summarySection = findSection(rawText, ['summary', 'profile', 'objective']);
  const profileSummary = summarySection || `${fullName} has a resume profile centered on ${skills.slice(0, 5).join(', ') || 'software and professional capabilities'}.`;

  return {
    fullName,
    email,
    phone,
    location: rawText.match(/(?:location|address)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim() || '',
    linkedin,
    github,
    portfolio,
    education: {
      college,
      university,
      degree,
      cgpa: cgpaMatch ? Number(cgpaMatch[1]) : null,
      graduationYear: year,
    },
    skills: classifySkills(skills),
    certifications: certLines,
    experience: experienceLines,
    projects: projectLines,
    achievements,
    internships,
    publications,
    languages,
    profileSummary,
    rawText,
  };
}

export function employeeFromParsedResume(parsed: ParsedResumeProfile): Employee {
  const experienceYears = Math.min(10, Math.max(0, parsed.experience.length || (parsed.internships.length ? 1 : 0)));
  return {
    id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: parsed.fullName,
    email: parsed.email || `candidate-${Date.now()}@workforce.ai`,
    department: 'Engineering',
    role: parsed.education.degree ? 'Candidate / Software Engineer' : 'Parsed Candidate',
    experienceYears,
    performanceRating: 4,
    technicalSkills: parsed.skills.all.slice(0, 14).map(name => ({ name, proficiency: 3 })),
    softSkills: parsed.skills.all.includes('Communication') ? ['Communication'] : ['Communication', 'Problem Solving'],
    certifications: parsed.certifications,
    resumeText: parsed.rawText,
    currentProjects: [],
    profileSummary: parsed.profileSummary,
  };
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset < buffer.length - 30) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) break;
    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString('utf-8');
    const compressed = buffer.slice(dataStart, dataEnd);
    let fileBuffer = Buffer.alloc(0);
    try {
      fileBuffer = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
      entries.push({ name, buffer: fileBuffer });
    } catch {
      // Skip unreadable zip entries and continue processing the rest.
    }
    offset = dataEnd;
  }
  return entries;
}

function stripXml(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function extractZipResumeFiles(file: ResumeFileLike): ResumeFileLike[] {
  if (!/\.zip$/i.test(file.originalname) && file.mimetype !== 'application/zip') return [file];
  return readZipEntries(file.buffer)
    .filter(entry => /\.(pdf|txt|docx)$/i.test(entry.name))
    .map(entry => ({
      originalname: entry.name.split('/').pop() || entry.name,
      mimetype: entry.name.endsWith('.pdf')
        ? 'application/pdf'
        : entry.name.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/plain',
      buffer: entry.buffer,
      size: entry.buffer.length,
    }));
}

export async function extractResumeText(file: ResumeFileLike): Promise<string> {
  const lower = file.originalname.toLowerCase();
  if (file.mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
    let pdf: any;
    try {
      const mod = await import('pdf-parse');
      pdf = mod.default || mod;
    } catch (e) {
      pdf = async () => ({ text: 'PDF parsing is disabled because pdf-parse module is unavailable.' });
    }
    const parsed = await pdf(file.buffer);
    return cleanText(parsed.text || '');
  }
  if (lower.endsWith('.docx') || file.mimetype.includes('wordprocessingml')) {
    const entries = readZipEntries(file.buffer);
    const xmlText = entries
      .filter(entry => /^word\/(document|header\d*|footer\d*)\.xml$/i.test(entry.name))
      .map(entry => stripXml(entry.buffer.toString('utf-8')))
      .join('\n');
    return cleanText(xmlText);
  }
  if (file.mimetype.startsWith('image/')) {
    throw new Error('Image resume OCR requires an OCR runtime. Upload a PDF, DOCX, TXT, or ZIP for immediate parsing.');
  }
  return cleanText(file.buffer.toString('utf-8'));
}

export async function processResumeFile(file: ResumeFileLike) {
  const text = await extractResumeText(file);
  if (!text || text.length < 20) {
    throw new Error(`Could not extract readable resume text from ${file.originalname}.`);
  }
  return parseResumeText(text);
}
