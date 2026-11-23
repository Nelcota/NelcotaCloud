import type { FormEvent, JSX } from 'react'
import { useId, useState } from 'react'

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
import { DiscardRowChangesDialog } from '@/modules/database/components/discard-row-changes-dialog'
import { RowFormHeading } from '@/modules/database/components/row-form-heading'
import { rowSaveMissing, saveLabel } from '@/modules/database/components/row-save-state'
import {
  useInsertRowMutation,
  useUpdateRowMutation,
} from '@/modules/database/queries/use-row-mutations'
import type { components } from '@/shared/api/api-schema'
import { missingNoteReference } from '@/shared/lib/missing-unless'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { MissingNote } from '@/shared/ui/missing-note'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { Sheet, SheetBody, SheetContent, SheetFooter } from '@/shared/ui/primitives/sheet'

type TableOverview = components['schemas']['TableOverview']

/**
 * What the sheet edits: a new row, or an existing one found by its primary key. `opening`
 * counts the times the panel was opened, so reopening the same row starts a fresh form.
 */
export type RowTarget = { opening?: number } & (
  | { kind: 'new'; draft: RowDraft }
  | { kind: 'existing'; number: number; key: RowFilter[]; draft: RowDraft; json: string }
)

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

  return <RowForm key={formKey(target)} {...props} target={target} />
}

/** A new form for every opening, so edits discarded or left behind never come back. */
function formKey(target: RowTarget): string {
  const opening = target.opening ?? 0

  if (target.kind === 'new') {
    return `new:${opening}`
  }

  return `${opening}:${target.json}`
}

type RowFormProps = Omit<RowEditorSheetProps, 'target'> & { target: RowTarget }

function RowForm(props: RowFormProps): JSX.Element {
  const { projectId, table, target } = props
  const [draft, setDraft] = useState<RowDraft>(target.draft)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const insertion = useInsertRowMutation(projectId)
  const update = useUpdateRowMutation(projectId)
  const columns = table.columns
  const changes = changedValues(columns, { original: target.draft, edited: draft })
  const isPending = insertion.isPending || update.isPending
  const missingId = useId()
  const missing = rowSaveMissing(target, {
    changeCount: Object.keys(changes).length,
    hasFieldErrors: hasErrors(columns, draft),
  })

  function close(): void {
    props.onOpenChange(false)
  }

  /** Esc, a click outside or the close button ask first when there are edits to lose. */
  function changeOpen(isOpen: boolean): void {
    if (isOpen || isPending) {
      return
    }

    if (Object.keys(changes).length > 0) {
      setIsDiscarding(true)
      return
    }

    close()
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (missing !== null || isPending) {
      return
    }

    if (target.kind === 'new') {
      insertion.mutate(
        { table: table.name, values: insertValues(columns, draft) },
        { onSuccess: close },
      )
      return
    }

    update.mutate({ table: table.name, key: target.key, values: changes }, { onSuccess: close })
  }

  return (
    <Sheet open={props.isOpen} onOpenChange={changeOpen}>
      <SheetContent className="sm:max-w-xl">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <RowFormHeading table={table} target={target} />
          <SheetBody>
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
          </SheetBody>
          <SheetFooter>
            <DeleteRowButton
              projectId={projectId}
              table={table}
              target={target}
              onDeleted={close}
            />
            <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
              <MissingNote id={missingId} missing={missing} />
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>
                Cancelar
              </Button>
              <PendingButton
                type="submit"
                isPending={isPending}
                disabled={missing !== null}
                aria-describedby={missingNoteReference(missingId, missing)}
              >
                {saveLabel(target)}
              </PendingButton>
            </div>
          </SheetFooter>
        </form>
        <DiscardRowChangesDialog
          isOpen={isDiscarding}
          onOpenChange={setIsDiscarding}
          onDiscard={close}
        />
      </SheetContent>
    </Sheet>
  )
}
