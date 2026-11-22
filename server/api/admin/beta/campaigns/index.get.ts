// Campagnes avec synthèse des résultats : issues globales et, par étape, réussites et échecs.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const c = await db.query(
    `SELECT id::text, title, body, steps, version, to_char(starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(ends_on, 'YYYY-MM-DD') AS "endsOn", published
       FROM beta_campaigns ORDER BY created_at DESC`,
  )
  const res = await db.query(
    `SELECT r.campaign_id::text AS id, r.steps, r.outcome, r.comment, u.display_name AS name FROM beta_campaign_results r JOIN users u ON u.id = r.user_id`,
  )
  return c.rows.map((x) => {
    const mine = res.rows.filter(r => r.id === x.id)
    const outcomes = { success: 0, partial: 0, failure: 0 } as Record<string, number>
    for (const r of mine) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1
    const steps = (x.steps as unknown[]).map((_, i) => ({
      ok: mine.filter(r => r.steps[i]?.result === 'ok').length,
      ko: mine.filter(r => r.steps[i]?.result === 'ko').length,
      notes: mine.filter(r => r.steps[i]?.note).map(r => `${r.name} : ${r.steps[i].note}`),
    }))
    return { ...x, participants: mine.length, outcomes, stepResults: steps, comments: mine.filter(r => r.comment).map(r => ({ name: r.name, comment: r.comment })) }
  })
})
