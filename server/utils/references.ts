// Références clients : lecture publique (publiées seulement) et contrôle des logos téléversés.
export const REFERENCE_PUBLIC = `
  r.id::text, r.slug, r.name, r.sector, r.size, r.location, r.website, r.services, r.quote, r.quote_author AS "quoteAuthor",
  r.quote_role AS "quoteRole", r.logo IS NOT NULL AS "hasLogo", r.logo_dark_bg AS "logoDarkBg",
  (r.story->>'fr' <> '' OR r.story->>'en' <> '') AS "hasStory", extract(epoch FROM r.updated_at)::bigint AS v`

/** Type réel d'une image d'après ses premiers octets (PNG, WebP, JPEG) ; le SVG est refusé (scripts possibles). */
export function sniffImage(buf: Buffer): 'image/png' | 'image/webp' | 'image/jpeg' | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  return null
}
export const LOGO_MAX_BYTES = 300 * 1024
