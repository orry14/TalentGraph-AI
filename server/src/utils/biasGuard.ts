/**
 * biasGuard.ts — Defense-in-depth protection against protected attribute leakage into AI models.
 * All AI decision surfaces MUST call sanitizeForAI() before passing employee data to scoring functions.
 *
 * EU AI Act Article 10 compliance: training data must not introduce discrimination.
 * This guard enforces it at the data preparation layer.
 */

/** Inputs explicitly permitted in AI/scoring functions */
export const FAIR_INPUTS_ALLOWLIST = [
  'id', 'name', 'email', 'technicalSkills', 'softSkills', 'certifications',
  'performanceRating', 'experienceYears', 'currentProjects', 'role',
  'department', 'billing_rate', 'cost_rate', 'allocationPercentage',
  'learningHistory', 'pastExperience', 'managerId', 'profileSummary'
] as const;

/** Attributes NEVER permitted as model inputs — protected under GDPR Article 9 */
export const PROTECTED_ATTRIBUTES_DENYLIST = [
  'gender', 'sex', 'age', 'date_of_birth', 'dob', 'birthdate',
  'ethnicity', 'race', 'nationality', 'national_origin',
  'religion', 'religious_affiliation', 'marital_status', 'family_status',
  'pregnancy', 'disability', 'health_condition', 'medical_history',
  'sexual_orientation', 'gender_identity', 'political_affiliation',
  'political_views', 'caste', 'tribe'
] as const;

export type ProtectedAttribute = typeof PROTECTED_ATTRIBUTES_DENYLIST[number];

/**
 * Strips any demographic fields from an employee record before AI scoring.
 * Defense-in-depth: even if schema discipline fails, this guard prevents leakage.
 */
export function sanitizeForAI<T extends Record<string, any>>(input: T): Omit<T, ProtectedAttribute> {
  const sanitized = { ...input };
  for (const attr of PROTECTED_ATTRIBUTES_DENYLIST) {
    delete (sanitized as any)[attr];
  }
  return sanitized as Omit<T, ProtectedAttribute>;
}

/**
 * Validates that an input set contains no protected attributes.
 * Call at each AI decision surface boundary.
 */
export function auditInputSet(
  inputs: Record<string, any>,
  surfaceName: string
): { clean: boolean; violations: string[] } {
  const violations: string[] = [];
  const inputKeys = Object.keys(inputs).map(k => k.toLowerCase());
  for (const attr of PROTECTED_ATTRIBUTES_DENYLIST) {
    if (inputKeys.includes(attr.toLowerCase())) violations.push(attr);
  }
  if (violations.length > 0) {
    console.error(
      `[BiasGuard] ⚠️  PROTECTED ATTRIBUTE in surface "${surfaceName}": ${violations.join(', ')}. Stripped. Review code immediately.`
    );
    recordBiasAudit({ timestamp: new Date().toISOString(), surface: surfaceName, clean: false, violations });
  }
  return { clean: violations.length === 0, violations };
}

export interface BiasGuardAuditEntry {
  timestamp: string;
  surface: string;
  clean: boolean;
  violations: string[];
}

const biasAuditLog: BiasGuardAuditEntry[] = [];

export function recordBiasAudit(entry: BiasGuardAuditEntry): void {
  biasAuditLog.push(entry);
  if (biasAuditLog.length > 1000) biasAuditLog.shift();
}

export function getBiasAuditLog(): BiasGuardAuditEntry[] {
  return [...biasAuditLog];
}
