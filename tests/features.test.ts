import { describe, expect, it } from 'vitest'
import { SITE_FEATURE_KEYS, isSiteFeatureKey } from '#shared/features'

describe('éléments du site', () => {
  it('reconnaît les clés que l’administration peut masquer', () => {
    expect(SITE_FEATURE_KEYS).toEqual(['contact', 'booking', 'demo', 'newsletter'])
    for (const key of SITE_FEATURE_KEYS) expect(isSiteFeatureKey(key)).toBe(true)
    expect(isSiteFeatureKey('admin')).toBe(false)
    expect(isSiteFeatureKey(1)).toBe(false)
  })
})
