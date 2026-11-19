import { AUTH_MARKS } from '@/modules/account/model/auth-marks'

/** A link opened without its code (cut while copying, or a page reloaded): same words everywhere. */
export const BROKEN_LINK = {
  title: 'Não conseguimos abrir este link',
  description: 'Abra o link do email de novo ou peça um novo.',
  mark: AUTH_MARKS.brokenLink,
}
