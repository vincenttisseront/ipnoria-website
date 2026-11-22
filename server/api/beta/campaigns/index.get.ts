// Campagnes de test publiées, avec mon résultat éventuel
export default defineEventHandler(async (event) => {
  const s = await requireTester(event)
  const r = await useDb().query(
    `SELECT c.id::text, c.title, c.body, c.version, to_char(c.starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(c.ends_on, 'YYYY-MM-DD') AS "endsOn",
            jsonb_array_length(c.steps) AS "stepCount", r.outcome, r.submitted_at AS "submittedAt",
            (SELECT count(*)::int FROM beta_campaign_results x WHERE x.campaign_id = c.id) AS participants
       FROM beta_campaigns c LEFT JOIN beta_campaign_results r ON r.campaign_id = c.id AND r.user_id = $1
      WHERE c.published ORDER BY COALESCE(c.starts_on, c.created_at::date) DESC`, [s.user.id],
  )
  return r.rows
})
