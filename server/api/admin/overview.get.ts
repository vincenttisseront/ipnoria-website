// Vue d'ensemble pour l'administration : démonstrations à venir, idées par statut, comptes
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const zone = bookingZone()
  const [{ rows: bookings }, { rows: ideas }, { rows: [users] }, { rows: closures }] = await Promise.all([
    db.query(`SELECT id, starts_at, name, email, company, notes, locale FROM bookings
               WHERE status = 'confirmed' AND starts_at > now() - interval '1 day' ORDER BY starts_at LIMIT 100`),
    db.query<{ status: string, n: number }>(`SELECT status, count(*)::int AS n FROM ideas WHERE NOT hidden GROUP BY status`),
    db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS verified,
                     count(*) FILTER (WHERE totp_secret_enc IS NOT NULL OR EXISTS (SELECT 1 FROM user_passkeys p WHERE p.user_id = users.id))::int AS mfa
                FROM users`),
    db.query<{ day: string, note: string }>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, note FROM booking_closures
        WHERE day >= ((now() AT TIME ZONE $1)::date - 1) ORDER BY day LIMIT 120`,
      [zone],
    ),
  ])
  return { bookings, closures, ideas: Object.fromEntries(ideas.map(i => [i.status, i.n])), users }
})
