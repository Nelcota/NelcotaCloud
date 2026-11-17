import { Link } from '@tanstack/react-router'
import ArrowRight from '~icons/solar/arrow-right-linear'
import Calendar from '~icons/solar/calendar-linear'
import Folder from '~icons/solar/folder-with-files-linear'
import Global from '~icons/solar/global-linear'
import UserId from '~icons/solar/user-id-linear'
import type { JSX } from 'react'

import type { ProjectSort, SortKey } from '@/modules/projects/components/project-query'
import { siteLabel } from '@/modules/projects/components/site-label'
import { RoleBadge } from '@/modules/projects/components/role-badge'
import { SortableColumn } from '@/modules/projects/components/sortable-column'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { ColumnLabel } from '@/shared/ui/column-label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type ProjectSummary = components['schemas']['ProjectSummary']

const CELL = 'px-4 py-4'

type ProjectsTableProps = {
  projects: ProjectSummary[]
  sort: ProjectSort
  onSort: (key: SortKey) => void
}

/** One row per project; the name links to it and the whole row is its click target. */
export function ProjectsTable({ projects, sort, onSort }: ProjectsTableProps): JSX.Element {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableColumn
              sortKey="name"
              sort={sort}
              icon={Folder}
              onSort={onSort}
              className="sm:px-5"
            >
              Projeto
            </SortableColumn>
            <SortableColumn sortKey="role" sort={sort} icon={UserId} onSort={onSort}>
              Papel
            </SortableColumn>
            <TableHead className="hidden h-11 px-4 md:table-cell">
              <ColumnLabel icon={Global}>Site</ColumnLabel>
            </TableHead>
            <SortableColumn
              sortKey="created_at"
              sort={sort}
              icon={Calendar}
              onSort={onSort}
              className="hidden sm:table-cell"
            >
              Criado em
            </SortableColumn>
            <TableHead className="h-11 w-12 px-4 sm:px-5">
              <span className="sr-only">Abrir</span>
            </TableHead>
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

function ProjectRow({ project }: { project: ProjectSummary }): JSX.Element {
  return (
    <TableRow className="group relative">
      {/* `w-full max-w-0` lets the name take the free width and truncate inside it. */}
      <TableCell className={`${CELL} w-full max-w-0 sm:px-5`}>
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="block truncate font-medium after:absolute after:inset-0 after:content-['']"
        >
          {project.name}
        </Link>
        <p className="text-muted-foreground truncate font-mono text-xs">{project.slug}</p>
      </TableCell>
      <TableCell className={CELL}>
        <RoleBadge role={project.role} />
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground hidden max-w-64 truncate md:table-cell`}>
        <span title={project.site_url}>{siteLabel(project.site_url)}</span>
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground hidden sm:table-cell`}>
        {formatDate(project.created_at)}
      </TableCell>
      <TableCell className={`${CELL} text-right sm:px-5`}>
        <ArrowRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-foreground inline size-5 transition-[color,transform] group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </TableCell>
    </TableRow>
  )
}
