# Veloz panel tokens (measured)

Measured on 2026-11-22 with Playwright (Edge, 1440×900) and `getComputedStyle` on the panel
mockups embedded in onveloz.com (`/`, `/deploy`, `/observabilidade`, `/banco-de-dados`,
`/seguranca`), which are live DOM, not images. Light values come from the docs app
(`/docs`, `:root[data-theme="light"] .docs-app`), the only place Veloz ships a light theme.
Screenshots: `screenshots/<page>-<desktop|mobile>-<light|dark>.png` (the marketing pages ignore
`prefers-color-scheme`, so both files are dark) and `docs-<desktop|mobile>-light-theme.png`.

The mockup frame is rendered at `--frame-scale: 0.9667`; every size below is the unscaled CSS
value.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| UI text | **Cal Sans** (`"Cal Sans", system-ui, sans-serif`), weights 400–700 | Not Geist (confirmed via `document.fonts`). |
| Mono | **JetBrains Mono**, weights 400–500 (600 rendered synthetic) | Hashes, URLs, slugs, log lines, metrics in cards, period pills, `Executar`. |

Type scale inside the panel (px, size/line-height, weight):

| Token | Value | Used for |
| --- | --- | --- |
| `text-2xs` | 9/18 w600, `letter-spacing: .18px`, mono | Log level badge (INF/WRN/ERR) |
| `text-3xs` | 10/15 w400 | Card meta ("Next.js", "Público", "há 14h"), footer shortcuts, `kbd` |
| `text-label` | 10/15 w500, uppercase, `letter-spacing: .25px` | Sidebar group labels (PÚBLICO, TABELAS, ATIVIDADE RECENTE) |
| `text-xs` | 11/16.5 w400–500 | Branch under service name, status pills, log fields |
| `text-sm` | 12/16 w400–500 | **Default panel text**: labels, buttons, inputs, legends, breadcrumbs |
| `text-base` | 13/19.5 w400–500 | Sidebar items, search, summary sentence |
| `text-md` | 14/20 w500–600 | Section and card titles ("Métricas", "Loja Aurora") |
| `text-lg` | 20/28 w500 | Page title ("Visão geral") |
| `text-stat` | 24/32 w600 | Stat card number ("15,2 mil", "99 ms") |
| `text-stat-mono` | 24/32 w500 mono | Observability totals ("783,8 mil", "33,1 GB") |

- Letter-spacing is `normal` everywhere except the two cases above.
- `font-variant-numeric: tabular-nums` on every number (stats, legend percentages, field counts).
- Uppercase only for sidebar group labels.

## Colors

### Dark (the panel)

| Token | Value | Use |
| --- | --- | --- |
| `--frame` | `#000000` | Outer frame behind the rounded panel (rail lives here) |
| `--background` | `#141414` | Main panel |
| `--card` | `#222222` | Resource cards, side panel |
| `--popover` | `#1c1c1c` (docs: `#2a2a2a`) | Menus, popovers |
| `--surface` | `rgb(255 255 255 / .06)` → ≈`#222` on bg | Stat cards, chart sections, inputs, search, secondary buttons, banners |
| `--surface-hover` | `rgb(255 255 255 / .10)` | Hover, active rail item, active tab pill, `kbd` |
| `--foreground` | `#ededed` | Primary text |
| `--heading` | `#ffffff` | Titles |
| `--text-body` | `#a0a0a0` | Body copy (docs: `#b3b3b3`) |
| `--muted-foreground` | `#8b8b8b` | Secondary text, labels, inactive nav |
| `--text-faint` | `#888888` / `#666666` | INF badge text, disabled |
| `--border` | `#262626` | Hairlines (rarely used: the panel separates with surfaces, not borders) |
| `--border-faint` | `rgb(255 255 255 / .06)` | Dividers |
| `--input` | `#2a2a2a` (docs: `#303030`) | Input border |
| `--primary` / `--ring` | `#ff4d00` | CTA, focus, active marker |
| `--primary-hover` | `#e64500` | CTA hover |
| `--brand-subtle` | `color-mix(in srgb, #ff4d00 10%, transparent)` (`oklch(.668 .224 37 / .14)` in the panel) | Row flash, selected tint |
| `--success` | `#16a34a` | "Saudável", "Ativo", "Servindo" |
| `--warning` | `#d97706` (text `#f59e0b`) | "Deploy em andamento", alert markers |
| `--danger` | `#ef4444` | "Build falhou", ERR, "Deletar projeto" |
| `--info` | `#60a5fa` | Docs only |

