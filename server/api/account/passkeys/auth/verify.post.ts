import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const body = (await readBody(event)) as { response?: AuthenticationResponseJSON }
  const userId = await consumePasskeyLogin(event, body?.response)
  const user = await loadUser(userId)
  if (!user) throw fail(401, 'passkey_invalid')
  const s = await getAccountSession(event)
  if (s && !s.mfaPending && s.user.id === user.id) {
    await markReauth(s.id) // confirmation d'identité
    return { ok: true, reauth: true }
  }
  // Connexion (sans mot de passe, ou second facteur après le mot de passe)
  await useDb().query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id])
  const { newDevice } = await createSession(event, user.id)
  await recordEvent(event, user, 'login_passkey')
  if (newDevice) await recordEvent(event, user, 'login_new_device')
  return { ok: true }
})