import type { JSX } from 'react'

type InlineCheckboxProps = {
  label: string
  isChecked: boolean
  isDisabled?: boolean
  onChange: (isChecked: boolean) => void
}

/** A compact checkbox with its label, for the several flags of one column. */
export function InlineCheckbox(props: InlineCheckboxProps): JSX.Element {
  return (
    <label className="hover:bg-accent/60 has-[:disabled]:text-muted-foreground -mx-2 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-[background-color,transform] active:scale-[0.98] has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-transparent motion-reduce:active:scale-100">
      <input
        type="checkbox"
        className="accent-foreground focus-visible:ring-ring/50 size-4 rounded outline-none focus-visible:ring-3"
        aria-label={props.label}
        checked={props.isChecked}
        disabled={props.isDisabled}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.label}
    </label>
  )
}