Tinted pills: background = status color at 10–16% (`rgb(22 163 74 / .16)`, `rgb(239 68 68 / .10)`).
Danger button: `--surface` fill + `1px rgb(239 68 68 / .30)` border + `#ef4444` text.

Charts: `#3987e5` (2xx, primary series), `#8cc0ff` (3xx), `#fab219` (4xx), `#d03b3b` (5xx),
`#d95926` (secondary series, "Entrada"), `#16a34a`, `#666`. Event markers: 1px dashed left
border in `#8b8b8b` (Deploy), `#ef4444` (Falha), `#d97706` (Alerta de recurso).

### Light (docs app)

| Token | Value |
| --- | --- |
| `--frame` | `#ebebeb` |
| `--background` | `#ffffff` |
| `--card` | `#f0f0f0` |
| `--popover` | `#ffffff` + `0 0 0 1px rgb(0 0 0/.06), 0 12px 32px -8px rgb(0 0 0/.18)` |
| `--surface` / `--surface-hover` | `rgb(0 0 0 / .06)` / `rgb(0 0 0 / .09)` |
| `--foreground` / `--heading` | `#171717` / `#0a0a0a` |
| `--text-body` | `#4a4a4a` |
| `--muted-foreground` | `#6b6b6b` |
| `--border` / `--input` | `#e3e3e3` / `#d6d6d6` |
| `--success` / `--warning` / `--info` | `#15803d` / `#b45309` / `#2563eb` |
| `--code-text` (orange as text) | `#c2410c` |

### Contrast (WCAG 2.2)

