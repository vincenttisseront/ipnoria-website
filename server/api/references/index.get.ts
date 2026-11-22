// Références publiées, dans l'ordre choisi par l'équipe
export default defineEventHandler(async () => {
  if (!hasDb()) return []
  const r = await useDb().query(`SELECT ${REFERENCE_PUBLIC} FROM customer_references r WHERE r.published ORDER BY r.position, r.name`)
  return r.rows
})
