import { applicationSchema } from '#shared/beta'

// Candidature : compte vérifié, une seule candidature (modifiable tant qu'elle est en attente).
// Le code de parrainage éventuel relie le candidat au testeur qui l'a invité.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const d = await readJson(event, applicationSchema)
  await verifyPow(event, d.pow)
  const db = useDb()
  const existing = (await db.query('SELECT status FROM beta_applications WHERE user_id = $1', [s.user.id])).rows[0]
  if (existing && existing.status !== 'pending') throw fail(409, 'already_decided')
  let referredBy: string | null = null
  if (d.ref) {
    const r = await db.query(`SELECT user_id::text FROM beta_applications WHERE referral_code = $1 AND status = 'accepted' AND user_id <> $2`, [d.ref, s.user.id])
    referredBy = r.rows[0]?.user_id ?? null
  }
  await db.query(
    `INSERT INTO beta_applications (user_id, sector, org_size, hypervisor, current_stack, active_directory, wifi_8021x, services, hours, motivation, public_credit, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (user_id) DO UPDATE SET sector = $2, org_size = $3, hypervisor = $4, current_stack = $5, active_directory = $6, wifi_8021x = $7,
       services = $8, hours = $9, motivation = $10, public_credit = $11, referred_by = COALESCE(beta_applications.referred_by, $12), updated_at = now()`,
    [s.user.id, d.sector, d.orgSize, d.hypervisor, d.currentStack, d.activeDirectory, d.wifi8021x, d.services, d.hours, d.motivation, d.publicCredit, referredBy],
  )
  if (!existing) {
    await mailBetaDecision(s.user.email, s.user.locale, s.user.displayName, 'received')
    const { smtp, public: { siteUrl } } = useRuntimeConfig()
    if (hasSmtp() && smtp.to) {
      await sendMail({ to: smtp.to, subject: `[Ipnoria] Candidature bêta : ${s.user.displayName}`, text: `${s.user.displayName} (${s.user.email}), ${d.sector}, ${d.orgSize}\n\n${d.motivation}\n\n${siteUrl.replace(/\/$/, '')}/admin` })
        .catch(err => console.error('[beta]', err.message))
    }
  }
  return { ok: true, state: await betaState(s.user.id) }
})
