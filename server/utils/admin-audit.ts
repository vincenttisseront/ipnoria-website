import type { H3Event } from 'h3'

/** Inscrit une action d'administration au journal (qui, quoi, sur quoi, détails sans données sensibles). */
export async function adminAudit(event: H3Event, admin: { email: string }, action: string, targetType: string, targetId?: string | null, details: unknown = {}) {
  await useDb().query(
    'INSERT INTO admin_audit (admin_email, action, target_type, target_id, details, ip_hash) VALUES ($1, $2, $3, $4, $5, $6)',
    [admin.email, action, targetType, targetId ?? null, JSON.stringify(details ?? {}), clientIpHash(event)],
  ).catch(err => console.error('[audit]', err.message))
}
