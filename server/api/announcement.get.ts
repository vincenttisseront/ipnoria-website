// Bandeau public. Absent s'il est masqué, périmé, ou sans texte.
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  if (!hasDb()) return null
  try {
    const row = (await useDb().query<{ fr: string, en: string }>(
      `SELECT body_fr AS fr, body_en AS en FROM site_announcement
        WHERE id = 1 AND enabled
          AND (ends_on IS NULL OR ends_on >= (now() AT TIME ZONE $1)::date)
          AND (char_length(btrim(body_fr)) > 0 OR char_length(btrim(body_en)) > 0)`,
      [bookingZone()],
    )).rows[0]
    return row ?? null
  }
  catch { return null }
})
