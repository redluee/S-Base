---
name: S-Base
description: Multi-app platform for personal use and development
colors:
  brand: "#00e3a4"
  brand-hover: "#03f5b0"
  brand-active: "#005f4e"
  background: "#000000"
  foreground: "#ffffff"
  card-bg: oklch(0.205 0 0)
  muted: "#a1a1aa"
  border: oklch(1 0 0 / 10%)
  destructive: oklch(0.704 0.191 22.216)
typography:
  display:
    fontFamily: "'oatmeal', Georgia, serif"
    fontSize: clamp(1.75rem, 5vw, 3rem)
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "'epilogue', system-ui, sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'epilogue', system-ui, sans-serif"
    fontSize: 0.8rem
    fontWeight: 500
    letterSpacing: 0.01em
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
components:
  button-default:
    backgroundColor: oklch(0.922 0 0)
    textColor: oklch(0.205 0 0)
    rounded: "{rounded.lg}"
    padding: 0.625rem 1rem
    height: 2rem
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 0.625rem 1rem
    height: 2rem
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#111"
    rounded: "{rounded.lg}"
    padding: 0.625rem 1.25rem
    height: 2.5rem
  input:
    backgroundColor: oklch(1 0 0 / 6%)
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 0.375rem 0.625rem
    height: 2rem
  card:
    backgroundColor: oklch(0.205 0 0)
    textColor: oklch(0.985 0 0)
    rounded: "{rounded.xl}"
    padding: 1rem
---

# Design System: S-Base

## 1. Overview

**Creative North Star: "The Signal Panel"**

S-Base reads like a monitor panel in a dim room — dark backgrounds, crisp bright data, and the brand green glowing only where it matters. The UI is a tool, not a showcase. Every pixel earns its place: thin borders define surfaces, the brand accent signals interaction, and typography carries hierarchy without decorative flourish.

The system is dark by design choice (not by default) — the all-black background reduces glare during real-world use (cooking, browsing, quick data entry) and makes the brand green pop as a deliberate signal, not a background wash.

