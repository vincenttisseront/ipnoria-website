export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const r = await useDb().query(
    `SELECT ${REFERENCE_PUBLIC}, r.story, r.published, r.position, r.authorized_by AS "authorizedBy", to_char(r.authorized_at, 'YYYY-MM-DD') AS "authorizedAt"
       FROM customer_references r ORDER BY r.position, r.name`,
  )
  return r.rows
})
