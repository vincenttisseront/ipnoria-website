// Lien de confirmation reçu par e-mail : valable 7 jours, à usage unique (le jeton est remplacé ensuite)
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  if (!hasDb() || !/^[\w-]{43}$/.test(token)) return sendRedirect(event, '/newsletter?etat=invalide', 303)
  const { rows: [row] } = await useDb().query<{ locale: string }>(
    `UPDATE newsletter_subscribers
        SET confirmed_at = now(), token_hash = encode(sha256(gen_random_uuid()::text::bytea), 'hex')
      WHERE token_hash = $1 AND confirmed_at IS NULL AND unsubscribed_at IS NULL AND created_at > now() - interval '7 days'
      RETURNING locale`,
    [hashToken(token)],
  )
  if (!row) return sendRedirect(event, '/newsletter?etat=invalide', 303)
  return sendRedirect(event, `${row.locale === 'en' ? '/en' : ''}/newsletter?etat=confirme`, 303)
})
