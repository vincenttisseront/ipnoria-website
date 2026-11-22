// Lien de vérification reçu par e-mail : marque l'adresse comme vérifiée puis renvoie vers le compte.
export default defineEventHandler(async (event) => {
  requireAccounts()
  const token = String(getQuery(event).token ?? '')
  const t = await consumeToken(token, 'verify')
  if (!t) return sendRedirect(event, '/compte?verification=invalide', 303)
  const r = await useDb().query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 RETURNING id::text, email, locale`, [t.userId],
  )
  const u = r.rows[0]
  await recordEvent(event, u, 'email_verified')
  return sendRedirect(event, `${u.locale === 'en' ? '/en/account' : '/compte'}?verification=ok`, 303)
})
