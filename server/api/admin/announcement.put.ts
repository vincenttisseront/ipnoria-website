import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const data = await readJson(event, z.object({
    fr: z.string().trim().max(280).default(''),
    en: z.string().trim().max(280).default(''),
    endsOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(''),
    enabled: z.boolean(),
  }))
  if (data.endsOn) {
    const when = new Date(`${data.endsOn}T12:00:00Z`)
    if (Number.isNaN(when.getTime()) || when.toISOString().slice(0, 10) !== data.endsOn) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid day' })
    }
  }
  await useDb().query(
    `INSERT INTO site_announcement (id, body_fr, body_en, ends_on, enabled)
     VALUES (1, $1, $2, NULLIF($3, '')::date, $4)
     ON CONFLICT (id) DO UPDATE
       SET body_fr = EXCLUDED.body_fr, body_en = EXCLUDED.body_en, ends_on = EXCLUDED.ends_on,
           enabled = EXCLUDED.enabled, updated_at = now()`,
    [data.fr, data.en, data.endsOn, data.enabled],
  )
  await adminAudit(event, admin, 'announcement.update', 'announcement', null, { enabled: data.enabled })
  return { ok: true }
})
