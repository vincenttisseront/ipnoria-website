import { isSiteFeatureKey } from '#shared/features'

// État public des éléments du site (contact, démonstration…). Sans donnée sensible.
// Un aperçu d'administration ne masque l'élément que pour une session d'administration valide.
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const features = { ...(await siteFeatures()) }
  const preview = getCookie(event, 'ipn_preview')
  if (preview && isSiteFeatureKey(preview)) {
    try {
      await requireAdmin(event)
      features[preview] = false
    }
    catch { /* visiteur, ou session close : le site réel reste affiché */ }
  }
  return features
})
