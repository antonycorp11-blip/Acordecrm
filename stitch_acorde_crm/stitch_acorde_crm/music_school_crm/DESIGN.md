---
name: Music School CRM
colors:
  surface: '#fff8f6'
  surface-dim: '#efd5ca'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae1'
  surface-container-high: '#fee3d8'
  surface-container-highest: '#f8ddd2'
  on-surface: '#261812'
  on-surface-variant: '#5a4136'
  inverse-surface: '#3d2d26'
  inverse-on-surface: '#ffede6'
  outline: '#8e7164'
  outline-variant: '#e2bfb0'
  surface-tint: '#a04100'
  primary: '#a04100'
  on-primary: '#ffffff'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#ffb693'
  secondary: '#7b5647'
  on-secondary: '#ffffff'
  secondary-container: '#feccba'
  on-secondary-container: '#7a5446'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#989999'
  on-tertiary-container: '#2f3132'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ecbcaa'
  on-secondary-fixed: '#2e140a'
  on-secondary-fixed-variant: '#613e31'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fff8f6'
  on-background: '#261812'
  surface-variant: '#f8ddd2'
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -2px
  headline-lg:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.0'
  headline-lg-mobile:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-page: 32px
  sticker-offset: 6px
---

## Brand & Style

This design system is a high-octane collision of Y2K nostalgia, 8-bit gaming aesthetics, and contemporary cartoon maximalism. It is designed for a generation that finds clarity in controlled chaos. The personality is unapologetically loud, informal, and creative, moving away from "corporate tech" into a space that feels like a digital scrapbook or a customized locker.

The visual direction leans heavily into **Retro-Brutalism** and **Maximalism**. Key characteristics include:
- **Gen-Z Energy:** Using irony and dense visual information to create a sense of community and play.
- **8-Bit Textures:** Low-fidelity digital artifacts used as high-fidelity design assets.
- **Informal Functionality:** The CRM is a tool, but it shouldn't feel like work. It should feel like making music.
- **Sticker-Skeuomorphism:** UI elements are treated like physical stickers slapped onto a digital surface, complete with white offsets and heavy shadows.

## Colors

The palette is anchored by a high-saturation **Vibrant Orange** that demands action and attention. This is balanced by **Deep Brown**, used not as a neutral, but as a grounding, rhythmic element reminiscent of vintage hardware and chocolate aesthetics. **Crisp White** provides the "sticker" base and essential legibility in a crowded layout.

- **Primary (Orange):** Used for primary actions, progress bars, and "New Student" alerts.
- **Secondary (Brown):** Used for typography, thick borders, and container backgrounds.
- **Tertiary (White):** Used for card backgrounds and high-contrast text.
- **Texture:** The background is never a flat color; it must utilize a subtle dot-matrix or "grainy" noise texture to simulate printed zines or vintage monitor static.

## Typography

The typography system uses a "Digital-Organic" pairing. **Space Mono** serves as the 8-bit proxy—its geometric, fixed-width nature evokes early computing and synthesizers. This is used for all headings, numbers, and data points to emphasize the technical nature of music.

For readability within a maximalist layout, **Plus Jakarta Sans** is used for body copy. Its rounded terminals and friendly apertures provide a necessary "cartoonish" softness that counters the rigid grid of the mono font. All headlines should be set in Uppercase for maximum impact.

## Layout & Spacing

This design system rejects "airy" whitespace in favor of a "packed" layout. We use a **Fluid Grid** with aggressive margins. 

- **Density:** Elements should be tightly packed, often slightly overlapping to create a "collage" effect.
- **The Sticker Grid:** Components do not just sit on the grid; they are often rotated by 1-2 degrees (alternating) to break the digital rigidity.
- **Reflow:** On mobile, the overlapping elements collapse into a vertical stack, but maintain their "tilted" rotation and heavy borders to keep the energy high.
- **Safe Areas:** While the vibe is chaotic, the text within "stickers" must maintain a generous 16px internal padding to ensure the CRM remains functional.

## Elevation & Depth

Depth is not achieved through light and shadow, but through **Hard Offsets** and **Layering**.

- **Hard Shadows:** Use 100% opacity shadows in Deep Brown, offset by 4px or 8px. This creates a "pop-out" 2D effect typical of 8-bit platformers.
- **Sticker Borders:** Every card or container must have a 2px Deep Brown border, surrounded by a 4px "white-cut" outer border (simulating a die-cut sticker).
- **Doodle Overlays:** High-priority items or new features should be highlighted with "hand-drawn" orange arrows or circles that sit on a higher Z-index than the UI itself.

## Shapes

The shape language is a mix of **Pixelated Rigidity** and **Cartoon Bubbles**. 

- **Primary Containers:** Use the `rounded-lg` (1rem) setting to mimic the chunky, softened corners of 90s hardware.
- **Buttons:** Use `rounded-xl` for a "squishy" feel that contrasts with the 8-bit icons inside them.
- **Iconography:** All icons must be strictly 8-bit/pixel-art. No smooth curves are allowed in the iconography. If an icon represents a synthesizer or cassette, it should look like it was drawn in MS Paint.

## Components

### Buttons
Buttons must look like physical "pressable" objects. Use a thick 4px bottom border in a darker shade of the button color to create a tactile click effect. On hover, the button should "sink" (translate Y by 2px and reduce shadow).

### Cards (The "Sticker")
Every student profile or lesson schedule is housed in a "Sticker Card." These are white containers with heavy brown outlines. They should feature "Doodle Overlays" like a small pixelated star in the corner if a student has practiced, or a "Late" stamp in bright red.

### Input Fields
Inputs should use the Deep Brown for borders and a chunky, pixelated cursor. Focus states should trigger a "Neon Green" glow or a thick dashed border.

### Chips & Tags
Tags for "Piano," "Guitar," or "Theory" should look like label-maker tape—dark backgrounds with white Space Mono text.

### Progress Bars
Progress bars for student grades should look like "Health Bars" from a retro RPG, using blocky segments rather than a smooth gradient.