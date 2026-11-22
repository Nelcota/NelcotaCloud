import { percentChange } from '@/modules/overview/components/period-change'
import { totalOf } from '@/modules/overview/components/period-series'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

/** One day of the period: the users at its end and what happened in it. */
export type GrowthPoint = { date: string; users: number; signUps: number; logins: number }

export type HeroFigures = {
  signUps: number
  logins: number
  /** How much the user base grew in the period, in percent; `null` when it started empty. */
  change: number | null
  growth: GrowthPoint[]
}

/**
 * The period read from today's total backwards: the users before it are today's total minus
 * its sign-ups (never below zero, since deleted users leave no trace in the daily counts).
 */
export function heroFigures(total: number, days: DailyActivity[]): HeroFigures {
  const signUps = totalOf(days, (day) => day.sign_ups)
  const logins = totalOf(days, (day) => day.logins)
  const before = Math.max(total - signUps, 0)

  return {
    signUps,
    logins,
    change: percentChange(total, before),
    growth: growthOf(before, days),
  }
}

function growthOf(before: number, days: DailyActivity[]): GrowthPoint[] {
  let users = before

  return days.map((day) => {
    users += day.sign_ups

    return { date: day.date, users, signUps: day.sign_ups, logins: day.logins }
  })
}
