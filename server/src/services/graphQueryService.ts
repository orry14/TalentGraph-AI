import { runCypher, isNeo4jEnabled } from '../db/neo4jClient.js';
import type { Employee, Project } from '../db/seedData.js';

export interface GraphNode {
  id: string;
  label: string;
  type: 'employee' | 'skill' | 'project' | 'department';
  group: string;
  size?: number;
  color?: string;
  data?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLive: boolean; // true = from Neo4j, false = in-memory fallback
}

export interface SpofResult {
  skill: string;
  expertCount: number;
  experts: string[];
  dependentProjects: string[];
  dependencyCount: number;
  riskLevel: 'Critical' | 'High' | 'Medium';
}

export interface PathStep {
  type: 'employee' | 'skill' | 'project';
  id: string;
  name: string;
  relationship: string;
}

// ────────────────────────────────────────────────────────────────
// 1. SPOF Detection — Cypher path + in-memory fallback
// ────────────────────────────────────────────────────────────────

export async function findSPOFs(
  employees: Employee[],
  projects: Project[],
  proficiencyThreshold = 4
): Promise<SpofResult[]> {
  if (isNeo4jEnabled()) {
    const rows = await runCypher<any>(
      `MATCH (e:Employee)-[r:HAS_SKILL]->(s:Skill)
       WHERE r.proficiency >= $threshold
       WITH s, collect(e.name) AS experts, count(e) AS cnt
       WHERE cnt <= 2
       OPTIONAL MATCH (p:Project)-[:DEPENDS_ON]->(s)
       WITH s, experts, cnt, collect(p.name) AS projects, count(p) AS depCount
       RETURN s.name AS skill, cnt AS expertCount, experts, projects AS dependentProjects, depCount AS dependencyCount
       ORDER BY depCount DESC, cnt ASC`,
      { threshold: proficiencyThreshold }
    );

    return rows.map(r => ({
      skill: r.skill,
      expertCount: r.expertCount,
      experts: r.experts,
      dependentProjects: r.dependentProjects || [],
      dependencyCount: r.dependencyCount,
      riskLevel: r.dependencyCount >= 2 ? 'Critical' : r.expertCount === 1 ? 'High' : 'Medium' as any
    }));
  }

  // ── In-memory fallback ──
  const skillMap = new Map<string, Employee[]>();
  employees.forEach(emp => {
    emp.technicalSkills.forEach(skill => {
      if (skill.proficiency >= proficiencyThreshold) {
        const key = skill.name;
        if (!skillMap.has(key)) skillMap.set(key, []);
        skillMap.get(key)!.push(emp);
      }
    });
  });

  const results: SpofResult[] = [];
  skillMap.forEach((experts, skillName) => {
    if (experts.length <= 2) {
      const dependentProjects = projects
        .filter(p => p.requiredSkills.some(s => s.toLowerCase() === skillName.toLowerCase()))
        .map(p => p.name);
      results.push({
        skill: skillName,
        expertCount: experts.length,
        experts: experts.map(e => e.name),
        dependentProjects,
        dependencyCount: dependentProjects.length,
        riskLevel: dependentProjects.length >= 2 ? 'Critical' : experts.length === 1 ? 'High' : 'Medium'
      });
    }
  });

  return results.sort((a, b) => b.dependencyCount - a.dependencyCount || a.expertCount - b.expertCount);
}

// ────────────────────────────────────────────────────────────────
// 2. Talent Network Graph Data
// ────────────────────────────────────────────────────────────────

