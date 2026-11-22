// Problèmes connus : signalements marqués par l'équipe, visibles de tous les testeurs (sans l'auteur).
export default defineEventHandler(async (event) => {
  await requireTester(event)
  const r = await useDb().query(
    `SELECT id::text, version, module, severity, title, status, fixed_in AS "fixedIn", updated_at AS "updatedAt"
       FROM beta_reports WHERE known ORDER BY (status = 'fixed'), updated_at DESC LIMIT 200`,
  )
  return r.rows
})
