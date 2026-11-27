import { z } from 'zod'

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const data = await readJson(event, z.object({
    day,
    note: z.string().trim().max(200).optional().default(''),
  }))
  const when = new Date(`${data.day}T12:00:00Z`)
  if (Number.isNaN(when.getTime()) || when.toISOString().slice(0, 10) !== data.day) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid day' })
  }
  try {
    await useDb().query(
      `INSERT INTO booking_closures (day, note) VALUES ($1::date, $2)`,
      [data.day, data.note],
    )
  }
  catch (err) {
    const code = (err as { code?: string }).code
    if (code === '23505') throw createError({ statusCode: 409, statusMessage: 'Already closed' })
    throw createError({ statusCode: 400, statusMessage: 'Invalid day' })
  }
  await adminAudit(event, admin, 'booking.close', 'booking_closure', data.day)
  return { ok: true }
})
