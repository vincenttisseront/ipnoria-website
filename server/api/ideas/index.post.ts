import { ideaSchema } from '#shared/account'

// Proposer une idée : adresse vérifiée, 5 idées par 24 heures au plus. L'auteur vote d'office pour son idée.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const d = await readJson(event, ideaSchema)
  const db = useDb()
  const recent = await db.query(`SELECT count(*)::int AS n FROM ideas WHERE author_id = $1 AND created_at > now() - interval '24 hours'`, [s.user.id])
  if (recent.rows[0].n >= 5) throw fail(429, 'too_many_ideas')
  const r = await db.query(
    `INSERT INTO ideas (title, body, locale, author_id) VALUES ($1, $2, $3, $4) RETURNING id::text`,
    [{ [d.locale]: d.title }, { [d.locale]: d.body }, d.locale, s.user.id],
  )
  const id = r.rows[0].id
  await db.query('INSERT INTO idea_votes (idea_id, user_id) VALUES ($1, $2)', [id, s.user.id])
  await db.query(`INSERT INTO idea_status_events (idea_id, status) VALUES ($1, 'proposed')`, [id])
  const { smtp, public: { siteUrl } } = useRuntimeConfig()
  if (hasSmtp() && smtp.to) {
    await sendMail({
      to: smtp.to,
      subject: `[Ipnoria] Nouvelle idée : ${d.title}`,
      text: `${s.user.displayName} (${s.user.email}) propose :\n\n${d.title}\n\n${d.body}\n\n${siteUrl.replace(/\/$/, '')}/admin`,
    }).catch(err => console.error('[ideas]', err.message))
  }
  return { ok: true, id }
})
