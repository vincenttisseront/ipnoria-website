import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

const COOKIE_PATH = '/api/admin/passkeys'

export default defineEventHandler(async (event) => {
  const pending = await requireAdminPending(event)
  const body = (await readBody(event)) as { response?: AuthenticationResponseJSON }
  const userId = await consumePasskeyLogin(event, body?.response, COOKIE_PATH)
  if (userId !== pending.userId) throw fail(401, 'passkey_invalid')
  await useDb().query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [pending.userId])
  await openAdminSession(event, pending)
  await noteLoginDevice(event, { id: pending.userId, email: pending.email, locale: pending.locale }, 'login_passkey')
  await adminAudit(event, pending, 'login', 'session', null, { factor: 'passkey' })
  return { ok: true }
})
