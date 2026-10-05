---
name: hetops.dev
description: The site is an eye that wakes up and shows what it watches.
colors:
  lid-dark: "#08090a"
  lid-dark-2: "#0f1112"
  lid-dark-3: "#171a1b"
  sclera: "#efe9dd"
  sclera-2: "rgba(239, 233, 221, 0.76)"
  sclera-3: "rgba(239, 233, 221, 0.6)"
  rule: "rgba(239, 233, 221, 0.1)"
  rule-strong: "rgba(239, 233, 221, 0.18)"
  iris-gold: "#e3a944"
  iris-gold-hi: "#f0bd5e"
  gold-ink: "#1d1404"
  iris-moss: "#45b88d"
  moss-text: "#74d3ab"
  alert: "#ef7a64"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 4.6vw, 4.5rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  heading:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 4.4vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  chart-row:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "calc(var(--s) * clamp(2.6rem, 8.4vw, 7.6rem))"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  pill: "999px"
  image: "14px"
  panel: "22px"
spacing:
  gutter: "32px"
  section: "180px"
  section-mobile: "112px"
components:
  button-gold:
    backgroundColor: "{colors.iris-gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "0 24px"
  button-gold-hover:
    backgroundColor: "{colors.iris-gold-hi}"
  button-line:
    textColor: "{colors.sclera}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "0 24px"
  input-domain:
    backgroundColor: "{colors.lid-dark-2}"
    textColor: "{colors.sclera}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 22px"
  orbit-node:
    backgroundColor: "#0b0d0e"
    rounded: "{rounded.pill}"
    size: "48px"
---

# Design System: hetops.dev

## Overview

**Creative North Star: "The Watching Eye."** Het's work is observability: watching production so problems are seen before they become incidents. The page makes that literal. A closed eye wakes on load, flutters, and opens. His tools orbit inside a generative iris, his results sit in the white of the eye wired to it by gold veins, and scrolling dives through the pupil into the rest of the site. The page ends with a small eye that closes.

The voice is precise and calm, not neon. The palette comes from a hazel iris on lid-dark ground. Shapes are almonds, rings and lenses. Structure is 1px rules and space, never boxes.

## Colors

### Primary
- **Iris Gold** `#e3a944`: focus, numbers, the primary action, the 20/200 chart row, veins and progress rings. Hover lifts to `#f0bd5e`.

### Secondary
- **Iris Moss** `#45b88d` (text tint `#74d3ab`): things that are live, links, the brand mark, and "ok" states.

### Neutral
- **Lid Dark** `#08090a` is the ground, with `#0f1112` and `#171a1b` for inputs and code.
- **Sclera** `#efe9dd` is the type colour. Secondary text is sclera at 0.76 and tertiary at 0.6, both at or above 4.5:1 on the ground.
- **Rules** are sclera at 0.10 and 0.18.
- **Alert** `#ef7a64` is used only for errors and failed states.

### Named Rules
- **One Pupil Rule.** The pupil is exactly the ground colour, so the dive lands on the page itself with no seam.
- **Gold Means Look Here.** Gold marks one thing per region: a number, an action, or a progress mark. Never a fill for decoration.

## Typography

**Archivo** (variable width and weight) for everything a person reads; **JetBrains Mono** only for code, CI job names, commands and measurements such as acuity labels and domains.

### Hierarchy
- **Display**: Archivo 112% width, weight 760, `clamp(2.5rem, 4.6vw, 4.5rem)`, line-height 0.98.
- **Section heading**: 115% width, weight 700, `clamp(2.2rem, 4.4vw, 3.6rem)`.
- **Chart rows**: weight 800, uppercase, each row scaled by `--s` from 1 down to 0.25, like a Snellen chart. Minimum 17px.
- **Problem lines**: 20px, weight 500, 104% width.
- **Body**: 16 to 18px at 1.6, secondary sclera, measure up to about 58ch.

### Named Rules
- **Wide Means Display.** Width above 100% belongs to headings, never to body text.

## Layout

- **Container:** a single 1180px wrap with 32px gutters (20px on mobile).
- **Section rhythm:** sections open 180px apart (112px on mobile), with more space above a heading than below it.
- **Hero:** a full viewport. The almond eye is `min(1120px, 94vw, (100dvh - 340px) * 2.5)` wide at 5:2. A caption sits under it, then a two-column row: H1 left, lede and actions right.
- **Mobile:** below 760px the eye becomes 1.55:1 and the sclera results move into a two-column list under it.

## Elevation & Depth

The page is flat. Depth comes from the iris itself (limbal ring, pupil shadow) and from one neutral offset shadow under primary buttons and orbit nodes. No glows and no coloured halos.

## Shapes

- **Interactive controls:** pills (999px), echoing the iris.
- **Screenshots:** a 14px image radius with no frame.
- **Recurring forms:** the almond (hero eye, contact eye) and the ring (Threadvault stage, release ring, scope).
- **Never:** boxed cards.

## Components

- **Eye (hero):**
  - Lids are two cubic curves.
  - The interior is clipped to the space between them.
  - Lashes are drawn curves that hang when the eye is closed and lift as it opens.
  - The iris is a seeded canvas of about 1,500 fibres, gold near the pupil and moss at the rim, with a collarette, crypts and a limbal ring.
  - The pupil follows the pointer and dilates when a product node is picked.
  - The eye blinks every 5 to 10 seconds.
- **Orbit nodes:** 48px circles on a slowly turning ring inside the iris. Hovering, focusing or clicking one dilates the pupil and fills the caption.
- **Eye chart:** rows of shrinking type, each labelled with a mono acuity mark and a line of fine print beneath. On hover-capable devices the rows you aren't hovering blur.
- **Lens:** screenshots carry a 190px gold-ringed loupe at 2.4x that follows a fine pointer.
- **Release ring:** the CI stages sit around a ring with `main` at the centre. The gold arc runs stage by stage while the ring is visible.
- **Buttons:**
  - Gold pill: Email me, Check.
  - Line pill: Résumé.

## Do's and Don'ts

- **Do** wire new results or tools into the eye: a new tool gets an orbit node, and a new headline number gets a sclera label and a chart row.
- **Do** keep every motion off under `prefers-reduced-motion`. The eye then renders open and still, and the dive is skipped.
- **Don't** add boxed cards, eyebrow labels above headings, gradient text, or glow shadows.
- **Don't** use mono as decoration; it is for code and measurement only.