export async function getTalentNetworkGraph(
  employees: Employee[],
  projects: Project[],
  filters?: { department?: string; minProficiency?: number }
): Promise<GraphData> {
  const minProf = filters?.minProficiency || 1;
  const deptFilter = filters?.department;

  if (isNeo4jEnabled()) {
    const nodeRows = await runCypher<any>(
      `MATCH (e:Employee) ${deptFilter ? 'WHERE e.department = $dept' : ''}
       WITH e
       MATCH (e)-[r:HAS_SKILL]->(s:Skill) WHERE r.proficiency >= $minProf
       RETURN e, s, r`,
      { dept: deptFilter || '', minProf }
    );

    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    nodeRows.forEach(row => {
      const e = row.e;
      if (!nodes.has('emp-' + e.id)) {
        nodes.set('emp-' + e.id, {
          id: 'emp-' + e.id,
          label: e.name,
          type: 'employee',
          group: e.department,
          size: 6 + (e.experienceYears || 0) / 2,
          color: '#3b82f6',
          data: e
        });
      }
      const skillId = 'skill-' + e.name;
      if (!nodes.has(skillId)) {
        nodes.set(skillId, {
          id: skillId,
          label: row.s.name || skillId,
          type: 'skill',
          group: 'skill',
          size: 5,
          color: '#10b981',
        });
      }
      edges.push({
        id: `hs-${e.id}-${row.s.name}`,
        source: 'emp-' + e.id,
        target: skillId,
        label: 'HAS_SKILL',
        weight: row.r?.proficiency || 1
      });
    });

    return { nodes: [...nodes.values()], edges, isLive: true };
  }

  // ── In-memory fallback — full graph ──
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  let filteredEmployees = employees;
  if (deptFilter) filteredEmployees = employees.filter(e => e.department === deptFilter);

  // Add department nodes
  const depts = [...new Set(filteredEmployees.map(e => e.department))];
  depts.forEach(dept => {
    nodes.set('dept-' + dept, {
      id: 'dept-' + dept, label: dept, type: 'department', group: 'department', size: 14, color: '#8b5cf6'
    });
  });

  // Add employee nodes
  filteredEmployees.forEach(emp => {
    nodes.set('emp-' + emp.id, {
      id: 'emp-' + emp.id,
      label: emp.name,
      type: 'employee',
      group: emp.department,
      size: 7 + emp.experienceYears / 2,
      color: '#3b82f6',
      data: { role: emp.role, department: emp.department, performance: emp.performanceRating }
    });
    // BELONGS_TO department
    edges.push({ id: 'bt-' + emp.id, source: 'emp-' + emp.id, target: 'dept-' + emp.department, label: 'BELONGS_TO' });

    // REPORTS_TO
    if (emp.managerId && filteredEmployees.some(e => e.id === emp.managerId)) {
      const eId = 'rt-' + emp.id + '-' + emp.managerId;
      if (!edgeSet.has(eId)) {
        edgeSet.add(eId);
        edges.push({ id: eId, source: 'emp-' + emp.id, target: 'emp-' + emp.managerId, label: 'REPORTS_TO' });
      }
    }
  });

  // Add skill nodes
  const skillCounts = new Map<string, number>();
  filteredEmployees.forEach(emp => {
    emp.technicalSkills.forEach(skill => {
      if (skill.proficiency >= minProf) {
        skillCounts.set(skill.name, (skillCounts.get(skill.name) || 0) + 1);
      }
    });
  });
  skillCounts.forEach((count, skillName) => {
    nodes.set('skill-' + skillName, {
      id: 'skill-' + skillName,
      label: skillName,
      type: 'skill',
      group: 'skill',
      size: 4 + count * 1.5,
      color: '#10b981',
      data: { employeeCount: count }
    });
  });

  // HAS_SKILL edges
  filteredEmployees.forEach(emp => {
    emp.technicalSkills.forEach(skill => {
      if (skill.proficiency >= minProf && nodes.has('skill-' + skill.name)) {
        edges.push({
          id: 'hs-' + emp.id + '-' + skill.name,
          source: 'emp-' + emp.id,
          target: 'skill-' + skill.name,
          label: 'HAS_SKILL',
          weight: skill.proficiency
        });
      }
    });
  });

  // Add project nodes and DEPENDS_ON + WORKED_ON
  projects.forEach(proj => {
    const hasRelevantEmployee = filteredEmployees.some(e => e.currentProjects.includes(proj.name));
    if (hasRelevantEmployee) {
      nodes.set('proj-' + proj.id, {
        id: 'proj-' + proj.id,
        label: proj.name,
        type: 'project',
        group: 'project',
        size: 8,
        color: '#f59e0b',
        data: { requiredSkills: proj.requiredSkills, teamSize: proj.teamSize }
      });
      filteredEmployees.forEach(emp => {
        if (emp.currentProjects.includes(proj.name)) {
          edges.push({ id: 'wo-' + emp.id + '-' + proj.id, source: 'emp-' + emp.id, target: 'proj-' + proj.id, label: 'WORKED_ON' });
        }
      });
      proj.requiredSkills.forEach(skillName => {
        if (nodes.has('skill-' + skillName)) {
          edges.push({ id: 'dep-' + proj.id + '-' + skillName, source: 'proj-' + proj.id, target: 'skill-' + skillName, label: 'DEPENDS_ON' });
        }
      });
    }
  });

  return { nodes: [...nodes.values()], edges, isLive: false };
}

