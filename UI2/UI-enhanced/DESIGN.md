---
name: Aether-HUD
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#9e8e78'
  outline-variant: '#514532'
  surface-tint: '#ffba38'
  primary: '#ffd79b'
  on-primary: '#432c00'
  primary-container: '#ffb300'
  on-primary-container: '#6b4900'
  inverse-primary: '#7e5700'
  secondary: '#c4c7c8'
  on-secondary: '#2d3132'
  secondary-container: '#464a4b'
  on-secondary-container: '#b6b9ba'
  tertiary: '#a4e7ff'
  on-tertiary: '#003543'
  tertiary-container: '#00d2fe'
  on-tertiary-container: '#00566a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeac'
  primary-fixed-dim: '#ffba38'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#e0e3e4'
  secondary-fixed-dim: '#c4c7c8'
  on-secondary-fixed: '#181c1d'
  on-secondary-fixed-variant: '#444748'
  tertiary-fixed: '#b5ebff'
  tertiary-fixed-dim: '#43d6ff'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
  amber-dim: '#4D3600'
  interface-grid: '#1A1A1A'
  warning-red: '#FF4500'
  success-green: '#00FF41'
typography:
  display-lg:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  body-base:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.15em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
  headline-md-mobile:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.2'
spacing:
  unit: 4px
  gutter: 16px
  panel-margin: 24px
  safe-area: 32px
---

## Brand & Style
The design system is a high-fidelity, data-dense interface designed for advanced technical operations and deep-space telemetry. It targets power users who require high information density and real-time monitoring capabilities.

The aesthetic follows a **High-Tech HUD / Cyber-Minimalist** style. It prioritizes utility and precision through a "dark-mode-first" approach. Visual interest is generated through fine-line technical graphics, wireframe motifs, and a central spherical data visualization ("The Core") that serves as the visual anchor for the dashboard. The emotional response should be one of focused control, technological sophistication, and urgency without chaos.

## Colors
The palette is dominated by absolute blacks (`#000000`) to maximize contrast and reduce visual fatigue in low-light environments. 

- **Primary Amber (`#FFB300`):** Used exclusively for critical data, active states, and primary navigation indicators. It mimics the glow of vintage high-resolution phosphors.
- **Secondary Chrome (`#C4C7C8`):** Applied to secondary text and non-critical technical icons, providing a metallic, utilitarian feel.
- **Backgrounds:** Pure black is the base. Subtle dark grays are used for panel differentiation, but never for large surfaces.

## Typography
Typography is strictly monospaced to reinforce the technical, computer-terminal aesthetic. **JetBrains Mono** is the sole typeface, utilized for its excellent legibility in high-density environments.

- **Data Readouts:** Use `data-mono` for all numerical streams.
- **System Labels:** Use `label-caps` for section headers and peripheral HUD indicators to create a "blueprint" feel.
- **Hierarchy:** Contrast is achieved through weight and color (Amber vs. Chrome) rather than multiple font families.

## Layout & Spacing
The layout follows a **Fixed Grid** model based on a 4px modular unit. Components are snapped to a strict 12-column underlying structure with visible (but subtle) grid lines.

- **Density:** High. Margins between data points are minimal to maximize screen real estate.
- **Modular Panels:** Content is organized into "Modules" with defined borders.
- **Responsive Behavior:** On mobile, the multi-column dashboard collapses into a vertical stack of modules, prioritized by criticality. The central spherical element remains at the top, reduced in scale.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Fine-Line Outlines** rather than shadows. 

- **Level 0 (Base):** Absolute black background.
- **Level 1 (Panels):** Defined by 1px solid borders in `interface-grid` color.
- **Level 2 (Active):** Defined by 1px solid borders in `primary_color_hex` (Amber).
- **Glow FX:** Only critical alerts and the central spherical element utilize a soft, 8px outer glow (Amber) to simulate light emission.

## Shapes
The design system utilizes **Sharp (0px)** corners for all UI elements. This reinforces the rigid, industrial, and "non-organic" nature of a technical dashboard.

- **Exceptions:** Circular indicators and the central spherical graphic are the only rounded elements allowed, used specifically to represent complex data visualizations or orbital mechanics.
- **Graphic Accents:** 45-degree angled corners (chamfers) may be used on panel headers to add a futuristic, machined look.

## Components
- **Buttons:** Rectangular, sharp corners. Ghost style by default (1px Amber border) with solid Amber fill on hover. Text must be uppercase.
- **Input Fields:** Underscore-only or full 1px box borders. Carets should blink with a 500ms interval to mimic terminal behavior.
- **Chips / Tags:** Small, mono-spaced labels enclosed in a solid Chrome or Amber bracket (e.g., `[ STATUS: OK ]`).
- **Cards/Modules:** Each card must have a visible header bar containing a unique alphanumeric ID in the top-left corner (e.g., `MOD-0192`).
- **Central Sphere:** A 3D wireframe or point-cloud sphere that rotates slowly on the Y-axis, representing the core data source.
- **Data Tables:** Borderless rows with 1px horizontal dividers. Alternating row highlights should be avoided; use subtle text-dimming instead.
---

## Session Log - June 2026

### Aether-HUD integration status
The Aether-HUD design spec is being incrementally applied to the live app. Current alignment:

| Spec element | Status | Where in app |
|--------------|--------|--------------|
| JetBrains Mono sole typeface | ✓ Done | `index.html` Google Fonts |
| `#FFB300` primary amber | ✓ Done | `tailwind.config.ts` + CSS variables |
| `#000000` base background | ✓ Done | `<body>` and `<main>` |
| 4px modular unit grid | ✓ Done | Tailwind config |
| Sharp (0px) corners | ✓ Done | Default Tailwind |
| Wireframe outer sphere | ✓ Done | `OrbitalRings.tsx` |
| Concentric rings | ✓ Improved (was 3 thin, now 5 thick) | `OrbitalRings.tsx` |
| **Chamfered (45°) panel corners** | ⏳ Pending | CSS class `.cui-corner` exists in `index.css`, not yet applied |
| **Module ID prefixes** (e.g., `MOD-0192`) | ⏳ Pending | Would require adding to panel headers in `Dashboard.tsx` |
| **Status chips in brackets** (`[ STATUS: OK ]`) | ✓ Partial | Used in nodeStore, not standardized in UI |
| **Blinking caret** (500ms) | ⏳ Pending | Textareas still use default browser caret |
| **Scanline effect** | ⏳ Pending | CSS class `.cui-scanline` exists, not yet applied to panels |
| **Data tables: 1px horizontal dividers, no alternating rows** | ✓ Done | `VeracityLog.tsx` |

### CSS classes ready but not yet applied
- `.cui-scanline` - animated amber scanline (2px height, 6s loop, fades at top and bottom)
- `.cui-corner.tl/tr/bl/br` - 12×12 L-shaped corner brackets in `#FFB300`
- `.cui-header` - flex header bar with amber gradient
- `.cui-main` - main panel area, 1-column on mobile, 2-column on desktop
- `.cui-footer` - footer bar with threshold display
- `.cui-wrapper` / `.cui-wrapper-inner` - flex container for the Ultrans screen

### Pending application
The Ultrans panel (`CognoscentaeUltrans.tsx`) does not yet use `.cui-header`, `.cui-main`, `.cui-footer`, `.cui-scanline`, or `.cui-corner` classes. They were defined in `src/index.css` but only `.cui-wrapper` and `.cui-wrapper-inner` are wired up.

The Dashboard panels (`Dashboard.tsx`) don't have corner brackets either.

Adding both is a 30-min job. Would visibly increase the HUD aesthetic.
