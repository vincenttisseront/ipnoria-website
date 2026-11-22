// Créneaux libres de démonstration (instants UTC ; le navigateur les affiche dans le fuseau du visiteur)
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  return await availableSlots()
})
