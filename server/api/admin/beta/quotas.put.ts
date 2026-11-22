import { z } from 'zod'
import { REFERENCE_SECTORS } from '#shared/account'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const q = await readJson(event, z.record(z.enum(REFERENCE_SECTORS), z.number().int().min(0).max(1000)))
  await useDb().query(`UPDATE beta_settings SET value = $1 WHERE key = 'quotas'`, [q])
  await adminAudit(event, admin, 'beta.quotas', 'beta_settings', 'quotas', q)
  return { ok: true }
})
