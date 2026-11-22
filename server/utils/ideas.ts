import type pg from 'pg'
import { ROADMAP } from '#shared/roadmap'
import type { IdeaStatus } from '#shared/account'

// Demandes de fonctionnalités : outils communs aux routes publiques et à l'administration.

type Loc = 'fr' | 'en'
/** Texte dans la langue demandée, sinon dans l'autre. */
export const pickLocale = (v: Record<string, string> | null | undefined, l: Loc) => v?.[l] || v?.[l === 'fr' ? 'en' : 'fr'] || ''

export async function seedTeamIdeas(pool: pg.Pool): Promise<void> {
  for (const i of ROADMAP) {
    const r = await pool.query(
      `INSERT INTO ideas (key, title, body, locale, status) VALUES ($1, $2, $3, 'fr', $4) ON CONFLICT (key) DO NOTHING RETURNING id`,
      [i.id, i.title, i.text, i.status === 'planned' ? 'planned' : 'review'],
    )
    if (r.rowCount) await pool.query('INSERT INTO idea_status_events (idea_id, status) VALUES ($1, $2)', [r.rows[0].id, i.status === 'planned' ? 'planned' : 'review'])
  }
}

export const IDEA_SELECT = `
  i.id::text, i.key, i.title, i.body, i.locale, i.status, i.duplicate_of::text AS "duplicateOf", i.hidden,
  i.created_at AS "createdAt", i.updated_at AS "updatedAt",
  CASE WHEN i.author_id IS NULL AND i.key IS NOT NULL THEN 'team' WHEN i.author_id IS NULL THEN 'deleted' ELSE 'user' END AS "authorKind",
  u.display_name AS "authorName",
  (SELECT count(*)::int FROM idea_votes v WHERE v.idea_id = i.id) AS votes,
  (SELECT count(*)::int FROM idea_comments c WHERE c.idea_id = i.id AND NOT c.hidden) AS comments`

/** Prévient par e-mail l'auteur et les votants (qui l'acceptent) d'un changement de statut. */
export async function notifyStatusChange(ideaId: string, status: IdeaStatus, note: string): Promise<number> {
  if (!hasSmtp()) return 0
  const db = useDb()
  const idea = (await db.query('SELECT id::text, title FROM ideas WHERE id = $1', [ideaId])).rows[0]
  if (!idea) return 0
  const r = await db.query(
    `SELECT DISTINCT u.email, u.locale FROM users u
      WHERE u.notify_status AND u.email_verified_at IS NOT NULL
        AND (u.id IN (SELECT user_id FROM idea_votes WHERE idea_id = $1) OR u.id = (SELECT author_id FROM ideas WHERE id = $1))`, [ideaId],
  )
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const LABEL: Record<Loc, Record<IdeaStatus, string>> = {
    fr: { proposed: 'proposée', review: 'à l\'étude', planned: 'prévue', progress: 'en cours', shipped: 'livrée', declined: 'non retenue', duplicate: 'doublon' },
    en: { proposed: 'proposed', review: 'under review', planned: 'planned', progress: 'in progress', shipped: 'shipped', declined: 'declined', duplicate: 'duplicate' },
  }
  let sent = 0
  for (const u of r.rows as Array<{ email: string, locale: Loc }>) {
    const l = u.locale
    const title = pickLocale(idea.title, l)
    const link = `${site}${l === 'en' ? '/en/roadmap' : '/feuille-de-route'}/${idea.id}`
    const prefs = `${site}${l === 'en' ? '/en/account' : '/compte'}`
    await sendMail({
      to: u.email,
      subject: l === 'en' ? `[Ipnoria] “${title}” is now ${LABEL.en[status]}` : `[Ipnoria] « ${title} » : ${LABEL.fr[status]}`,
      text: l === 'en'
        ? `The idea you follow, “${title}”, is now ${LABEL.en[status]}.\n${note ? `\nTeam note:\n${note}\n` : ''}\n${link}\n\nTo stop these emails: ${prefs}\n`
        : `L'idée que vous suivez, « ${title} », est maintenant ${LABEL.fr[status]}.\n${note ? `\nNote de l'équipe :\n${note}\n` : ''}\n${link}\n\nPour ne plus recevoir ces e-mails : ${prefs}\n`,
    }).then(() => sent++).catch(err => console.error('[ideas] e-mail non envoyé :', err.message))
  }
  return sent
}

/** Prévient l'auteur d'une idée d'un nouveau commentaire (sauf le sien). */
export async function notifyComment(ideaId: string, commenterId: string | null, authorName: string, body: string): Promise<void> {
  if (!hasSmtp()) return
  const db = useDb()
  const r = await db.query(
    `SELECT i.id::text, i.title, u.email, u.locale FROM ideas i JOIN users u ON u.id = i.author_id
      WHERE i.id = $1 AND u.notify_comments AND u.email_verified_at IS NOT NULL AND u.id IS DISTINCT FROM $2`, [ideaId, commenterId],
  )
  const x = r.rows[0]
  if (!x) return
  const l = x.locale as Loc
  const title = pickLocale(x.title, l)
  const link = `${useRuntimeConfig().public.siteUrl.replace(/\/$/, '')}${l === 'en' ? '/en/roadmap' : '/feuille-de-route'}/${x.id}`
  const excerpt = body.length > 600 ? `${body.slice(0, 600)}…` : body
  await sendMail({
    to: x.email,
    subject: l === 'en' ? `[Ipnoria] New comment on “${title}”` : `[Ipnoria] Nouveau commentaire sur « ${title} »`,
    text: l === 'en' ? `${authorName} wrote:\n\n${excerpt}\n\n${link}\n` : `${authorName} a écrit :\n\n${excerpt}\n\n${link}\n`,
  }).catch(err => console.error('[ideas] e-mail non envoyé :', err.message))
}
