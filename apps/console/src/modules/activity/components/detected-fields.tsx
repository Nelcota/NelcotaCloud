import type { JSX } from 'react'
import { useState } from 'react'

import type { LogFacets } from '@/modules/activity/components/use-log-facets'
import { formatCount } from '@/shared/lib/format-number'
import { cn } from '@/shared/lib/utils'
import { FieldFacets } from '@/shared/ui/field-facets'
import { Button } from '@/shared/ui/primitives/button'

/** "Campos detectados": always open beside the log, folded above it on narrow screens. */
export function DetectedFields({ facets }: { facets: LogFacets }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-label font-mono text-muted-foreground">Campos detectados</h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="lg:hidden"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(isOpen === false)}
        >
          {toggleLabel(isOpen)}
        </Button>
      </div>
      <div className={cn('hidden lg:block', isOpen && 'block')}>
        <FacetList facets={facets} />
      </div>
    </div>
  )
}

function FacetList({ facets }: { facets: LogFacets }): JSX.Element {
  if (facets.facets.length === 0) {
    return <p className="text-2xs text-muted-foreground">Nenhum campo nas linhas carregadas.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldFacets facets={facets.facets} selected={facets.selected} onSelect={facets.onSelect} />
      <p className="px-1.5 text-2xs text-muted-foreground">
        Contados nas {linesText(facets.loadedCount)} carregadas. {searchedText(facets)}
      </p>
    </div>
  )
}

/** The searched fields ask the API, so they reach past the loaded lines. */
function searchedText(facets: LogFacets): string {
  if (facets.facets.some((facet) => facet.field === 'usuário')) {
    return 'IP e usuário buscam no período todo.'
  }

  return 'IP busca no período todo.'
}

function linesText(count: number): string {
  if (count === 1) {
    return '1 linha'
  }

  return `${formatCount(count)} linhas`
}

function toggleLabel(isOpen: boolean): string {
  if (isOpen) {
    return 'Ocultar'
  }

  return 'Mostrar'
}
