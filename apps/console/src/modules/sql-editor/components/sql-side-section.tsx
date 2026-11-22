import { useId, type JSX, type ReactNode } from 'react'

type SqlSideSectionProps = {
  title: string
  /** A quiet figure after the title, such as the number of tables. */
  meta?: ReactNode
  children: ReactNode
}

/** A labeled group of the editor's side panel (TABELAS, EXEMPLOS, HISTÓRICO). */
export function SqlSideSection({ title, meta, children }: SqlSideSectionProps): JSX.Element {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1">
      <h2 id={titleId} className="type-label flex items-center gap-1.5 px-2 text-muted-foreground">
        {title}
        <span className="text-muted-foreground tabular-nums">{meta}</span>
      </h2>
      {children}
    </section>
  )
}
