import { KeyRound as Key } from 'lucide-react'

export const DELETE_DESCRIPTION =
  'Ele para de receber eventos na hora, e as entregas pendentes são canceladas.'

export const ROTATE_DESCRIPTION =
  'O segredo atual continua assinando por 24 horas, junto com o novo. Troque no seu servidor dentro desse prazo.'

/** The current secret's change, shown in both ways to rotate it. */
export const ROTATE_CHANGE = {
  subject: 'Segredo atual',
  icon: Key,
  from: 'Assinando',
  to: 'Válido por 24 horas',
}
