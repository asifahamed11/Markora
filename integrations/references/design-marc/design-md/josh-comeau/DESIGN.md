# Josh Comeau — DESIGN.md

**URL:** https://joshwcomeau.com
**Category:** Design-Forward Portfolios
**Tagline:** Friendly tutorials for web developers
**Last extracted:** 2026-04-24

## 1. Visual Theme & Atmosphere
Warm-inviting educational portfolio. Josh Comeau's site is the
gold-standard for "teaching-focused" developer portfolios — warm color
palette, playful interactive demos embedded in every article, a
signature "custom cursor" experience, and a deliberate coziness in
copy and visual tone. The mood is "your favorite developer friend
explaining things." The palette is warm-forward: cream-to-orange
gradients, muted pinks, purples for accents. Dark mode is equally
warm (not clinical black). Every post is a showcase for interactive
teaching — sliders, toggles, live canvases, and fun emoji throughout.

## 2. Color Palette & Roles
| Token name            | Hex          | Role                                    |
| --------------------- | ------------ | --------------------------------------- |
| --surface-primary     | #FFFAEE      | Warm cream canvas (light mode)          |
| --surface-dark        | #2D1E40      | Plum dark canvas (dark mode — unique!)  |
| --surface-secondary   | #FFF4D6      | Soft warm-yellow bands                  |
| --surface-elevated    | #FFFFFF      | Cards (light)                           |
| --surface-elevated-dk | #3A2C52      | Cards (dark)                            |
| --text-primary        | #1D1F27      | Body on cream                           |
| --text-primary-dk     | #F0E6FF      | Body on dark-plum                       |
| --text-secondary      | #6E5F7C      | Supporting copy                         |
| --accent-primary      | #FF6B6B      | Warm coral CTAs                         |
| --accent-purple       | #B07AFF      | Signature purple-violet                 |
| --accent-blue         | #4F9EFF      | Info / link blue                        |
| --accent-gold         | #FFC876      | Warm gold highlight                     |
| --accent-pink         | #FF93C8      | Soft pink accents                       |
| --border-subtle       | #E8DBC6      | Dividers on cream                       |

## 3. Typography Rules
**Font families**
- Display / Headings: Wotfard or Inter Display — self-host
- Body: Wotfard or Inter — self-host / next-font
- Serif (rare, emphasis): Charter or Lora — self-host
- Mono: JetBrains Mono — for code blocks

**Hierarchy**
| Level | Font      | Size    | Line-height | Weight | Tracking  |
| ----- | --------- | ------- | ----------- | ------ | --------- |
| H1    | Wotfard   | 40–64px | 1.1         | 700    | -0.02em   |
| H2    | Wotfard   | 28–40px | 1.2         | 700    | -0.015em  |
| H3    | Wotfard   | 22–26px | 1.3         | 600    | -0.01em   |
| Body  | Wotfard   | 17–19px | 1.65        | 400    | 0         |
| Mono  | JetBrains | 14–15px | 1.55        | 500    | 0         |

## 4. Component Stylings
- **Primary button**: 48px height, 12px radius (soft), 0/24px padding, Wotfard 700 16px, coral `#FF6B6B` fill, white text. Hover: slight scale(1.03) + translateY(-2px) with `0 8px 24px rgba(255,107,107,0.3)` coral-tinted shadow.
- **Interactive demo block**: embedded live component (slider, toggle, canvas) inside article flow. Cream or soft-yellow fill, 12px radius, 24px padding, with a tiny "Try it!" label above.
- **Code block**: `#2D1E40` dark plum fill (even in light mode!), 8px radius, JetBrains 14px with pastel syntax (purple keywords, coral strings, gold numbers). Syntax is warm, not cold.
- **Callout box**: soft-warm tinted fill (yellow `#FFF4D6` or pink `#FFE0E8`), 12px radius, emoji prefix (💡 / ⚠️ / 🎉), body text in Wotfard.
- **Custom cursor**: optional. Replaces native cursor with a circle + dot that follows mouse with spring damping — Josh's signature detail.
- **Navigation**: 64px height, cream backdrop blur, Wotfard 600 16px nav links, emoji-embellished (📚 Tutorials, 📝 Articles, 👋 About).

