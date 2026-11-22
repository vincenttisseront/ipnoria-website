import type { H3Event } from 'h3'
import { deviceLabel } from './account-password'

// E-mails des comptes, en texte brut, dans la langue du compte.

type L = 'fr' | 'en'
const site = () => useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const prefix = (l: L) => (l === 'en' ? '/en/account' : '/compte')
export const accountUrl = (l: L, path = '') => `${site()}${prefix(l)}${path}`

const SIGN = { fr: '\n-- \nIpnoria\n', en: '\n-- \nIpnoria\n' }

export async function mailVerify(to: string, l: L, name: string, token: string) {
  const link = `${site()}/api/account/verify?token=${token}`
  await sendMail({
    to,
    subject: l === 'en' ? 'Confirm your email address' : 'Confirmez votre adresse e-mail',
    text: l === 'en'
      ? `Hello ${name},\n\nConfirm your address to vote, propose ideas and comment:\n${link}\n\nThe link is valid for 24 hours. If you didn't create an account, ignore this email.\n${SIGN.en}`
      : `Bonjour ${name},\n\nConfirmez votre adresse pour voter, proposer des idées et commenter :\n${link}\n\nLe lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez cet e-mail.\n${SIGN.fr}`,
  })
}

/** Inscription avec une adresse déjà utilisée : on prévient le titulaire, sans rien révéler à l'auteur de la demande. */
export async function mailAlreadyRegistered(to: string, l: L) {
  await sendMail({
    to,
    subject: l === 'en' ? 'You already have an Ipnoria account' : 'Vous avez déjà un compte Ipnoria',
    text: l === 'en'
      ? `Someone tried to create an account with this address, which already has one.\n\nSign in: ${accountUrl('en', '/sign-in')}\nForgot your password? ${accountUrl('en', '/forgot-password')}\n\nIf it wasn't you, no action is needed.\n${SIGN.en}`
      : `Quelqu'un a voulu créer un compte avec cette adresse, qui en a déjà un.\n\nSe connecter : ${accountUrl('fr', '/connexion')}\nMot de passe oublié : ${accountUrl('fr', '/mot-de-passe-oublie')}\n\nSi ce n'était pas vous, rien à faire.\n${SIGN.fr}`,
  })
}

export async function mailReset(to: string, l: L, token: string) {
  const link = `${l === 'en' ? accountUrl('en', '/reset-password') : accountUrl('fr', '/reinitialiser')}?token=${token}`
  await sendMail({
    to,
    subject: l === 'en' ? 'Reset your password' : 'Réinitialiser votre mot de passe',
    text: l === 'en'
      ? `To choose a new password, open this link (valid for 1 hour):\n${link}\n\nAll your sessions will be signed out. Two-step verification stays on.\nIf you didn't ask for this, ignore this email: your password doesn't change.\n${SIGN.en}`
      : `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nToutes vos sessions seront fermées. La validation en deux étapes reste active.\nSi vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe ne change pas.\n${SIGN.fr}`,
  })
}

export async function mailEmailChange(to: string, l: L, token: string) {
  const link = `${site()}/api/account/email/confirm?token=${token}`
  await sendMail({
    to,
    subject: l === 'en' ? 'Confirm your new email address' : 'Confirmez votre nouvelle adresse',
    text: l === 'en'
      ? `Confirm this address for your Ipnoria account (link valid for 24 hours):\n${link}\n${SIGN.en}`
      : `Confirmez cette adresse pour votre compte Ipnoria (lien valable 24 heures) :\n${link}\n${SIGN.fr}`,
  })
}

const EVENT_TEXT: Record<string, { fr: string, en: string }> = {
  login_new_device: { fr: 'Nouvelle connexion à votre compte depuis un appareil inconnu', en: 'New sign-in to your account from an unknown device' },
  password_changed: { fr: 'Votre mot de passe a été changé', en: 'Your password was changed' },
  password_reset: { fr: 'Votre mot de passe a été réinitialisé', en: 'Your password was reset' },
  email_changed: { fr: 'L\'adresse e-mail du compte a été changée', en: 'The account email address was changed' },
  totp_enabled: { fr: 'Application d\'authentification activée', en: 'Authenticator app turned on' },
  totp_disabled: { fr: 'Application d\'authentification retirée', en: 'Authenticator app removed' },
  passkey_added: { fr: 'Clé d\'accès ajoutée', en: 'Passkey added' },
  passkey_removed: { fr: 'Clé d\'accès retirée', en: 'Passkey removed' },
  recovery_regenerated: { fr: 'Nouveaux codes de secours générés', en: 'New recovery codes generated' },
  github_linked: { fr: 'Compte GitHub lié', en: 'GitHub account linked' },
  github_unlinked: { fr: 'Compte GitHub délié', en: 'GitHub account unlinked' },
  sessions_revoked: { fr: 'Autres sessions fermées', en: 'Other sessions signed out' },
}
export const ALERT_KINDS = new Set(Object.keys(EVENT_TEXT))

/** Inscrit l'événement au journal du compte et, pour les événements sensibles, prévient le titulaire. */
export async function recordEvent(event: H3Event, user: { id: string, email: string, locale: L }, kind: string, opts: { notifyTo?: string } = {}) {
  const device = deviceLabel(getRequestHeader(event, 'user-agent') ?? '')
  await useDb().query('INSERT INTO user_events (user_id, kind, device, ip_hash) VALUES ($1, $2, $3, $4)', [user.id, kind, device, clientIpHash(event)])
  const t = EVENT_TEXT[kind]
  if (!t || !hasSmtp()) return
  const l = user.locale
  const when = new Intl.DateTimeFormat(l === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date())
  const security = l === 'en' ? accountUrl('en', '/security') : accountUrl('fr', '/securite')
  await sendMail({
    to: opts.notifyTo ?? user.email,
    subject: `[Ipnoria] ${t[l]}`,
    text: l === 'en'
      ? `${t.en}.\n\nWhen: ${when} (Paris time)\nDevice: ${device}\n\nIf it was you, nothing to do. Otherwise, reset your password now and review your security settings:\n${security}\n${SIGN.en}`
      : `${t.fr}.\n\nQuand : ${when}\nAppareil : ${device}\n\nSi c'était vous, rien à faire. Sinon, réinitialisez tout de suite votre mot de passe et vérifiez vos réglages de sécurité :\n${security}\n${SIGN.fr}`,
  }).catch(err => console.error('[account] alerte non envoyée :', err.message))
}
