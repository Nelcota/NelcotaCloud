---
name: NelcotaCloud Console
description: A dense engineering console in the visual language of the Veloz panel.
system: shadcn/ui with Radix UI
---

# NelcotaCloud Console design

The console follows the Veloz panel (measured in `design-reference/TOKENS.md`): clean, dense and
built for engineers. Lots of information, little decoration. Blocks are told apart by fill
(`surface` on `background`, `card` on the canvas), not by heavy borders or shadows; only
popovers carry a shadow. Tokens live in `apps/console/src/app/global.css`; never hardcode a
color or a size in a screen.

## Type

- Cal Sans (official variable font, `cal-sans`) for the interface, JetBrains Mono (`font-mono`)
  for ids, slugs, hashes, URLs, timestamps in logs, keys, shortcuts, CLI and SQL.
- Scale, one step above the Veloz mockup (the site shows it scaled down, too small to work in
  all day): `text-2xs` 11px (meta, kbd, uppercase group labels), `text-xs` 13px (labels,
  meta, table headers), `text-sm` 14px (body, inputs, tables, sidebar), `text-base` 15px
  `font-medium` (section and card titles), `text-xl` 22px `font-medium` (page titles),
  `text-2xl` 26px `font-semibold` (stat figures).
- Every number uses `tabular-nums`. Numbers are formatted the Brazilian way with
  `shared/lib/format-number` (`15,2 mil`, `86,6%`, `33,1 GB`) and times with
  `shared/lib/format-relative` (`há 14h`, `há 2d`).
- Uppercase only for sidebar group labels and menu/palette group headings.

## Color

- Dark: black frame, `#141414` panel, `surface` = white 6%, `surface-hover` = white 10%,
  text `#ededed` / muted `#8b8b8b`. Light: `#ebebeb` frame, white panel, black 6% surfaces.
- Orange is rare: `brand` (#ff4d00) marks focus, the active item, live markers and charts;
  `primary-fill` (#d63f00, AA with white) fills the one primary button of a view; `primary`
  is orange text that passes AA in each theme.
- Status words and pills use `success`, `warning`, `destructive`, `info` on a 12–16% tint.
- Charts: `chart-1` blue (main series), `chart-2` orange, `chart-3` amber, `chart-4` green,
  `chart-5` red, `chart-6` light blue.

## Shape and size

- Radius: 4 (log badges), 6 (pills, kbd), 8 (`rounded-md`: buttons, inputs, menu items),
  10 (rail items, switcher), 12 (`rounded-xl`: cards, sections, dialogs), 16 (the panel).
- Buttons: `h-9` default, `h-8` sm, `h-10` lg, 13px medium text, 16px icons. Primary = orange fill;
  `outline`/`secondary` = `surface` fill; `ghost` = text only; `destructive` = surface with a
  red 30% border and red text. Inputs: `h-9`, 14px, `surface` fill, 3:1 border, orange focus.
- Tables: header 13px muted on no fill, rows 48px with hover `surface`, numeric columns
  right-aligned.

## Layout

- Shell: an icon rail on the frame; a rounded panel with a 56px top bar (account chip with its
  initial on a square, ←/→, breadcrumb `Projetos › Projeto › Grupo › Página`, "Buscar… ⌘K"
  and the "IA" button inside a project) and, inside a project, a 240px sidebar: project
  switcher (name + slug in mono) and pages in labeled groups (active item: `surface-hover`
  with the icon in `brand`). Below `lg` the sidebar opens in a sheet.
- A page: `PageHeader` (20px title, one line of context, actions on the right), then a
  `SummarySentence` when the page reads metrics ("**Saudável.** Nenhum login recusado em 30
  dias."), `StatCard` rows (label, figure, one line of context), and `Section`s (14px title +
  one-line description saying what the data means).
- Subpages use `Tabs` with `variant="line"` (orange 2px indicator, horizontal scroll on
  narrow screens). Areas with many subsections use a secondary sidebar with labeled groups.
- Lists of things with state are resource cards (`ResourceCard`: name, kind, mono address,
  status chips, key figures, shortcut footer). Records are table rows. Event streams are
  activity feeds (`ActivityItem`: message first, `meta · meta · há 2h` line, status pill on the
  right) or log lines (mono, time in ms, `LevelBadge`, `chave=valor` chips, `FieldFacets` with
  counts per value, `LiveIndicator`).
- Shortcuts are visible as `Kbd`: "Buscar… ⌘K", "Executar ⌘↵", "/" to focus a list search.

## Motion

200ms `ease-standard` for color changes, `scale(.97)` on press, `animate-page-in` (180ms fade,
blur and 6px slide) on page and tab changes, `animate-row-in` for new rows, `animate-live` for
the live dot, 250ms `ease-emphasized` for sheets. Everything collapses under
`prefers-reduced-motion`.

## States

- Empty: one useful sentence and the action that fills the list (`EmptyState`).
- Loading: skeletons shaped like the real content (same rows, same card sizes).
- Errors: a human sentence that says what happened and what to do ("O servidor de email não
  respondeu em 10 s. Tente de novo."), with a retry action (`LoadError`).
- Danger: destructive actions are isolated at the bottom (`SettingsSection isDanger`), red,
  and go through `ConfirmButton`.

## Copy

Short, direct pt-BR sentences that say what the data means. No exclamation marks, no tips, no
jargon the user does not need. Never rewrite text that comes from the backend.

## Onboarding

1. Novo projeto is a full-page wizard: a step list on the left (Ponto de partida, Configuração,
   Revisar e criar) and the step on the right, with a live preview of what will be created.
2. Creating shows each part being prepared as a checked step list, then the project is ready:
   the one-time secret key, the publishable key, the SDK snippet and the next steps.

## Interaction

Every control is labeled and keyboard operable with an orange `:focus-visible` outline.
Dialogs and sheets have accessible titles. Destructive actions require confirmation.
