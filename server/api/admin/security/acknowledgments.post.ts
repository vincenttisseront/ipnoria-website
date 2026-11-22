import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readJson(event, z.object({
    name: z.string().trim().min(2).max(80),
    url: z.union([z.literal(''), z.string().trim().max(200).regex(/^https:\/\/[^\s<>"]+$/)]).optional().default(''),
    summary: z.object({ fr: z.string().trim().max(200).optional().default(''), en: z.string().trim().max(200).optional().default('') }),
    reportedOn: z.iso.date(),
  }))
  const r = await useDb().query(
    `INSERT INTO security_acknowledgments (name, url, summary, reported_on) VALUES ($1, NULLIF($2, ''), $3, $4) RETURNING id::text`, [d.name, d.url, d.summary, d.reportedOn],
  )
  await adminAudit(event, admin, 'security.ack.create', 'security_acknowledgment', r.rows[0].id, { name: d.name })
  return { ok: true }
})
