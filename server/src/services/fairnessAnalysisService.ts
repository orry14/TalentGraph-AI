/**
 * fairnessAnalysisService.ts — Disparity metric computation for AI recommendation fairness.
 *
 * Implements equivalent metrics to Microsoft Fairlearn (Python):
 * - Demographic Parity Difference (DPD)
 * - Group Mean Score Disparity
 * - Selection Rate Disparity
 *
 * Reference: https://fairlearn.org/main/user_guide/fairness_in_machine_learning.html
 *
 * PRIVACY PRINCIPLE: Only aggregate stats are stored. No individual-level bias scores.
 * Demographic data is only used here, never forwarded to AI models.
 */

import { getDemographicsForAnalysis } from '../db/fairnessConsent.js';
import type { Employee } from '../db/seedData.js';

export type FairnessSurface = 'promotion_readiness' | 'staffing_selection' | 'flight_risk' | 'succession';
export type DisparityRating = 'Low' | 'Moderate' | 'Attention Required';

export interface GroupStat {
  groupLabel: string;
  groupSize: number;
  meanScore: number;
  selectionRate: number;  // proportion of this group selected/recommended
}

export interface FairnessReport {
  id: string;
  reportDate: string;
  surface: FairnessSurface;
  sampleSize: number;
  minimumGroupSize: number; // groups smaller than this are suppressed for privacy
  groups: GroupStat[];
  demographicParityDifference: number;  // |max_rate - min_rate| across groups
  meanScoreDisparity: number;            // |max_mean - min_mean|
  disparityRating: DisparityRating;
  plainLanguageSummary: string;
  caveat: string;
}

/**
 * Compute Demographic Parity Difference.
 * DPD = |P(score >= threshold | group_A) - P(score >= threshold | group_B)|
 * 0 = perfect parity; > 0.1 = concerning; > 0.2 = significant disparity.
 */
function computeDPD(groupRates: number[]): number {
  if (groupRates.length < 2) return 0;
  return Math.abs(Math.max(...groupRates) - Math.min(...groupRates));
}

function disparityRating(dpd: number): DisparityRating {
  if (dpd < 0.05) return 'Low';
  if (dpd < 0.10) return 'Moderate';
  return 'Attention Required';
}

const MIN_GROUP_SIZE = 2; // Reduced from 5 to allow demo data on small seed sets (e.g. 13 employees)

/**
 * Run fairness analysis for a given surface using scores derived from employee data.
 * scoreMap: employeeId → score (0-100)
 * selectionMap: employeeId → boolean (was this person selected/recommended)
 */
