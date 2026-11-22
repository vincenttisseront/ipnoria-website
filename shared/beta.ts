import { z } from 'zod'
import { REFERENCE_SECTORS, REFERENCE_SERVICES } from './account'

// Programme bêta : listes fermées, schémas des formulaires, accord versionné.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001F\u007F]*$/
const text = (min: number, max: number) => z.string().trim().min(min).max(max).refine(s => !CONTROL.test(s))

export const ORG_SIZES = ['lt100', 'lt500', 'lt2000', 'gt2000'] as const
export const HYPERVISORS = ['vmware', 'proxmox', 'hyperv', 'xcpng', 'nutanix', 'other', 'none'] as const
export const CURRENT_STACK = ['windows_dns', 'windows_dhcp', 'windows_nps', 'windows_adcs', 'linux_bind', 'linux_dhcp', 'box', 'spreadsheet', 'commercial_ddi', 'other'] as const
export const HOURS = ['lt2', 'lt8', 'gt8'] as const
export const MODULES = ['install', 'update', 'console', 'ipam', 'dns', 'dhcp', 'radius', 'pki', 'cluster', 'ad', 'other'] as const
export const SEVERITIES = ['blocker', 'major', 'minor', 'suggestion'] as const
export const REPORT_STATUSES = ['new', 'need_info', 'confirmed', 'in_progress', 'fixed', 'wontfix', 'duplicate'] as const
export const APPLICATION_STATUSES = ['pending', 'accepted', 'waitlist', 'declined', 'left'] as const
export type ReportStatus = typeof REPORT_STATUSES[number]
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]

export const applicationSchema = z.object({
  sector: z.enum(REFERENCE_SECTORS),
  orgSize: z.enum(ORG_SIZES),
  hypervisor: z.enum(HYPERVISORS),
  currentStack: z.array(z.enum(CURRENT_STACK)).max(CURRENT_STACK.length).default([]),
  activeDirectory: z.boolean(),
  wifi8021x: z.boolean(),
  services: z.array(z.enum(REFERENCE_SERVICES)).min(1).max(REFERENCE_SERVICES.length),
  hours: z.enum(HOURS),
  motivation: text(20, 2000),
  publicCredit: z.boolean().default(false),
  ref: z.string().trim().regex(/^[a-z0-9]{6,16}$/).optional().or(z.literal('')),
  pow: z.string().max(2000).optional(),
})

export const reportSchema = z.object({
  version: z.string().trim().min(1).max(40).regex(SINGLE_LINE),
  module: z.enum(MODULES),
  severity: z.enum(SEVERITIES),
  title: z.string().trim().min(8).max(140).regex(SINGLE_LINE),
  steps: text(10, 6000),
  expected: text(2, 3000),
  actual: text(2, 3000),
  logs: z.string().max(20000).refine(s => !CONTROL.test(s.replace(/\t/g, ''))).optional().default(''),
  campaignId: z.number().int().positive().nullable().optional(),
})

export const campaignResultSchema = z.object({
  steps: z.array(z.object({ result: z.enum(['ok', 'ko', 'skip']), note: z.string().trim().max(500).optional().default('') })).max(30),
  outcome: z.enum(['success', 'partial', 'failure']),
  comment: z.string().trim().max(3000).optional().default(''),
})

const bi = (max: number) => z.object({ fr: z.string().trim().max(max).optional().default(''), en: z.string().trim().max(max).optional().default('') })
export const adminReleaseSchema = z.object({
  version: z.string().trim().regex(/^[0-9A-Za-z.+-]{1,40}$/),
  title: bi(120),
  notes: bi(8000),
  fileName: z.string().trim().regex(/^[A-Za-z0-9._-]{1,120}$/),
  published: z.boolean().default(false),
})
export const adminCampaignSchema = z.object({
  title: bi(140),
  body: bi(4000),
  steps: z.array(bi(300)).max(30),
  version: z.string().trim().max(40).optional().default(''),
  startsOn: z.union([z.literal(''), z.iso.date()]).optional().default(''),
  endsOn: z.union([z.literal(''), z.iso.date()]).optional().default(''),
  published: z.boolean().default(false),
})

/** Version courante de l'accord bêta : la changer oblige chaque testeur à accepter la nouvelle version. */
export const BETA_AGREEMENT_VERSION = '2026-11'
export const BETA_AGREEMENT: Record<'fr' | 'en', Array<{ title: string, text: string }>> = {
  fr: [
    { title: 'Objet', text: 'Vous testez des versions préliminaires d\'Ipnoria et nous faites part de vos constats. Le programme est gratuit et sans engagement de durée : vous pouvez le quitter à tout moment depuis votre espace.' },
    { title: 'Pas de production', text: 'Les versions bêta peuvent contenir des défauts graves. Installez-les sur un environnement de test, isolé de votre production, sans données que vous ne pourriez pas perdre.' },
    { title: 'Confidentialité', text: 'Les versions, notes et problèmes connus de l\'espace bêta ne sont pas publics. Ne les redistribuez pas et ne publiez pas de captures sans notre accord. Vos impressions générales sur le produit restent libres.' },
    { title: 'Vos retours', text: 'Vous nous autorisez à utiliser vos signalements, suggestions et résultats de campagne pour améliorer Ipnoria, y compris dans le code publié sous licence AGPL. Retirez de vos journaux tout secret, mot de passe ou donnée personnelle avant de les joindre.' },
    { title: 'Sans garantie', text: 'Les versions bêta sont fournies en l\'état, sans garantie ni support contractuel. Nous répondons aux signalements au mieux, sans délai garanti.' },
    { title: 'Liens de téléchargement', text: 'Les liens sont personnels et expirent après 24 heures. Les téléchargements sont enregistrés pour suivre la diffusion des versions.' },
    { title: 'Données personnelles', text: 'Votre candidature, vos signalements et vos résultats sont conservés pendant le programme et un an après sa fin, puis effacés. Vous pouvez les exporter ou les supprimer avec votre compte.' },
    { title: 'Fin du programme', text: 'Nous pouvons mettre fin au programme, ou à votre participation en cas de non-respect de cet accord. La confidentialité continue de s\'appliquer aux versions non publiées.' },
  ],
  en: [
    { title: 'Purpose', text: 'You test pre-release versions of Ipnoria and share your findings with us. The programme is free with no minimum duration: you can leave it at any time from your space.' },
    { title: 'Not for production', text: 'Beta versions may contain serious defects. Install them in a test environment, isolated from production, with no data you couldn\'t afford to lose.' },
    { title: 'Confidentiality', text: 'Versions, notes and known issues in the beta space are not public. Don\'t redistribute them and don\'t publish screenshots without our agreement. Your general impressions of the product remain yours to share.' },
    { title: 'Your feedback', text: 'You allow us to use your reports, suggestions and campaign results to improve Ipnoria, including in code published under the AGPL. Remove any secret, password or personal data from your logs before attaching them.' },
    { title: 'No warranty', text: 'Beta versions are provided as is, with no warranty or contractual support. We answer reports on a best-effort basis, with no guaranteed delay.' },
    { title: 'Download links', text: 'Links are personal and expire after 24 hours. Downloads are logged to follow how versions spread.' },
    { title: 'Personal data', text: 'Your application, reports and results are kept for the programme and one year after it ends, then erased. You can export or delete them with your account.' },
    { title: 'End of the programme', text: 'We may end the programme, or your participation if this agreement is not respected. Confidentiality keeps applying to unreleased versions.' },
  ],
}
