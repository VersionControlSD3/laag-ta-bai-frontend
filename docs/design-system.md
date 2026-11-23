# Design system

The source of truth is the Figma file
[laagtabAI](https://www.figma.com/design/IZksIsf3UEGbnocTt0oa9E/laagtabAI). This page records what
is in it (read on 2026-10-27) and how it maps to code, so you can build a screen without guessing.
When Figma and this page disagree, Figma wins: update this page in the same PR.

> **Status.** The maroon / gold scaffold (`bg`, `fg`, `surface`, `primary`, `maroon`, `gold`, ...) is
> **not** the final design. The target is the **Lagoon & Coral** palette below (token names from Ivory + Sage). Migrate screens one at
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

> **Palette change (UI Redesign, ClickUp #1).** The team replaced the Figma **Ivory + Sage** colours
> with the **Tropical Lagoon & Coral** palette from the redesign screenshots and brand assets
> (lagoon teal `#0D5C63`, coral `#E76F51`, teal `#2A9D8F`, warm ivory `#FFFBF4`). The **token
> names did not change**: they are roles now, so every screen switched palette at once. Read
> `navy` as "lagoon primary", `terracotta` as "coral accent" and `sage` as "teal secondary".
> Figma's Foundations page still shows Ivory + Sage until the designer updates it; for colour,
> this table wins over Figma.

Use the Tailwind class names in the second column; they switch with the theme. Values were taken
from the redesign screenshots and logo files, then checked for WCAG AA.

| Role (Ivory + Sage name) | Tailwind name | Light | Dark | Use for |
|---|---|---|---|---|
| `color/ivory` | `ivory` | `#FFFBF4` | `#0A1D24` | App background |
| `color/ivory-deep` | `ivory-deep` | `#F4EBD9` | `#061318` | Sand input wells; locked and empty fills |
| `color/surface` | `ivory-surface` | `#FFFFFF` | `#112B35` | Cards, sheets, tab bar, top bar |
| `color/line` | `ivory-line` | `#E5D9C3` | `#1F4452` | Hairline borders, list dividers |
| `color/line-strong` | `line-strong` | `#8A7D66` | `#7D989C` | Borders that mark a control (≥ 3:1) |
| `color/navy` | `navy` | `#0D5C63` lagoon | `#48CAE4` | Primary buttons, active navigation, lagoon accents |
| `color/navy-pressed` | `navy-pressed` | `#09454C` | `#36B5D0` | Pressed primary fills |
| `color/navy-soft` | `navy-soft` | `#DDF2F0` | `#163A47` | Lagoon tint (chips, location pills) |
| `color/on-navy` | `on-navy` | → ivory | `#0A1D24` | Text and icons on lagoon fills |
| `color/ink` | `ink` | `#0B2E36` | `#F2FBF9` | Headings and titles |
| `color/ink-body` | `ink-body` | `#2D4A51` | `#C7E6E3` | Body copy |
| `color/ink-muted` | `ink-muted` | `#4E6E75` | `#8AB5B2` | Metadata, placeholders, inactive tabs |
| `color/ink-faint` | `ink-faint` | `#7A9295` | `#5F7A7E` | Locked / disabled **icons only, never text** |
| `color/sage` | `sage` | `#2A9D8F` teal | `#4FBFB0` | Secondary accents, logo steps; **icons and large text only** |
| `color/sage-soft` | `sage-soft` | `#DCF5EE` mint | `#153B33` | Insets, icon discs, tracks, PWA icon background |
| `color/sage-deep` | `sage-deep` | `#16655A` | `#9FE3D6` | Text and icons on sage-soft |
| `color/terracotta` | `terracotta` | `#E46B4D` coral | `#FF8566` | Accents, Scan button, active dots; **icons and 24 px+ only** |
| `color/terracotta-ink` | `terracotta-ink` | `#B54124` | `#FFA68F` | Coral for text; coral **filled buttons with white text** |
| `color/terracotta-soft` | `terracotta-soft` | `#FFE8DF` | `#3A211D` | Category tags, AI Mode chip, callouts |
| none | `terracotta-light` | `#F9C4B4` | `#F9C4B4` | Labels, icons and links on lagoon fills only |
| `color/danger` | `danger` | `#A8322A` | `#FF8787` | Destructive text |
| `color/danger-soft` | `danger-soft` | `#F7E1DC` | `#3B1A1D` | Destructive button fill and error notices |
| `color/danger-line` | `danger-line` | `#E3B3AA` | `#8A3036` | Destructive button and error notice border |

**Contrast rules.**
- Coral (`terracotta`) is a shade darker than the brand `#E76F51` so coral icons reach 3:1 on
  ivory. The logo files keep the exact brand colour.
- White text on coral is only 3.1:1, so coral **buttons with text** use `terracotta-ink` as the fill
  (5.6:1), or `ink` text on `terracotta` (4.7:1). The redesign screenshots show white on brand
  coral; don't copy that.
- Lowest checked text pairs: light `ink-muted` on `ivory-deep` 4.65:1, dark `ink-muted` on
  `navy-soft` 5.9:1. `ink-faint` stays icons-only.

Overlays (not yet tokens in code; add them when a screen needs them): photo scrim, modal scrim,
glass panel, camera control, chip on photo.

Rules: one lagoon primary button per screen; coral is for accents, icons and the Scan action; use
`terracotta-ink` for coral text; `ink-faint` is never used for text.

**Naming.** `ivory-surface` and `ivory-line` keep the `ivory-` prefix because the scaffold already
owns `surface` and `line`. Renaming the roles to `lagoon-*` / `coral-*` is a separate refactor.

### Dark mode

`src/styles/index.css` uses the Figma Lagoon & Coral dark mode values from `07 · Mastery & Gamification (Dark)`, checked for WCAG AA. Lagoon fills invert to bright cyan-teal (`#48CAE4`) with dark text (`#0A1D24`).

The **splash** stays ivory in both themes (`data-theme="light"`): the installed PWA's launch screen
uses the manifest's ivory `background_color`, and the logo artwork is lagoon on transparent.

Define each colour **once**, through `--ds-*`: a second `--color-ivory: #...` elsewhere overrides the
theme and breaks dark mode. To keep light text on a photo in both themes, put `data-palette="light"`
on the wrapper (it pins these tokens only), and read `var(--ds-*)` rather than `var(--color-*)` in
custom CSS, because `--color-*` is resolved once at the root.

### How colours were used on the Final Pages (Ivory + Sage, before the redesign)

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
  | `#EFAE97` | 82 | `terracotta-light` (code-only token, auth card) |
  | `#243B53` at 10–44 % | ~150 | navy overlays / `scrim-*` |

- **Fully tokenized reference screens:** *Permissions Page* and *Local Commute Page* use no raw
  colours. The *Profile* screens use the most (20–25 each).

## Typography

**UI Redesign fonts (ClickUp #2).** The redesign uses two self-hosted web fonts (OFL, from
`@fontsource-variable`, imported in `src/main.tsx`):

- **Plus Jakarta Sans** is `--font-sans`, the default text face (Tailwind `font-sans`, so every
  screen uses it).
- **Playfair Display** is `--font-display` (Tailwind `font-display`) for editorial headlines, such
  as onboarding headlines and screen titles. Italic is loaded for the `bAI` in the wordmark.

Only the Latin subsets are precached (about 104 KB, `vite.config.ts`); other subsets load on demand.
The system face is the fallback. This replaces Figma's "platform system face" rule.

Use these styles; sizes are in `rem` so they follow the OS font size.

| Figma style | Size / line, weight, tracking | Tailwind |
|---|---|---|
| Display / screen-title | 36/40, 800, -2.5 % | `text-4xl font-extrabold tracking-tight` |
| Display / hero-title | 30/36, 700, 2.5 % | `text-3xl font-bold tracking-wide` |
| Display / level-numeral | 48/48, 800 | `text-5xl font-extrabold` |
| Headings / section-title | 24/32, 700 | `text-2xl font-bold` |
| Headings / nav-title | 22/28, 700, 1 % | `text-[1.375rem] leading-7 font-bold tracking-[0.01em]` (TopNavbar) |
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
  buttons, Scan button, LevelRing) and `shadow-card` (chat composer, cards) are tokens. Figma's `shadow-lg`, `shadow-2xl` and `shadow-panel`
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
| IconButton | One Ionicon in a 40–48 px disc; always has an accessible label | ❌ |
| Tag | Heritage, navy, rating, locked / unlocked pills | ❌ |
| LandmarkCard / LandmarkRow | 160 px rail tile / 80 px thumbnail row | ⚠️ scaffold version |
| PaginationDots | 8 px sage dots, current 24 px terracotta | ❌ |
| TopNavbar | Back, centred navy title, optional action; 40 px bottom corners; 60 px + inset | ✅ `TopNavbar.tsx` |
| **ScreenNavbar** | Four tabs + raised navy Scan; 40 px top corners; 70 px + inset | ✅ `BottomNav.tsx` |
| TextField | Uppercase label, surface well, line-strong border, terracotta icon; 56 / 48 px | ❌ |
| SearchBar | Surface field, terracotta search icon, filter button on Explore | ❌ |
| Switch | Ivory-deep track off; navy or sage-deep on | ❌ |
| ChatComposer / ChatBubble | Sage camera, send turns navy; guide in surface, traveller in navy | ✅ inline in `ChatPage.tsx` |
| InfoSection | Terracotta-ink title, ink-body text; Trivia callout in terracotta-soft | ⚠️ inline in `LandmarkPage.tsx` |
| OptionRow / SettingsList | Icon disc, title, chevron / radio / switch; eyebrow group labels | ❌ |
| ProgressBar | Navy XP, terracotta quest, sage-deep identifying; 12 / 6 px | ✅ `MasteryCards.tsx` (navy, terracotta); Profile still uses scaffold `XpBar` |
| StatTile, QuestCard, BadgeTile, LevelRing | Mastery and Profile pieces | ✅ `MasteryCards.tsx` |

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

**Visibility rules.** The bar is rendered by `AppShell`, so it shows only on the five tab screens
(`/`, `/archives`, `/scan`, `/mastery`, `/profile`). It's hidden on pushed screens (landmark
details, chat), auth, splash, onboarding, permissions and 404, which use a TopNavbar or nothing. Keep
new tab-level screens inside `AppShell` and pushed screens outside it. The designer still needs to
show these rules in the prototype (ticket #27).

### Mastery (UI Redesign #7: Mastery & Gamification, Light & Dark)

Built in `src/pages/MasteryPage.tsx`, `src/pages/MasteryListPages.tsx` and `src/components/MasteryCards.tsx` from Figma `07 · Mastery & Gamification (Light & Dark)`:

- **Background & shadows.** Flat `bg-ivory` surface (`#FFFBF4` light / `#0A1D24` dark), `shadow-navy` dual lagoon + coral glow on `LevelRing`, and `shadow-card` on `QuestCard`.
- **Rank & stats.** `LevelRing` (`128 px` outer lagoon border, `112 px` inner coral ring), `navy` XP progress bar with monospace numbers (`font-mono tabular-nums`), and three stat tiles (`TrophyIcon` Awards, `FlameIcon` Streak, `LocationIcon` Visited).
- **QuestCard.** Filled `BookIcon` in a `sage-soft` `10 px`-radius square, `navy-soft` badge pill, top-right monospace `done/total` counter in `terracotta-ink`, `6 px` coral progress bar (with full `role="progressbar"` ARIA text), and `Log a visit` action. Active quests are ordered nearest to completion first (ClickUp #33).
- **BadgeTile.** Three-column grid; unlocked badges sit on `terracotta-soft` with a `terracotta` border and `StarIcon`, while locked badges show a `LockClosedIcon` and the word "Locked" (so state isn't colour alone).
- **State notices.** `MasteryNotice` (`20 px` radius) uses `ivory-surface` / `ivory-line` for signed-out and 0 XP prompts, and `danger-soft` / `danger-line` / `danger` for connection error alerts.

### Profile, Settings & Modals (UI Redesign #8: Light & Dark)

Built in `src/pages/ProfilePage.tsx` (routes `/profile`, `/profile/permissions`) from Figma `08 · Profile, Settings & Modals (Light & Dark)`:

- **Traveler card & inline edit.** Flat `bg-ivory` surface (`20 px` gutters), `64 px` coral initials avatar (`bg-terracotta text-on-navy`), uppercase rank/level eyebrow, `Edit` button (`rounded-[10px]`), and inline `Edit profile` card with `border-terracotta`, `14 px`-radius sand inputs, and `Cancel` / `Save changes` actions.
- **Summary tiles & XP card.** Three-column stat tiles (`Places visited`, `Badges earned`, `Day streak`) with filled `18 px` Ionicons (`LocationIcon`, `RibbonIcon`, `FlameIcon`) above the count, followed by the lagoon-teal `Your journey` XP card (`bg-navy text-on-navy`) with monospace XP value (`font-mono tabular-nums`) and `10 px` coral-on-`navy-soft` progress bar.
- **Preferences, Support & Developer.** `34 px` duotone icon badges (`terracotta-soft` with filled `MoonIcon`, `GlobeOutlineIcon`, `ShieldCheckmarkIcon`, `LocationIcon`, `FlameIcon`, `NotificationsIcon`; `sage-soft` with `CloudOfflineOutlineIcon` for Offline storage), accessible `role="switch"` toggles, and the `terracotta` accent-bar `About the developer` card.
- **Permissions subpage & Modals.** `TopNavbar` + `sage-soft` `You're in control` banner (`ShieldCheckmarkIcon`), permission status pills (`Allowed`, `Not enabled`, `Blocked`), and `bg-ivory-surface` dialogs with `shadow-modal` and `navy-soft`/`border-navy` active radio rows for Appearance, Language, and Log out.

### Global Statuses, Overlays & Errors (UI Redesign #9: Light & Dark)

Built in `src/pages/NotFoundPage.tsx`, `src/features/progress/CelebrationProvider.tsx`, `src/components/PwaUpdatePrompt.tsx`, `src/components/AppShell.tsx`, `src/components/StateMessage.tsx` and `src/components/SignInPrompt.tsx` from Figma `09 · Global Statuses, Overlays & Errors (Light & Dark)`:

- **404 Not Found (`*`).** Flat `bg-ivory` surface, `48 px` coral `404` display numeral (`text-terracotta`), `18 px` bold `Na-laag ka, bai! This page doesn't exist.` copy, and a lagoon `Back to Explore` CTA (`bg-navy text-on-navy`).
- **Celebration & XP Toast.** Gold pill toast (`bg-gold`, `RibbonIcon`, pinned to the light palette with `data-palette="light"` so its `text-ink` stays dark on gold in both themes) for `+XP`, and a `28 px`-radius `bg-ivory-surface` modal (`shadow-modal`, `bg-ink/60 dark:bg-ivory-deep/60` scrim) with a `64 px` gold `TrophyIcon` disc, `30 px` `Level N!` heading, `terracotta-soft` badge unlocked pill (`RibbonIcon`), and `Padayon! (Continue)` lagoon CTA.
- **PWA Update & Landscape Guard.** `bg-ivory-surface` update banner (`New version of Laag ta bAI ready.` + `Later` / lagoon `Reload` buttons) and full-screen lagoon `LandscapeGuard` (`bg-navy text-on-navy`, `CompassOutlineIcon`, `Please rotate your phone to portrait`).
- **State Messages & Sign-In Prompt.** Migrated `Loading`, `ErrorMessage` (`danger-soft` / `danger-line` / `danger`), `EmptyState` and `SignInPrompt` off the old maroon/crimson scaffold onto Lagoon & Coral tokens and Ionicons.

### Onboarding (first run)

Built in `src/pages/OnboardingPage.tsx`, route `/onboarding`, from the UI Redesign #2 screenshots.
The running app is the clickable prototype: open `/onboarding` (or clear `laagtabai:preferences`
and open `/`).

Layout:
- **Photo.** A full-bleed photo fills the top 56 % of the screen (46 % on screens 680 px tall or
  less). Slide 1 uses `authenticationBG/LoginDay.webp`, slide 2 `landmarks/magellan.jpg` and slide
  3 `onboarding/bridge.webp`.
  - The photo has a lagoon tint plus top and bottom `ink` scrims.
  - The header shows `EN`, the "Laag ta *bAI*" wordmark and Skip; the photo headline is set in
    `font-display`.
  - The photo area pins the light palette, so the white text stays white in dark mode.
- **Sheet.** An `ivory-surface` sheet with `rounded-t-[2rem]` overlaps the photo by 32 px. It holds
  the slide title (`font-display`, the slide's `h1`) and the body text.
- **Footer.**
  - The active dot is 28 px coral; inactive dots are 8 px `line-strong`, so they keep 3:1 as
    controls. The target's sand dots are only 1.4:1.
  - The CTA is a lagoon `rounded-xl` button. Below 400 px wide it uses tighter padding, so "Start
    exploring" fits next to the dots at 360 px; on narrower screens it wraps onto its own row.

Flow and transition timing:

| From | Action | To | Transition |
|---|---|---|---|
| Splash | after 1500 ms, or tap | Onboarding slide 1 | instant (route replace) |
| Slide n | Next, swipe left (> 50 px), or tap dot | Slide n + 1 / dot's slide | 300 ms fade + 8 px rise, `ease-out` |
| Slide n | swipe right (> 50 px) | Slide n − 1 | 300 ms fade + 8 px rise, `ease-out` |
| Any slide | Page dot | — | dot width 8 → 28 px, 150 ms (Tailwind `transition-all`) |
| Slide 3 | Start exploring | Permissions, then Sign up (`/register`) | instant (route replace) |
| Any slide | Skip | Login | instant (route replace) |

- Both exits replace the history entry, so back on Permissions or Login never returns to the slides.
- Either exit sets `onboarded: true`, so onboarding shows once.
- With "reduce motion" on, the fade and dot transitions are off and the splash skips its delay.
- Tab order: Skip → page dots 1–3 → Next / Start exploring. All controls show a 2 px navy focus
  ring and are at least 48 × 48 px. Dots are labelled "Page n of 3"; the current one has
  `aria-current="step"`. A `role="status"` region outside the animated slide stays mounted and announces "Page n of 3: <headline>" on every change.

### Login (UI Redesign #3)

Built in `src/pages/authentication/LoginPage.tsx` on `src/components/AuthScreen.tsx`, from the
ClickUp #3 screenshot.

- **Photo band.** `AuthScreen` is a short photo band, `clamp(14rem, 32dvh, 17rem)`: `LoginDay.webp`
  in light, `LoginNight.webp` in dark, with a lagoon tint and ink scrims.
  - It shows `EN`, the "Laag ta *bAI*" wordmark and "Cebu, PH", then the `font-display` tagline
    "Go where the map *runs out.*"
  - Only the band pins the light palette; the sheet below follows the theme.
- **Sheet.** An `ivory-surface` sheet with `rounded-t-[2rem]` overlaps the band by 32 px. It holds:
  - the italic `font-display` greeting "Maayong pagbalik" (`lang="ceb"`) and the `font-display`
    title "Log In";
  - text fields with a sentence-case label, a 56 px `ivory-deep` (sand) well, an `ivory-line`
    border (`danger` when invalid, plus the error text) and an `ink-muted` outline icon;
  - a full-width lagoon `Log in` button;
  - an outlined `Continue as Guest`;
  - the Google button (Supabase mode) and "New here? Create Account".
- **Dev mode.** Without Supabase keys, `DevSignIn tone="notice"` shows the sand box with a dashed
  coral border and a lagoon "Continue as dev traveler" button.

### Sign up (UI Redesign #4)

Built in `src/pages/authentication/SignUpPage.tsx` on the same `AuthScreen` as Login, from the
ClickUp #4 screenshot. The task's `RegisterDay` / `RegisterNight` photos are byte-for-byte the
Login photos, so the separate register images were deleted.

- **Header.** `font-display` "Create Account" plus "Get started.". The dev notice is the same
  `DevSignIn` box as Login.
- **Fields.** Each field has a sentence-case label with `*` and a 56 px `ivory-deep` (sand) well.
  - Every field has exactly **one** border state: `ivory-line` (neutral), `danger` (error) or
    `sage-deep` (passwords match). This avoids the old neutral-plus-error class conflict.
  - Errors are text in `danger`.
  - The password rules show a check or a cross icon plus `sage-deep` / `ink-muted` text, so the
    state isn't colour alone.
- **Date of birth.** A custom 18+ picker (`SignUpPage.css`, tokens only) with a coral
  `calendar-outline` icon.
  - The popover is an `ivory-surface` card with lagoon selection and `terracotta-ink` weekday
    labels.
  - Underage days are disabled, faded **and** struck through.
- **Actions.** A lagoon `Create account` button, an "OR" divider and an outlined `Continue with
  Google` (Google's own multicolour "G"), then "Already have an account? Sign in".
- **Removed tokens.** The leftover `design-surface`, `design-line`, `navy-deep`, `error` and
  `success` tokens are gone from `index.css`.

### Landmark details and Ask bAI (UI Redesign #5)

Figma section *05 · Landmark Story & AI Guide Chat* (`558:3329`).

**Landmark details.** Built in `src/pages/LandmarkPage.tsx` (`/landmarks/:id`, frames `558:3330` / `558:3421`).

- **Photo.** A 320 px full-bleed photo with no top bar. It has floating 48 px discs:
  - Back and Share use `ivory-surface` at 94 % with a `navy` icon.
  - Bookmark is outline on that disc; once saved it's a filled icon on a `terracotta` disc, so the
    state isn't colour alone.
  - The `1/1` photo badge is `navy` at 85 %. The API returns one photo, so it always reads 1/1.
- **Sheet.** An `ivory-surface` sheet, `rounded-t-[2rem]`, overlaps the photo by 30 px. In order:
  - a `sage-soft` "Landmark matched · 97 %" pill (scans only);
  - the `font-display` 30 px title;
  - rating and opening hours;
  - a `sage-soft` district pill;
  - About, with a Listen button for narration;
  - three `ivory-deep` fact tiles (`font-mono` values);
  - the outlined "Ask bAI, your guide" pill;
  - a "Significance & History" `<details>` accordion (open by default; each paragraph has a 3 px
    `navy` bar);
  - the `terracotta-soft` Trivia callout with a `terracotta` border;
  - the `ivory-deep` check-in pill.
- **Bottom bar.** A sticky `ivory-surface` bar shows "Free entry · 25 min visit" in `font-mono` and
  the "Scan another landmark" CTA.
  - The CTA uses a `terracotta-ink` fill with `on-navy` text. Figma's white on brand coral is 3.1:1,
    so it isn't copied.
- **Errors.** The not-found and offline cards follow `Laag ta bAI/StateNotice` (`558:3380`): 20 px
  radius, `ivory-surface` or `danger-soft`. Each also has a recovery action (Explore landmarks / Try
  again).
- **Removed.** "Nearby Stores" (an empty placeholder) isn't in the frame, so it's gone.

**Ask bAI.** Built in `src/pages/ChatPage.tsx` (`/landmarks/:id/chat`, frames `558:3385` / `558:3476`).

- **Header.** An `ivory` header with no TopNavbar: back, an `ivory-deep` name pill (the `h1`), then
  Copy · Export · Clear as 48 px text buttons.
- **Messages.**
  - A `font-mono` day divider ("Today, Nov 23").
  - Traveller bubbles are `navy` with `on-navy` text.
  - Guide answers have no bubble: a 28 px `terracotta-soft` compass disc plus Markdown.
  - The greeting shows a Landmark Summary Card (52 px photo, `font-display` name, `font-mono`
    facts) that links back to the details page.
- **Feedback.** Each answer has "Helpful · Needs improvement" buttons (`aria-pressed`; the chosen one
  is bold with a check). The tap area is a 48 px `::before` box, so the row stays 16 px high.
  - Feedback is kept on the device until the API has an endpoint for it.
- **Composer.**
  - Quick prompt chips (34 px visual, 48 px tap) send at once.
  - The composer card uses `shadow-card`.
  - The camera opens Scan, since `/v1/chat` takes text only.
  - Send is a 38 px `navy` disc in a 48 px target; it's `ivory-deep` while empty.

## Assets

Export from the **Assets** page: `Placeholder` (landmark photos: Basilica, Casa, Fort, Heritage,
Magellan, Museo, Temple, Yap), `Oboarding` (Onboarding 1–4, Welcome), `Authentication` (Login; the
redesign reuses the Login photos for Register), `Laag ta bAI — Logos & Backgrounds`, and `Logo` (don't resize the logo). Export photos
as WebP around 1080 px wide and under 250 KB, and keep large decorative images out of the PWA
precache (see `vite.config.ts`).

## Open questions for the designer

1. Dark-mode values for Lagoon & Coral (the code uses provisional ones), and updating Foundations to the new palette.
2. Which token each raw colour on the Final Pages should be (table above).
3. Lato / Roboto / Archivo Black on the Final Pages versus the system-face rule.
4. Partial and denied states for permissions, which aren't in Figma yet.
5. ScreenNavbar visibility rules in the prototype.
