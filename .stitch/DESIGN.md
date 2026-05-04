# Academy Realtors - current landing source of truth

## Overall vibe

Quiet, exact, product-led education landing page for real estate professionals. The page should feel modern and confident, but not loud. It is not a luxury-black brand page, not a startup gradient page, and not a crypto-inspired concept. The user should feel that the academy is practical, structured, and already close to the way real work happens.

## DESIGN SYSTEM

- Platform: Web, responsive, desktop-first
- Palette:
  - Background / Canvas: `#ffffff`
  - Soft surface: `#f7f8fb`
  - Primary action blue: `#2346ff`
  - Deep blue hover: `#1738cf`
  - Signal green: `#c8ff2d`
  - Main text: `#10131a`
  - Secondary text: `#667085`
- Styles:
  - Thin visible grid on the page background
  - Soft rounded cards with low-noise shadows
  - One strong blue product panel in the hero
  - SVG line icons used as a clear system layer

## Typography

- Display: wide sans-serif, heavy, architectural, compact line-height
- Body: neutral modern sans-serif with high readability
- Subline / kicker: italic serif used sparingly for warmth and contrast

### Rules

- Main hero heading must never split awkwardly
- Body copy stays grounded and practical
- Headings should sound direct, not inflated
- Avoid empty marketing claims and abstract “transformation” language

## PAGE STRUCTURE

1. **Header**
   - Compact sticky shell
   - Brand at left, utility nav centered, clear primary CTA at right
   - Feels quiet and premium, not heavy

2. **Hero Section**
   - Strong left headline with one italic supporting line
   - Short paragraph explaining what the system helps with in real work
   - Two actions only
   - Blue product object on the right with visible interface cues and icons

3. **Primary Content Area**
   - Three compact signal cards right after the hero
   - Split educational format section with step cards
   - Audience block with short, honest descriptions
   - Program catalog with one featured course card in blue

4. **Footer**
   - Minimal contact and navigation
   - Reinforce academy positioning without extra slogans

## Copy guidance

- Write like a calm expert, not a funnel builder
- Use concrete language: deals, documents, pace, risks, workflow, clients
- Avoid broad words like “ecosystem”, “breakthrough”, “game-changing”
- Prefer short statements with a bit of personality over polished abstraction

## Technical quality baseline

- Semantic landmarks and heading hierarchy
- Skip link for keyboard users
- Decorative icons marked hidden for assistive tech
- Visible focus states
- `text-wrap: balance` for large headings
- `scroll-margin-top` for anchored sections
- `touch-action: manipulation` on interactive elements
