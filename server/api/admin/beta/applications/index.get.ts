// Candidatures, répartition par secteur (acceptés, en attente) face aux objectifs, parrainages.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const [apps, quotas] = await Promise.all([
    db.query(
      `SELECT a.id::text, a.status, a.sector, a.org_size AS "orgSize", a.hypervisor, a.current_stack AS "currentStack",
              a.active_directory AS "activeDirectory", a.wifi_8021x AS "wifi8021x", a.services, a.hours, a.motivation,
              a.public_credit AS "publicCredit", a.decision_note AS "decisionNote", a.created_at AS "createdAt", a.decided_at AS "decidedAt",
              u.display_name AS name, u.email, u.organization, r.display_name AS "referredBy",
              (SELECT count(*)::int FROM beta_applications x WHERE x.referred_by = a.user_id) AS referrals,
              (SELECT count(*)::int FROM beta_reports b WHERE b.user_id = a.user_id) AS reports,
              EXISTS (SELECT 1 FROM beta_agreements g WHERE g.user_id = a.user_id) AS signed
         FROM beta_applications a JOIN users u ON u.id = a.user_id LEFT JOIN users r ON r.id = a.referred_by
        ORDER BY a.created_at DESC`,
    ),
    db.query(`SELECT value FROM beta_settings WHERE key = 'quotas'`),
  ])
  return { applications: apps.rows, quotas: quotas.rows[0]?.value ?? {} }
})
