# Design system

The source of truth is the Figma file
[laagtabAI](https://www.figma.com/design/IZksIsf3UEGbnocTt0oa9E/laagtabAI). This page records what
is in it (read on 2026-10-27) and how it maps to code, so you can build a screen without guessing.
When Figma and this page disagree, Figma wins: update this page in the same PR.

> **Status.** The maroon / gold scaffold (`bg`, `fg`, `surface`, `primary`, `maroon`, `gold`, ...) is
> **not** the final design. The target is the **Ivory + Sage** palette below. Migrate screens one at
> a time; don't add new scaffold colours, and don't mix the two palettes inside one component.

## Where things are in Figma

| Page | What it's for | Use it? |
|---|---|---|
| **Final Pages** | The approved screens (31 frames, 440 px wide) | ✅ Build from these |
| **Components** | `Laag ta bAI — Components`: 24 components with a written spec each (list below) | ✅ Build from these |
| **Foundations** | Colour, type, spacing, radius, shadow, size and opacity tokens with usage rules | ✅ Token source |
| **Icons** | Ionicons 7.4.0 plus the app's own icons | ✅ |
| **Assets** | Landmark placeholders, onboarding and auth photos, logos and backgrounds | ✅ Export from here |
| **Themes** | Nine palette explorations. **09 · Ivory + Sage** is the chosen one; it matches the variables | ⚠️ Reference only |
| **Ideas/Brainstorming** | Early drafts and older copies of screens | ❌ Don't build from these |

The Figma variables collection is **`Laag ta bAI / Ivory`** (Light mode only). Every Foundations
swatch is bound to a variable; text styles are under `Laag ta bAI/…`, effects under
`Laag ta bAI/shadow-*`.

**Reading exact values.** Open the file in Chrome while signed in, then run read-only plugin-API
calls from the console (or have an agent do it), e.g.
`await figma.variables.getLocalVariableCollectionsAsync()` or `(await figma.getNodeByIdAsync('151:122'))`.
Figma's Dev Mode / MCP server works too. Never edit the file from a script.

## Colour

Four brand colours (ivory, sage, navy, terracotta) plus derived ink, line, soft-fill, status and
overlay tokens. Use the Tailwind class names in the second column; they switch with the theme.

| Figma variable | Tailwind name | Light (Figma) | Dark (provisional) | Use for |
|---|---|---|---|---|
| `color/ivory` | `ivory` | `#FAF5EC` | `#121A24` | App background (gradient top) |
| `color/ivory-deep` | `ivory-deep` | `#F2EBDD` | `#0C121A` | Gradient bottom; locked and empty fills |
| `color/surface` | `ivory-surface` | `#FFFDF8` | `#1B2633` | Cards, sheets, tab bar, top bar |
| `color/line` | `ivory-line` | `#E3DCCD` | `#2C3A4A` | Hairline borders, list dividers |
| `color/line-strong` | `line-strong` | `#8F8878` | `#7F8C9A` | Borders that mark a control (≥ 3:1) |
| `color/navy` | `navy` | `#243B53` | `#DBE5EF` | Primary buttons, headings, active navigation |
| `color/navy-pressed` | `navy-pressed` | `#1A2C3F` | `#C2D0DE` | Pressed navy fills |
| `color/navy-soft` | `navy-soft` | `#E5E2DD` | `#26364A` | Navy tint behind navy text |
| `color/on-navy` | `on-navy` | → ivory | `#121A24` | Text and icons on navy |
| `color/ink` | `ink` | → navy | `#FAF5EC` | Headings and titles |
| `color/ink-body` | `ink-body` | `#3D5166` | `#D3DBE3` | Body copy |
| `color/ink-muted` | `ink-muted` | `#536170` | `#A7B2BD` | Metadata, placeholders, inactive tabs |
| `color/ink-faint` | `ink-faint` | `#8A96A1` | `#6B7885` | Locked / disabled **icons only, never text** |
| `color/sage` | `sage` | `#9BAF9A` | `#9BAF9A` | Secondary surfaces, supporting accents |
| `color/sage-soft` | `sage-soft` | `#DEE0D3` | `#2B3A31` | Insets, icon discs, tracks |
| `color/sage-deep` | `sage-deep` | `#4D654D` | `#B9CDB8` | Text and icons on sage-soft |
| `color/terracotta` | `terracotta` | `#C66B4E` | `#D98A6E` | Heritage accents; **icons and 24 px+ only** |
| `color/terracotta-ink` | `terracotta-ink` | `#9F4B31` | `#ECA88F` | Terracotta for text |
| `color/terracotta-soft` | `terracotta-soft` | `#F3E2D6` | `#3A2A22` | Callouts, heritage tags, unlocked badges |
| `color/danger` | `danger` | `#A8322A` | `#F2958A` | Destructive text |
| `color/danger-soft` | `danger-soft` | `#F7E1DC` | `#3A1F1C` | Destructive button fill |
| `color/danger-line` | `danger-line` | `#E3B3AA` | `#7A3B34` | Destructive button border |

Overlays in Figma (not yet tokens in code; add them when a screen needs them):
`scrim-photo` navy 55 % over full-bleed photos, `scrim-modal` navy 45 % behind modals,
`panel-glass` ivory 90 % (blurred auth panel), `camera-control` navy 50 % over the camera feed,
`on-photo` surface 92 % for chips on photos.

Rules from Foundations: one navy primary button per screen; terracotta is decoration and accents,
use `terracotta-ink` for terracotta text; `ink-faint` is never used for text. All light pairs above
pass WCAG AA (`ink-muted` on `surface` 6.2:1, `line-strong` on `surface` 3.5:1).

**Naming.** Figma `color/surface` and `color/line` are `ivory-surface` and `ivory-line` in code
because the scaffold already owns `surface` and `line`. Rename them once the scaffold is gone.

### Dark mode

Figma has **no dark mode** for Ivory + Sage. (Themes → *06 · Dark Theme* is a separate direction
with a gold accent, not a dark version of this palette.) The project still requires dark mode, so
`src/styles/index.css` ships **provisional** dark values derived from the same hues. Each text pair
was checked for WCAG AA (lowest: `ink-muted` on `surface` 7.1:1). Navy fills invert to a light navy
with dark text. Ask the designer for real dark values and replace them in one place.

### How colours are used on the Final Pages

Counted across all 31 Final Pages frames:

- **Bound to variables:** `ink` 547, `terracotta` 508, `ivory` 324, `ink-muted` 137, `surface` 90,
  `navy` 82, `line` 53, then `terracotta-ink`, `sage-soft`, `sage-deep`, `on-navy`, `ink-body`, ...
  Navy/ink carries text, ivory carries backgrounds, terracotta carries icons and decoration.
- **Not bound (raw hex):** many frames still use colours outside the palette. The most common, with
  the token they most likely mean (**ask the designer before relying on these**):

  | Raw colour | Count | Likely token |
  |---|---|---|
  | `#60758A`, `#718398` | 267, 24 | `ink-muted` |
  | `#7D8C9B` | 58 | `ink-faint` (icons) |
  | `#A63939` | 55 | `danger` |
  | `#FFFDF8`, `#FFFFFF` | 52, 28 | `ivory-surface` |
  | `#E8E4DC` | 79 | `ivory-line` or `navy-soft` |
  | `#9BAF9A` at 12–38 % | ~150 | `sage-soft` |
  | `#C66B4E` at 10–12 % | ~80 | `terracotta-soft` |
  | `#EFAE97` | 82 | none (light terracotta, decoration) |
  | `#243B53` at 10–44 % | ~150 | navy overlays / `scrim-*` |

- **Fully tokenized reference screens:** *Permissions Page* and *Local Commute Page* use no raw
  colours. The *Profile* screens use the most (20–25 each).

## Typography

Figma says the app uses the **platform system face** (SF Pro on iOS, Roboto on Android) and that
Inter only stands in for it in the file. In code, `--font-sans` lists Inter first but Inter is not
loaded, so the system face is what renders. Use these styles; sizes are in `rem` so they follow
the OS font size.

| Figma style | Size / line, weight, tracking | Tailwind |
|---|---|---|
| Display / screen-title | 36/40, 800, -2.5 % | `text-4xl font-extrabold tracking-tight` |
| Display / hero-title | 30/36, 700, 2.5 % | `text-3xl font-bold tracking-wide` |
| Display / level-numeral | 48/48, 800 | `text-5xl font-extrabold` |
| Headings / section-title | 24/32, 700 | `text-2xl font-bold` |
| Headings / nav-title | 24/32, 700, 2.5 % | `text-2xl font-bold tracking-wide` |
| Headings / subsection-title | 20/28, 700 | `text-xl font-bold` |
| Headings / card-title | 18/28, 700 | `text-lg font-bold` |
| Text / body | 16/24, 400 | `text-base` |
| Text / body-strong | 16/24, 700 | `text-base font-bold` |
| Text / body-sm | 14/20, 400 | `text-sm` |
| Text / caption | 12/16, 500 | `text-xs font-medium` |
| Text / micro | 10/14, 700 | `text-[0.625rem] leading-[0.875rem] font-bold` |
| Labels / button-label | 18/28, 700, 5 %, UPPERCASE | `text-lg font-bold tracking-[0.05em] uppercase` |
| Labels / eyebrow | 12/16, 700, 10 %, UPPERCASE | `text-xs font-bold tracking-[0.1em] uppercase` |
| Labels / tag | 10/14, 700, 2.5 % | `text-[0.625rem] leading-[0.875rem] font-bold tracking-wide` |
| Labels / tagline | 18/28, 500, 10 % | `text-lg font-medium tracking-[0.1em]` |

Use `uppercase` in CSS rather than typing capitals, so screen readers read words, not letters.
The Final Pages also contain **Lato, Roboto and Archivo Black** text (and legacy styles
`Display/H1`, `Body/Regular`, ... outside the `Laag ta bAI/` folder). Those are leftovers; map them
to the table above and confirm with the designer.

## Spacing, radius, shadow, size, opacity

- **Spacing** (`space/*`): 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48 px = Tailwind `0.5 1 1.5 2 3 4 5 6 8
  10 12`. Screen gutter is 24 px (`px-6`); sections are 32 px apart (`gap-8`).
- **Radius** (`radius/*`): md 6, lg 8, xl 12, 2xl 16, 3xl 24 (Tailwind defaults), plus
  `rounded-tray` 30 px and `rounded-chrome` 40 px (tab bar and top bar). Radius grows with the
  object: tags → buttons → cards → panels → chrome → round controls.
- **Shadows** (navy-tinted, soft, few): `shadow-tabbar`, `shadow-topbar`, `shadow-navy` (navy
  buttons, Scan button, LevelRing) are tokens. Figma's `shadow-lg`, `shadow-2xl` and `shadow-panel`
  are navy-tinted versions of Tailwind's; add them when the scaffold no longer uses Tailwind's.
- **Sizes** (`size/*`): icon 24 (sm 18), control 48 (sm 40), field 56, top bar 60 (`h-topbar`),
  Scan button 64 (`size-scan-button`), tab bar 70 (`h-tabbar`), shutter 80, level ring 128,
  medallion 192.
- **Opacity**: press-primary 80 %, press-row 70 %, tab-inactive 60 %, muted 80 %, skip 50 %.

Touch targets are **48 × 48** minimum in this project (SRS), even where Figma or a ticket says 44.

## Icons

Figma uses **Ionicons 7.4.0** (MIT). Don't use `lucide-react` for new UI; it's from the scaffold.
Icons live in `src/components/icons/ionicons.tsx` with paths copied from `ionicons/dist/svg`.
To add one: `npm pack ionicons@7.4.0`, copy the `<path>` data, keep `currentColor`, and export it
next to the others. Outline icons are for resting states and filled icons for active states, at
24 px with the 1.5 px stroke (32/512) Figma shows.

## Components

Each component in Figma has a written spec next to it. Read it before building.

| Component | Spec summary | In code |
|---|---|---|
| GradientBackground | Vertical ivory → ivory-deep gradient behind every screen | ❌ (scaffold gradient) |
| GlassPanel | The card: card, quiet, panel, modal, well tones | ❌ |
| Button | Full width; one navy primary per screen; large = UPPERCASE | ❌ |
| IconButton | One Ionicon in a 40–48 px disc; always has an accessible label | ⚠️ camera tone only (`OverlayButton` in `ScanPage.tsx`) |
| Tag | Heritage, navy, rating, locked / unlocked pills | ❌ |
| LandmarkCard / LandmarkRow | 160 px rail tile / 80 px thumbnail row | ⚠️ scaffold version |
| PaginationDots | 8 px sage dots, current 24 px terracotta | ❌ |
| TopNavbar | Back, centred navy title, optional action; 40 px bottom corners; 60 px + inset | ✅ `TopNavbar.tsx` |
| **ScreenNavbar** | Four tabs + raised navy Scan; 40 px top corners; 70 px + inset | ✅ `BottomNav.tsx` |
| TextField | Uppercase label, surface well, line-strong border, terracotta icon; 56 / 48 px | ❌ |
| SearchBar | Surface field, terracotta search icon, filter button on Explore | ❌ |
| Switch | Ivory-deep track off; navy or sage-deep on | ❌ |
| ChatComposer / ChatBubble | Sage camera, send turns navy; guide in surface, traveller in navy | ✅ in `ChatPage.tsx` |
| InfoSection | Terracotta-ink title, ink-body text; Trivia callout in terracotta-soft | ✅ in `LandmarkPage.tsx` (scaffold `StorySection` is unused) |
| OptionRow / SettingsList | Icon disc, title, chevron / radio / switch; eyebrow group labels | ❌ |
| ProgressBar | Navy XP, terracotta quest, sage-deep identifying; 12 / 6 px | ⚠️ scaffold `XpBar` |
| StatTile, QuestCard, BadgeTile, LevelRing | Mastery and Profile pieces | ❌ |

Build components in `src/components/`, take colours only from the tokens above, and add a test.

### ScreenNavbar (bottom navigation)

Figma: Components → `Laag ta bAI/ScreenNavbar` (node `151:122`), variants `Active=Explore …
Profile`. Implemented in `src/components/BottomNav.tsx`:

- `ivory-surface` slab, `rounded-t-chrome`, `shadow-tabbar`, `h-tabbar` + bottom safe-area inset,
  24 px side padding (16 px below 375 px so the targets keep a gap on 320 px phones).
- Active tab: filled Ionicon at 28 px in `navy` and a 12 px bold `navy` label, plus
  `aria-current="page"`. Inactive tabs: outline icon at 24 px in `ink-muted`; the label stays in the
  DOM as `sr-only`, so every link has an accessible name and the state isn't shown by colour alone.
- Scan: 64 px `navy` disc with a 4 px `ivory` ring and `shadow-navy`, overlapping the bar by 17 px;
  `camera-outline` in `on-navy`. Its label shows only when Scan is active.
- Tabs are at least 48 × 48 px; the Scan disc is 64 px.

**Visibility rules.** The bar is rendered by `AppShell`, so it shows only on the tab screens
(`/`, `/archives`, `/mastery`, `/profile`). The Scan tab opens a full-screen camera (`/scan`, outside
`AppShell`), as in the Figma Scan-to-Story frames. It's also hidden on pushed screens (landmark
details, chat), auth, splash, welcome, permissions and 404, which use a TopNavbar or nothing. Keep
new tab-level screens inside `AppShell` and pushed screens outside it. The designer still needs to
show these rules in the prototype (ticket #27).

### Scan-to-Story (camera, processing, results, details, chat)

Figma: Final Pages → *Scan-to-Story Page* (`268:7812`, overlay `268:7961`), *… - Scanning*
(`268:7994`) and *… - Landmark Details* (`268:8180`). Implemented in `ScanPage.tsx`,
`LandmarkPage.tsx` and `ChatPage.tsx`:

- **Camera** (`useCamera`, getUserMedia): full screen, navy gradients behind the header and
  controls, terracotta viewfinder corners, 82 px shutter ("Scan landmark"), gallery and
  switch-camera controls, flash when the device supports it. Screens on photos set
  `data-theme="light"` so they keep the light token values in dark mode.
- **Processing**: the captured photo with a navy glass panel, a spinner (still under reduced motion)
  and a Cancel button that aborts the request.
- **Results** (not in Figma, designed in the same style): low confidence, not nearby and no match,
  with the captured photo beside the best guess, a "Best match" tag, the score as text and a bar,
  nearby alternatives, Retake and Search. A confident match goes straight to Landmark Details with
  a "Landmark matched · 98%" pill.
- **States**: camera permission denied, no camera, offline and API error, each with a way forward.
- **Details**: hero photo under the TopNavbar, story sheet, fact tiles, Trivia callout, and an "Ask
  bAI" card with follow-up question chips that open the chat and ask the question.
- **Chat** (SRS 3.1.2): ChatBubble / ChatComposer styling, a typing indicator, follow-up chips
  after each answer, retry on error, copy / export / clear.

API gap: per-candidate confidence isn't in `ScanResult`, and the API only returns the guess
(`landmark`) when the status is `identified`. The UI shows a best match and score whenever the API
sends one; ranking several matches by confidence needs an API change.

## Assets

Export from the **Assets** page: `Placeholder` (landmark photos: Basilica, Casa, Fort, Heritage,
Magellan, Museo, Temple, Yap), `Oboarding` (Onboarding 1–4, Welcome), `Authentication` (Login,
Register), `Laag ta bAI — Logos & Backgrounds`, and `Logo` (don't resize the logo). Export photos
as WebP around 1080 px wide and under 250 KB, and keep large decorative images out of the PWA
precache (see `vite.config.ts`).

## Open questions for the designer

1. Dark-mode values for Ivory + Sage (the code uses provisional ones).
2. Which token each raw colour on the Final Pages should be (table above).
3. Lato / Roboto / Archivo Black on the Final Pages versus the system-face rule.
4. Partial and denied states for permissions, which aren't in Figma yet.
5. ScreenNavbar visibility rules in the prototype.
