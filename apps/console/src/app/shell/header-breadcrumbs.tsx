import { Folder } from 'lucide-react'
import type { JSX } from 'react'

import { ProjectAvatar } from '@/shared/ui/project-avatar'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { RouterLink } from '@/shared/routing/router-link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/primitives/breadcrumb'

type HeaderBreadcrumbsProps = {
  location: ProjectLocation | null
  pageTitle: string
}

/** The path from the projects list to the current page. */
export function HeaderBreadcrumbs({ location, pageTitle }: HeaderBreadcrumbsProps): JSX.Element {
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1.5">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <RouterLink href="/" className="inline-flex items-center gap-1.5">
              <Folder aria-hidden className="size-3.5" />
              Projetos
            </RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <ProjectCrumbs location={location} pageTitle={pageTitle} />
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function ProjectCrumbs({ location, pageTitle }: HeaderBreadcrumbsProps): JSX.Element | null {
  if (location === null) {
    return <CurrentCrumb title={pageTitle} hasSeparator={pageTitle !== 'Projetos'} />
  }

  return (
    <>
      <BreadcrumbSeparator className="hidden sm:inline-flex" />
      <ProjectCrumb projectId={location.projectId} />
      <GroupCrumb label={location.group.label} />
      <CurrentCrumb title={pageTitle} hasSeparator />
    </>
  )
}

function CurrentCrumb({
  title,
  hasSeparator,
}: {
  title: string
  hasSeparator: boolean
}): JSX.Element | null {
  if (hasSeparator === false || title === '') {
    return null
  }

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem className="min-w-0">
        <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  )
}

/** The sidebar group of the page ("Autenticação"), a level of the path but not a page itself. */
function GroupCrumb({ label }: { label: string | null }): JSX.Element | null {
  if (label === null) {
    return null
  }

  return (
    <>
      <BreadcrumbSeparator className="hidden md:inline-flex" />
      <BreadcrumbItem className="hidden md:inline-flex">{label}</BreadcrumbItem>
    </>
  )
}

function ProjectCrumb({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)
  const name = project?.name ?? 'Projeto'

  return (
    <BreadcrumbItem className="min-w-0">
      <BreadcrumbLink asChild>
        <RouterLink
          href={`/projects/${projectId}`}
          className="inline-flex min-w-0 items-center gap-1.5"
        >
          <ProjectAvatar name={name} mascotId={project?.mascot_id} size="xs" />
          <span className="truncate">{name}</span>
        </RouterLink>
      </BreadcrumbLink>
    </BreadcrumbItem>
  )
}
