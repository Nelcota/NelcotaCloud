import { type FormEvent, type JSX, type ReactNode, useEffect, useId, useRef } from 'react'

type StepPanelProps = {
  /** The step's one question, the strongest text on the screen. */
  title: string
  /** One short line under the title, only when it prevents a mistake. */
  description?: string
  /** Moves focus to the title when the step opens after a click, so readers hear where they are. */
  isFocusedOnMount: boolean
  onSubmit: () => void
  /** The step's buttons, under its fields. */
  footer: ReactNode
  children: ReactNode
}

/** One step of the flow as a form: its question, its fields and the way forward. */
export function StepPanel(props: StepPanelProps): JSX.Element {
  const titleId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const { isFocusedOnMount } = props

  useEffect(() => {
    if (isFocusedOnMount) {
      heading.current?.focus()
    }
  }, [isFocusedOnMount])

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    props.onSubmit()
  }

  return (
    <form
      aria-labelledby={titleId}
      method="post"
      noValidate
      onSubmit={submit}
      className="flex min-w-0 flex-col gap-8"
    >
      <div className="grid gap-2">
        <h2
          id={titleId}
          ref={heading}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight text-balance text-heading outline-none"
        >
          {props.title}
        </h2>
        <StepDescription description={props.description} />
      </div>
      <div className="grid gap-6">{props.children}</div>
      <div className="flex flex-wrap items-center gap-2">{props.footer}</div>
    </form>
  )
}

function StepDescription({ description }: { description?: string }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-base text-muted-foreground">{description}</p>
}
