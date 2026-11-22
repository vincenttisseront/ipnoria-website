import { generateAuthenticationOptions } from '@simplewebauthn/server'

// Défi d'authentification par clé d'accès, pour trois usages :
// connexion sans mot de passe (pas de session), second facteur (session en attente), confirmation d'identité (session).
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const s = await getAccountSession(event)
  const { rpID } = rp()
  let allow: Array<{ id: string, transports?: string[] }> | undefined
  if (s) {
    const r = await useDb().query('SELECT credential_id, transports FROM user_passkeys WHERE user_id = $1', [s.user.id])
    if (!r.rowCount) throw fail(400, 'no_passkey')
    allow = r.rows.map(c => ({ id: c.credential_id, transports: c.transports ? c.transports.split(',') : undefined }))
  }
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred', allowCredentials: allow })
  await saveChallenge(event, options.challenge, 'login', s?.user.id ?? null)
  return options
})
