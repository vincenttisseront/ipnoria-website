export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const day = getRouterParam(event, 'day')
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw createError({ statusCode: 400, statusMessage: 'Invalid day' })
  const { rowCount } = await useDb().query(`DELETE FROM booking_closures WHERE day = $1::date`, [day])
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  await adminAudit(event, admin, 'booking.open', 'booking_closure', day)
  return { ok: true }
})
