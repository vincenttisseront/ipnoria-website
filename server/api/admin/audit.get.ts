// Journal des actions d'administration (200 dernières), filtrable par administrateur ou type d'objet
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const args: unknown[] = []
  const where: string[] = []
  if (typeof q.admin === 'string' && q.admin.trim()) { args.push(q.admin.trim().toLowerCase()); where.push(`lower(admin_email) = $${args.length}`) }
  if (typeof q.type === 'string' && q.type) { args.push(q.type); where.push(`target_type = $${args.length}`) }
  const r = await useDb().query(
    `SELECT id::text, admin_email AS admin, action, target_type AS "targetType", target_id AS "targetId", details, created_at AS at
       FROM admin_audit ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 200`, args,
  )
  return r.rows
})