// ────────────────────────────────────────────────────────────────
// 3. Path to Coverage
// ────────────────────────────────────────────────────────────────

export async function findPathToCoverage(
  skillName: string,
  employees: Employee[],
  projects: Project[]
): Promise<{ steps: PathStep[]; candidate: Employee | null; explanation: string }[]> {
  if (isNeo4jEnabled()) {
    // Find employees with adjacent skills (those who share a project with experts in the target skill)
    const rows = await runCypher<any>(
      `MATCH (target:Skill {name: $skillName})<-[:DEPENDS_ON]-(proj:Project)<-[:WORKED_ON]-(candidate:Employee)
       WHERE NOT (candidate)-[:HAS_SKILL]->(target)
       OPTIONAL MATCH (expert:Employee)-[r:HAS_SKILL]->(target) WHERE r.proficiency >= 3
       RETURN candidate, proj, expert
       LIMIT 5`,
      { skillName }
    );

    if (rows.length > 0) {
      return rows.slice(0, 3).map(r => ({
        steps: [
          { type: 'skill', id: 'skill-' + skillName, name: skillName, relationship: 'GAP' },
          { type: 'project', id: 'proj-' + r.proj?.name, name: r.proj?.name || 'Shared Project', relationship: 'DEPENDS_ON' },
          { type: 'employee', id: 'emp-' + r.candidate?.id, name: r.candidate?.name || 'Candidate', relationship: 'WORKED_ON' },
        ],
        candidate: null,
        explanation: `${r.candidate?.name} works on ${r.proj?.name} which depends on ${skillName}. Recommend pairing with expert ${r.expert?.name}.`
      }));
    }
  }

  // ── In-memory fallback — breadth-first search ──
  const targetSkillLower = skillName.toLowerCase();
  
  // Find experts who have the skill
  const experts = employees.filter(e =>
    e.technicalSkills.some(s => s.name.toLowerCase() === targetSkillLower && s.proficiency >= 3)
  );

  // Find candidates who DON'T have the skill but are adjacent via shared projects or manager
  const candidates = employees.filter(e =>
    !e.technicalSkills.some(s => s.name.toLowerCase() === targetSkillLower)
  );

  const results: { steps: PathStep[]; candidate: Employee | null; explanation: string }[] = [];

  for (const candidate of candidates.slice(0, 5)) {
    // Check path via shared projects
    const sharedProjects = projects.filter(p =>
      p.requiredSkills.some(s => s.toLowerCase() === targetSkillLower) &&
      candidate.currentProjects.includes(p.name)
    );

    if (sharedProjects.length > 0) {
      const proj = sharedProjects[0];
      const expert = experts.find(ex => ex.currentProjects.includes(proj.name)) || experts[0];
      results.push({
        steps: [
          { type: 'skill', id: 'skill-' + skillName, name: skillName, relationship: 'SKILL_GAP' },
          { type: 'project', id: 'proj-' + proj.id, name: proj.name, relationship: 'DEPENDS_ON' },
          { type: 'employee', id: 'emp-' + candidate.id, name: candidate.name, relationship: 'WORKED_ON' },
        ],
        candidate,
        explanation: `${candidate.name} works on "${proj.name}" which requires ${skillName}. ${expert ? 'Pair with ' + expert.name + ' (expert) for upskilling.' : 'Consider targeted upskilling.'}`
      });
    } else if (experts.length > 0) {
      // Check path via shared manager
      const sharedManager = experts.find(ex => ex.id === candidate.managerId || candidate.id === ex.managerId);
      if (sharedManager) {
        results.push({
          steps: [
            { type: 'skill', id: 'skill-' + skillName, name: skillName, relationship: 'SKILL_GAP' },
            { type: 'employee', id: 'emp-' + sharedManager.id, name: sharedManager.name, relationship: 'REPORTS_TO' },
            { type: 'employee', id: 'emp-' + candidate.id, name: candidate.name, relationship: 'SAME_TEAM' },
          ],
          candidate,
          explanation: `${candidate.name} is on the same team as ${sharedManager.name} who has ${skillName}. Internal mentorship is the shortest coverage path.`
        });
      }
    }
  }

  if (results.length === 0 && experts.length === 0) {
    return [{
      steps: [{ type: 'skill', id: 'skill-' + skillName, name: skillName, relationship: 'SKILL_GAP' }],
      candidate: null,
      explanation: `No internal candidates found with ${skillName} or adjacent skills. External hire or training cohort recommended.`
    }];
  }

  return results.slice(0, 3);
}
