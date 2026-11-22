// Sonde de santé (HEALTHCHECK Docker, supervision) : 200 si la base répond, 503 sinon. Ne révèle aucun détail.
export default defineEventHandler(async (event) => {
  if (!hasDb()) return { status: 'ok', db: 'disabled' }
  try {
    await useDb().query('SELECT 1')
    return { status: 'ok', db: 'up' }
  }
  catch {
    setResponseStatus(event, 503)
    return { status: 'degraded', db: 'down' }
  }
})
