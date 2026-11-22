import { Upload } from 'lucide-react'
import { useId, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/primitives/field'

type FileInputProps = {
  label: string
  placeholder?: string
  description?: string
  accept?: string
  value: File | null
  onChange: (file: File | null) => void
  status?: { type: 'error'; message?: ReactNode }
  isLabelHidden?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  mode?: 'dropzone'
  maxSize?: number
}

export function FileInput({
  label,
  placeholder,
  description,
  accept,
  value,
  onChange,
  status,
  isLabelHidden,
  isRequired,
  isDisabled,
  maxSize,
}: FileInputProps): JSX.Element {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <Field
      className="gap-2"
      data-invalid={Boolean(status) || undefined}
      data-disabled={isDisabled || undefined}
    >
      <FieldLabel htmlFor={id} className={cn(isLabelHidden && 'sr-only')}>
        {label}
      </FieldLabel>
      <div
        className="relative grid min-w-0 gap-2 rounded-lg border border-dashed bg-muted/35 p-5 text-center focus-within:ring-2 focus-within:ring-ring"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files.item(0)

          if (!isDisabled && file) {
            onChange(file)
          }
        }}
      >
        <Upload className="mx-auto size-4.5 text-muted-foreground" aria-hidden />
        <span className="wrap-anywhere">{value?.name ?? placeholder ?? 'Selecionar arquivo'}</span>
        <input
          id={id}
          type="file"
          className="absolute inset-0 size-full opacity-0"
          accept={accept}
          disabled={isDisabled}
          aria-required={isRequired}
          aria-invalid={Boolean(status) || undefined}
          aria-describedby={
            [description && descriptionId, status?.message && errorId].filter(Boolean).join(' ') ||
            undefined
          }
          onChange={(event) => {
            const file = event.target.files?.item(0) ?? null

            if (file) {
              onChange(file)
            }

            event.currentTarget.value = ''
          }}
        />
      </div>
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {status?.message && <FieldError id={errorId}>{status.message}</FieldError>}
      {!status?.message && maxSize !== undefined && value && value.size > maxSize && (
        <FieldError>O arquivo passa do limite. Escolha um menor.</FieldError>
      )}
    </Field>
  )
}
