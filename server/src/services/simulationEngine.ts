import { Employee, Project } from '../db/seedData.js';
import { analytics } from './analytics.js';

export interface SimulationResult {
  action: 'promotion' | 'departure' | 'transfer';
  targetEmployeeId: string;
  beforeStats: {
    capabilityScore: number;
    headcount: number;
  };
  afterStats: {
    capabilityScore: number;
    headcount: number;
  };
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

class SimulationEngine {
  /**
   * Run a workforce simulation
   */
  public runSimulation(
    action: 'promotion' | 'departure' | 'transfer',
    targetEmployeeId: string,
    employees: Employee[],
    projects: Project[],
    newRole?: string,
    newDepartment?: string
  ): SimulationResult {
    // 1. Deep clone to avoid mutating real data
    const simEmployees: Employee[] = JSON.parse(JSON.stringify(employees));
    
    // 2. Identify target
    const targetIdx = simEmployees.findIndex(e => e.id === targetEmployeeId);
    if (targetIdx === -1) {
      throw new Error('Target employee not found for simulation');
    }
    const targetEmployee = simEmployees[targetIdx];

    // 3. Capture "Before" Stats
    const beforeStats = analytics.calculateDashboardStats(simEmployees, projects);

    // 4. Apply Action
    const impactedProjects = targetEmployee.currentProjects;
    
    if (action === 'departure') {
      simEmployees.splice(targetIdx, 1);
    } else if (action === 'promotion') {
      simEmployees[targetIdx].role = newRole || `Senior ${targetEmployee.role}`;
      // Simulating promotion usually boosts performance slightly or assumes they act at a higher level
      simEmployees[targetIdx].performanceRating = Math.min(5.0, simEmployees[targetIdx].performanceRating + 0.2);
    } else if (action === 'transfer') {
      simEmployees[targetIdx].department = newDepartment || 'New Department';
      simEmployees[targetIdx].currentProjects = []; // Assuming they drop old projects
    }

    // 5. Capture "After" Stats
    const afterStats = analytics.calculateDashboardStats(simEmployees, projects);

    // 6. Calculate Successors for the target's old role/skills
    // We look for people with similar skills but lower experience/role
    const targetSkills = targetEmployee.technicalSkills.map(s => s.name);
    
    const successors = simEmployees
      .filter(e => e.id !== targetEmployeeId && e.department === targetEmployee.department)
      .map(e => {
        let matchCount = 0;
        e.technicalSkills.forEach(s => {
          if (targetSkills.includes(s.name)) matchCount++;
        });
        
        const matchScore = targetSkills.length > 0 ? (matchCount / targetSkills.length) * 100 : 0;
        
        // Determine readiness based on performance and experience gap
        let readiness: 'Ready Now' | 'Ready 1-2 Yrs' | 'Needs Upskilling' = 'Needs Upskilling';
        const expGap = targetEmployee.experienceYears - e.experienceYears;
        
        if (matchScore >= 80 && expGap <= 2 && e.performanceRating >= 4.0) {
          readiness = 'Ready Now';
        } else if (matchScore >= 50 && expGap <= 4 && e.performanceRating >= 3.5) {
          readiness = 'Ready 1-2 Yrs';
        }

        return { employee: e, matchScore, readiness };
      })
      .filter(s => s.matchScore > 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3); // top 3

    // 7. Calculate Missing Skills caused by departure/transfer
    let missingSkills: string[] = [];
    if (action === 'departure' || action === 'transfer') {
      // Find skills that only the target had, or where the target was the only expert
      const originalSkillMap = new Map<string, number>();
      employees.forEach(e => {
        e.technicalSkills.forEach(s => {
          if (s.proficiency >= 4) {
            originalSkillMap.set(s.name, (originalSkillMap.get(s.name) || 0) + 1);
          }
        });
      });
      
      targetEmployee.technicalSkills.forEach(s => {
        if (s.proficiency >= 4 && originalSkillMap.get(s.name) === 1) {
          missingSkills.push(s.name);
        }
      });
    }

    // 8. Calculate Financial Impact
    let financialImpact = '';
    if (action === 'departure') {
      const lostBilling = targetEmployee.billing_rate || 0;
      const savedCost = targetEmployee.cost_rate || 0;
      const backfillCost = savedCost * 1.5; // Estimated 1.5x to hire and train external replacement
      
      let successorSavings = 0;
      if (successors.length > 0) {
        const topSuccessor = successors[0].employee;
        const alloc = topSuccessor.allocationPercentage !== undefined ? topSuccessor.allocationPercentage : (topSuccessor.currentProjects.length > 0 ? 100 : 0);
        if (alloc === 0) {
          successorSavings = topSuccessor.cost_rate || 0;
        }
      }
      
      const netDelta = successorSavings - lostBilling - (backfillCost - savedCost);
      const sign = netDelta >= 0 ? '+' : '';
      financialImpact = `Loss of ₹${lostBilling.toLocaleString()}/mo billing. Est backfill cost: ₹${backfillCost.toLocaleString()}/mo. Net delta (incl successor bench savings): ${sign}₹${netDelta.toLocaleString()}/mo.`;
    } else if (action === 'promotion') {
       const raise = (targetEmployee.cost_rate || 0) * 0.2;
       financialImpact = `Est. Promotion cost increase: -₹${raise.toLocaleString()}/mo.`;
    }

    return {
      action,
      targetEmployeeId,
      beforeStats: {
        capabilityScore: beforeStats.capabilityScore,
        headcount: beforeStats.totalEmployees
      },
      afterStats: {
        capabilityScore: afterStats.capabilityScore,
        headcount: afterStats.totalEmployees
      },
      impactedProjects,
      recommendedSuccessors: successors,
      deltaCapability: afterStats.capabilityScore - beforeStats.capabilityScore,
      missingSkills,
      financialImpact
    };
  }
}

export const simulationEngine = new SimulationEngine();
