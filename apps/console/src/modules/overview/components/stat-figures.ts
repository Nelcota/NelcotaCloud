import { heroFigures } from '@/modules/overview/components/hero-figures'
import { percentChange } from '@/modules/overview/components/period-change'
import { type PeriodSeries, totalOf } from '@/modules/overview/components/period-series'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']
type DailyActivity = Schemas['DailyActivity']

/** One metric of the overview's row; `value` is `undefined` while its source loads. */
export type StatFigure = {
  value: number | undefined
  change: number | null
  trend: number[]
}

export type StatFigures = { users: StatFigure; logins: StatFigure; active: StatFigure }

type StatSources = {
  total: number | undefined
  period: PeriodSeries
  usage: Schemas['ProjectUsage'] | undefined
}

const EMPTY: StatFigure = { value: undefined, change: null, trend: [] }

/** The users, logins and monthly actives with how each moved against the period before. */
export function statFiguresOf({ total, period, usage }: StatSources): StatFigures {
  return {
    users: usersFigure(total, period),
    logins: loginsFigure(period),
    active: activeFigure(usage),
  }
}

function usersFigure(total: number | undefined, period: PeriodSeries): StatFigure {
  const days = period.current

  if (total === undefined || days === undefined) {
    return { ...EMPTY, value: total }
  }

  const figures = heroFigures(total, days)

  return { value: total, change: figures.change, trend: figures.growth.map((point) => point.users) }
}

function loginsFigure({ current, previous }: PeriodSeries): StatFigure {
  if (current === undefined) {
    return EMPTY
  }

  const logins = totalOf(current, (day) => day.logins)
  const before = loginsOf(previous)

  return {
    value: logins,
    change: percentChange(logins, before),
    trend: current.map((day) => day.logins),
  }
}

function loginsOf(days: DailyActivity[] | null): number | null {
  if (days === null) {
    return null
  }

  return totalOf(days, (day) => day.logins)
}

function activeFigure(usage: Schemas['ProjectUsage'] | undefined): StatFigure {
  if (usage === undefined) {
    return EMPTY
  }

  const current = usage.active_users_this_month
  const last = usage.active_users_last_month

  return { value: current, change: percentChange(current, last), trend: [last, current] }
}
