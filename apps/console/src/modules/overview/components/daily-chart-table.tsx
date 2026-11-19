import type { JSX } from 'react'

import { formatCount, shortDay } from '@/modules/overview/model/daily-chart-labels'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

/** Every value of the chart for screen readers, without hovering day by day. */
export function DailyChartTable({ days }: { days: readonly DailyActivity[] }): JSX.Element {
  return (
    <table className="sr-only">
      <caption>Logins e cadastros por dia</caption>
      <thead>
        <tr>
          <th scope="col">Dia</th>
          <th scope="col">Logins</th>
          <th scope="col">Cadastros</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.date}>
            <th scope="row">{shortDay(day.date)}</th>
            <td>{formatCount(day.logins)}</td>
            <td>{formatCount(day.sign_ups)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
