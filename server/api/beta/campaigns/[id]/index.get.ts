export default defineEventHandler(async (event) => {
  const s = await requireTester(event)
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const r = await useDb().query(
    `SELECT c.id::text, c.title, c.body, c.steps, c.version, to_char(c.starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(c.ends_on, 'YYYY-MM-DD') AS "endsOn",
            r.steps AS "mySteps", r.outcome, r.comment, r.submitted_at AS "submittedAt"
       FROM beta_campaigns c LEFT JOIN beta_campaign_results r ON r.campaign_id = c.id AND r.user_id = $2
      WHERE c.id = $1 AND c.published`, [id, s.user.id],
  )
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return r.rows[0]
})
