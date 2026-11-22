// Type commun des références renvoyées par l'API publique
export interface PublicReference {
  id: string, slug: string, name: string, sector: string, size: Record<string, string>, location: string | null, website: string | null
  services: string[], quote: Record<string, string>, quoteAuthor: string | null, quoteRole: Record<string, string>
  hasLogo: boolean, logoDarkBg: boolean, hasStory: boolean, v: number, story?: Record<string, string>
}
export const logoUrl = (r: { id: string, v: number }) => `/logos/${r.id}?v=${r.v}`
/** Correspondance entre pages « Pour qui » et secteurs des références */
export const PROFILE_SECTOR: Record<string, string> = { pme: 'pme', collectivites: 'collectivite', enseignement: 'enseignement' }
/** Citation avec les guillemets de la langue : « … » en français, “…” en anglais. */
export const quoted = (s: string, locale: string) => (locale === 'fr' ? `« ${s} »` : `“${s}”`)