export async function runFairnessAnalysis(
  surface: FairnessSurface,
  employees: Employee[],
  scoreMap: Map<string, number>,
  selectionMap: Map<string, boolean>
): Promise<FairnessReport | null> {
  const demographics = getDemographicsForAnalysis();
  if (demographics.length < MIN_GROUP_SIZE) {
    return null; // insufficient consenting sample — do not compute
  }

  // Group by tenure_band (safest grouping — least sensitive, most actionable)
  const groupMap = new Map<string, { scores: number[]; selected: number }>();

  demographics.forEach(demo => {
    const emp = employees.find(e => e.id === demo.employeeId);
    if (!emp) return;
    const score = scoreMap.get(demo.employeeId);
    const selected = selectionMap.get(demo.employeeId) ?? false;
    if (score === undefined) return;

    const key = demo.tenure_band;
    if (!groupMap.has(key)) groupMap.set(key, { scores: [], selected: 0 });
    const g = groupMap.get(key)!;
    g.scores.push(score);
    if (selected) g.selected++;
  });

  // Build group stats, suppressing small groups
  const groups: GroupStat[] = [];
  const selectionRates: number[] = [];
  const meanScores: number[] = [];

  groupMap.forEach((data, label) => {
    if (data.scores.length < MIN_GROUP_SIZE) return; // suppress small groups
    const meanScore = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
    const selectionRate = data.selected / data.scores.length;
    groups.push({
      groupLabel: label,
      groupSize: data.scores.length,
      meanScore: Math.round(meanScore * 10) / 10,
      selectionRate: Math.round(selectionRate * 1000) / 1000,
    });
    selectionRates.push(selectionRate);
    meanScores.push(meanScore);
  });

  if (groups.length < 2) return null; // need at least 2 groups to compute disparity

  const dpd = computeDPD(selectionRates);
  const msd = Math.abs(Math.max(...meanScores) - Math.min(...meanScores));
  const rating = disparityRating(dpd);

  const surfaceLabel: Record<FairnessSurface, string> = {
    promotion_readiness: 'Promotion Readiness',
    staffing_selection: 'Project Staffing Selection',
    flight_risk: 'Flight Risk Flagging',
    succession: 'Succession Successor Ranking',
  };

  const summaryParts = groups.map(g =>
    `${g.groupLabel}: mean score ${g.meanScore}, selection rate ${(g.selectionRate * 100).toFixed(1)}%`
  ).join('; ');

  const plainSummary = rating === 'Low'
    ? `${surfaceLabel[surface]} scores are consistent across tenure groups (${(dpd * 100).toFixed(1)}% max parity gap). No significant disparity detected.`
    : rating === 'Moderate'
    ? `${surfaceLabel[surface]} shows a moderate ${(dpd * 100).toFixed(1)}% selection rate gap across tenure groups. Recommend review. ${summaryParts}.`
    : `${surfaceLabel[surface]} shows an ${(dpd * 100).toFixed(1)}% selection rate gap — above the 10% concern threshold. Immediate review recommended. ${summaryParts}.`;

  return {
    id: `${surface}_${new Date().toISOString().slice(0, 10)}`,
    reportDate: new Date().toISOString(),
    surface,
    sampleSize: demographics.length,
    minimumGroupSize: MIN_GROUP_SIZE,
    groups,
    demographicParityDifference: Math.round(dpd * 1000) / 1000,
    meanScoreDisparity: Math.round(msd * 10) / 10,
    disparityRating: rating,
    plainLanguageSummary: plainSummary,
    caveat: `This analysis uses only data from employees who voluntarily provided consent (${demographics.length} of total org). Results may not be representative of the full workforce. Aggregate statistics only — no individual scores are stored or exposed.`,
  };
}

/**
 * Generate mock fairness reports for demonstration when no consent data exists.
 * These are clearly marked as synthetic and used only to demonstrate the dashboard UI.
 */
export function generateDemoFairnessReports(): FairnessReport[] {
  const surfaces: FairnessSurface[] = ['promotion_readiness', 'staffing_selection', 'flight_risk', 'succession'];
  return surfaces.map(surface => {
    const dpd = Math.random() * 0.08;
    const groups: GroupStat[] = [
      { groupLabel: '0-2yr tenure', groupSize: 8, meanScore: 62 + Math.random() * 10, selectionRate: 0.3 + Math.random() * 0.1 },
      { groupLabel: '2-5yr tenure', groupSize: 12, meanScore: 72 + Math.random() * 8, selectionRate: 0.4 + Math.random() * 0.1 },
      { groupLabel: '5-10yr tenure', groupSize: 9, meanScore: 78 + Math.random() * 8, selectionRate: 0.48 + Math.random() * 0.1 },
      { groupLabel: '10+yr tenure', groupSize: 6, meanScore: 81 + Math.random() * 6, selectionRate: 0.52 + Math.random() * 0.08 },
    ].map(g => ({ ...g, meanScore: Math.round(g.meanScore * 10) / 10, selectionRate: Math.round(g.selectionRate * 1000) / 1000 }));

    return {
      id: `${surface}_demo`,
      reportDate: new Date().toISOString(),
      surface,
      sampleSize: 35,
      minimumGroupSize: MIN_GROUP_SIZE,
      groups,
      demographicParityDifference: Math.round(dpd * 1000) / 1000,
      meanScoreDisparity: Math.round((Math.random() * 15 + 5) * 10) / 10,
      disparityRating: dpd < 0.05 ? 'Low' : dpd < 0.1 ? 'Moderate' : 'Attention Required',
      plainLanguageSummary: `[DEMO DATA] ${surface.replace(/_/g, ' ')} scores show a ${(dpd * 100).toFixed(1)}% parity gap across tenure bands. Enable employee consent to compute live metrics.`,
      caveat: 'DEMO: This is synthetic data for UI demonstration. Enable the fairness consent flow to compute real metrics from opt-in employee data.',
    };
  });
}
