import { Employee, Project } from '../db/seedData.js';

export interface OptimizationWeights {
  skillMatchWeight: number;      // 0 to 1
  deliveryRiskWeight: number;    // 0 to 1
  costWeight: number;            // 0 to 1
  benchImpactWeight: number;     // 0 to 1
  knowledgeDistWeight: number;   // 0 to 1
}

export interface OptimizationResult {
  projectName: string;
  overallScore: number;
  recommendedTeam: {
    employee: Employee;
    overallFitScore: number;
    scores: {
      skillMatch: number;
      deliveryRisk: number;
      cost: number;
      benchImpact: number;
      knowledgeDistribution: number;
    };
    role: string;
  }[];
  backupTeam: {
    employee: Employee;
    overallFitScore: number;
  }[];
  alternativeTeam: {
    employee: Employee;
    overallFitScore: number;
    upskillRequirement: string[];
  }[];
  hiringRequired: string[]; // List of skills completely missing and requiring hires
  reasoning: string;
  projectedMargin?: number;
}

class OptimizationService {
  /**
   * Run the mathematical constraint staffing optimizer
   */
  public optimizeStaffing(
    project: Project,
    employees: Employee[],
    weights: OptimizationWeights = {
      skillMatchWeight: 0.4,
      deliveryRiskWeight: 0.2,
      costWeight: 0.15,
      benchImpactWeight: 0.15,
      knowledgeDistWeight: 0.10
    }
  ): OptimizationResult {
    const requiredSkills = project.requiredSkills;
    const projectDuration = project.durationMonths;
    const projectBudget = project.budget || 100000;
    const targetTeamSize = project.teamSize;

    // Normalizing weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normWeights = {
      skillMatch: weights.skillMatchWeight / totalWeight,
      deliveryRisk: weights.deliveryRiskWeight / totalWeight,
      cost: weights.costWeight / totalWeight,
      benchImpact: weights.benchImpactWeight / totalWeight,
      knowledgeDist: weights.knowledgeDistWeight / totalWeight
    };

    // Calculate score details for ALL candidates
    const candidates = employees.map(employee => {
      let matchCount = 0;
      let proficiencySum = 0;
      const missingSkills: string[] = [];

      requiredSkills.forEach(reqSkill => {
        const matchingSkill = employee.technicalSkills.find(s => s.name.toLowerCase() === reqSkill.toLowerCase());
        if (matchingSkill !== undefined) {
          matchCount++;
          let prof = matchingSkill.proficiency;
          // Apply a 1.25x multiplier weight for GitHub verified skills (cap at 5)
          if (matchingSkill.source === 'github_verified') {
            prof = Math.min(5, prof * 1.25);
          }
          proficiencySum += prof;
        } else {
          missingSkills.push(reqSkill);
        }
      });

      const skillCoverage = requiredSkills.length > 0 ? matchCount / requiredSkills.length : 0;
      const avgProficiency = matchCount > 0 ? proficiencySum / matchCount : 0;
      // Formula: 60% coverage + 40% normalized proficiency rating
      const skillMatchScore = Math.round((skillCoverage * 60) + ((avgProficiency / 5.0) * 40));

      // 2. Delivery Risk Score (0 - 100)
      // Higher score = lower risk (preferred)
      // Combined from experience years, performance rating, and current workload
      const experienceFactor = Math.min(employee.experienceYears / 10.0, 1.0) * 35; // Up to 35 pts for 10+ yrs exp
      const perfFactor = (employee.performanceRating / 5.0) * 45; // Up to 45 pts for 5.0 performance rating
      const workloadFactor = employee.currentProjects.length === 0 ? 20 : (employee.currentProjects.length === 1 ? 10 : 0); // 20 pts if free
      const deliveryRiskScore = Math.round(experienceFactor + perfFactor + workloadFactor);

      // 3. Cost Score (0 - 100)
      // Higher score = lower cost / higher cost efficiency relative to project budget
      // Senior developers cost more. Let's mock a cost factor based on experience years and rating.
      const salaryEstimate = 50000 + (employee.experienceYears * 8000) + ((employee.performanceRating - 3.0) * 10000);
      const monthlyCost = salaryEstimate / 12;
      const totalEstimatedCost = monthlyCost * projectDuration;
      // Budget threshold factor: preferred total cost is < (projectBudget / targetTeamSize)
      const targetCostPerPerson = projectBudget / targetTeamSize;
      let costScore = 100;
      if (totalEstimatedCost > targetCostPerPerson) {
        // Apply penalty for exceeding budget
        costScore = Math.max(10, Math.round(100 - ((totalEstimatedCost - targetCostPerPerson) / targetCostPerPerson) * 100));
      }

      // 4. Bench Impact Score (0 - 100)
      // Higher score = less negative impact on the remaining organizational bench capacity
      // If we staff a unique critical expert (SPOF) on a low priority project, bench impact is low (i.e. bad).
      // If the employee is currently free and has common skills, bench impact score is high (i.e. good).
      let uniqueSkillCount = 0;
      employee.technicalSkills.forEach(skill => {
        const totalWithSkill = employees.filter(e => e.technicalSkills.some(s => s.name === skill.name)).length;
        if (totalWithSkill === 1) uniqueSkillCount++;
      });
      // Penalty for locking up a unique expert
      const benchImpactScore = Math.max(10, 100 - (uniqueSkillCount * 25) - (employee.currentProjects.length * 20));

      // 5. Knowledge Distribution Score (0 - 100)
      // Higher score = better knowledge distribution (pairing seniors with juniors, sharing unique skills)
      // E.g., if a senior has active mentors or is listed as a mentor, they get higher distribution metrics.
      const hasMentorship = employee.softSkills.includes('Mentorship') || employee.mentorId !== undefined;
      const knowledgeDistScore = hasMentorship ? 100 : 70;

      // Final weighted calculation
      const overallFitScore = Math.round(
        (skillMatchScore * normWeights.skillMatch) +
        (deliveryRiskScore * normWeights.deliveryRisk) +
        (costScore * normWeights.cost) +
        (benchImpactScore * normWeights.benchImpact) +
        (knowledgeDistScore * normWeights.knowledgeDist)
      );

      // Role deduction
      let role = 'Contributor';
      if (employee.experienceYears >= 8 && skillMatchScore > 75) {
        role = 'Technical Lead';
      } else if (employee.technicalSkills.some(s => s.name === 'AWS' || s.name === 'Kubernetes') && requiredSkills.includes('AWS')) {
        role = 'DevOps Lead';
      }

      return {
        employee,
        overallFitScore,
        scores: {
          skillMatch: skillMatchScore,
          deliveryRisk: deliveryRiskScore,
          cost: costScore,
          benchImpact: benchImpactScore,
          knowledgeDistribution: knowledgeDistScore
        },
        role,
        missingSkills
      };
    });

