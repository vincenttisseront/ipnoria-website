import { z } from 'zod'

// Décision sur une candidature : e-mail au candidat ; à l'acceptation, code de parrainage attribué.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const { status, note } = await readJson(event, z.object({ status: z.enum(['accepted', 'waitlist', 'declined', 'pending']), note: z.string().trim().max(2000).optional().default('') }))
  const db = useDb()
  const id = getRouterParam(event, 'id')
  const cur = (await db.query(
    `SELECT a.status, a.referral_code, u.email, u.locale, u.display_name FROM beta_applications a JOIN users u ON u.id = a.user_id WHERE a.id = $1`, [id],
  )).rows[0]
  if (!cur) throw createError({ statusCode: 404 })
  await db.query(
    `UPDATE beta_applications SET status = $2, decision_note = NULLIF($3, ''), decided_at = now(), updated_at = now(),
            referral_code = CASE WHEN $2 = 'accepted' THEN COALESCE(referral_code, $4) ELSE referral_code END WHERE id = $1`,
    [id, status, note, newReferralCode()],
  )
  if (status !== cur.status && status !== 'pending') await mailBetaDecision(cur.email, cur.locale, cur.display_name, status, note)
  await adminAudit(event, admin, 'beta.decision', 'beta_application', id, { from: cur.status, to: status })
  return { ok: true }
})
