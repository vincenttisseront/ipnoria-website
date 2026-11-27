import { generateAuthenticationOptions } from '@simplewebauthn/server'

const COOKIE_PATH = '/api/admin/passkeys'

// Défi de clé d'accès pour le compte qui vient de saisir son mot de passe.
export default defineEventHandler(async (event) => {
  const pending = await requireAdminPending(event)
  const keys = await useDb().query('SELECT credential_id, transports FROM user_passkeys WHERE user_id = $1', [pending.userId])
  if (!keys.rowCount) throw fail(400, 'no_passkey')
  const { rpID } = rp()
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: keys.rows.map(c => ({ id: c.credential_id, transports: c.transports ? c.transports.split(',') : undefined })),
  })
  await saveChallenge(event, options.challenge, 'login', pending.userId, COOKIE_PATH)
  return options
})
