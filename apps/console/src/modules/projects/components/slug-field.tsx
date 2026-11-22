import { Pencil as Pen } from 'lucide-react'
import type { JSX } from 'react'

import { isValidSlug, MAX_SLUG_LENGTH } from '@/modules/projects/components/project-slug'
import { InlineCode } from '@/shared/ui/inline-code'
import { Button } from '@/shared/ui/primitives/button'
import { TextField } from '@/shared/ui/text-field'

const SLUG_HINT = '3 a 40 letras minúsculas, números ou _, começando por letra. Não muda depois.'

type SlugFieldProps = {
  slug: string
  /** Null while the slug follows the name. */
  customSlug: string | null
  onCustomSlugChange: (slug: string) => void
  /** Shown once the step was submitted with a slug the API would refuse. */
  error?: string
}

/** The slug made from the name, shown as is; "Editar" opens it for typing. */
export function SlugField(props: SlugFieldProps): JSX.Element {
  const { slug, customSlug, onCustomSlugChange } = props

  if (customSlug !== null) {
    return (
      <TextField
        label="Identificador"
        required
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="[&_input]:font-mono"
        hint={SLUG_HINT}
        error={typedSlugError(slug, props.error)}
        value={slug}
        onChange={(event) => onCustomSlugChange(event.target.value.slice(0, MAX_SLUG_LENGTH))}
      />
    )
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-7 flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Identificador:</span>
        <SlugValue slug={slug} />
        <Button type="button" variant="ghost" size="xs" onClick={() => onCustomSlugChange(slug)}>
          <Pen aria-hidden data-icon="inline-start" />
          Editar
        </Button>
      </div>
      <SlugHint slug={slug} error={props.error} />
    </div>
  )
}

/** Marks a typed slug the API would refuse as soon as it is typed (the hint says the rule). */
function typedSlugError(slug: string, error: string | undefined): string | undefined {
  if (slug === '' || isValidSlug(slug)) {
    return error
  }

  return error ?? 'Formato inválido.'
}

function SlugHint({ slug, error }: { slug: string; error: string | undefined }): JSX.Element {
  if (error !== undefined) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    )
  }

  if (slug === '') {
    return <p className="text-xs text-muted-foreground">Gerado a partir do nome do projeto.</p>
  }

  return <p className="text-xs text-muted-foreground">{SLUG_HINT}</p>
}

function SlugValue({ slug }: { slug: string }): JSX.Element | null {
  if (slug === '') {
    return null
  }

  return <InlineCode>{slug}</InlineCode>
}
