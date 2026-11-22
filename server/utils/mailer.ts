import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type { ContactData } from '#shared/contact'

let transport: Transporter | null = null

export function hasSmtp(): boolean {
  const { smtp } = useRuntimeConfig()
  return Boolean(smtp.host && smtp.from)
}

function getTransport(): Transporter {
  if (transport) return transport
  const { smtp } = useRuntimeConfig()
  const secure = String(smtp.secure) === 'true'
  transport = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure,
    // STARTTLS exigé sauf relais local explicitement déclaré sans TLS (tests, relais sur le même hôte)
    requireTLS: !secure && String(smtp.allowPlain) !== 'true',
    ignoreTLS: String(smtp.allowPlain) === 'true',
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: 10_000,
    tls: { minVersion: 'TLSv1.2' },
  })
  return transport
}

/** Envoi d'un e-mail en texte brut. Les champs viennent de données validées (aucun retour à la ligne dans les en-têtes). */
export async function sendMail(msg: {
  to: string, subject: string, text: string, replyTo?: { name: string, address: string }, headers?: Record<string, string>
  icalEvent?: { method: string, content: string, filename?: string }
}) {
  const { smtp } = useRuntimeConfig()
  await getTransport().sendMail({ from: smtp.from, ...msg })
}

/** Notification d'un nouveau message de contact. Sans SMTP ou sans destinataire, ne fait rien. */
export async function notifyContact(id: string, data: ContactData): Promise<boolean> {
  const { smtp } = useRuntimeConfig()
  if (!hasSmtp() || !smtp.to) return false
  await sendMail({
    to: smtp.to,
    replyTo: { name: data.name, address: data.email },
    subject: `[Ipnoria] ${data.topic} : ${data.name}`,
    text: [
      `Message n° ${id}`,
      `Nom : ${data.name}`,
      `E-mail : ${data.email}`,
      `Organisation : ${data.company || '-'}`,
      `Sujet : ${data.topic}`,
      `Langue : ${data.locale}`,
      '',
      data.message,
    ].join('\n'),
  })
  return true
}
