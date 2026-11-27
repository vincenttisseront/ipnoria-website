import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const data = await readJson(event, z.object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(2).max(10000),
  }))
  const { rows } = await useDb().query<{ id: string }>(
    `INSERT INTO reply_templates (title, body) VALUES ($1, $2) RETURNING id::text`,
    [data.title, data.body],
  )
  await adminAudit(event, admin, 'template.create', 'reply_template', rows[0]?.id, { title: data.title })
  return { id: rows[0]?.id }
})
