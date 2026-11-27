import { SITE_FEATURE_KEYS } from '#shared/features'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const features = await siteFeatures()
  return { features: SITE_FEATURE_KEYS.map(key => ({ key, enabled: features[key] })) }
})
