// Éléments publics que l'administration peut masquer. Une clé absente de la base reste affichée.
export const SITE_FEATURE_KEYS = ['contact', 'booking', 'demo', 'newsletter'] as const
export type SiteFeatureKey = (typeof SITE_FEATURE_KEYS)[number]

export function isSiteFeatureKey(value: unknown): value is SiteFeatureKey {
  return typeof value === 'string' && (SITE_FEATURE_KEYS as readonly string[]).includes(value)
}
