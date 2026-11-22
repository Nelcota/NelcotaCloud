---
name: NelcotaCloud Console
description: A dense, dark-first backend console framed like an infrastructure dashboard.
system: shadcn/ui with Radix UI
---

# NelcotaCloud Console design

The console is dark first: a black frame holds one rounded panel (`bg-background`), cards are a
step lighter (`bg-card`) with thin borders, and the brand orange (`primary`) marks only the main
action of a page, the active step or a key figure. The light theme keeps the same structure with
neutral grays. Theme tokens live in `apps/console/src/app/global.css` (`frame`, `heading`,
`surface`, `surface-hover`, `chart-1..4` on top of the shadcn tokens). Geist is the typeface; type
is compact (page titles `text-lg`, section titles `text-sm font-semibold`).

## Layout

- Icon rail on the frame (brand, Projetos, Minha conta; invitations, theme and account at the
  bottom). The panel has a top bar (history arrows, breadcrumbs, search with Ctrl K, API status)
  and, inside a project, a sidebar with the project switcher and the project's pages in groups.
  Below the large breakpoint the rail and the project's pages open in a sheet.
- A page is a compact `PageHeader` with its actions on the right, then a status strip
  (`Notice`), rows of `StatCard`s, and framed panels (`Section isFramed`) for tables, charts and
  lists. Settings are `SettingsSection` panels with a footer bar for Save.
- Records are rows in framed tables with a toolbar (search, segmented filters, count) and a `...`
  menu of row actions. Detail pages start with a back link, then a header with badges and
  actions, then tabs.

## Onboarding

1. Novo projeto is a full-page wizard: a step list on the left (Ponto de partida, Configuração,
   Revisar e criar) and the step on the right. The configuration step shows a live preview of
   what will be created. The slug follows the name until edited; email confirmation is on by
   default.
2. Creating shows what is being prepared, then the project is ready: the one-time secret key,
   the publishable key, the SDK snippet and the next steps (connect the app, email, social
   login, team). A pending request and an unsaved secret each guard against navigation.

## Interaction

Use labeled, keyboard-operable controls with visible focus. Dialogs and sheets provide accessible
titles. Destructive actions require confirmation. Loading, error, and empty states describe what
the user can do next. Interface copy is in Brazilian Portuguese.