| Pair | Ratio | AA text |
| --- | --- | --- |
| `#ededed` on `#141414` | 15.7 | yes |
| `#8b8b8b` on `#141414` / on surface | 5.4 / 4.7 | yes / yes |
| `#ff4d00` on `#141414` | 5.5 | yes |
| `#ef4444` / `#16a34a` on `#141414` | 4.9 / 5.6 | yes |
| `#6b6b6b` on `#fff` / on `#f0f0f0` | 5.3 / 4.7 | yes |
| **white on `#ff4d00`** (Veloz's CTA) | **3.3** | **no** (large text only) |
| **`#ff4d00` on `#fff`** | **3.3** | **no** |
| white on `#e64500` | 4.0 | no |
| white on `#d63f00` / `#d63f00` on `#fff` | 4.6 / 4.6 | yes |
| `#c2410c` on `#fff` | 5.2 | yes |

### Decisions for NelcotaCloud (approved)

- Fonts: `@fontsource/cal-sans` (UI) and `@fontsource-variable/jetbrains-mono` (mono) replace
  Geist.
- Button fill `#d63f00` with white text (4.6:1, AA); hover `#c23900`. `#ff4d00` stays for the
  focus ring, active markers, charts and indicators. Orange text in the light theme uses
  `#c2410c`.

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `radius-xs` | 3–4px | Log badge, legend swatch |
| `radius-sm` | 5–6px | `kbd`, status pills, period pills, Runtime/Build tabs |
| `radius-md` | 8px | Buttons, inputs, search, sidebar items, breadcrumb items, selects |
| `radius-lg` | 10px | Rail items (40×40), service header block |
| `radius-xl` | 12px | Cards, stat cards, chart sections, banners, code blocks |
| `radius-2xl` | 16px | The main panel inside the frame |

## Controls

| Component | Height | Padding | Font | Fill |
| --- | --- | --- | --- | --- |
| Primary button (panel) | 36 | 0 20px, gap 8 | 12/16 w500 | `#ff4d00`, white text |
| Primary button (site, default) | 36 | 0 16px | 14/20 w500 | `#ff4d00` → hover `#e64500`, `active:scale(.97)` |
| Secondary button | 32 | 0 10px, gap 4 | 12/16 w500 | `--surface`, 1px transparent border |
| Ghost button | 28–36 | 0 8–12px | 12–14 w400 | transparent → hover `--surface` |
| Danger button | 28 | — | 12/16 w500 | surface + red 30% border |
| Search ("Buscar… ⌘K") | 29.5 | 5px 10px, gap 6 | 13/19.5 | `--surface`, no border, width 200 |
| Resource search ("Buscar recurso /") | 32 | 0 28px 0 32px | 12/16 | `--surface` |
| Select ("24h") | 32 | 8px 8px 8px 10px | 12/16 | `--surface` |
| `kbd` | 15–16 | 0 4px | 10/10 | `--surface-hover`, radius 5 |
| Sidebar item | 31.5 | 6px 8px, gap 8 | 13/19.5 (active w500) | active: `--surface-hover` fill + foreground; inactive: muted |
| Rail item | 40×40 | — | 16px icon | active `rgb(255 255 255/.1)`, radius 10 |
| Status pill | 20 | 2px 8px, gap 4 | 11/16.5 w500 | status color 10–16% + status text |
| Period pill | 22.5 | 3px 8px | 11/16.5 mono | inactive transparent muted; active `--surface-hover` |
| Segmented tab (Runtime/Build) | 20.5 | 2px 10px | 11/16.5 mono w500 | active `rgb(255 255 255/.1)` |
| Log level badge | 16×30 | — | 9/18 w600 mono | INF `rgb(102 102 102/.12)` `#888`; ERR `rgb(239 68 68/.12)` `#ef4444` |
| Execute button | 28.5 | 6px 10px, gap 5 | 11 mono w500 | `rgb(255 255 255/.07)` |

## Layout and density

- Frame: black, rail 40px icons with 4px gap on the left; the panel is inset `8px` (`my-2 mr-2`)
  with radius 16.
- Topbar inside the panel: org chip (28px high, radius 8) + `VIBE`-style plan tag (8/12 w600,
  uppercase, `letter-spacing .3px`), back/forward, breadcrumb (12px muted, current item
  foreground), search + "IA" on the right.
- Secondary sidebar 200px (items `mx-2`), service header block with name (14 w500) + branch
  (11px muted) at the top, radius 10.
- Content `px-8`, vertical rhythm `gap-4` (16) between blocks, `gap-3` (12) inside a section,
  `gap-1.5` (6) inside a stat card; stat grid gap 16.
- Cards: no border, no shadow, separated by fill (`surface` on `background`, `card` on canvas).
  Only popovers carry a shadow.
- Resource card: 260 wide, radius 12, `--card`; body `p-3`, footer of shortcut icons (10px
  labels) in a 3-column grid.
- Activity feed: title 12/19.5, meta line 10/15 muted (service · sha mono · branch · time),
  status pill below.

## Motion

| What | Value |
| --- | --- |
| Color/background transitions | `200ms cubic-bezier(.4, 0, .2, 1)` |
| Press | `active:scale(.97)` |
| Page change | `obs-replica-page-in 180ms ease-out` (from `opacity 0`, `blur(4px)`, `translateX(-6px)`) |
| New log row | `obs-replica-row-in` (fade) + `obs-replica-row-mark` (flash `--brand-subtle`) |
| Live dot | Tailwind `pulse` (opacity 1 → .5 at 50%) |
| Panels/drawers | `transform 250ms cubic-bezier(.65, 0, .35, 1)` |

## Copy and formatting seen

- Numbers: `15,2 mil`, `783,8 mil`, `33,1 GB`, `1,8 d`, `99 ms`, `<0,1%`, `114 MB de 512 MB (22,3%)`.
- Relative time: `há 14h`, `há 1d`, `há 48min`, `há 7d`.
- Summary sentence: status word in success color + plain sentence ("**Saudável.** Nenhum erro do
  serviço em 15,2 mil requisições nas últimas 24 horas.").
- Chart header: title (14 w500) + one-line description (12 muted, "Contagem a cada 30 min.").
- Empty/explanatory copy is one short sentence, no exclamation marks.
