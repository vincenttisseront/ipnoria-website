import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'
import { BETA_AGREEMENT_VERSION } from '#shared/beta'
import { randomToken, safeEqual } from './account-crypto'

// Programme bêta : statut d'un compte, accès à l'espace testeur, liens de téléchargement signés, e-mails.

export interface BetaState {
  application: null | {
    status: string, sector: string, orgSize: string, createdAt: string, decidedAt: string | null, decisionNote: string | null
    referralCode: string | null, referred: number, publicCredit: boolean
  }
  agreementVersion: string
  agreementAccepted: boolean
  tester: boolean
}

export async function betaState(userId: string): Promise<BetaState> {
  const db = useDb()
  const a = (await db.query(
    `SELECT status, sector, org_size AS "orgSize", created_at AS "createdAt", decided_at AS "decidedAt", decision_note AS "decisionNote",
            referral_code AS "referralCode", public_credit AS "publicCredit",
            (SELECT count(*)::int FROM beta_applications r WHERE r.referred_by = $1) AS referred
       FROM beta_applications WHERE user_id = $1`, [userId],
  )).rows[0] ?? null
  const ag = await db.query('SELECT 1 FROM beta_agreements WHERE user_id = $1 AND version = $2', [userId, BETA_AGREEMENT_VERSION])
  const accepted = Boolean(ag.rowCount)
  return { application: a, agreementVersion: BETA_AGREEMENT_VERSION, agreementAccepted: accepted, tester: a?.status === 'accepted' && accepted }
}

/** Exige un testeur accepté qui a signé la version courante de l'accord. */
export async function requireTester(event: H3Event) {
  const s = await requireUser(event, { verified: true })
  const st = await betaState(s.user.id)
  if (st.application?.status !== 'accepted') throw fail(403, 'not_tester')
  if (!st.agreementAccepted) throw fail(403, 'agreement_required')
  return s
}

export const newReferralCode = () => randomToken(8).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(8, '7')

// Liens de téléchargement : /beta-download/<id>?u=<utilisateur>&exp=<epoch>&sig=<HMAC>, valables 24 h
const linkKey = () => `beta-download:${useRuntimeConfig().accounts.secret}`
export function signDownload(releaseId: string, userId: string, hours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600
  const sig = createHmac('sha256', linkKey()).update(`${releaseId}.${userId}.${exp}`).digest('base64url')
  return `/beta-download/${releaseId}?u=${userId}&exp=${exp}&sig=${sig}`
}
export function checkDownload(releaseId: string, userId: string, exp: string, sig: string): boolean {
  if (!/^\d+$/.test(userId) || !/^\d{9,12}$/.test(exp) || Number(exp) < Date.now() / 1000) return false
  const expected = createHmac('sha256', linkKey()).update(`${releaseId}.${userId}.${exp}`).digest('base64url')
  return safeEqual(expected, sig)
}

type L = 'fr' | 'en'
const site = () => useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
/** Adresse d'une page bêta dans la langue du destinataire : betaUrl('fr', { fr: '/espace', en: '/space' }) */
export const betaUrl = (l: L, path: { fr: string, en: string } = { fr: '', en: '' }) => `${site()}${l === 'en' ? `/en/beta${path.en}` : `/beta${path.fr}`}`

const DECISION: Record<string, Record<L, { subject: string, text: string }>> = {
  received: {
    fr: { subject: 'Candidature au programme bêta reçue', text: 'Merci pour votre candidature au programme bêta d\'Ipnoria. Nous la lisons et revenons vers vous sous quelques jours. Vous pouvez suivre son état ici :' },
    en: { subject: 'Beta programme application received', text: 'Thanks for applying to the Ipnoria beta programme. We read every application and will get back to you within a few days. Follow its status here:' },
  },
  accepted: {
    fr: { subject: 'Bienvenue dans le programme bêta d\'Ipnoria', text: 'Votre candidature est acceptée. Dernière étape : lire et accepter l\'accord bêta, puis l\'espace testeur s\'ouvre (versions, campagnes, signalements) :' },
    en: { subject: 'Welcome to the Ipnoria beta programme', text: 'Your application is accepted. Last step: read and accept the beta agreement, then the tester space opens (versions, campaigns, reports):' },
  },
  waitlist: {
    fr: { subject: 'Programme bêta : liste d\'attente', text: 'Merci pour votre candidature. Les places sont pour l\'instant pourvues pour votre profil : vous êtes sur la liste d\'attente et serez prévenu dès qu\'une place s\'ouvre.' },
    en: { subject: 'Beta programme: waiting list', text: 'Thanks for applying. Places for your profile are filled for now: you are on the waiting list and will be told as soon as one opens.' },
  },
  declined: {
    fr: { subject: 'Programme bêta : votre candidature', text: 'Merci pour votre candidature. Nous ne pouvons pas la retenir pour cette phase du programme. Vous pourrez repostuler lors de la prochaine ouverture, et la feuille de route reste ouverte à vos idées.' },
    en: { subject: 'Beta programme: your application', text: 'Thanks for applying. We can\'t take it for this phase of the programme. You can apply again at the next opening, and the roadmap stays open to your ideas.' },
  },
}

