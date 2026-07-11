import Groq from 'groq-sdk';
import { db } from '../db/dbClient.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing_key' });

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Most capable, best reasoning' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fastest responses' },
  { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', description: 'Advanced reasoning & analysis' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', description: 'Deep reasoning' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Lightweight & efficient' },
  { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec', description: 'Speculative decoding' },
] as const;

export type GroqModelId = typeof GROQ_MODELS[number]['id'];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Build a rich system prompt with live workforce data
async function buildSystemPrompt(): Promise<string> {
  try {
    const [employees, projects] = await Promise.all([
      db.getEmployees(),
      db.getProjects(),
    ]);

    const now = new Date().toISOString();
    const activeProjects = projects.filter(p => p.status === 'Active' || !p.status);
    const totalSkills = new Set(employees.flatMap(e => e.technicalSkills.map(s => s.name))).size;
    const avgPerf = employees.length
      ? (employees.reduce((s, e) => s + e.performanceRating, 0) / employees.length).toFixed(2)
      : 'N/A';

    const empSummary = employees.slice(0, 20).map(e =>
      `  • ${e.name} | ${e.role} | ${e.department} | ${e.experienceYears}yrs | Rating: ${e.performanceRating} | Skills: ${e.technicalSkills.slice(0, 5).map(s => s.name).join(', ')}${e.technicalSkills.length > 5 ? '...' : ''} | Projects: ${e.currentProjects.join(', ') || 'None'}`
    ).join('\n');

    const projSummary = projects.slice(0, 15).map(p =>
      `  • ${p.name} (${p.id}) | Status: ${p.status || 'Active'} | Priority: ${p.priority || 'Medium'} | Budget: $${(p.budget || 0).toLocaleString()} | Health: ${(p as any).healthScore ? `${(p as any).healthScore}% (${(p as any).healthLevel})` : 'N/A'} | Manager: ${(p as any).projectManager || 'Unassigned'} | Required Skills: ${p.requiredSkills.slice(0, 5).join(', ')}`
    ).join('\n');

    return `You are an elite AI Workforce Copilot for a Workforce Intelligence Platform called TalentGraph.
You are embedded inside a sophisticated HR & engineering management dashboard used by executives, HR directors, and engineering managers.

Current date/time: ${now}

## YOUR ROLE
You are an expert in:
- Workforce analytics, talent management, succession planning
- Project portfolio health and delivery risk analysis  
- Skill gap identification and learning roadmap design
- Team composition optimization and staffing strategy
- Executive-level reporting and data interpretation

## BEHAVIOR GUIDELINES
- Be conversational, intelligent, and proactive. Never robotic.
- Always explain your reasoning with specific data points from the workforce.
- When you make recommendations, list the exact reasons with bullet points.
- Maintain context across the conversation — remember what was said earlier.
- When something is ambiguous, ask a clarifying follow-up question.
- After each response, suggest 2–4 intelligent follow-up actions the user could take.
- Format your responses in clean Markdown: use headers, bold, bullet lists, tables.
- When performing actions (create, edit, delete), always confirm first before executing.
- Reference specific employee names, project names, and metrics from the live data below.

## LIVE WORKFORCE DATA (${new Date().toLocaleDateString()})

### Employees (${employees.length} total)
${empSummary}${employees.length > 20 ? `\n  ... and ${employees.length - 20} more employees` : ''}

### Projects (${projects.length} total, ${activeProjects.length} active)
${projSummary}${projects.length > 15 ? `\n  ... and ${projects.length - 15} more projects` : ''}

### Aggregate Metrics
- Total Unique Skills tracked: ${totalSkills}
- Average Team Performance: ${avgPerf}/5.0
- Active Projects: ${activeProjects.length}
- Delayed Projects: ${projects.filter(p => p.status === 'Delayed').length}
- High Priority Projects: ${projects.filter(p => p.priority === 'High').length}

## ACTION COMMANDS
When users want to perform an action, respond with the action in a structured block at the END of your message:
\`\`\`action
{"type": "navigate", "target": "employees|projects|staffing|gap-analysis|skill-graph|dashboard", "reason": "..."}
\`\`\`
or
\`\`\`action
{"type": "highlight", "entityType": "employee|project", "entityId": "...", "reason": "..."}
\`\`\`

Always be helpful, specific, data-driven, and strategic. You are the most intelligent workforce advisor in the organization.`;
  } catch {
    return `You are an elite AI Workforce Copilot for TalentGraph. Be conversational, helpful, intelligent, and strategic. Format responses in Markdown. Suggest follow-ups after each response.`;
  }
}

interface StreamChatOptions {
  messages: ChatMessage[];
  model?: GroqModelId;
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion(opts: StreamChatOptions): Promise<string> {
  const {
    messages,
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    maxTokens = 2048,
    onToken,
    onDone,
    onError,
    signal,
  } = opts;

  const systemPrompt = await buildSystemPrompt();
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  let fullText = '';
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const stream = await groq.chat.completions.create({
        model,
        messages: fullMessages as any[],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const delta = (chunk as any).choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          onToken?.(delta);
        }
      }

      onDone?.(fullText);
      return fullText;
    } catch (err: any) {
      if (signal?.aborted) break;
      if (attempt === maxAttempts || err?.status === 401 || err?.status === 400) {
        const error = new Error(err?.message || 'Groq API error');
        onError?.(error);
        throw error;
      }
      // Exponential back-off before retry
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  return fullText;
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: GroqModelId = 'llama-3.3-70b-versatile',
  temperature = 0.7,
  maxTokens = 2048,
): Promise<string> {
  const systemPrompt = await buildSystemPrompt();
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      if (attempt === maxAttempts || err?.status === 401 || err?.status === 400) {
        throw new Error(err?.message || 'Groq API error');
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  return '';
}

export async function analyzeFileContent(
  fileContent: string,
  fileName: string,
  mimeType: string,
  model: GroqModelId = 'llama-3.3-70b-versatile',
): Promise<string> {
  const prompt = `You are an expert HR analyst. Analyze the following file and provide structured insights.

File name: ${fileName}
File type: ${mimeType}

File content:
${fileContent.slice(0, 8000)}${fileContent.length > 8000 ? '\n...[content truncated]' : ''}

Please provide:
1. A summary of the document
2. Key insights or extracted information
3. Actionable recommendations if applicable
4. Any notable data points or metrics

Format your response in clean Markdown.`;

  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || 'Could not analyze file.';
}

export const groqService = {
  streamChatCompletion,
  chatCompletion,
  analyzeFileContent,
  models: GROQ_MODELS,
};
