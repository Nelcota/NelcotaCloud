import { CirclePlus as Plus } from 'lucide-react'
import { CONSOLE_SECTIONS } from '@/app/shell/console-sections'
import { PROJECT_SECTIONS, sectionPath } from '@/app/shell/project-sections'
import type { components } from '@/shared/api/api-schema'
import type { IconComponent } from '@/shared/ui/icon-component'

type ProjectSummary = components['schemas']['ProjectSummary']

export type CommandGroupId = 'project-pages' | 'projects' | 'console'

/** What is drawn before an item: its page's icon, or the project's avatar. */
export type CommandMark =
  | { kind: 'icon'; icon: IconComponent }
  | { kind: 'project'; name: string; mascotId: number }

/** One place the search can open. */
export type CommandItem = {
  id: string
  label: string
  /** Also searched: the project a page belongs to, or "Projeto"/"Console". */
  context: string
  to: string
  group: CommandGroupId
  mark: CommandMark
}

export type CommandGroup = {
  id: CommandGroupId
  heading: string
  items: CommandItem[]
}

type CommandSources = {
  projectId: string | null
  projects: ProjectSummary[]
}

const GROUP_HEADINGS: readonly { id: CommandGroupId; heading: string }[] = [
  { id: 'project-pages', heading: 'Páginas do projeto' },
  { id: 'projects', heading: 'Projetos' },
  { id: 'console', heading: 'Console' },
]

const NEW_PROJECT: CommandItem = {
  id: 'console-new',
  label: 'Novo projeto',
  context: 'Console',
  to: '/projects/new',
  group: 'console',
  mark: { kind: 'icon', icon: Plus },
}

/** The current project's pages first, then the other projects, then the console's pages. */
export function commandItems({ projectId, projects }: CommandSources): CommandItem[] {
  return [...projectPages(projectId, projects), ...projectLinks(projects), ...consolePages()]
}

/** The items under their headings, in order, leaving out headings with nothing under them. */
export function groupCommands(items: CommandItem[]): CommandGroup[] {
  return GROUP_HEADINGS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0)
}

function projectPages(projectId: string | null, projects: ProjectSummary[]): CommandItem[] {
  if (projectId === null) {
    return []
  }

  const name = projects.find((project) => project.id === projectId)?.name ?? 'Projeto'

  return PROJECT_SECTIONS.map((section) => ({
    id: `page-${section.segment}`,
    label: section.label,
    context: name,
    to: sectionPath(projectId, section),
    group: 'project-pages',
    mark: { kind: 'icon', icon: section.icon },
  }))
}

function projectLinks(projects: ProjectSummary[]): CommandItem[] {
  return projects.map((project) => ({
    id: `project-${project.id}`,
    label: project.name,
    context: 'Projeto',
    to: `/projects/${project.id}`,
    group: 'projects',
    mark: { kind: 'project', name: project.name, mascotId: project.mascot_id },
  }))
}

function consolePages(): CommandItem[] {
  const sections = CONSOLE_SECTIONS.map((section): CommandItem => ({
    id: `console-${section.path}`,
    label: section.label,
    context: 'Console',
    to: section.path,
    group: 'console',
    mark: { kind: 'icon', icon: section.icon },
  }))

  return [...sections, NEW_PROJECT]
}

/** Items whose name or context contains every word typed, ignoring case and accents. */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const words = normalize(query)
    .split(/\s+/)
    .filter((word) => word !== '')

  if (words.length === 0) {
    return items
  }

  return items.filter((item) => {
    const text = normalize(`${item.label} ${item.context}`)

    return words.every((word) => text.includes(word))
  })
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
