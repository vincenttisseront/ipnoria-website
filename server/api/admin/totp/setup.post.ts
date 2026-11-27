import QRCode from 'qrcode'
import { base32Encode, newTotpSecret, otpauthUri } from '../../../utils/account-totp'

// Active le premier second facteur pendant la connexion. Refusé si un facteur existe déjà.
export default defineEventHandler(async (event) => {
  const pending = await requireAdminPending(event)
  if (await hasSecondFactor(pending.userId)) throw fail(400, 'mfa_already')
  const secret = newTotpSecret()
  await useDb().query('UPDATE users SET totp_pending_enc = $2 WHERE id = $1', [pending.userId, sealTotp(secret)])
  const uri = otpauthUri(secret, pending.email)
  const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
  return { svg, key: base32Encode(secret).match(/.{1,4}/g)!.join(' ') }
})
