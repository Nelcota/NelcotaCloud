import { useParams } from '@tanstack/react-router'

/** The `$projectId` of the current route; pages that use it only render under a project. */
export function useProjectId(): string {
  const { projectId } = useParams({ strict: false })

  if (projectId === undefined) {
    throw new Error('useProjectId is only valid under /projects/$projectId')
  }

  return projectId
}
