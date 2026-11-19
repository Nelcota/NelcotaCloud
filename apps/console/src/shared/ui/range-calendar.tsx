import AltArrowLeft from '~icons/solar/alt-arrow-left-linear'
import AltArrowRight from '~icons/solar/alt-arrow-right-linear'
import type { JSX } from 'react'
import { type ClassNames, type DateRange, DayPicker, type Matcher } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'

const RANGE_END_CLASSES =
  'bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary'

/** The calendar in the console's tokens; the library brings behaviour and accessibility only. */
const CALENDAR_CLASSES: Partial<ClassNames> = {
  root: 'relative w-fit',
  month: 'grid gap-2',
  month_caption: 'flex h-9 items-center justify-center',
  caption_label: 'text-base font-semibold first-letter:uppercase',
  nav: 'absolute inset-x-0 top-0 flex justify-between',
  button_previous:
    'hover:bg-accent grid size-9 place-items-center rounded-lg transition-colors disabled:opacity-40 motion-safe:active:scale-95',
  button_next:
    'hover:bg-accent grid size-9 place-items-center rounded-lg transition-colors disabled:opacity-40 motion-safe:active:scale-95',
  month_grid: 'border-collapse',
  weekday: 'text-muted-foreground size-10 text-xs font-medium',
  day: 'size-10 p-0 text-center',
  day_button:
    'hover:bg-accent size-10 rounded-lg text-sm tabular-nums transition-colors motion-safe:active:scale-95',
  today: 'text-primary-ink font-bold',
  outside: 'text-muted-foreground/50',
  disabled: 'text-muted-foreground/40 [&>button]:hover:bg-transparent [&>button]:active:scale-100',
  // The band runs behind the whole range; its two ends are filled, the days between are not.
  range_start: `rounded-l-lg ${RANGE_END_CLASSES}`,
  range_end: `rounded-r-lg ${RANGE_END_CLASSES}`,
  range_middle: 'bg-primary/15',
}

type RangeCalendarProps = {
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  /** Days that cannot be picked, such as those past the data that exists. */
  disabled: Matcher[]
  /** The first and last months the arrows reach. */
  months: { first: Date; last: Date }
}

/** One month to pick a range of days on: the first click starts it, the second ends it. */
export function RangeCalendar({
  selected,
  onSelect,
  disabled,
  months,
}: RangeCalendarProps): JSX.Element {
  return (
    <DayPicker
      mode="range"
      locale={ptBR}
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      startMonth={months.first}
      endMonth={months.last}
      defaultMonth={selected?.to ?? months.last}
      resetOnSelect
      showOutsideDays
      classNames={CALENDAR_CLASSES}
      components={{ Chevron: CalendarChevron }}
    />
  )
}

function CalendarChevron({ orientation }: { orientation?: string }): JSX.Element {
  if (orientation === 'left') {
    return <AltArrowLeft aria-hidden="true" className="size-5" />
  }

  return <AltArrowRight aria-hidden="true" className="size-5" />
}
