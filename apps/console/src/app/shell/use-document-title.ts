import { useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

import { consolePageTitle } from '@/app/shell/console-sections'
import { type ProjectSection, projectLocation, sectionTitle } from '@/app/shell/project-sections'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'

const PRODUCT_NAME = 'NelcotaCloud'
const SEPARATOR = ' · '

/**
 * Names the browser tab after the page and its project, so tabs tell apart and screen readers
 * announce where a navigation landed.
 */
export function useDocumentTitle(): string {
  const { pathname } = useLocation()
  const projects = useProjectsQuery()
  const location = projectLocation(pathname)
  const projectName = projects.data?.find((project) => project.id === location?.projectId)?.name
  const pageTitle = titleOf(location?.section, pathname)
  const title = [pageTitle, projectName, PRODUCT_NAME]
    .filter((part) => part !== undefined && part !== '')
    .join(SEPARATOR)

  useEffect(() => {
    document.title = title
  }, [title])

  return pageTitle
}

function titleOf(section: ProjectSection | undefined, pathname: string): string {
  if (section === undefined) {
    return consolePageTitle(pathname)
  }

  return sectionTitle(section)
}
