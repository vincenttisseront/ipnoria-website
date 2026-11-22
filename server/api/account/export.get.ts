// Export de mes données (RGPD, droit d'accès et à la portabilité) : profil, idées, votes, commentaires, activité.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const db = useDb()
  const id = s.user.id
  const [ideas, votes, comments, events, sessions, passkeys] = await Promise.all([
    db.query('SELECT id::text, title, body, status, created_at FROM ideas WHERE author_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT i.id::text AS idea, i.title, v.created_at FROM idea_votes v JOIN ideas i ON i.id = v.idea_id WHERE v.user_id = $1', [id]),
    db.query('SELECT idea_id::text AS idea, body, created_at, edited_at FROM idea_comments WHERE user_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT kind, device, created_at FROM user_events WHERE user_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT device, created_at, last_seen_at FROM user_sessions WHERE user_id = $1', [id]),
    db.query('SELECT name, created_at, last_used_at FROM user_passkeys WHERE user_id = $1', [id]),
  ])
  const { passkeys: _n, ...profile } = s.user
  setResponseHeader(event, 'content-disposition', 'attachment; filename="ipnoria-mes-donnees.json"')
  return {
    exportedAt: new Date().toISOString(),
    profile,
    ideas: ideas.rows, votes: votes.rows, comments: comments.rows,
    securityLog: events.rows, sessions: sessions.rows, passkeys: passkeys.rows,
  }
})
