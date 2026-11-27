import { codeSchema } from '#shared/account'
import { verifyTotp } from '../../../utils/account-totp'

// Le code prouve que l'application est réglée. Ouvre ensuite la session et remet les codes de secours.
export default defineEventHandler(async (event) => {
  const pending = await requireAdminPending(event)
  if (await hasSecondFactor(pending.userId)) throw fail(400, 'mfa_already')
  const { code } = await readJson(event, codeSchema)
  const db = useDb()
  const row = (await db.query('SELECT totp_pending_enc FROM users WHERE id = $1', [pending.userId])).rows[0]
  if (!row?.totp_pending_enc) throw fail(400, 'no_pending_setup')
  const step = verifyTotp(unsealTotp(row.totp_pending_enc), code.replace(/\s/g, ''))
  if (step == null) throw fail(400, 'invalid_code')
  await db.query(
    'UPDATE users SET totp_secret_enc = totp_pending_enc, totp_pending_enc = NULL, totp_last_step = $2, updated_at = now() WHERE id = $1',
    [pending.userId, step],
  )
  const recoveryCodes = await ensureRecoveryCodes(pending.userId)
  await openAdminSession(event, pending)
  await recordEvent(event, { id: pending.userId, email: pending.email, locale: pending.locale }, 'totp_enabled')
  await adminAudit(event, pending, 'mfa.enable', 'user', pending.userId, { factor: 'totp' })
  return { ok: true, recoveryCodes }
})
