import nodemailer from 'nodemailer'
import type { ContactData } from '#shared/contact'

/** Notification par e-mail d'un nouveau message (texte brut uniquement). Sans NUXT_SMTP_HOST, ne fait rien. */
export async function notifyContact(id: string, data: ContactData): Promise<boolean> {
  const { smtp } = useRuntimeConfig()
  if (!smtp.host || !smtp.to || !smtp.from) return false

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: String(smtp.secure) === 'true',
    requireTLS: String(smtp.secure) !== 'true',
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: 10_000,
    tls: { minVersion: 'TLSv1.2' },
  })

  const body = [
    `Message n° ${id}`,
    `Nom : ${data.name}`,
    `E-mail : ${data.email}`,
    `Organisation : ${data.company || '-'}`,
    `Sujet : ${data.topic}`,
    `Langue : ${data.locale}`,
    '',
    data.message,
  ].join('\n')

  await transport.sendMail({
    from: smtp.from,
    to: smtp.to,
    // Le schéma interdit les retours à la ligne dans le nom et l'e-mail : pas d'injection d'en-tête possible
    replyTo: { name: data.name, address: data.email },
    subject: `[DDI-Buntu] ${data.topic} : ${data.name}`,
    text: body,
  })
  return true
}
