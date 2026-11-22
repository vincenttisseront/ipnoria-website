import { BETA_AGREEMENT_VERSION } from '#shared/beta'

// Acceptation de l'accord bêta (version courante), horodatée.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const st = await betaState(s.user.id)
  if (st.application?.status !== 'accepted') throw fail(403, 'not_tester')
  await useDb().query(
    'INSERT INTO beta_agreements (user_id, version, ip_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [s.user.id, BETA_AGREEMENT_VERSION, clientIpHash(event)],
  )
  return { ok: true }
})
