import type { RowTarget } from '@/modules/database/components/row-editor-sheet'

/** Why the save button waits: no change on an existing row, or a field with an error. */
export function rowSaveMissing(
  target: RowTarget,
  state: { changeCount: number; hasFieldErrors: boolean },
): string | null {
  if (target.kind === 'existing' && state.changeCount === 0) {
    return 'Nenhuma alteração para salvar'
  }

  if (state.hasFieldErrors) {
    return 'Corrija os campos marcados'
  }

  return null
}

export function saveLabel(target: RowTarget): string {
  if (target.kind === 'new') {
    return 'Inserir linha'
  }

  return 'Salvar'
}
