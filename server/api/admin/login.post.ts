import { loginSchema } from '#shared/account'

// Connexion de l'administration. Même erreur si l'adresse est inconnue, le mot de passe faux, ou le compte non autorisé.
// Sans second facteur, l'étape suivante est son activation. Avec, le code ou la clé d'accès.
export default defineEventHandler(async (event) => {
  if (!adminEnabled()) throw createError({ statusCode: 404 })
  assertSameOrigin(event)
  const { email, password } = await readJson(event, loginSchema)
  const u = await checkPasswordLogin(event, email, password)
  if (!allowedAdmin(u.email)) throw fail(401, 'invalid_credentials')
  await beginAdminLogin(event, u)
  const factors = (await useDb().query(
    `SELECT totp_secret_enc IS NOT NULL AS totp,
            EXISTS (SELECT 1 FROM user_passkeys p WHERE p.user_id = $1) AS passkey
       FROM users WHERE id = $1`,
    [u.id],
  )).rows[0]
  return { step: factors?.totp || factors?.passkey ? 'mfa' : 'setup', passkey: Boolean(factors?.passkey) }
})
