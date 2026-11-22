import { createHmac } from 'node:crypto'
import { MIN_FILL_MS } from '#shared/contact'
import { voteSchema } from '#shared/forms'
import { roadmapItem } from '#shared/roadmap'

// Vote : une voix par élément et par adresse, comptée après confirmation par e-mail. L'adresse n'est jamais stockée.
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  if (!getRequestHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415 })
  if (!hasDb() || !hasSmtp()) throw createError({ statusCode: 503, statusMessage: 'Voting unavailable' })

  const raw = (await readBody(event)) ?? {}
  if ((typeof raw.website === 'string' && raw.website) || (typeof raw.startedAt === 'number' && Date.now() - raw.startedAt < MIN_FILL_MS)) {
    setResponseStatus(event, 202)
    return { ok: true }
  }
  const parsed = voteSchema.safeParse(raw)
  if (!parsed.success || !roadmapItem(parsed.data.item)) {
    const fields = parsed.success ? ['item'] : [...new Set(parsed.error.issues.map(i => String(i.path[0])))]
    throw createError({ statusCode: 400, statusMessage: 'Invalid vote', data: { fields } })
  }
  const { item, email, locale } = parsed.data
  const emailHash = createHmac('sha256', String(useRuntimeConfig().ipHashSalt)).update(`vote:${email}`).digest('hex')
  const token = newToken()

  // Déjà confirmé : réponse identique, rien n'est renvoyé (pas d'énumération)
  const { rows } = await useDb().query(
    `INSERT INTO roadmap_votes (item, email_hash, token_hash, locale, ip_hash) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (item, email_hash) DO UPDATE SET token_hash = EXCLUDED.token_hash, created_at = now(), locale = EXCLUDED.locale
       WHERE roadmap_votes.confirmed_at IS NULL
     RETURNING id`,
    [item, emailHash, hashToken(token), locale, clientIpHash(event)],
  )
  if (rows.length) {
    const title = roadmapItem(item)!.title[locale]
    const url = `${useRuntimeConfig().public.siteUrl.replace(/\/$/, '')}/api/roadmap/confirm?token=${token}`
    const text = locale === 'en'
      ? `Hello,\n\nTo count your vote for “${title}” on the Ipnoria roadmap, confirm it here:\n\n${url}\n\nIf you didn't vote, ignore this message: unconfirmed votes are deleted after 7 days. Your address is not kept.\n`
      : `Bonjour,\n\nPour compter votre vote pour « ${title} » sur la feuille de route d'Ipnoria, confirmez-le ici :\n\n${url}\n\nSi vous n'avez pas voté, ignorez ce message : un vote non confirmé est supprimé au bout de 7 jours. Votre adresse n'est pas conservée.\n`
    try {
      await sendMail({ to: email, subject: locale === 'en' ? `Confirm your vote: ${title}` : `Confirmez votre vote : ${title}`, text })
    }
    catch (err) {
      console.error('[roadmap] e-mail de confirmation impossible :', (err as Error).message)
      throw createError({ statusCode: 502, statusMessage: 'Mail delivery failed' })
    }
  }
  setResponseStatus(event, 202)
  return { ok: true }
})
