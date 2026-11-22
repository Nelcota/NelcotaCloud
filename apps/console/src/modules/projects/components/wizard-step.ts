/** The steps of the new project flow, in order. */
export type WizardStepId = 'start' | 'config' | 'review'

/** Where the flow is: one of its steps, or past the last one once the project exists. */
export type WizardPosition = WizardStepId | 'done'

export const WIZARD_STEPS: readonly { id: WizardStepId; label: string }[] = [
  { id: 'start', label: 'Ponto de partida' },
  { id: 'config', label: 'Configuração' },
  { id: 'review', label: 'Revisar e criar' },
]

const POSITIONS: readonly WizardPosition[] = ['start', 'config', 'review', 'done']

/** The position's place in the flow, so steps before it read as done. */
export function positionIndex(position: WizardPosition): number {
  return POSITIONS.indexOf(position)
}
