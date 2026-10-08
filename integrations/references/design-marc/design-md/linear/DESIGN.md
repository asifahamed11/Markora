# Linear — DESIGN.md

**URL:** https://linear.app
**Category:** SaaS & Productivity
**Tagline:** The product development system for teams and agents
**Last extracted:** 2026-04-23

## 1. Visual Theme & Atmosphere
The benchmark. Linear's site is widely considered the most refined marketing
page in SaaS — a near-black canvas that matches the app's dark UI, one
subtle indigo accent (the "Linear purple" #5E6AD2), 3D render heroes, and
ticker-smooth scroll animations that feel custom-coded rather than Framer-
templated. The mood is "senior craftsperson's workshop." Every edge is
aligned; every transition is intentional; every piece of copy has been
rewritten 30 times. Cold-confident.

## 2. Color Palette & Roles
| Token name            | Hex          | Role                                    |
| --------------------- | ------------ | --------------------------------------- |
| --surface-primary     | #08090A      | Linear's signature near-black (day-dark) |
| --surface-secondary   | #101113      | Secondary dark sections                 |
| --surface-elevated    | #1A1C1F      | Cards, panels                           |
| --surface-light       | #FFFFFF      | Light contrast sections (docs, pricing) |
| --text-primary        | #F7F8F8      | Body text on dark                       |
| --text-secondary      | #8A8F98      | Supporting copy                         |
| --text-on-light       | #08090A      | Text on light                           |
| --accent-primary      | #5E6AD2      | Signature Linear purple                 |
| --accent-hover        | #7170FF      | Hover brighter purple                   |
| --accent-gradient-a   | #A8A7FF      | Gradient stop A                         |
| --accent-gradient-b   | #5E6AD2      | Gradient stop B                         |
| --border-subtle       | #23252A      | Dividers, card borders                  |

## 3. Typography Rules
**Font families**
- Display / Headings: Inter Display — self-host (custom Linear variant)
- Body: Inter — next/font/google
- Mono: Berkeley Mono or IBM Plex Mono — for keyboard shortcuts

**Hierarchy**
| Level | Font          | Size    | Line-height | Weight | Tracking  |
| ----- | ------------- | ------- | ----------- | ------ | --------- |
| H1    | Inter Display | 56–88px | 1.05        | 560    | -0.03em   |
| H2    | Inter Display | 36–48px | 1.1         | 560    | -0.025em  |
| H3    | Inter Display | 18–22px | 1.3         | 560    | -0.01em   |
| Body  | Inter         | 15–17px | 1.55        | 400    | -0.01em   |
| Mono  | Berkeley Mono | 12–13px | 1.5         | 500    | normal    |

## 4. Component Stylings
- **Primary button**: 32px height (yes, slim — Linear's signature), 6px radius, 0/14px padding, Inter 500 14px, white-tinted fill `rgba(255,255,255,0.09)` with 1px `rgba(255,255,255,0.08)` inner border, white text. Hover brightens fill to `rgba(255,255,255,0.14)`.
- **Secondary button**: Same slim height, transparent fill, 1px border, `text-secondary` color.
- **Feature card**: #1A1C1F fill, 12px radius, 1px #23252A border, zero shadow, 24–40px padding. Hover: border brightens to `#2E3036`.
- **Keyboard shortcut chip**: Inline, 22px height, 4/8px padding, 4px radius, #23252A fill, Berkeley Mono 11px, like `⌘K` or `↵` glyph.
- **Input**: 32px height, 6px radius, `rgba(255,255,255,0.04)` fill, 1px `rgba(255,255,255,0.08)` border, focus ring 2px #5E6AD2 at 50% opacity.
- **Navigation**: 56px height, sticky, backdrop blur on scroll. Slim nav links in Inter 500 14px.

## 5. Layout Principles
- Grid: 1024px max container (deliberately narrow for reading comfort), 12 columns, 24px gutter.
- Spacing scale: 4px base (4, 8, 16, 24, 40, 64, 96, 128).
- Whitespace philosophy: disciplined. Sections are generous but never empty — each has a purpose.
- Section rhythm: hero with 3D render → product screenshots with scroll-pinned callouts → dark-and-light alternating bands → pricing → CTA. Linear famously uses section-pinned scroll to introduce features one at a time.

## 6. Depth & Elevation
Border-first with tightly tuned translucent overlays:
- L0: page (#08090A)
- L1: card (#1A1C1F + 1px #23252A)
- L2: hovered / active — border brightens + `rgba(94,106,210,0.1)` subtle glow
- L3: modal `0 16px 48px rgba(0,0,0,0.6)` + rgba(0,0,0,0.6) scrim
Shadows are almost never used on-page; Linear uses color layering and border translucency.

## 7. Do's and Don'ts
**Do**
- Use the exact Linear purple (#5E6AD2) — the brand lives on that hex.
- Keep buttons unusually slim (32px height) — it's one of Linear's signatures.
- Show keyboard shortcuts throughout (⌘K, ↵, G-then-I).
- Render the product in 3D — actual Linear app previews in dimensional space.
- Pin sections to scroll-animate feature introductions.

**Don't**
- Don't use Vercel-style Geist; Inter Display is Linear's specific voice.
- Don't make buttons 40px+; the slim height is part of the signature.
- Don't over-accent purple — keep it under 5% of viewport as the rule.
- Don't use heavy shadows; translucent borders are the depth language.
- Don't add emoji or playful decoration — Linear is unsentimental.

## 8. Responsive Behavior
- Breakpoints: 640, 768, 1024, 1280px.
- Touch targets: 40px minimum (buttons enlarge on mobile from 32 → 40).
- Mobile nav: Drawer from right, #08090A fill, stacked Inter 500 16px links, purple CTA pill at bottom.
- Content collapse: Narrow 1024px content stays narrow; 3D renders scale down but maintain aspect. Keyboard shortcut chips hide at 640px.

## 9. Agent Prompt Guide

**Build me a hero section that looks like Linear's**
> Background #08090A. Container max-width 1024px centered, 128px top
> padding. H1 in Inter Display 80px weight 560 line-height 1.05 color
> #F7F8F8 tracking -0.03em. Subhead in Inter 18px color #8A8F98
> max-width 480px. Primary CTA: slim 32px button, `rgba(255,255,255,
> 0.09)` fill, 1px `rgba(255,255,255,0.08)` inner border, 6px radius,
> Inter 500 14px white text, "Start building". Below: a keyboard
> shortcut chip "⌘K" in Berkeley Mono 12px inside a 22px-tall pill.
> Backdrop: 3D render of the Linear app UI at 60% opacity, positioned
> below the fold.

**Build me a feature card like Linear's**
> Container 1024px wide. Card: #1A1C1F fill, 12px radius, 1px #23252A
> border, 40px padding, zero shadow. Small label top-left in Berkeley
> Mono 11px uppercase tracked 0.08em color #8A8F98 "PROJECTS". H3 in
> Inter Display 22px weight 560 color #F7F8F8. Body Inter 15px color
> #8A8F98 max-width 48ch. Right side of card: a product screenshot
> with zero border, sharp crop. Hover: border brightens to #2E3036.

**Build me a purple-accented CTA band like Linear's**
> Full-width section, #08090A. 128px vertical padding. Centered H2 in
> Inter Display 48px weight 560 color #F7F8F8. Single slim button:
> gradient fill `linear-gradient(135deg, #A8A7FF, #5E6AD2)`, 32px
> height, 6px radius, Inter 500 14px white text, "Get started →".
> Subtle purple glow beneath the button: `0 8px 24px rgba(94,106,
> 210,0.25)`.
