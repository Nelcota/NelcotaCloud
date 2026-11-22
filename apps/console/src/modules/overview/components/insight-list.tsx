import type { JSX } from 'react'

import { InsightRow } from '@/modules/overview/components/insight-row'
import type { Insight } from '@/modules/overview/components/insight-types'

/** The insights the next step leaves out, one line each. */
export function InsightList({ insights }: { insights: Insight[] }): JSX.Element | null {
  if (insights.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-1">
      <h3 className="text-sm text-muted-foreground">Outros avisos</h3>
      <ul className="-mx-2 grid">
        {insights.map((insight) => (
          <li key={insight.id}>
            <InsightRow insight={insight} />
          </li>
        ))}
      </ul>
    </div>
  )
}
