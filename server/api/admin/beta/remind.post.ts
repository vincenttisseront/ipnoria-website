import { BETA_AGREEMENT_VERSION } from '#shared/beta'

// Écrit aux testeurs acceptés qui n'ont pas téléchargé la dernière version publiée.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const release = (await useDb().query<{ id: string, version: string }>(
    `SELECT id::text, version FROM beta_releases WHERE published ORDER BY created_at DESC LIMIT 1`,
  )).rows[0]
  if (!release) return { sent: 0, pending: 0, version: null, mailed: hasSmtp() }
  const people = (await useDb().query<{ email: string, locale: string, name: string, user_id: string }>(
    `SELECT u.email, u.locale, u.display_name AS name, u.id::text AS user_id
       FROM beta_applications a
       JOIN users u ON u.id = a.user_id
      WHERE a.status = 'accepted'
        AND EXISTS (SELECT 1 FROM beta_agreements g WHERE g.user_id = u.id AND g.version = $1)
        AND NOT EXISTS (SELECT 1 FROM beta_downloads d WHERE d.release_id = $2 AND d.user_id = u.id)`,
    [BETA_AGREEMENT_VERSION, release.id],
  )).rows
  if (!hasSmtp() || !people.length) {
    await adminAudit(event, admin, 'beta.remind', 'beta_release', release.id, { sent: 0, pending: people.length })
    return { sent: 0, pending: people.length, version: release.version, mailed: hasSmtp() }
  }
  let sent = 0
  for (const person of people) {
    const en = person.locale === 'en'
    const name = person.name || person.email
    const link = `${useRuntimeConfig().public.siteUrl.replace(/\/$/, '')}${signDownload(release.id, person.user_id)}`
    const subject = en ? `Version ${release.version} is ready to download` : `La version ${release.version} est à télécharger`
    const text = en
      ? `Hello ${name},\n\nVersion ${release.version} is available and you have not downloaded it yet.\n\n${link}\n\n-- \nIpnoria\n`
      : `Bonjour ${name},\n\nLa version ${release.version} est disponible et vous ne l'avez pas encore téléchargée.\n\n${link}\n\n-- \nIpnoria\n`
    await sendMail({ to: person.email, subject: `[Ipnoria bêta] ${subject}`, text })
      .then(() => sent++)
      .catch(err => console.error('[beta]', (err as Error).message))
  }
  await adminAudit(event, admin, 'beta.remind', 'beta_release', release.id, { sent, pending: people.length })
  return { sent, pending: people.length, version: release.version, mailed: true }
})
