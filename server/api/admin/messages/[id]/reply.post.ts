import { z } from 'zod'

// Réponse par e-mail à l'auteur d'un message ; la réponse est conservée et le message passe en « traité »
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!hasSmtp()) throw createError({ statusCode: 503, statusMessage: 'SMTP not configured' })
  const id = z.coerce.number().int().positive().parse(getRouterParam(event, 'id'))
  // eslint-disable-next-line no-control-regex
  const { body } = z.object({ body: z.string().trim().min(2).max(10_000).refine(v => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)) }).parse(await readBody(event))

  const db = useDb()
  const { rows: [msg] } = await db.query<{ email: string, name: string, topic: string, locale: string, message: string }>(
    'SELECT email, name, topic, locale, message FROM contact_messages WHERE id = $1', [id],
  )
  if (!msg) throw createError({ statusCode: 404 })

  const quoted = msg.message.split('\n').map(l => `> ${l}`).join('\n')
  const { smtp } = useRuntimeConfig()
  await sendMail({
    to: msg.email,
    subject: msg.locale === 'en' ? 'Re: your message to Ipnoria' : 'Re : votre message à Ipnoria',
    text: `${body}\n\n${quoted}\n`,
    replyTo: smtp.to ? { name: 'Ipnoria', address: smtp.to } : undefined,
  })
  await db.query(
    'UPDATE contact_messages SET reply_body = $2, replied_at = now(), handled_at = coalesce(handled_at, now()) WHERE id = $1',
    [id, body],
  )
  console.info(`[admin] réponse au message ${id} envoyée par ${admin.email}`)
  return { ok: true }
})
