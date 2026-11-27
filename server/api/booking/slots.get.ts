// Créneaux libres de démonstration (instants UTC ; le navigateur les affiche dans le fuseau du visiteur)
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const features = await siteFeatures()
  if (!features.booking) return { enabled: false, slots: [] as string[], durationMin: 30, timezone: 'Europe/Paris' }
  return await availableSlots()
})
