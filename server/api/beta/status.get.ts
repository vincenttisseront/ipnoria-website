// État du programme pour la page bêta : candidature, accord, accès testeur, parrainage, remerciements publics.
export default defineEventHandler(async (event) => {
  if (!accountsEnabled()) return { enabled: false, state: null, credits: [], testers: 0 }
  const s = await getAccountSession(event)
  const db = useDb()
  const [credits, count] = await Promise.all([
    db.query(`SELECT u.display_name AS name, u.organization AS org FROM beta_applications a JOIN users u ON u.id = a.user_id
               WHERE a.status = 'accepted' AND a.public_credit ORDER BY a.decided_at LIMIT 200`),
    db.query(`SELECT count(*)::int AS n FROM beta_applications WHERE status = 'accepted'`),
  ])
  return {
    enabled: true,
    state: s && !s.mfaPending ? await betaState(s.user.id) : null,
    credits: credits.rows,
    testers: count.rows[0].n,
  }
})
