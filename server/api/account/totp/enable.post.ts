import { codeSchema } from '#shared/account'
import { verifyTotp } from '../../../utils/account-totp'

// Fin d'activation : le code prouve que l'application est réglée. Premiers codes de secours si besoin.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const { code } = await readJson(event, codeSchema)
  const db = useDb()
  const row = (await db.query('SELECT totp_pending_enc FROM users WHERE id = $1', [s.user.id])).rows[0]
  if (!row?.totp_pending_enc) throw fail(400, 'no_pending_setup')
  const step = verifyTotp(unsealTotp(row.totp_pending_enc), code)
  if (step == null) throw fail(400, 'invalid_code')
  await db.query('UPDATE users SET totp_secret_enc = totp_pending_enc, totp_pending_enc = NULL, totp_last_step = $2, updated_at = now() WHERE id = $1', [s.user.id, step])
  await recordEvent(event, s.user, 'totp_enabled')
  return { ok: true, recoveryCodes: await ensureRecoveryCodes(s.user.id) }
})
