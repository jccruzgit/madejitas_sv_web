---
name: Lifestyle Boutique
colors:
  surface: '#fff7fe'
  surface-dim: '#e1d7e2'
  surface-bright: '#fff7fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf0fc'
  surface-container: '#f5ebf6'
  surface-container-high: '#efe5f1'
  surface-container-highest: '#e9dfeb'
  on-surface: '#1f1a22'
  on-surface-variant: '#4c4452'
  inverse-surface: '#342e37'
  inverse-on-surface: '#f8edf9'
  outline: '#7e7383'
  outline-variant: '#cfc2d4'
  surface-tint: '#803abd'
  primary: '#500088'
  on-primary: '#ffffff'
  primary-container: '#6b21a8'
  on-primary-container: '#d7a8ff'
  inverse-primary: '#dfb7ff'
  secondary: '#6f5092'
  on-secondary: '#ffffff'
  secondary-container: '#d9b5ff'
  on-secondary-container: '#614283'
  tertiary: '#393337'
  on-tertiary: '#ffffff'
  tertiary-container: '#50494e'
  on-tertiary-container: '#c2b9be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f1dbff'
  primary-fixed-dim: '#dfb7ff'
  on-primary-fixed: '#2d0050'
  on-primary-fixed-variant: '#661aa3'
  secondary-fixed: '#efdbff'
  secondary-fixed-dim: '#dbb8ff'
  on-secondary-fixed: '#29074a'
  on-secondary-fixed-variant: '#573878'
  tertiary-fixed: '#eae0e6'
  tertiary-fixed-dim: '#cec4ca'
  on-tertiary-fixed: '#1f1a1e'
  on-tertiary-fixed-variant: '#4b454a'
  background: '#fff7fe'
  on-background: '#1f1a22'
  surface-variant: '#e9dfeb'
  deep-purple: '#4C1D95'
  violet: '#7C3AED'
  lilac: '#C084FC'
  soft-pink: '#FCE7F3'
  fuchsia-accent: '#D946EF'
  cream-bg: '#FFFBF7'
  surface-dark: '#2E1065'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
  section-gap: 5rem
---

## Brand & Style

The visual identity of the design system is defined by a "Lifestyle Boutique" aesthetic—a sophisticated blend of modern e-commerce efficiency and the tactile, creative warmth of the fiber arts. It targets a discerning audience that values quality and inspiration, moving away from traditional "craft shop" tropes toward a premium, tech-forward retail experience.

The design style leverages **Corporate Modern** foundations with **Glassmorphism** accents. It prioritizes clarity through generous whitespace and a systematic hierarchy, while using soft-rounded typography and subtle gradients to evoke a welcoming, feminine, and professional atmosphere. The emotional response is one of organized creativity: a space where premium materials meet an effortless shopping and quoting experience.

## Colors

The palette is anchored by **Deep Purple** and **Violet**, providing a high-contrast, professional foundation for typography and primary actions. **Lilac** and **Soft Pink** function as bridge colors, used for secondary surfaces, hover states, and tonal backgrounds to maintain a soft, approachable feel.

**Fuchsia** is reserved exclusively as an accent color for micro-interactions, sale badges, or vital indicators to ensure it retains its visual impact without overwhelming the elegant base. 

Backgrounds utilize a mix of pure white and a very light **Cream** to add warmth. Subtle linear gradients—transitioning from Soft Pink to a pale Lilac—are used behind product hero sections and cards to create depth. Dark sections (footers, highlight banners) transition into **Deep Purple** to provide a dramatic, premium contrast that anchors the lighter elements.

## Typography

This design system utilizes **Plus Jakarta Sans** for all typographic roles. Its modern, geometric construction and slightly rounded terminals perfectly balance professional structure with a friendly, boutique charm.

Headings use tighter letter-spacing and heavier weights to command attention, while body text is set with generous line heights to ensure readability during longer browsing sessions. The "Lifestyle Boutique" aesthetic is reinforced by a clear contrast between the bold, Deep Purple headlines and the softer, Lilac or Grey-toned subtext. Label styles are optimized for functional clarity within the "Cotización" (Quote) workflows and product metadata.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy with a 12-column system for desktop and a 4-column system for mobile. A core principle of this design system is "generous whitespace," allowing the colorful textures of the products (yarns, threads) to serve as the primary visual interest without competing with the UI.

- **Desktop:** 12 columns with 24px (1.5rem) gutters and 40px (2.5rem) side margins.
- **Mobile:** Single or dual-column reflow with 16px (1rem) side margins.
- **Rhythm:** Vertical spacing relies on a strict 8px scale. Sections are separated by large gaps (80px+) to create a breathy, high-end editorial feel.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Ambient Shadows**. Surfaces do not sit flat; they float subtly above the light-cream background.

1.  **Level 0 (Background):** Light Cream or White with very subtle Lilac-to-Pink gradients.
2.  **Level 1 (Cards):** Pure white background with a very soft, diffused shadow (15% opacity Deep Purple tint) and a 1px border in ultra-light Lilac.
3.  **Level 2 (Modals/Overlays):** Stronger backdrop blur (12px) to create a frosted glass effect, ensuring that the "Mi Cotización" side panel feels like a premium overlay rather than a jarring new screen.

Avoid heavy, black shadows. All shadows must be tinted with the primary Deep Purple to maintain color harmony and softness.

## Shapes

The shape language is consistently **Rounded**, reflecting the soft nature of the textile industry. Standard components like cards and input fields use a `0.5rem` (8px) radius. Larger containers, such as hero images or category banners, utilize `rounded-lg` (16px) or `rounded-xl` (24px) to emphasize the friendly, modern aesthetic.

Buttons and chips transition into **Pill-shapes** (full rounding) to create distinct touch targets that feel approachable and inviting.

## Components

### Buttons
Buttons are pill-shaped. The primary action ("Preparar cotización") uses the Deep Purple background with White text. Secondary actions ("Explorar catálogo") use a Lilac ghost style with a 2px border. Fuchsia is used for high-urgency micro-actions like "Eliminar" or "Oferta."

### Cards
Product cards feature a 1:1 aspect ratio image with a soft `rounded-lg` corner. The content area below the image uses `headline-md` for pricing and `label-lg` for product titles. A "Quick Add" button appears on hover using a soft-shadow elevation change.

### Navigation
The navigation bar is a clean, white "sticky" surface with a subtle bottom border in Soft Pink. Icons (search, user, quote) are thin-stroke (2px) and rendered in Deep Purple.

### "Mi Cotización" Workflow
- **Add Action:** "Agregar a mi cotización" (Primary Button).
- **Quote View:** A side-drawer (Glassmorphism) listing items with thumbnail images, quantity selectors, and a clear "Total estimado" summary.
- **Final Action:** "Preparar cotización" (Prominent fixed bottom button in the drawer).

### Form Inputs
Input fields use a light cream background with a 1px Lilac border that thickens and turns Deep Purple on focus. Labels are always visible in `label-sm` above the field to ensure professional clarity.