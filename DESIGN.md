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

- Cal Sans (official variable font, self-hosted in `public/fonts` and preloaded) for the interface, JetBrains Mono (`font-mono`)
  for ids, slugs, hashes, URLs, timestamps in logs, keys, shortcuts, CLI and SQL.
- Scale, set well above the Veloz mockup so it reads comfortably all day: `text-2xs` 13px
  (kbd, uppercase group labels, chart axes), `text-xs` 15px (labels, meta, table headers,
  buttons, badges, and every mono id, address or key), `text-sm` 16px (body, inputs, tables),
  `text-base` 17px (sidebar items; `font-medium` for section and card titles), `text-xl` 26px
  `font-medium` (page titles), `text-2xl` 30px `font-semibold` (stat figures). Body text has
  0.01em tracking (Cal Sans is drawn tight); headings and mono keep their own. Icons are 20px
  (`size-5`) beside text, 22px in the project sidebar, 18px in compact controls, 24px in the icon rail; nothing smaller
  than 13px.
- Every number uses `tabular-nums`. Numbers are formatted the Brazilian way with
  `shared/lib/format-number` (`15,2 mil`, `86,6%`, `33,1 GB`) and times with
  `shared/lib/format-relative` (`há 14h`, `há 2d`).
- Uppercase only for sidebar group labels and menu/palette group headings.
- `faint` is for icons and separators only; text uses `muted-foreground` or stronger.

## Color

- Dark: black frame, `#141414` panel, `surface` = white 6%, `surface-hover` = white 10%,
  text `#ededed` / muted `#8b8b8b`. Light: `#ebebeb` frame, white panel, black 6% surfaces.
- Orange is rare: `brand` (#ff4d00) marks focus, the active item, live markers and charts;
  `primary-fill` (#d63f00, AA with white) fills the one primary button of a view; `primary`
  is orange text that passes AA in each theme.
- `divider` (#343434 dark, #d6d6d6 light) draws the lines inside a panel (between rows, under
  the title, above the footer) and under line tabs; `border` alone disappears on `card`.
- Status words and pills use `success`, `warning`, `destructive`, `info` on a 12–16% tint.
- Charts: `chart-1` blue (main series) and `chart-2` orange, drawn dashed so the two series
  differ without hue. Add a token when a chart needs a third series.

## Shape and size

- Radius: 4 (log badges), 6 (pills, kbd), 8 (`rounded-md`: buttons, inputs, menu items),
  10 (rail items), 12 (`rounded-xl`: cards, sections, dialogs), 16 (the panel).
- Buttons: `h-10` default, `h-9` sm, `h-8` xs, `h-11` lg, 15px medium text, 20px icons. Primary = orange fill;
  `outline`/`secondary` = `surface` fill; `ghost` = text only; `destructive` = surface with a
  red 30% border and red text; `destructive-ghost` = red text only, for icon buttons in rows
  (trash cans); `destructive-solid` = red fill with white text, for deleting the
  project and for the confirm button of every destructive dialog. Every control that deletes,
  revokes, blocks, ends sessions, removes MFA or discards custom settings is red, both the
  trigger and its confirmation; rotations with a grace period and role changes stay neutral. Inputs and selects: `h-10`, 16px, `surface` fill, 3:1 border, orange focus.
- Tables: header 15px muted on no fill, rows 52px with hover `surface`, numeric columns
  right-aligned.

## Layout

- Shell: an icon rail on the frame; a rounded panel with a 56px top bar over a 2px `border`
  line, all its controls 40px tall (account chip with its initial on a square, ←/→, breadcrumb `Projetos › Projeto › Grupo › Página`, "Buscar… ⌘K"
  and the "IA" button inside a project) and, inside a project, a 256px sidebar split from the
  page by a 2px `border` line: the pages in labeled groups separated by space only, no
  dividers (active item: `surface-hover` with the icon in `brand`). Below `lg` the sidebar opens in a sheet.
- Shell edge lines (set 2026-11-22 in an alignment pass with the owner):
  - Sidebar (and the mobile sheet): 44px items 2px apart, starting 20px below the top bar,
    Configurações pinned at the foot, 8px above the panel's bottom edge,
    boxes 8px in from its edge, 22px icons from 18px (centred at 29px), labels at 48px; group labels start on the icons' leading edge (18px), and the
    sheet's footer buttons centre on the icon column. The top bar's account chip continues
    them: box on the sidebar's box line, avatar on the icon column, name on the label line.
  - Below `lg` the top bar's menu icon sits on the page's text line, and the sheet keeps a
    56px top row for its close button, so it never covers a link.
  - Inside a project, from `lg` on, the account and the arrows fill the sidebar's width and
    the breadcrumb starts on the page's text line (the page gutter past the sidebar).
  - The bar's end padding is the page gutter (16/24/32px), so its last control ends on the
    page actions' edge. The two differ by the page's scrollbar width when the page scrolls,
    and stop meeting once the page column is centred (wide screens, pages outside a project).
  - The rail's logo is centred on the top bar's controls.
- A page: `PageHeader` (20px title, one line of context, actions on the right), then a
  `SummarySentence` when the page reads metrics ("**Saudável.** Nenhum login recusado em 30
  dias."), `StatCard` rows (label, figure, one line of context), and `Section`s (14px title +
  one-line description saying what the data means).
- Subpages use `Tabs` with `variant="line"` (orange 2px indicator, horizontal scroll on
  narrow screens). Areas with many subsections use a secondary sidebar with labeled groups.
- Lists of things with state are resource cards (`ResourceCard`: name, kind, mono address,
  status chips, key figures, shortcut footer). Records are table rows. Event streams are
  activity feeds (`ActivityItem`: who acted, message first, `meta · meta · há 2h` line, a status
  pill on the right only when the event needs a look), grouped by day, with `LiveIndicator`
  when they refresh on their own.
- Shortcuts are visible as `Kbd`: "Buscar… ⌘K", "Executar ⌘↵". No single-key shortcuts: they
  cannot be turned off, which fails WCAG 2.1.4.

## Motion

200ms `ease-standard` for color changes, `scale(.97)` on press, `animate-page-in` (180ms fade
and 6px slide) on page changes only (tab content swaps instantly), `animate-row-in` for live
log rows, `animate-live` for the live dot, 250ms `ease-emphasized` in and 150ms out for sheets.
Theme switches skip transitions. Everything collapses under `prefers-reduced-motion`.

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

## Dialogs and sheets

- Three parts: header (title, one-line description), a body that scrolls on its own and a
  footer bar (`divider` line, `surface` fill) holding the buttons, so the title and the
  buttons never scroll away (`DialogHeader`/`DialogBody`/`DialogFooter`, and the `Sheet*`
  equivalents). On phones the footer stacks with the main button on top.
- Forms are `ConfirmDialog` (one step) or `StepDialog` (a guided task). A button that waits
  says why beside it (`missing`: "Digite o email da pessoa"), never a silent disabled button.
- A click outside never closes a dialog with fields or a destructive one; Esc and the close
  button do. A sheet with unsaved edits asks "Descartar as alterações?" first.
- Dialogs opened from a menu stay mounted while they close (`useLastPresent`), so they fade
  out like the rest, and each opening starts from a clean form.
- Side sheets are full width on phones, 576px (`sm:max-w-xl`) on larger screens, 672px for code.

## Interaction

Every control is labeled and keyboard operable with an orange `:focus-visible` outline.
Dialogs and sheets have accessible titles. Destructive actions require confirmation.
