---
name: 8-Bit Groove
colors:
  surface: '#1d100a'
  surface-dim: '#1d100a'
  surface-bright: '#46362e'
  surface-container-lowest: '#170b06'
  surface-container-low: '#261812'
  surface-container: '#2b1c16'
  surface-container-high: '#362720'
  surface-container-highest: '#41312a'
  on-surface: '#f8ddd2'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#f8ddd2'
  inverse-on-surface: '#3d2d26'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb693'
  primary: '#ffb693'
  on-primary: '#561f00'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#a04100'
  secondary: '#e0c0b4'
  on-secondary: '#402c24'
  secondary-container: '#5b443b'
  on-secondary-container: '#d1b2a7'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#989999'
  on-tertiary-container: '#2f3132'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#fddbd0'
  secondary-fixed-dim: '#e0c0b4'
  on-secondary-fixed: '#291710'
  on-secondary-fixed-variant: '#584239'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#1d100a'
  on-background: '#f8ddd2'
  surface-variant: '#41312a'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
  label-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1'
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max-width: 1440px
  border-width-thick: 3px
  shadow-offset: 6px
---

## Brand & Style

This design system embraces an "8-bit Dark Maximalista" aesthetic, specifically tailored for a Music School CRM. It blends the nostalgia of retro arcade hardware with the high-culture of classical and modern music education. The brand personality is energetic, rhythmic, and unapologetically "loud"—designed to make administrative tasks feel like a high-score mission.

The style is a fusion of **Retro/Vaporwave** and **Brutalism**. It utilizes absolute black surfaces to make neon accents pop, paired with thick architectural lines and "sticker-slap" UI components. The goal is to evoke the feeling of a vintage synthesizer or a back-alley music shop filled with posters and gear, maintained by a rigorous, modern functional hierarchy.

## Colors

The palette is anchored in an absolute black (`#000000`) background, providing infinite depth for the maximalist elements to sit upon. 

- **Primary (Vibrant Orange):** Used for critical actions, highlights, and "Player 1" status. It represents the energy of performance.
- **Secondary (Deep Brown):** Used for container backgrounds and structural "wood-grain" elements, nodding to classical instruments like violins and pianos.
- **Accents:** Pure white is used for high-contrast text and "sticker" backgrounds. A secondary neon green is utilized for success states and "Active" status indicators, mimicking arcade CRT monitors.

## Typography

Typography leans into the technical and the rhythmic. **Space Grotesk** is used for headlines to provide a modern, high-impact readability that contrasts with the retro elements. **Space Mono** serves as the workhorse for body text and labels, reinforcing the 8-bit, terminal-style aesthetic.

All headlines should be treated with tight tracking to feel dense and "loaded." Labels are always uppercase to mimic arcade cabinet instructions and hardware markings. For specific "Old World" flourishes (e.g., classical music theory sections), **EB Garamond** can be used as an italicized accent to denote elegance amidst the digital grit.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a rigid 4px base unit, ensuring all elements align to a "pixel" rhythm. 

- **Desktop:** 12-column grid with 24px gutters. Content is contained within a 1440px max-width, but backgrounds bleed to the edges.
- **Tablet:** 8-column grid with 16px gutters. Components retain their thick borders but scale in width.
- **Mobile:** 4-column grid. Most "sticker" components stack vertically. Decorative pixel art elements are hidden to prioritize functional density.

Spacing should feel deliberate and "chunky." Instead of soft margins, use hard borders and defined slots to separate content blocks.

## Elevation & Depth

Elevation is achieved through **Hard Offset Shadows** and **Bold Borders** rather than blurs or gradients. 

- **Level 0 (Surface):** Absolute Black (#000000).
- **Level 1 (Containers):** Deep Brown (#2D1B14) with a 3px solid black border.
- **Level 2 (Interactive):** White or Orange cards with a 3px solid black border and a 6px hard offset shadow (Bottom-Right) in the primary orange or black.

This "Neo-Brutalist" approach creates a tactile, physical feel—like buttons on a drum machine or stickers slapped onto a flight case. There is no transparency or "glass"; every layer is opaque and structural.

## Shapes

The shape language is strictly **Sharp (0px)**. To maintain the 8-bit aesthetic, all curves are prohibited. Any "rounded" appearance must be achieved through stepped pixel-art dithering or 45-degree chamfered corners. 

Buttons, input fields, and card containers must have hard right angles. This reinforces the technical, arcade-grid nature of the design system. Icons should be restricted to pixel-grid compositions (e.g., 16x16 or 24x24 pixel art icons).

## Components

### Buttons
Buttons are high-contrast rectangles. The "Default" state features a 3px black border and a hard offset shadow. On "Hover," the shadow disappears and the button shifts 3px down and right to simulate a physical press.

### Stickers (Chips)
Small status indicators or tags should look like physical stickers. Use a white background, black text, and a slightly "crooked" 2-degree rotation to break the grid and add maximalist personality.

### Input Fields
Inputs are deep brown or black with a thick orange bottom-border. The cursor should be a blinking solid block, mimicking a command-line interface.

### CRM Cards
Cards (e.g., Lead or Student profiles) use a white background with a thick black border. Header information is separated by a solid horizontal line. Use 8-bit instrument icons (tiny guitars, pianos, notes) as status markers in the top-right corner of the card.

### Lists & Tables
Tables should look like "Track Lists" on an album cover. Rows are separated by 2px solid lines. High-intensity rows (e.g., overdue payments) use the primary orange as a full-row background color with black text.