**Key Characteristics:**
- Dark background with layered card surfaces (tonal, not shadowed)
- Brand green (#00e3a4) used sparingly — active states, ratings, the S in the logo
- Thin borders (rgba white 10%) define containers
- Glow shadows reserved for active/hover states only
- Two-font system: Oatmeal serif for display hierarchy, Epilogue sans for body and labels
- Information density with breathing room

## 2. Colors

A restrained palette. Black background, white text, one accent color. No secondary or tertiary — the brand green is the only chromatic note, and its rarity is the point.

### Primary

- **Signal Green** (#00e3a4 / oklch(0.78 0.2 165)): The brand accent. Used for the logo mark, primary action buttons, active status badges, rating highlights, and selection indicators. Never used as a background wash. Its glow shadow (`0 0 2rem #00e3a4`) appears only on active/hover states.

### Neutral

- **Pitch Black** (#000 / oklch(0 0 0)): Page background. This is the canvas.
- **Dark Slate** (oklch(0.205 0 0)): Card, popover, and elevated surface backgrounds. One step off pure black for subtle layering.
- **Dim Slate** (oklch(0.269 0 0)): Secondary surfaces, muted backgrounds, selected states.
- **Muted Signal** (#a1a1aa / oklch(0.556 0 0)): Secondary text, placeholder text, inactive labels.
- **White** (#fff / oklch(0.985 0 0)): Primary body text and headings.
- **Border Wire** (oklch(1 0 0 / 10%)): All container borders. Thin, subtle, defines edges without calling attention.
- **Destinct** (oklch(0.704 0.191 22.216)): Destructive actions, delete buttons, error states.

### Named Rules

**The Signal Rarity Rule.** The brand green appears on ≤10% of any screen. Its scarcity is what gives it meaning. Active filters, selected ratings, and the primary CTA earn the green; everything else earns layered neutrals.

## 3. Typography

**Display Font:** Oatmeal (Georgia, serif fallback)
**Body Font:** Epilogue (system-ui, sans-serif fallback)

**Character:** A deliberate contrast — Oatmeal brings warmth and editorial weight to headings, while Epilogue provides clean, unadorned readability for body text. The pairing is not decorative; display gets the serif gravity for hierarchy, body gets the sans clarity for scanning.

### Hierarchy

- **Display** (400, clamp(1.75rem, 5vw, 3rem), 1.1): Page titles, section headings. `text-wrap: balance`. Used sparingly — typically once per page.
- **Title** (500, 1rem, 1.3): Card titles, component headings. Sans-serif (Epilogue).
- **Body** (400, 0.875rem, 1.5): All running text. `text-wrap: pretty`. Max line length 65–75ch.
- **Label** (500, 0.8rem, 1.4, 0.01em tracking): Form labels, table headers, metadata. Often in Muted Signal.

### Named Rules

**The One-Per-Page Rule.** The Oatmeal display font appears once per page — the primary heading. Card titles and lower headings use Epilogue weight contrast instead. This preserves the display font's authority.

## 4. Elevation

Depth is conveyed through tonal layering, not shadows. Cards sit one step lighter than the page background (Dark Slate on Pitch Black). Shadows are reserved for interactive feedback only.

### Shadow Vocabulary

- **Signal Glow** (`0 0 2rem #00e3a4`): The brand glow. Used on the login page's decorative ring and as a halo on primary CTAs.
- **Signal Glow Small** (`0 0 1rem #00e3a480`): Hover/active feedback on rating buttons and status pills.
- **No default shadows.** Containers at rest have no drop shadow. The border wire defines the surface.

## 5. Components

### Buttons
- **Shape:** Rounded (0.625rem / rounded-lg). Consistent 2rem default height.
- **Primary:** Brand green background (#00e3a4), dark text (#111). The single call-to-action per viewport.
- **Default:** Light gray background (oklch 0.922), dark text. Secondary actions.
- **Outline:** Transparent with border wire. Tertiary actions, cancel, and non-emphasized commands.
- **Ghost:** Transparent, hover fills muted. Icon-only and toolbar actions.
- **Destructive:** Transparent with red text and border. Delete and destructive confirmations.
- **Hover / Focus:** Brighten opacity or fill. Focus ring uses `var(--ring)` with 50% opacity. Active press translates down 1px.
- **Sizes:** xs (1.5rem), sm (1.75rem), default (2rem), lg (2.25rem), icon variants.

### Inputs & Fields
- **Shape:** Rounded (0.625rem), 2rem default height.
- **Style:** Transparent fill with border wire (`var(--input)`). Subtle dark tint (`bg-input/30`) in dark mode.
- **Focus:** Border shifts to `var(--ring)` with a 3px ring at 50% opacity. No glow — a clean focus indicator.
- **Placeholder:** Muted Signal (#a1a1aa). Must meet 4.5:1 contrast (it does against Dark Slate card backgrounds).
- **Disabled:** 50% opacity with `bg-input/50` fill. No interaction.

### Cards
- **Shape:** Rounded (0.875rem / rounded-xl).
- **Background:** Dark Slate (oklch 0.205). Borders via 1px ring (`ring-1 ring-foreground/10`) rather than a full border — keeps the edge crisp without adding layout weight.
- **Internal Padding:** 1rem (`p-(--card-spacing)`), smaller variant at 0.75rem.
- **No shadow at rest.** Glow reserved for interactive elements.

### Badges
- **Shape:** Full rounded (rounded-4xl). Tight pill.
- **Height:** 1.25rem. Compact enough to inline with text.
- **Style:** Solid background for active/selected, outline for neutral.

### Select
- **Trigger:** Matches input styling (rounded, border wire, 2rem height).
- **Popup:** Portal-based (no clip issues). Popover background (Dark Slate), ring shadow. Items highlight on focus with accent fill.

## 6. Do's and Don'ts

### Do:
- **Do** use the brand green to signal what's active, selected, or actionable.
- **Do** keep one font per role — Oatmeal for display, Epilogue for everything else.
- **Do** use the `glow` shadow family only as interactive feedback, never as a resting state.
- **Do** make every tap target at least 44×44px on mobile.
- **Do** respect `prefers-reduced-motion` — all animations should have a reduced alternative.

### Don't:
- **Don't** use the brand green as a background wash or page tint.
- **Don't** use gradient text (`background-clip: text` with gradients) anywhere.
- **Don't** use side-stripe borders (border-left >1px as decoration).
- **Don't** use the Oatmeal display font more than once per page.
- **Don't** put cards inside cards — nested cards are always the wrong answer.
- **Don't** use glassmorphism or backdrop blur as decoration.
- **Don't** let text overflow its container — test heading clamp scales at every breakpoint.
