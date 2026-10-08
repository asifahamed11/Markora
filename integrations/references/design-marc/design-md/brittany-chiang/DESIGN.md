# Brittany Chiang — DESIGN.md

**URL:** https://brittanychiang.com
**Category:** Design-Forward Portfolios
**Tagline:** Software engineer
**Last extracted:** 2026-04-24

## 1. Visual Theme & Atmosphere
The canonical developer-portfolio template. Brittany Chiang's site has
been copied (with attribution — she provides a starter template) thousands
of times because it's the cleanest, most readable, and most professional
developer-portfolio execution in the category. The mood is "resume as a
website." Dark navy canvas, signature teal-green accent (`#64FFDA`),
monospaced accent numbering, serif headings, and a strict editorial
column layout. Calm, confident, job-ready. The structure is fixed:
intro → about → experience timeline → featured projects → archive list →
contact. No surprises, no ornament, no playground — just a well-dressed
resume.

## 2. Color Palette & Roles
| Token name            | Hex          | Role                                    |
| --------------------- | ------------ | --------------------------------------- |
| --surface-primary     | #0A192F      | Signature navy canvas                   |
| --surface-secondary   | #112240      | Elevated navy (cards)                   |
| --surface-elevated    | #1D2D50      | Card hover                              |
| --text-primary        | #CCD6F6      | Light blue-gray body                    |
| --text-secondary      | #8892B0      | Muted blue-gray supporting              |
| --text-highlight      | #E6F1FF      | Brighter highlighted body               |
| --accent-primary      | #64FFDA      | Signature teal-green                    |
| --accent-glow         | #64FFDA      | Used with `rgba(100,255,218,0.1)` glow  |
| --border-subtle       | rgba(100,255,218,0.1) | Subtle teal borders          |

## 3. Typography Rules
**Font families**
- Display / Headings: Inter or Calibre — self-host
- Body: Inter — next/font/google
- Mono: SF Mono or Roboto Mono — for accent numbering, metadata

**Hierarchy**
| Level | Font         | Size    | Line-height | Weight | Tracking  |
| ----- | ------------ | ------- | ----------- | ------ | --------- |
| H1    | Inter        | 56–80px | 1.1         | 600    | -0.02em   |
| H2    | Inter        | 32–44px | 1.15        | 600    | -0.015em  |
| H3    | Inter        | 20–24px | 1.3         | 600    | -0.01em   |
| Body  | Inter        | 17–19px | 1.6         | 400    | -0.005em  |
| Mono  | SF Mono      | 13–16px | 1.5         | 400    | 0         |
| Accent # | SF Mono   | 14–20px | 1.5         | 400    | 0         |

## 4. Component Stylings
- **Primary button**: 48px height, 4px radius, 0/28px padding, SF Mono 400 14px (!), transparent fill, 1px `#64FFDA` border, `#64FFDA` text. Hover: `rgba(100,255,218,0.1)` fill fades in.
- **Section header**: H2 with monospaced numbering prefix — `01. About Me`, `02. Where I've Worked`, `03. Some Things I've Built`. The `01.` prefix is in SF Mono `#64FFDA` followed by the H2 title.
- **Project card (featured)**: side-by-side image (left) + text (right), alternating per project. Image has a `#64FFDA` tint overlay that fades on hover. Text is position:absolute in a small `#112240` card overlapping the image.
- **Archive list card**: `#112240` fill, 4px radius, 28px padding. Top row: folder icon `#64FFDA` + external-link icon. Title in Inter 20px `#CCD6F6`. Description Inter 15px `#8892B0`. Tech tags bottom: SF Mono 12px `#8892B0`. Hover: translateY(-6px).
- **Side nav (fixed)**: left edge, vertical text "brittanychiang@gmail.com" rotated 90deg with a line beneath. Right edge: social icons in vertical stack with line beneath.
- **Navigation (top)**: 100px height, transparent with backdrop blur on scroll. Nav items are numbered `01. About` `02. Experience` in SF Mono 13px.

