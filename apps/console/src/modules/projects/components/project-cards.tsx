import type { JSX } from 'react'

import { ProjectCard } from '@/modules/projects/components/project-card'
import type { components } from '@/shared/api/api-schema'

type ProjectSummary = components['schemas']['ProjectSummary']

export function ProjectCards({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  return (
    <ul
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4"
      aria-label="Projetos"
    >
      {projects.map((project) => (
        <li key={project.id} className="min-w-0">
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  )
}
