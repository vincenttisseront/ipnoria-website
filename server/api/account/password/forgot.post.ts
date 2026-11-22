import { forgotSchema } from '#shared/account'

// Mot de passe oublié : toujours la même réponse ; lien envoyé seulement si le compte existe.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const { email } = await readJson(event, forgotSchema)
  const r = await useDb().query('SELECT id::text, email, locale FROM users WHERE lower(email) = $1', [email])
  const u = r.rows[0]
  if (u) {
    const token = await issueToken(u.id, 'reset', 1)
    await mailReset(u.email, u.locale, token).catch(err => console.error('[account]', err.message))
  }
  return { ok: true }
})
