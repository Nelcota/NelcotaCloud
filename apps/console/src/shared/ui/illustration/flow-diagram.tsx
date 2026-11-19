import CloseCircle from '~icons/solar/close-circle-linear'
import { Fragment, type JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'

export type FlowNode = {
  icon: IconComponent
  label: string
  /** `focus` marks the part the dialog is about; `gone` one that stops existing. */
  tone?: 'plain' | 'focus' | 'gone'
}

export type FlowLink = {
  /** What travels, in a word or two ("POST assinado"). */
  label?: string
  /** `flowing` plays a dot along it, `cut` shows it interrupted. */
  state: 'flowing' | 'cut' | 'still'
}

type FlowDiagramProps = {
  nodes: FlowNode[]
  /** One per gap between nodes, in order. */
  links: FlowLink[]
}

/**
 * Two to four parts and what travels between them, drawn with the console's own icons: a row
 * when its container is wide enough (`@md`), a column in narrow places (phones, the step
 * preview panel), where four parts side by side would not fit.
 */
export function FlowDiagram({ nodes, links }: FlowDiagramProps): JSX.Element {
  return (
    <div className="mx-auto flex w-fit flex-col gap-1 @md:w-auto @md:flex-row @md:items-start @md:justify-center @md:gap-2">
      {nodes.map((node, index) => (
        <Fragment key={node.label}>
          <Node node={node} />
          <Link link={links[index]} />
        </Fragment>
      ))}
    </div>
  )
}

const NODE_TONES: Record<NonNullable<FlowNode['tone']>, string> = {
  plain: 'text-muted-foreground border-border',
  focus: 'text-foreground border-foreground/50',
  gone: 'text-muted-foreground/60 border-dashed border-border',
}

function Node({ node }: { node: FlowNode }): JSX.Element {
  const Icon = node.icon

  return (
    <div className="flex shrink-0 items-center gap-3 @md:w-20 @md:flex-col @md:gap-2 @md:text-center @lg:w-24">
      <span
        className={cn(
          'bg-popover flex size-10 shrink-0 items-center justify-center rounded-xl border @md:size-12',
          NODE_TONES[node.tone ?? 'plain'],
        )}
      >
        <Icon className="size-5 @md:size-6" />
      </span>
      <span
        className={cn(
          'text-xs leading-tight text-balance',
          node.tone === 'gone' && 'text-muted-foreground line-through',
        )}
      >
        {node.label}
      </span>
    </div>
  )
}

function Link({ link }: { link: FlowLink | undefined }): JSX.Element | null {
  if (link === undefined) {
    return null
  }

  return (
    <div className="flex h-8 min-w-0 items-center gap-3 pl-5 @md:h-auto @md:min-w-8 @md:flex-1 @md:flex-col @md:gap-3.5 @md:pt-3 @md:pl-0">
      <LinkLine state={link.state} />
      <span className="text-muted-foreground max-w-full truncate text-xs leading-4 @md:order-first @md:h-4">
        {link.label}
      </span>
    </div>
  )
}

/** Vertical (pointing down) in narrow containers, horizontal (pointing right) from `@md`. */
function LinkLine({ state }: { state: FlowLink['state'] }): JSX.Element {
  if (state === 'cut') {
    return (
      <span className="relative flex h-full w-2 shrink-0 justify-center @md:h-2 @md:w-full @md:items-center">
        <span className="border-destructive/70 h-full border-l-2 border-dashed @md:h-0 @md:w-full @md:border-t-2 @md:border-l-0" />
        <CloseCircle className="text-destructive bg-popover absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </span>
    )
  }

  return (
    <span className="relative flex h-full w-2 shrink-0 justify-center @md:h-2 @md:w-full @md:items-center">
      <span className="bg-foreground/25 h-full w-px @md:h-px @md:w-full" />
      <span className="border-foreground/40 absolute bottom-0 size-1.5 rotate-135 border-t border-r @md:right-0 @md:bottom-auto @md:rotate-45" />
      <FlowDot state={state} />
    </span>
  )
}

/** Travels the horizontal link only; in a column the arrow alone shows the direction. */
function FlowDot({ state }: { state: FlowLink['state'] }): JSX.Element | null {
  if (state !== 'flowing') {
    return null
  }

  return (
    <span className="bg-primary animate-flow-dot absolute top-1/2 hidden size-2 -translate-y-1/2 rounded-full @md:block motion-reduce:hidden" />
  )
}
