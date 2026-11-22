import QRCode from 'qrcode'
import { base32Encode, newTotpSecret, otpauthUri } from '../../../utils/account-totp'

// Début d'activation : nouveau secret (gardé en attente), QR code et clé à saisir à la main.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const secret = newTotpSecret()
  await useDb().query('UPDATE users SET totp_pending_enc = $2 WHERE id = $1', [s.user.id, sealTotp(secret)])
  const uri = otpauthUri(secret, s.user.email)
  const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
  return { svg, uri, key: base32Encode(secret).match(/.{1,4}/g)!.join(' ') }
})
