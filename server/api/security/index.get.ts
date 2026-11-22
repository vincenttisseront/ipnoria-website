// Page de divulgation : adresse de contact, clé de chiffrement, remerciements publics.
export default defineEventHandler(async () => {
  const acks = hasDb()
    ? (await useDb().query(`SELECT id::text, name, url, summary, to_char(reported_on, 'YYYY-MM') AS month FROM security_acknowledgments ORDER BY reported_on DESC`)).rows
    : []
  return { contact: securityContact(), encryptionUrl: String(useRuntimeConfig().disclosure.encryptionUrl || ''), acknowledgments: acks }
})
