import ShieldCheck from '~icons/solar/shield-check-linear'
import ShieldWarning from '~icons/solar/shield-warning-linear'
import type { JSX } from 'react'

import { countLabel } from '@/modules/database/components/count-label'
import { isPlainTable, isRlsOff } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { StatCard } from '@/shared/ui/stat-card'

type TableOverview = components['schemas']['TableOverview']

const COMPACT_COUNT = new Intl.NumberFormat('pt-BR', { notation: 'compact' })

/** The schema in four figures; tables without RLS are the one that asks for attention. */
export function DatabaseStats({ tables }: { tables: TableOverview[] }): JSX.Element {
  const plain = tables.filter(isPlainTable)
  const otherKinds = tables.length - plain.length
  const policyCount = plain.reduce((total, table) => total + table.policies.length, 0)
  const withPolicies = plain.filter((table) => table.policies.length > 0).length

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Tabelas"
        value={tables.length.toLocaleString('pt-BR')}
        hint={kindsHint(otherKinds)}
      />
      <RlsCard plain={plain.length} open={tables.filter(isRlsOff).length} />
      <StatCard
        label="Políticas"
        value={policyCount.toLocaleString('pt-BR')}
        hint={`em ${withPolicies.toLocaleString('pt-BR')} de ${countLabel(plain.length, 'tabela', 'tabelas')}`}
      />
      <StatCard
        label="Linhas estimadas"
        value={COMPACT_COUNT.format(estimatedTotal(tables))}
        hint="pelo Postgres"
      />
    </div>
  )
}

function RlsCard({ plain, open }: { plain: number; open: number }): JSX.Element {
  const protectedCount = (plain - open).toLocaleString('pt-BR')

  if (open === 0) {
    return (
      <StatCard
        label="Com RLS"
        value={protectedCount}
        aside={<ShieldCheck aria-hidden className="size-5 text-success" />}
        hint="todas protegidas"
      />
    )
  }

  return (
    <StatCard
      label="Com RLS"
      value={`${protectedCount}/${plain.toLocaleString('pt-BR')}`}
      aside={<ShieldWarning aria-hidden className="size-5 text-warning" />}
      hint={<span className="text-warning">{open.toLocaleString('pt-BR')} sem RLS</span>}
      className="border-warning/40"
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