## 5. Layout Principles
- Grid: 1000px max container, narrow reading-focused.
- Spacing scale: 8px base (8, 16, 24, 32, 48, 64, 96, 128).
- Whitespace philosophy: editorial-generous, magazine-like. Every section is a clear chapter.
- Section rhythm: fixed sequence — intro hero → about (2-col: text left, headshot right) → experience timeline (tab interface) → featured projects (alternating image/text) → archive list (card grid) → contact (centered CTA).

## 6. Depth & Elevation
Translucent teal depth:
- L0: page (`#0A192F`)
- L1: card (`#112240`)
- L2: hovered — translateY(-6px) + `0 20px 30px rgba(0,0,0,0.5)` shadow
- L3: modal (rare in portfolio) — heavy navy overlay + elevated card
Teal overlays on project images at 15-30% opacity, fading on hover.

## 7. Do's and Don'ts
**Do**
- Use the exact teal `#64FFDA` — it's the entire brand.
- Prefix every H2 with `01.`, `02.` mono numbering — it's the editorial signature.
- Use SF Mono for ALL accent numbering, buttons, metadata — not just code.
- Keep the structure rigid: intro → about → experience → projects → archive → contact.
- Include the vertical side-nav (email on left, socials on right) with the bottom-anchored line.

**Don't**
- Don't introduce new accent colors — teal is the singular brand hex.
- Don't break the section ordering; it's a resume structure.
- Don't use decorative illustrations or playful elements; Brittany's portfolio is sober.
- Don't use serif body; sans Inter is the reading voice.
- Don't shout with CTAs; all buttons are subtle transparent-with-teal-border.

## 8. Responsive Behavior
- Breakpoints: 480, 768, 1080px.
- Touch targets: 48px minimum.
- Mobile nav: sheet from right, `#112240` fill, stacked SF Mono+Inter nav items with numbering preserved, teal CTA pill.
- Content collapse: 2-col about + project rows stack to single column; side-nav hides below 1080px; archive grid collapses 3→2→1.

## 9. Agent Prompt Guide

> These prompts pivot from SaaS patterns to PORTFOLIO-native sections:
> about block, experience timeline, featured-project row, archive grid.

**Build me a developer-portfolio about section in Brittany's style**
> Background `#0A192F`. Container max-width 1000px. H2 section
> header: SF Mono 20px `#64FFDA` "01." followed by Inter 32px weight
> 600 `#CCD6F6` "About Me", with a long horizontal line in `#233554`
> extending from the title to the right edge. 2-col split (60/40):
> left 3 paragraphs of Inter 17px `#8892B0` body copy, technical
> keywords wrapped in `<a>` with `#64FFDA` color + dotted underline
> hover. Right: headshot photo with teal `rgba(100,255,218,0.15)`
> tint overlay, 4px radius, fading on hover.

**Build me a featured-project row**
> Full-width alternating row — odd row image-left/text-right, even
> row flipped. Image 60% width, 4px radius, with teal tint overlay
> `rgba(100,255,218,0.3)` that fades on hover. Text side (40%):
> small SF Mono 13px `#64FFDA` "Featured Project". H3 Inter 28px
> weight 600 `#CCD6F6`. Description card — `#112240` fill, 4px
> radius, 28px padding, positioned overlapping the image by 40px;
> Inter 17px `#8892B0` body 4–5 lines. Tech stack row below: SF
> Mono 13px `#8892B0`. Icon row bottom: GitHub + external-link
> icons `#CCD6F6`, hover teal.

**Build me an archive list card grid**
> Background `#0A192F`. H2 with SF Mono "04." numbering + Inter 32px
> `#CCD6F6` "Other Noteworthy Projects". 3-col grid at 1080px, 16px
> gutter. Each card: `#112240` fill, 4px radius, 28px padding, 300px
> tall. Top row: folder icon (SVG) `#64FFDA` + external-link icon.
> Title Inter 20px `#CCD6F6`. Description Inter 15px `#8892B0` 3
> lines. Tech stack bottom: SF Mono 12px `#8892B0` — "React · Node
> · MongoDB". Hover: translateY(-6px) + shadow.
