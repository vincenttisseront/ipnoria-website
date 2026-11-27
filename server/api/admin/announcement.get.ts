export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const row = (await useDb().query<{ fr: string, en: string, ends_on: string | null, enabled: boolean }>(
    `SELECT body_fr AS fr, body_en AS en, to_char(ends_on, 'YYYY-MM-DD') AS ends_on, enabled
       FROM site_announcement WHERE id = 1`,
  )).rows[0]
  return { fr: row?.fr ?? '', en: row?.en ?? '', endsOn: row?.ends_on ?? '', enabled: Boolean(row?.enabled) }
})