## 5. Layout Principles
- Grid: 720px max reading column, centered. Some sections go wider (1024px) for hero art.
- Spacing scale: 8px base (8, 16, 24, 32, 48, 64, 96, 128).
- Whitespace philosophy: generous — reading comfort is king. Inline interactive demos break up otherwise-calm reading flow.
- Section rhythm: hero with illustration + H1 + CTA → featured articles with covers → course promos → blog list with covers → newsletter CTA → friendly footer.

## 6. Depth & Elevation
Warm, soft shadows:
- L0: page (cream `#FFFAEE`)
- L1: card (white + 1px `#E8DBC6`, `0 1px 2px rgba(0,0,0,0.04)`)
- L2: hovered `0 8px 24px rgba(255,107,107,0.15)` warm coral-tinted
- L3: modal `0 24px 64px rgba(45,30,64,0.2)` plum-tinted
Shadows always carry warm color tint — pure black shadows feel off-brand.

## 7. Do's and Don'ts
**Do**
- Use warm cream `#FFFAEE` light and warm plum `#2D1E40` dark — the brand is warm-forward.
- Pair Wotfard (or similar friendly sans) with plum-dark code blocks for a cohesive warmth.
- Include interactive demos (sliders, toggles, canvases) inside articles — teaching-native.
- Use emoji liberally — it's friendly, not unprofessional, in Josh's system.
- Add subtle hover animations (scale, translateY) with warm-tinted shadows.

**Don't**
- Don't use pure black or pure white canvas — both feel wrong against Josh's warmth.
- Don't use clinical grayscale code blocks; warm-tinted syntax is the signature.
- Don't omit interactive demos; they're the teaching mechanism.
- Don't use cold blues as primary brand color; warm coral or purple leads.
- Don't write dry tutorial copy — Josh's voice is friendly + enthusiastic.

## 8. Responsive Behavior
- Breakpoints: 640, 768, 1024, 1280px.
- Touch targets: 48px.
- Mobile nav: sheet from top, cream fill, stacked Wotfard 600 18px links with emoji preserved.
- Content collapse: 720px reading column becomes 92% viewport; interactive demos stay interactive on touch devices with tap-to-toggle; custom cursor disables on touch devices.

## 9. Agent Prompt Guide

> These prompts pivot from SaaS hero/feature/CTA to PORTFOLIO-native
> patterns: blog-post landings, interactive demos, article-card grids.

**Build me a blog-post landing hero in Josh's style**
> Background cream `#FFFAEE` (or plum `#2D1E40` for dark mode).
> Container 720px reading column centered. Header area: warm
> illustration (organic shapes in coral, purple, gold) 400px tall.
> H1 Wotfard 56px weight 700 `#1D1F27` line-height 1.1 tracking
> -0.02em. Subhead Wotfard 19px `#6E5F7C`. Metadata row in Wotfard
> Mono 14px "Published Mar 12, 2024 · 12 min read" with small
> avatar and emoji.

**Build me an interactive demo block**
> Inside article flow at 720px width. Cream-to-yellow soft
> gradient background `linear-gradient(135deg, #FFFAEE, #FFF4D6)`,
> 16px radius, 32px padding. Tiny "Try it!" label top-right in
> Wotfard 600 13px color `#FF6B6B`. Interactive element: a slider
> controlling a visual property (scale, rotation, color),
> demonstrating a CSS/JS concept live. Caption below in Wotfard
> 15px `#6E5F7C` explaining what's being demonstrated.

**Build me a featured-articles grid**
> Full-width `#FFF4D6` soft warm-yellow. H2 Wotfard 36px `#1D1F27`
> "Recent writing 📚". 3-col grid at 1024px, 24px gutter. Each
> card: white fill, 16px radius, 1px `#E8DBC6` border, 24px
> padding. Article cover image (illustration or photo with warm
> filter) 16:9. H3 Wotfard 22px `#1D1F27`. 2-line excerpt Wotfard
> 16px `#6E5F7C`. Metadata row bottom in Wotfard Mono 12px "Mar 12
> · 12 min". Hover: translateY(-4px) + `0 16px 32px rgba(255,107,
> 107,0.15)` warm shadow.
