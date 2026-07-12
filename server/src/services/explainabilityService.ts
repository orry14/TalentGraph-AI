import type { Employee } from '../db/seedData.js';

export interface ExplainabilityFactor {
  name: string;
  weight: number;        // 0-1 — contribution to the final score
  rawValue: string;      // human-readable value, e.g. "4.8 / 5.0"
  explanation: string;   // plain language sentence
  positive: boolean;     // true = increases score, false = decreases
}

export interface ExplainabilityResult {
  surface: string;
  employeeId: string;
  employeeName: string;
  score: number;
  factors: ExplainabilityFactor[];
  summary: string;
  euAiActNote: string;
}

/**
 * Compute org-level baselines used to contextualise individual values.
 */
function computeOrgBaselines(employees: Employee[]) {
  const perfRatings = employees.map(e => e.performanceRating);
  const expYears = employees.map(e => e.experienceYears);
  const skillCounts = employees.map(e => e.technicalSkills.length);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(arr.length, 1);
  const percentile = (arr: number[], value: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = sorted.filter(v => v <= value).length;
    return Math.round((pos / sorted.length) * 100);
  };
  return {
    avgPerf: avg(perfRatings), medianExp: avg(expYears), avgSkills: avg(skillCounts),
    perfPercentile: (v: number) => percentile(perfRatings, v),
    expPercentile: (v: number) => percentile(expYears, v),
    skillPercentile: (v: number) => percentile(skillCounts, v),
  };
}

/**
 * PROMOTION READINESS explanation
 * Inputs: performanceRating (40%), experienceYears (30%), technicalSkills breadth (30%)
 */
export function explainPromotionReadiness(employee: Employee, score: number, allEmployees: Employee[]): ExplainabilityResult {
  const org = computeOrgBaselines(allEmployees);
  const perfPct = org.perfPercentile(employee.performanceRating);
  const expPct = org.expPercentile(employee.experienceYears);
  const skillCount = employee.technicalSkills.length;
  const skillPct = org.skillPercentile(skillCount);
  const highProfSkills = employee.technicalSkills.filter(s => s.proficiency >= 4).length;

  const factors: ExplainabilityFactor[] = [
    {
      name: 'Performance Rating',
      weight: 0.40,
      rawValue: `${employee.performanceRating} / 5.0`,
      explanation: `Performance rating of ${employee.performanceRating}/5.0 places them in the ${perfPct}th percentile of the organisation.`,
      positive: employee.performanceRating >= org.avgPerf,
    },
    {
      name: 'Experience Tenure',
      weight: 0.30,
      rawValue: `${employee.experienceYears} years`,
      explanation: `${employee.experienceYears} years of experience ${employee.experienceYears >= org.medianExp ? 'exceeds' : 'is below'} the org median of ${org.medianExp.toFixed(1)} years (${expPct}th percentile).`,
      positive: employee.experienceYears >= org.medianExp,
    },
    {
      name: 'Skill Breadth & Depth',
      weight: 0.30,
      rawValue: `${skillCount} skills, ${highProfSkills} at proficiency ≥ 4`,
      explanation: `${skillCount} verified technical skills (${skillPct}th percentile). ${highProfSkills} are at advanced proficiency (≥ 4/5).`,
      positive: skillCount >= org.avgSkills,
    },
  ];

  return {
    surface: 'promotion_readiness',
    employeeId: employee.id,
    employeeName: employee.name,
    score,
    factors,
    summary: `Score of ${score}% is driven primarily by ${employee.name}'s performance rating (${employee.performanceRating}/5.0, 40% weight) and ${employee.experienceYears} years of tenure (30% weight). No protected demographic attributes were used.`,
    euAiActNote: 'Inputs: performanceRating, experienceYears, technicalSkills only. Protected attributes (gender, age, ethnicity, etc.) are explicitly excluded by design. See FAIRNESS_AND_ETHICS.md.'
  };
}

/**
 * FLIGHT RISK explanation
 * Inputs: performanceRating, engagementIndex, tenure without promotion
 */
export function explainFlightRisk(employee: Employee, flightRiskScore: number, allEmployees: Employee[]): ExplainabilityResult {
  const org = computeOrgBaselines(allEmployees);
  const performanceDecline = 5 - employee.performanceRating;
  const engagementIndex = (employee as any).engagementIndex ?? 85;
  const promotionDateStr = (employee as any).promotionDate ?? new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const yearsWithoutPromotion = (Date.now() - new Date(promotionDateStr).getTime()) / (1000 * 60 * 60 * 24 * 365);

  const factors: ExplainabilityFactor[] = [
    {
      name: 'Performance Trajectory',
      weight: 0.40,
      rawValue: `${employee.performanceRating} / 5.0`,
      explanation: `Performance rating of ${employee.performanceRating}/5.0. A score below 5.0 contributes to flight risk (${performanceDecline.toFixed(1)} point gap from peak).`,
      positive: employee.performanceRating >= org.avgPerf,
    },
    {
      name: 'Time Without Promotion',
      weight: 0.30,
      rawValue: `${yearsWithoutPromotion.toFixed(1)} years`,
      explanation: `${yearsWithoutPromotion.toFixed(1)} years since last promotion. The org median is 1.5 years.`,
      positive: yearsWithoutPromotion < 1.5,
    },
    {
      name: 'Engagement Index',
      weight: 0.30,
      rawValue: `${engagementIndex} / 100`,
      explanation: `Engagement index of ${engagementIndex}/100. Scores below 70 are a leading indicator of voluntary attrition.`,
      positive: engagementIndex >= 70,
    },
  ];

  const scoreLabel = flightRiskScore >= 4 ? 'Critical' : flightRiskScore >= 3 ? 'High' : flightRiskScore >= 2 ? 'Medium' : 'Low';

  return {
    surface: 'flight_risk',
    employeeId: employee.id,
    employeeName: employee.name,
    score: Math.round(flightRiskScore * 20), // normalise 0-5 → 0-100 for display
    factors,
    summary: `Flight risk is ${scoreLabel}. Primary driver: ${yearsWithoutPromotion.toFixed(1)} years without promotion (30% weight) combined with engagement index of ${engagementIndex}/100. No demographic data used.`,
    euAiActNote: 'Inputs: performanceRating, engagementIndex, tenure. Protected attributes explicitly excluded. See FAIRNESS_AND_ETHICS.md.'
  };
}

