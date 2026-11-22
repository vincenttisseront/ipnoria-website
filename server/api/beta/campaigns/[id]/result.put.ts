import { campaignResultSchema } from '#shared/beta'

// Résultat d'une campagne : une ligne par testeur, modifiable jusqu'à la fin de la campagne.
export default defineEventHandler(async (event) => {
  const s = await requireTester(event)
  const id = getRouterParam(event, 'id') ?? ''
  const d = await readJson(event, campaignResultSchema)
  const db = useDb()
  const c = (await db.query(`SELECT jsonb_array_length(steps) AS n, ends_on < current_date AS closed FROM beta_campaigns WHERE id = $1 AND published`, [id])).rows[0]
  if (!c) throw createError({ statusCode: 404 })
  if (c.closed) throw fail(409, 'campaign_closed')
  if (d.steps.length !== c.n) throw fail(400, 'invalid')
  await db.query(
    `INSERT INTO beta_campaign_results (campaign_id, user_id, steps, outcome, comment) VALUES ($1, $2, $3, $4, NULLIF($5, ''))
     ON CONFLICT (campaign_id, user_id) DO UPDATE SET steps = $3, outcome = $4, comment = NULLIF($5, ''), submitted_at = now()`,
    [id, s.user.id, JSON.stringify(d.steps), d.outcome, d.comment],
  )
  return { ok: true }
})
