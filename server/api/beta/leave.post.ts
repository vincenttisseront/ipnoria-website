export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  await useDb().query(`UPDATE beta_applications SET status = 'left', updated_at = now() WHERE user_id = $1 AND status = 'accepted'`, [s.user.id])
  return { ok: true }
})