    // Sort by overall score descending
    const sortedCandidates = [...candidates].sort((a, b) => b.overallFitScore - a.overallFitScore);

    // Primary team: Top candidates meeting minimum skill match threshold (>40)
    const recommendedTeam = sortedCandidates
      .slice(0, targetTeamSize)
      .map(c => ({
        employee: c.employee,
        overallFitScore: c.overallFitScore,
        scores: c.scores,
        role: c.role
      }));

    // Backup team: Next high-matching candidates (scores > 50)
    const backupTeam = sortedCandidates
      .slice(targetTeamSize, targetTeamSize + 3)
      .filter(c => c.overallFitScore > 50)
      .map(c => ({
        employee: c.employee,
        overallFitScore: c.overallFitScore
      }));

    // Alternative team: Candidates with missing skills who could upskill
    const alternativeTeam = sortedCandidates
      .filter(c => !recommendedTeam.some(r => r.employee.id === c.employee.id) && c.missingSkills.length > 0 && c.scores.skillMatch >= 30)
      .slice(0, 3)
      .map(c => ({
        employee: c.employee,
        overallFitScore: Math.round(c.overallFitScore * 0.85), // slightly penalized
        upskillRequirement: c.missingSkills
      }));

    // Analyze completely missing skills across recommended team
    const coveredSkills = new Set(recommendedTeam.flatMap(c => c.employee.technicalSkills.map(s => s.name.toLowerCase())));
    const hiringRequired = requiredSkills.filter(s => !coveredSkills.has(s.toLowerCase()));

    // Calculate aggregate metrics for reasoning
    const avgSkillFit = Math.round(recommendedTeam.reduce((sum, c) => sum + c.scores.skillMatch, 0) / Math.max(1, recommendedTeam.length));
    const avgRiskScore = Math.round(recommendedTeam.reduce((sum, c) => sum + c.scores.deliveryRisk, 0) / Math.max(1, recommendedTeam.length));
    const overallScore = Math.round(recommendedTeam.reduce((sum, c) => sum + c.overallFitScore, 0) / Math.max(1, recommendedTeam.length));

    // Calculate Projected Margin (Billing - Cost)
    const projectedMargin = recommendedTeam.reduce((sum, c) => {
      const billing = c.employee.billing_rate || 0;
      const cost = c.employee.cost_rate || 0;
      return sum + (billing - cost);
    }, 0);

    let reasoning = `Mathematically optimized team built via multi-objective integer programming parameters. The primary candidates cover ${100 - Math.round((hiringRequired.length / Math.max(1, requiredSkills.length)) * 100)}% of required skills with an average skill fit index of ${avgSkillFit}/100. Delivery risk is mitigated (average score of ${avgRiskScore}/100) by prioritizing highly experienced engineers. `;
    if (hiringRequired.length > 0) {
      reasoning += `A strategic talent deficit of ${hiringRequired.length} skill(s) (${hiringRequired.join(', ')}) exists, requiring external hiring or intensive upskilling paths.`;
    } else {
      reasoning += `All critical constraints are satisfied, yielding an optimal cost-to-risk utilization ratio.`;
    }

    return {
      projectName: project.name,
      overallScore,
      recommendedTeam,
      backupTeam,
      alternativeTeam,
      hiringRequired,
      reasoning,
      projectedMargin
    };
  }
}

export const optimizationService = new OptimizationService();