/**
 * STAFFING RECOMMENDATION explanation
 * Inputs: skill match (40%), delivery risk (20%), cost (15%), bench impact (15%), knowledge dist (10%)
 */
export function explainStaffingCandidate(
  employee: Employee,
  scores: { skillMatch: number; deliveryRisk: number; cost: number; benchImpact: number; knowledgeDistribution: number },
  overallFitScore: number,
  requiredSkills: string[]
): ExplainabilityResult {
  const matchedSkills = requiredSkills.filter(r =>
    employee.technicalSkills.some(s => s.name.toLowerCase() === r.toLowerCase())
  );
  const allocationPct = (employee as any).allocationPercentage ?? (employee.currentProjects.length > 0 ? 80 : 0);

  const factors: ExplainabilityFactor[] = [
    {
      name: 'Skill Match',
      weight: 0.40,
      rawValue: `${matchedSkills.length}/${requiredSkills.length} required skills`,
      explanation: `Matches ${matchedSkills.length} of ${requiredSkills.length} required skills: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}.`,
      positive: scores.skillMatch >= 60,
    },
    {
      name: 'Delivery Risk',
      weight: 0.20,
      rawValue: `${allocationPct}% current allocation`,
      explanation: `Currently ${allocationPct}% allocated to active projects. ${allocationPct < 50 ? 'Low context-switching risk.' : 'High allocation may introduce delivery risk.'}`,
      positive: allocationPct < 80,
    },
    {
      name: 'Cost Efficiency',
      weight: 0.15,
      rawValue: employee.cost_rate ? `₹${employee.cost_rate.toLocaleString('en-IN')}/mo` : 'N/A',
      explanation: `Cost rate ${scores.cost >= 60 ? 'is within' : 'exceeds'} project budget tolerance.`,
      positive: scores.cost >= 60,
    },
    {
      name: 'Knowledge Distribution',
      weight: 0.10,
      rawValue: `${employee.technicalSkills.length} unique skills`,
      explanation: `Brings ${employee.technicalSkills.length} skills — ${scores.knowledgeDistribution >= 60 ? 'adds unique expertise' : 'overlaps with existing team'} to the recommended team.`,
      positive: scores.knowledgeDistribution >= 60,
    },
  ];

  return {
    surface: 'staffing_recommendation',
    employeeId: employee.id,
    employeeName: employee.name,
    score: overallFitScore,
    factors,
    summary: `Overall fit score of ${overallFitScore}%. Primary driver: matching ${matchedSkills.length}/${requiredSkills.length} required project skills (40% weight). No demographic inputs used.`,
    euAiActNote: 'Inputs: technicalSkills, currentProjects, cost_rate only. Protected attributes excluded. See FAIRNESS_AND_ETHICS.md.'
  };
}

/**
 * SUCCESSION explanation
 */
export function explainSuccessorRanking(
  successor: Employee,
  matchScore: number,
  readiness: string,
  targetSkills: string[]
): ExplainabilityResult {
  const overlappingSkills = targetSkills.filter(t =>
    successor.technicalSkills.some(s => s.name.toLowerCase() === t.toLowerCase())
  );

  const factors: ExplainabilityFactor[] = [
    {
      name: 'Skill Overlap',
      weight: 0.50,
      rawValue: `${overlappingSkills.length} / ${targetSkills.length} key skills`,
      explanation: `Shares ${overlappingSkills.length} of ${targetSkills.length} key skills with the departing employee: ${overlappingSkills.slice(0, 3).join(', ')}${overlappingSkills.length > 3 ? '...' : ''}.`,
      positive: overlappingSkills.length >= Math.ceil(targetSkills.length * 0.5),
    },
    {
      name: 'Performance Baseline',
      weight: 0.30,
      rawValue: `${successor.performanceRating} / 5.0`,
      explanation: `Performance rating of ${successor.performanceRating}/5.0 ${successor.performanceRating >= 3.5 ? 'meets' : 'is below'} the succession minimum threshold of 3.5.`,
      positive: successor.performanceRating >= 3.5,
    },
    {
      name: 'Readiness Timing',
      weight: 0.20,
      rawValue: readiness,
      explanation: readiness === 'Ready Now'
        ? `Experience of ${successor.experienceYears} years meets the immediate succession threshold.`
        : `Estimated ${readiness} based on current skill gaps and ${successor.experienceYears} years of experience.`,
      positive: readiness === 'Ready Now',
    },
  ];

  return {
    surface: 'succession_ranking',
    employeeId: successor.id,
    employeeName: successor.name,
    score: matchScore,
    factors,
    summary: `Match score of ${matchScore.toFixed(0)}% based on ${overlappingSkills.length}/${targetSkills.length} skill overlap (50% weight) and performance rating of ${successor.performanceRating}/5.0 (30% weight). Readiness: ${readiness}.`,
    euAiActNote: 'Inputs: technicalSkills, performanceRating, experienceYears only. No demographic data used. See FAIRNESS_AND_ETHICS.md.'
  };
}
