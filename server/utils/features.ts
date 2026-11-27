import { SITE_FEATURE_KEYS, type SiteFeatureKey, isSiteFeatureKey } from '#shared/features'

const allOn = (): Record<SiteFeatureKey, boolean> =>
  Object.fromEntries(SITE_FEATURE_KEYS.map(k => [k, true])) as Record<SiteFeatureKey, boolean>

let cache: { at: number, value: Record<SiteFeatureKey, boolean> } | null = null

/** État des éléments publics. Sans base, tout reste visible. */
export async function siteFeatures(): Promise<Record<SiteFeatureKey, boolean>> {
  const value = allOn()
  if (!hasDb()) return value
  if (cache && Date.now() - cache.at < 5_000) return cache.value
  try {
    const { rows } = await useDb().query<{ key: string, enabled: boolean }>('SELECT key, enabled FROM site_features')
    for (const row of rows) if (isSiteFeatureKey(row.key)) value[row.key] = row.enabled
  }
  catch { /* table pas encore migrée : tout reste visible */ }
  cache = { at: Date.now(), value }
  return value
}

export function invalidateSiteFeatures(): void {
  cache = null
}

/** 404 si l'élément a été masqué : la page et son API disparaissent ensemble. */
export async function assertFeature(key: SiteFeatureKey): Promise<void> {
  const features = await siteFeatures()
  if (!features[key]) throw createError({ statusCode: 404, statusMessage: 'Not found' })
}
