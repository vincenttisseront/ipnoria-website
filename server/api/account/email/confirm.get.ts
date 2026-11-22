// Lien reçu à la nouvelle adresse : l'adresse du compte change, l'ancienne est prévenue.
export default defineEventHandler(async (event) => {
  requireAccounts()
  const t = await consumeToken(String(getQuery(event).token ?? ''), 'email')
  if (!t?.data) return sendRedirect(event, '/compte?email=invalide', 303)
  const db = useDb()
  const old = (await db.query('SELECT id::text, email, locale FROM users WHERE id = $1', [t.userId])).rows[0]
  try {
    await db.query('UPDATE users SET email = $2, email_verified_at = now(), updated_at = now() WHERE id = $1', [t.userId, t.data])
  }
  catch (err) {
    if ((err as { code?: string }).code === '23505') return sendRedirect(event, `${old.locale === 'en' ? '/en/account' : '/compte'}?email=invalide`, 303)
    throw err
  }
  await recordEvent(event, old, 'email_changed', { notifyTo: old.email })
  return sendRedirect(event, `${old.locale === 'en' ? '/en/account' : '/compte'}?email=ok`, 303)
})
