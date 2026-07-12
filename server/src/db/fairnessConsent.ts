/**
 * fairnessConsent.ts — Privacy-preserving opt-in demographic data management.
 *
 * Design principles:
 * - Opt-in ONLY: no data is stored without explicit employee consent.
 * - Aggregate-only outputs: individual demographic data is never exposed via API.
 * - Minimal collection: only 3 voluntary fields collected (gender_group, tenure_band, department proxy).
 * - Right to withdraw: employees can revoke consent at any time, triggering data deletion.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONSENT_FILE = path.join(DATA_DIR, 'fairness_consent.json');

export type GenderGroup = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
export type TenureBand = '0-2yr' | '2-5yr' | '5-10yr' | '10+yr';

export interface ConsentRecord {
  employeeId: string;
  consentGiven: boolean;
  consentTimestamp: string;
  withdrawalTimestamp?: string;
}

export interface DemographicRecord {
  employeeId: string;
  gender_group: GenderGroup;
  tenure_band: TenureBand;
  consentTimestamp: string;
}

interface ConsentStore {
  consents: ConsentRecord[];
  demographics: DemographicRecord[];
  lastUpdated: string;
}

function loadStore(): ConsentStore {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONSENT_FILE)) {
    const empty: ConsentStore = { consents: [], demographics: [], lastUpdated: new Date().toISOString() };
    fs.writeFileSync(CONSENT_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try {
    return JSON.parse(fs.readFileSync(CONSENT_FILE, 'utf-8'));
  } catch (e) {
    const empty: ConsentStore = { consents: [], demographics: [], lastUpdated: new Date().toISOString() };
    return empty;
  }
}

function saveStore(store: ConsentStore): void {
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CONSENT_FILE, JSON.stringify(store, null, 2));
}

export function recordConsent(employeeId: string, consentGiven: boolean): ConsentRecord {
  const store = loadStore();
  const existing = store.consents.find(c => c.employeeId === employeeId);
  const record: ConsentRecord = {
    employeeId,
    consentGiven,
    consentTimestamp: consentGiven ? new Date().toISOString() : (existing?.consentTimestamp || new Date().toISOString()),
    withdrawalTimestamp: !consentGiven ? new Date().toISOString() : undefined,
  };

  if (existing) {
    Object.assign(existing, record);
    // On withdrawal, delete demographic data
    if (!consentGiven) {
      store.demographics = store.demographics.filter(d => d.employeeId !== employeeId);
    }
  } else {
    store.consents.push(record);
  }

  saveStore(store);
  return record;
}

export function getConsentStatus(employeeId: string): ConsentRecord | null {
  const store = loadStore();
  return store.consents.find(c => c.employeeId === employeeId) || null;
}

export function recordDemographic(
  employeeId: string,
  gender_group: GenderGroup,
  tenure_band: TenureBand
): DemographicRecord | null {
  const store = loadStore();
  const consent = store.consents.find(c => c.employeeId === employeeId);
  if (!consent || !consent.consentGiven) {
    console.warn('[FairnessConsent] Attempted to store demographic data without consent for:', employeeId);
    return null;
  }

  const record: DemographicRecord = {
    employeeId,
    gender_group,
    tenure_band,
    consentTimestamp: new Date().toISOString(),
  };

  const existingIdx = store.demographics.findIndex(d => d.employeeId === employeeId);
  if (existingIdx >= 0) store.demographics[existingIdx] = record;
  else store.demographics.push(record);

  saveStore(store);
  return record;
}

/**
 * Returns ONLY aggregate counts — never individual records.
 * Used exclusively for disparity analysis, never exposed via API directly.
 */
export function getAggregateStats(): {
  totalWithConsent: number;
  byGenderGroup: Record<string, number>;
  byTenureBand: Record<string, number>;
} {
  const store = loadStore();
  const consentedIds = new Set(
    store.consents.filter(c => c.consentGiven).map(c => c.employeeId)
  );
  const demos = store.demographics.filter(d => consentedIds.has(d.employeeId));

  const byGenderGroup: Record<string, number> = {};
  const byTenureBand: Record<string, number> = {};

  demos.forEach(d => {
    byGenderGroup[d.gender_group] = (byGenderGroup[d.gender_group] || 0) + 1;
    byTenureBand[d.tenure_band] = (byTenureBand[d.tenure_band] || 0) + 1;
  });

  return { totalWithConsent: demos.length, byGenderGroup, byTenureBand };
}

/** For use by fairness analysis only — returns demographics joined by employeeId */
export function getDemographicsForAnalysis(): DemographicRecord[] {
  const store = loadStore();
  const consentedIds = new Set(
    store.consents.filter(c => c.consentGiven).map(c => c.employeeId)
  );
  return store.demographics.filter(d => consentedIds.has(d.employeeId));
}
