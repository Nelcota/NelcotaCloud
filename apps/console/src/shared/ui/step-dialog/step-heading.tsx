import type { JSX } from 'react'

type StepHeadingProps = {
  label: string | undefined
  description: string | undefined
}

/** The current step's name, large, with what to do here under it. */
export function StepHeading({ label, description }: StepHeadingProps): JSX.Element {
  return (
    <div className="grid gap-1">
      <h3 className="text-2xl font-semibold tracking-tight">{label}</h3>
      <StepDescription text={description} />
    </div>
  )
}

function StepDescription({ text }: { text: string | undefined }): JSX.Element | null {
  if (text === undefined) {
    return null
  }

  return <p className="text-muted-foreground text-pretty">{text}</p>
}
