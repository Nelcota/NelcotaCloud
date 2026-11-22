import { ShieldCheck, ShieldAlert as ShieldWarning } from 'lucide-react'
import type { JSX } from 'react'

import { countLabel } from '@/modules/database/components/count-label'
import { isPlainTable, isRlsOff } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { StatCard } from '@/shared/ui/stat-card'

type TableOverview = components['schemas']['TableOverview']

/** The schema in four figures; tables without RLS are the one that asks for attention. */
export function DatabaseStats({ tables }: { tables: TableOverview[] }): JSX.Element {
  const plain = tables.filter(isPlainTable)
  const otherKinds = tables.length - plain.length
  const policyCount = plain.reduce((total, table) => total + table.policies.length, 0)
  const withPolicies = plain.filter((table) => table.policies.length > 0).length

  return (
    <div className="grid grid-cols-2 gap-4 @min-[48rem]:grid-cols-4">
      <StatCard label="Tabelas" value={formatCount(tables.length)} hint={kindsHint(otherKinds)} />
      <RlsCard plain={plain.length} open={tables.filter(isRlsOff).length} />
      <StatCard
        label="Políticas"
        value={formatCount(policyCount)}
        hint={`em ${formatCount(withPolicies)} de ${countLabel(plain.length, 'tabela', 'tabelas')}`}
      />
      <StatCard
        label="Linhas estimadas"
        value={formatCount(estimatedTotal(tables))}
        hint="pelo Postgres"
      />
    </div>
  )
}

function RlsCard({ plain, open }: { plain: number; open: number }): JSX.Element {
  const protectedCount = formatCount(plain - open)

  if (open === 0) {
    return (
      <StatCard
        label="Com RLS"
        value={protectedCount}
        aside={<ShieldCheck aria-hidden className="mb-1 size-4 text-success" />}
        hint="todas protegidas"
      />
    )
  }

  return (
    <StatCard
      label="Com RLS"
      value={`${protectedCount} de ${formatCount(plain)}`}
      aside={<ShieldWarning aria-hidden className="mb-1 size-4 text-warning" />}
      hint={<span className="text-warning">{formatCount(open)} sem RLS</span>}
    />
  )
}

function kindsHint(otherKinds: number): string {
  if (otherKinds === 0) {
    return 'no schema public'
  }

  return `incluindo ${countLabel(otherKinds, 'view', 'views')}`
}

/** Tables never analyzed have no estimate yet; they count as zero. */
function estimatedTotal(tables: TableOverview[]): number {
  return tables.reduce((total, table) => total + Math.max(table.estimated_rows ?? 0, 0), 0)
}
