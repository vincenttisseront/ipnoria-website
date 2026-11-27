import { z } from 'zod'

// Incrémente la génération de session : les cookies déjà ouverts pour cette adresse ne passent plus.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const { email } = await readJson(event, z.object({ email: z.string().trim().email().max(254) }))
  const target = email.toLowerCase()
  if (!allowedAdmin(target)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  await useDb().query(
    `INSERT INTO admin_session_epoch (email, epoch) VALUES ($1, 1)
     ON CONFLICT (email) DO UPDATE SET epoch = admin_session_epoch.epoch + 1`,
    [target],
  )
  await adminAudit(event, admin, 'session.revoke', 'session', target)
  const self = target === admin.email.toLowerCase()
  if (self) await clearAdminLogin(event)
  return { ok: true, self }
})
