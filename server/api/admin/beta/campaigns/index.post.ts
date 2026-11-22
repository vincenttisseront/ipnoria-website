import { z } from 'zod'
import { adminCampaignSchema } from '#shared/beta'

// Créer (sans id) ou modifier une campagne ; à la première publication, les testeurs sont prévenus.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readJson(event, adminCampaignSchema.extend({ id: z.string().regex(/^\d+$/).optional() }))
  const db = useDb()
  const before = d.id ? (await db.query('SELECT published FROM beta_campaigns WHERE id = $1', [d.id])).rows[0] : null
  if (d.id && !before) throw createError({ statusCode: 404 })
  const vals = [d.title, d.body, JSON.stringify(d.steps), d.version || null, d.startsOn || null, d.endsOn || null, d.published]
  const r = d.id
    ? await db.query(`UPDATE beta_campaigns SET title = $2, body = $3, steps = $4, version = $5, starts_on = $6, ends_on = $7, published = $8 WHERE id = $1 RETURNING id::text`, [d.id, ...vals])
    : await db.query(`INSERT INTO beta_campaigns (title, body, steps, version, starts_on, ends_on, published) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id::text`, vals)
  const id = r.rows[0].id
  let notified = 0
  if (d.published && !before?.published) {
    notified = await mailTesters(
      { fr: `Nouvelle campagne : ${d.title.fr || d.title.en}`, en: `New campaign: ${d.title.en || d.title.fr}` },
      { fr: `Une nouvelle campagne de test est ouverte${d.endsOn ? ` jusqu'au ${d.endsOn}` : ''} : ${d.title.fr || d.title.en}.`, en: `A new test campaign is open${d.endsOn ? ` until ${d.endsOn}` : ''}: ${d.title.en || d.title.fr}.` },
      { fr: `/campagnes/${id}`, en: `/campaigns/${id}` },
    )
  }
  await adminAudit(event, admin, d.id ? 'beta.campaign.update' : 'beta.campaign.create', 'beta_campaign', id, { published: d.published })
  return { ok: true, id, notified }
})