export async function mailBetaDecision(to: string, l: L, name: string, kind: keyof typeof DECISION, note = '') {
  if (!hasSmtp()) return
  const m = DECISION[kind]![l]
  await sendMail({
    to,
    subject: `[Ipnoria] ${m.subject}`,
    text: `${l === 'en' ? 'Hello' : 'Bonjour'} ${name},\n\n${m.text}\n${kind === 'accepted' || kind === 'received' ? `${betaUrl(l)}\n` : ''}${note ? `\n${note}\n` : ''}\n-- \nIpnoria\n`,
  }).catch(err => console.error('[beta]', err.message))
}

/** Prévient les testeurs actifs (nouvelle version, nouvelle campagne). */
export async function mailTesters(subject: Record<L, string>, body: Record<L, string>, path: { fr: string, en: string }): Promise<number> {
  if (!hasSmtp()) return 0
  const r = await useDb().query(
    `SELECT u.email, u.locale FROM beta_applications a JOIN users u ON u.id = a.user_id
      WHERE a.status = 'accepted' AND EXISTS (SELECT 1 FROM beta_agreements g WHERE g.user_id = u.id AND g.version = $1)`, [BETA_AGREEMENT_VERSION],
  )
  let n = 0
  for (const u of r.rows as Array<{ email: string, locale: L }>) {
    await sendMail({ to: u.email, subject: `[Ipnoria bêta] ${subject[u.locale]}`, text: `${body[u.locale]}\n\n${betaUrl(u.locale, path)}\n\n-- \nIpnoria\n` })
      .then(() => n++).catch(err => console.error('[beta]', err.message))
  }
  return n
}

export async function mailReporter(reportId: string, kind: 'status' | 'reply', detail: string) {
  if (!hasSmtp()) return
  const r = (await useDb().query(
    `SELECT b.title, u.email, u.locale FROM beta_reports b JOIN users u ON u.id = b.user_id WHERE b.id = $1`, [reportId],
  )).rows[0]
  if (!r) return
  const l = r.locale as L
  const STATUS: Record<L, Record<string, string>> = {
    fr: { new: 'nouveau', need_info: 'informations demandées', confirmed: 'confirmé', in_progress: 'en cours de correction', fixed: 'corrigé', wontfix: 'ne sera pas corrigé', duplicate: 'doublon' },
    en: { new: 'new', need_info: 'information requested', confirmed: 'confirmed', in_progress: 'being fixed', fixed: 'fixed', wontfix: 'won\'t fix', duplicate: 'duplicate' },
  }
  const subject = kind === 'status'
    ? (l === 'en' ? `Your report “${r.title}”: ${STATUS.en[detail]}` : `Votre signalement « ${r.title} » : ${STATUS.fr[detail]}`)
    : (l === 'en' ? `Team reply on “${r.title}”` : `Réponse de l'équipe sur « ${r.title} »`)
  await sendMail({
    to: r.email,
    subject: `[Ipnoria bêta] ${subject}`,
    text: `${kind === 'reply' ? `${detail}\n\n` : ''}${betaUrl(l, { fr: `/signalements/${reportId}`, en: `/reports/${reportId}` })}\n\n-- \nIpnoria\n`,
  }).catch(err => console.error('[beta]', err.message))
}

/** Taille et SHA-256 d'un fichier du dossier bêta (null s'il n'existe pas). */
export async function hashBetaFile(fileName: string): Promise<{ size: number, sha256: string } | null> {
  const { createReadStream } = await import('node:fs')
  const { stat } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { createHash } = await import('node:crypto')
  const dir = String(useRuntimeConfig().beta.filesDir)
  if (!dir || !/^[A-Za-z0-9._-]{1,120}$/.test(fileName)) return null
  const path = join(dir, fileName)
  const st = await stat(path).catch(() => null)
  if (!st?.isFile()) return null
  const h = createHash('sha256')
  await new Promise<void>((resolve, reject) => createReadStream(path).on('data', c => h.update(c)).on('end', () => resolve()).on('error', reject))
  return { size: st.size, sha256: h.digest('hex') }
}
