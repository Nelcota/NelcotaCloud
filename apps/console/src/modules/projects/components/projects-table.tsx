import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { RoleBadge } from '@/modules/projects/components/role-badge'
import { siteLabel } from '@/modules/projects/components/site-label'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'
import { CopyButton } from '@/shared/ui/copy-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type ProjectSummary = components['schemas']['ProjectSummary']

/** On a phone, only the project and the role fit beside each other. */
const WIDE_ONLY = 'hidden md:table-cell'
const LARGE_ONLY = 'hidden lg:table-cell'
/** The first block of a UUID is enough to tell projects apart at a glance. */
const SHORT_ID_LENGTH = 8

export function ProjectsTable({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nome</TableHead>
            <TableHead className={WIDE_ONLY}>Slug</TableHead>
            <TableHead className={LARGE_ONLY}>Site</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead className={WIDE_ONLY}>Criado em</TableHead>
            <TableHead className={LARGE_ONLY}>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** The name is the row's link, so the keyboard and "open in new tab" reach the project. */
function ProjectRow({ project }: { project: ProjectSummary }): JSX.Element {
  const site = siteLabel(project.site_url)

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <ProjectAvatar name={project.name} mascotId={project.mascot_id} />
          <RouterLink
            href={`/projects/${project.id}`}
            className="truncate font-medium text-heading hover:underline"
          >
            {project.name}
          </RouterLink>
        </div>
      </TableCell>
      <TableCell className={cn(WIDE_ONLY, 'font-mono text-xs text-muted-foreground')}>
        {project.slug}
      </TableCell>
      <TableCell className={cn(LARGE_ONLY, 'max-w-56 truncate text-muted-foreground')} title={site}>
        {site}
      </TableCell>
      <TableCell>
        <RoleBadge role={project.role} />
      </TableCell>
      <TableCell className={cn(WIDE_ONLY, 'text-muted-foreground')}>
        <Timestamp value={project.created_at} format="date" />
      </TableCell>
      <TableCell className={LARGE_ONLY}>
        <ShortId id={project.id} />
      </TableCell>
    </TableRow>
  )
}

function ShortId({ id }: { id: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      <code title={id} className="font-mono text-xs text-muted-foreground">
        {id.slice(0, SHORT_ID_LENGTH)}
      </code>
      <CopyButton value={id} description="ID do projeto" isIconOnly />
    </span>
  )
}
