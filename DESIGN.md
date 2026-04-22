---
name: Premium Academic Interface
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464554'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#a12e70'
  on-tertiary: '#ffffff'
  tertiary-container: '#c0488a'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 4.5rem
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system is engineered to evoke a "Premium Academic" experience—balancing the prestige of Ivy League institutions with the cutting-edge agility of a modern fintech platform. The brand personality is authoritative yet inspiring, aimed at high-achieving students and institutional donors. 

The visual style leverages **Glassmorphism** as its primary structural driver. By using translucent layers, background blurs, and vibrant mesh gradients, the UI achieves a sense of "digital airiness." This is contrasted with sharp, bold typography to maintain a professional, high-end feel. The emotional response should be one of confidence, clarity, and "attainable luxury." Unlike the previous dark iteration, this light-mode version emphasizes clarity and "pristine" academic environments.

## Colors

The palette is now anchored in a bright, clean light-mode base to provide an energetic and accessible "Premium Academic" feel.

- **Primary (Vibrant Indigo):** Used for primary actions and active states. It represents stability and intelligence.
- **Secondary (Vivid Violet):** Used for accents, secondary buttons, and decorative gradients to inject energy.
- **Tertiary (Soft Pink/Rose):** Reserved for highlights, notifications, or "success" states that need a sophisticated pop.
- **Neutral/Background:** A clean white/light-grey palette provides the canvas, while surface colors use very subtle tints of the primary indigo to maintain brand cohesion.
- **Gradients:** Use linear gradients (135°) transitioning from Primary to Secondary for high-impact elements like hero sections and featured scholarship cards.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic weights across all levels. The typographic hierarchy is "top-heavy," using massive, bold display sizes to establish authority and a sense of scale. 

- **Headlines:** Set with tight tracking and heavy weights (700-800) to create a "locked-in" professional look.
- **Body:** Generous line-heights (1.6+) ensure readability during long application processes.
- **Labels:** Use uppercase tracking for metadata like "Scholarship Deadline" or "Eligibility" to differentiate from narrative body text.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop to maintain a "contained, premium gallery" feel, while transitioning to a fluid model for tablet and mobile. 

- **Grid:** A 12-column grid with 24px gutters. Content should be grouped in 4-column cards or 6-column split layouts.
- **Rhythm:** An 8px linear scale is used for most spacing, but 4px increments are permitted for micro-adjustments in dense forms.
- **Whitespace:** Use "Airy" margins (stack-lg) between major sections to emphasize the clean, light-mode aesthetic.

## Elevation & Depth

In light mode, depth is achieved through refined **Glassmorphism** and subtle tonal layering.

- **Surface Level 1 (Background):** Solid white or very light grey.
- **Surface Level 2 (Cards/Containers):** `rgba(255, 255, 255, 0.7)` with a `backdrop-filter: blur(12px)`. Include a 1px border at 10% primary color opacity to define edges.
- **Surface Level 3 (Modals/Popovers):** `rgba(255, 255, 255, 0.9)` with `backdrop-filter: blur(24px)`.
- **Light Source:** Instead of an inner glow, use soft, diffused ambient shadows with a hint of the primary indigo to lift glass elements from the bright background.

## Shapes

The design system adopts a **Rounded** philosophy. Standard elements (inputs, small cards) use a 0.5rem radius. Large layout containers and featured scholarship cards use 1.5rem (rounded-xl) to feel more inviting and modern. Buttons should always use the `rounded-xl` or full pill-shape to contrast against the structured grid.

## Components

### Interactive Elements
- **Buttons:** Primary buttons use a vibrant gradient (Indigo to Violet). On hover, they should scale by 1.05x and increase the box-shadow spread of a tinted violet glow.
- **Cards:** Scholarship cards feature a 1px border that brightens on hover. Use a "staggered entry" animation (Y-axis offset: 20px, duration: 0.4s) when the list loads.
- **Input Fields:** Semi-transparent backgrounds with a "glass" feel. The border-bottom should animate to a primary indigo color upon focus.

### Specialized Components
- **Progress Steppers:** Use glowing "dots" for application phases, connected by translucent primary-tinted lines.
- **Status Chips:** Small, pill-shaped badges with low-opacity background fills (e.g., "Open" in a translucent green with a 2px solid glow dot).
- **Glass Sidebar:** A fixed navigation element with 40px blur, providing a persistent anchor for the dashboard in the light-mode interface.

### Motion & Transitions
- **Hover States:** All interactive surfaces must use a `cubic-bezier(0.4, 0, 0.2, 1)` transition timing for a "slick" feel.
- **Page Transitions:** Fluid "fade and slide" transitions between scholarship categories to maintain the premium flow.