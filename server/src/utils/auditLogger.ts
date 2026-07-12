import { db, AuditLog } from '../db/dbClient.js';

export interface AuditLogParams {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: any;
}

/**
 * Non-blocking utility to write audit logs.
 * Wraps db.saveAuditLog in a promise chain without awaiting it in the main thread.
 * Fails silently by logging to console to ensure the main request is not disrupted.
 */
export const logAudit = (params: AuditLogParams): void => {
  const log: AuditLog = {
    actor_user_id: params.actorId || 'system',
    actor_role: params.actorRole || 'system',
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    metadata: params.metadata || {}
  };

  // Fire and forget
  Promise.resolve()
    .then(() => db.saveAuditLog(log))
    .catch((err) => {
      console.error('Audit Logging Failed (non-blocking):', err);
    });
};
