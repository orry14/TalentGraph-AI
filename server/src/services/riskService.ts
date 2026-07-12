import { Employee } from '../db/seedData.js';
import { getOrgRepositories } from '../utils/codeMaat.js';

export interface CapabilityRisk {
  skill: string;
  employee: Employee;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  capabilityImpact: number;
  recommendedAction: string;
  alternativeCandidates: string[];
  flightRiskScore: number;
  isGitVerified?: boolean;
}

class RiskService {
  /**
   * Identifies Single Points of Failure (SPOF) and capability risks
   */
  public calculateCapabilityRisks(employees: Employee[]): CapabilityRisk[] {
    const risks: CapabilityRisk[] = [];
    
    // 1. Load all employee skills with proficiency >= 4
    const skillMap = new Map<string, Employee[]>();
    
    employees.forEach(employee => {
      employee.technicalSkills.forEach(skill => {
        if (skill.proficiency >= 4) {
          const key = skill.name.toLowerCase();
          if (!skillMap.has(key)) {
            skillMap.set(key, []);
          }
          skillMap.get(key)!.push(employee);
        }
      });
    });

    // 2. Identify SPOFs (only one employee has proficiency >= 4)
    skillMap.forEach((experts, skillName) => {
      if (experts.length === 1) {
        const employee = experts[0];
        
        // 4. Calculate Flight Risk
        const performanceDecline = 5 - employee.performanceRating;
        
        // @ts-ignore
        const engagementIndex = employee.engagementIndex ?? 85; 
        const engagementDrop = (100 - engagementIndex) / 20;
        
        // @ts-ignore
        const promotionDateStr = employee.promotionDate ?? new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
        const yearsWithoutPromotion = (Date.now() - new Date(promotionDateStr).getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        let flightRiskScore = (0.4 * performanceDecline) + (0.3 * yearsWithoutPromotion) + (0.3 * engagementDrop);
        flightRiskScore = Math.min(Math.max(flightRiskScore, 0), 5); // clamp 0-5
        
        let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
        if (flightRiskScore >= 4) riskLevel = 'Critical';
        else if (flightRiskScore >= 3) riskLevel = 'High';
        else if (flightRiskScore >= 2) riskLevel = 'Medium';

        const totalPeopleWithSkill = employees.filter(e => e.technicalSkills.some(s => s.name.toLowerCase() === skillName)).length;
        const capabilityImpact = totalPeopleWithSkill <= 2 ? 5 : 3;

        let recommendedAction = 'Monitor closely';
        if (riskLevel === 'Critical') recommendedAction = 'Immediate knowledge transfer required. Initiate retention discussion.';
        else if (riskLevel === 'High') recommendedAction = 'Upskill backups immediately.';
        else if (riskLevel === 'Medium') recommendedAction = 'Plan cross-training sessions.';

        const alternatives = employees
          .filter(e => e.id !== employee.id && e.technicalSkills.some(s => s.name.toLowerCase() === skillName && s.proficiency >= 2))
          .sort((a, b) => b.performanceRating - a.performanceRating)
          .map(e => e.name)
          .slice(0, 3);

        risks.push({
          skill: employee.technicalSkills.find(s => s.name.toLowerCase() === skillName)?.name || skillName,
          employee,
          riskLevel,
          capabilityImpact,
          recommendedAction,
          alternativeCandidates: alternatives.length > 0 ? alternatives : ['External hire recommended'],
          flightRiskScore
        });
      }
    });

    // 3. Integrate Repo Truck Factors from code-maat
    const orgRepos = getOrgRepositories();
    orgRepos.forEach(repo => {
      if (repo.truckFactor === 1 && repo.owners.length > 0) {
        const ownerEmail = repo.owners[0];
        const employee = employees.find(e => e.email.toLowerCase() === ownerEmail.toLowerCase());
        if (employee) {
          // Check if this skill SPOF already exists for this employee
          const exists = risks.some(r => r.employee.id === employee.id && r.skill.toLowerCase() === repo.primarySkill.toLowerCase());
          if (!exists) {
            const performanceDecline = 5 - employee.performanceRating;
            // @ts-ignore
            const engagementIndex = employee.engagementIndex ?? 85;
            const engagementDrop = (100 - engagementIndex) / 20;
            // @ts-ignore
            const promotionDateStr = employee.promotionDate ?? new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
            const yearsWithoutPromotion = (Date.now() - new Date(promotionDateStr).getTime()) / (1000 * 60 * 60 * 24 * 365);
            let flightRiskScore = (0.4 * performanceDecline) + (0.3 * yearsWithoutPromotion) + (0.3 * engagementDrop);
            flightRiskScore = Math.min(Math.max(flightRiskScore, 0), 5);

            let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
            if (flightRiskScore >= 4) riskLevel = 'Critical';
            else if (flightRiskScore >= 3) riskLevel = 'High';
            else if (flightRiskScore >= 2) riskLevel = 'Medium';

            const alternatives = employees
              .filter(e => e.id !== employee.id && e.technicalSkills.some(s => s.name.toLowerCase() === repo.primarySkill.toLowerCase() && s.proficiency >= 2))
              .sort((a, b) => b.performanceRating - a.performanceRating)
              .map(e => e.name)
              .slice(0, 3);

            risks.push({
              skill: repo.primarySkill,
              employee,
              riskLevel,
              capabilityImpact: 5, // verified repo owner has highest impact
              recommendedAction: `[GitHub Verified SPOF] Single developer owns 80%+ commits in '${repo.name}' repository. Upskill backups immediately.`,
              alternativeCandidates: alternatives.length > 0 ? alternatives : ['External hire recommended'],
              flightRiskScore,
              isGitVerified: true
            });
          } else {
            // Update the existing SPOF to make it git verified and update comments
            const match = risks.find(r => r.employee.id === employee.id && r.skill.toLowerCase() === repo.primarySkill.toLowerCase());
            if (match) {
              match.isGitVerified = true;
              match.recommendedAction = `[GitHub Verified SPOF] verified by commit history on '${repo.name}' repo. ` + match.recommendedAction;
            }
          }
        }
      }
    });

    // Sort by risk severity
    return risks.sort((a, b) => b.flightRiskScore - a.flightRiskScore);
  }
}

export const riskService = new RiskService();
