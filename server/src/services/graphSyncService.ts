import { runCypher, isNeo4jEnabled } from '../db/neo4jClient.js';
import type { Employee, Project } from '../db/seedData.js';

export async function syncAllToGraph(employees: Employee[], projects: Project[]): Promise<void> {
  if (!isNeo4jEnabled()) return;
  console.log('[GraphSync] Starting full sync to Neo4j...');

  const departments = [...new Set(employees.map(e => e.department))];
  for (const dept of departments) {
    await runCypher('MERGE (d:Department {name: $name})', { name: dept });
  }

  const allSkills = new Set<string>();
  employees.forEach(e => e.technicalSkills.forEach(s => allSkills.add(s.name)));
  projects.forEach(p => p.requiredSkills.forEach(s => allSkills.add(s)));
  for (const skill of allSkills) {
    await runCypher('MERGE (s:Skill {name: $name})', { name: skill });
  }

  for (const project of projects) {
    await runCypher(
      'MERGE (p:Project {id: $id}) SET p.name = $name, p.status = $status, p.teamSize = $teamSize, p.priority = $priority',
      { id: project.id, name: project.name, status: (project as any).status || 'Active', teamSize: project.teamSize, priority: project.priority || 'Medium' }
    );
    for (const skill of project.requiredSkills) {
      await runCypher(
        'MATCH (p:Project {id: $projId}), (s:Skill {name: $skillName}) MERGE (p)-[:DEPENDS_ON]->(s)',
        { projId: project.id, skillName: skill }
      );
    }
  }

  for (const emp of employees) {
    await runCypher(
      'MERGE (e:Employee {id: $id}) SET e.name = $name, e.email = $email, e.role = $role, e.department = $department, e.experienceYears = $exp, e.performanceRating = $perf, e.billingRate = $billing, e.costRate = $cost',
      { id: emp.id, name: emp.name, email: emp.email, role: emp.role, department: emp.department, exp: emp.experienceYears, perf: emp.performanceRating, billing: emp.billing_rate || 0, cost: emp.cost_rate || 0 }
    );
    await runCypher(
      'MATCH (e:Employee {id: $empId}), (d:Department {name: $dept}) MERGE (e)-[:BELONGS_TO]->(d)',
      { empId: emp.id, dept: emp.department }
    );
    for (const skill of emp.technicalSkills) {
      await runCypher('MERGE (s:Skill {name: $name})', { name: skill.name });
      await runCypher(
        'MATCH (e:Employee {id: $empId}), (s:Skill {name: $skillName}) MERGE (e)-[r:HAS_SKILL]->(s) SET r.proficiency = $prof, r.source = $source',
        { empId: emp.id, skillName: skill.name, prof: skill.proficiency, source: skill.source || 'self_reported' }
      );
    }
    for (const projectName of emp.currentProjects) {
      await runCypher(
        'MATCH (e:Employee {id: $empId}), (p:Project {name: $projName}) MERGE (e)-[:WORKED_ON]->(p)',
        { empId: emp.id, projName: projectName }
      );
    }
    if (emp.managerId) {
      await runCypher(
        'MATCH (e:Employee {id: $empId}), (m:Employee {id: $managerId}) MERGE (e)-[:REPORTS_TO]->(m)',
        { empId: emp.id, managerId: emp.managerId }
      );
    }
  }
  console.log('[GraphSync] Synced ' + employees.length + ' employees, ' + projects.length + ' projects to Neo4j.');
}

export async function syncEmployeeToGraph(emp: Employee): Promise<void> {
  if (!isNeo4jEnabled()) return;
  await runCypher(
    'MERGE (e:Employee {id: $id}) SET e.name = $name, e.email = $email, e.role = $role, e.department = $department, e.experienceYears = $exp, e.performanceRating = $perf',
    { id: emp.id, name: emp.name, email: emp.email, role: emp.role, department: emp.department, exp: emp.experienceYears, perf: emp.performanceRating }
  );
  for (const skill of emp.technicalSkills) {
    await runCypher('MERGE (s:Skill {name: $name})', { name: skill.name });
    await runCypher(
      'MATCH (e:Employee {id: $empId}), (s:Skill {name: $skillName}) MERGE (e)-[r:HAS_SKILL]->(s) SET r.proficiency = $prof',
      { empId: emp.id, skillName: skill.name, prof: skill.proficiency }
    );
  }
}
