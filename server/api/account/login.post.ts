import { loginSchema } from '#shared/account'

// Connexion par mot de passe. Erreur identique pour une adresse inconnue ou un mauvais mot de passe.
// Verrou progressif par compte après 5 échecs (1, 2, 4… minutes, 60 au plus). Second facteur demandé s'il existe.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const { email, password } = await readJson(event, loginSchema)
  const u = await checkPasswordLogin(event, email, password)
  if (await hasSecondFactor(u.id)) {
    await createSession(event, u.id, { mfaPending: true })
    return { ok: true, mfa: true }
  }
  const { newDevice } = await createSession(event, u.id)
  await recordEvent(event, u, 'login')
  if (newDevice) await recordEvent(event, u, 'login_new_device')
  return { ok: true, mfa: false }
})
