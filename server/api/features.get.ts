// État public des éléments du site (contact, démonstration…). Sans donnée sensible.
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  return await siteFeatures()
})
