import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import type { RowFilter } from '@/modules/database/components/row-filter'
import {
  type RowDraft,
  changedValues,
  fieldOf,
  hasErrors,
  insertValues,
} from '@/modules/database/components/row-draft'
import { RowField } from '@/modules/database/components/row-field'
import { DeleteRowButton } from '@/modules/database/components/delete-row-button'
import { RowFormHeading } from '@/modules/database/components/row-form-heading'
import {
  useInsertRowMutation,
  useUpdateRowMutation,
} from '@/modules/database/queries/use-row-mutations'
import type { components } from '@/shared/api/api-schema'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { Sheet, SheetContent } from '@/shared/ui/primitives/sheet'

type TableOverview = components['schemas']['TableOverview']

/** What the sheet edits: a new row, or an existing one found by its primary key. */
export type RowTarget =
  | { kind: 'new'; draft: RowDraft }
  | { kind: 'existing'; number: number; key: RowFilter[]; draft: RowDraft; json: string }

type RowEditorSheetProps = {
  projectId: string
  table: TableOverview
  /** Kept after closing so the panel does not go blank while it slides out. */
  target: RowTarget | null
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** The side panel that inserts a row or changes and deletes one. */
export function RowEditorSheet(props: RowEditorSheetProps): JSX.Element | null {
  const { target } = props

  if (target === null) {
    return null
  }

  return (
    <Sheet open={props.isOpen} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <RowForm
          key={formKey(target)}
          projectId={props.projectId}
          table={props.table}
          target={target}
          onDone={() => props.onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

/** A new form for every row opened, so one row's edits never leak into the next. */
function formKey(target: RowTarget): string {
  if (target.kind === 'new') {
    return 'new'
  }

  return target.json
}

type RowFormProps = {
  projectId: string
  table: TableOverview
  target: RowTarget
  onDone: () => void
}

function RowForm({ projectId, table, target, onDone }: RowFormProps): JSX.Element {
  const [draft, setDraft] = useState<RowDraft>(target.draft)
  const insertion = useInsertRowMutation(projectId)
  const update = useUpdateRowMutation(projectId)
  const columns = table.columns
  const changes = changedValues(columns, { original: target.draft, edited: draft })
  const isPending = insertion.isPending || update.isPending

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (hasErrors(columns, draft) || isPending) {
      return
    }

    if (target.kind === 'new') {
      insertion.mutate(
        { table: table.name, values: insertValues(columns, draft) },
        { onSuccess: onDone },
      )
      return
    }

    update.mutate({ table: table.name, key: target.key, values: changes }, { onSuccess: onDone })
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <RowFormHeading table={table} target={target} />
      <div className="scrollbar-thin flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <ErrorAlert error={insertion.error ?? update.error} />
        {columns.map((column) => (
          <RowField
            key={column.name}
            column={column}
            field={fieldOf(draft, column)}
            isNewRow={target.kind === 'new'}
            onChange={(field) => setDraft({ ...draft, [column.name]: field })}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
        <DeleteRowButton projectId={projectId} table={table} target={target} onDeleted={onDone} />
        <div className="ms-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Cancelar
          </Button>
          <PendingButton
            type="submit"
            size="sm"
            isPending={isPending}
            disabled={canSave(target, changes) === false || hasErrors(columns, draft)}
          >
            {saveLabel(target)}
          </PendingButton>
        </div>
      </div>
    </form>
  )
}

function canSave(target: RowTarget, changes: Record<string, unknown>): boolean {
  if (target.kind === 'new') {
    return true
  }

  return Object.keys(changes).length > 0
}

function saveLabel(target: RowTarget): string {
  if (target.kind === 'new') {
    return 'Inserir linha'
  }

  return 'Salvar'
}
