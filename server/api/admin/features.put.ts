import { isSiteFeatureKey } from '#shared/features'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!hasDb()) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  const body = await readBody(event)
  const key = body?.key
  const enabled = body?.enabled
  if (!isSiteFeatureKey(key) || typeof enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature' })
  }
  await useDb().query(
    `INSERT INTO site_features (key, enabled, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [key, enabled, admin.email],
  )
  invalidateSiteFeatures()
  await adminAudit(event, admin, enabled ? 'feature.enable' : 'feature.disable', 'feature', key, { enabled })
  const features = await siteFeatures()
  return { key, enabled: features[key] }
})
