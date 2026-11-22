import { generateRegistrationOptions } from '@simplewebauthn/server'

export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const { rpID, rpName } = rp()
  const existing = await useDb().query('SELECT credential_id, transports FROM user_passkeys WHERE user_id = $1', [s.user.id])
  const options = await generateRegistrationOptions({
    rpName, rpID,
    userName: s.user.email,
    userDisplayName: s.user.displayName,
    userID: new TextEncoder().encode(`ipnoria-user-${s.user.id}`),
    attestationType: 'none',
    excludeCredentials: existing.rows.map(c => ({ id: c.credential_id, transports: c.transports ? c.transports.split(',') : undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  })
  await saveChallenge(event, options.challenge, 'register', s.user.id)
  return options
})
