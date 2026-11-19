import DownloadMinimalistic from '~icons/solar/download-minimalistic-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

type ExportActivityButtonProps = { isExporting: boolean; onExport: () => void }

/** The label shows once the row is wide enough; below that the icon stands alone, still named. */
const LABEL_CLASS = 'sr-only @3xl:not-sr-only'

/**
 * Downloads, as CSV, every event the row's filters match, not only the loaded ones. Drawn like
 * the filter menus beside it, since it acts on what they choose.
 */
export function ExportActivityButton({
  isExporting,
  onExport,
}: ExportActivityButtonProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={isExporting}
      aria-busy={isExporting}
      onClick={onExport}
      title="Baixa em CSV todos os eventos destes filtros, não só os carregados"
      className={cn(
        'bg-card hover:bg-accent flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-base font-medium whitespace-nowrap transition-colors @3xl:px-4',
        'disabled:opacity-70',
      )}
    >
      <DownloadMinimalistic aria-hidden="true" className="text-muted-foreground size-5" />
      <ExportLabel isExporting={isExporting} />
    </button>
  )
}

function ExportLabel({ isExporting }: { isExporting: boolean }): JSX.Element {
  if (isExporting) {
    return <span className={LABEL_CLASS}>Exportando…</span>
  }

  return <span className={LABEL_CLASS}>Exportar CSV</span>
}
