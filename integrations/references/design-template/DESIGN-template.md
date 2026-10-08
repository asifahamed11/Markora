# DESIGN.md — Agent-Ready Brand System Template
<!-- 
  TEMPLATE VERSION: 1.0
  BUILT BY: flohcreative.com
  SOURCE: Derived from a production site stylesheet — not a demo.
  
  HOW TO USE THIS TEMPLATE:
  1. Replace every {{ PLACEHOLDER }} with your actual brand values
  2. Read the inline comments (like this one) for guidance on each section
  3. Remove all comments before giving this file to an AI coding agent
  4. Save as DESIGN.md in the root of your project repo
  
  WHAT THIS FILE COVERS (~30-40% of a complete page build):
  ✅ Brand colors, typography, spacing tokens
  ✅ Component styles (buttons, cards, forms, nav, badges)
  ✅ Layout principles and responsive breakpoints
  ✅ Agent prompt guide for consistent AI output
  
  WHAT THIS FILE DOES NOT COVER:
  ❌ Header and footer (server-rendered by your CMS — WordPress, Elementor, etc.)
  ❌ Responsive behavior testing (agent interprets, cannot test output)
  ❌ Image sizing, cropping, and focal point instructions
  ❌ CMS integration (WooCommerce, ACF, WPBakery shortcodes)
  
  BEST USE CASES:
  - Greenfield static HTML/CSS pages
  - AI-assisted landing page drafts (developer finalizes)
  - QR code product landing pages on a clean builder (Elementor/Hello Theme)
  - Developer CSS token reference alongside Figma layouts
  - Claude Code prompt anchor for consistent brand copy and page structure
  
  NOT RECOMMENDED FOR:
  - Replacing a developer on complex CMS builds
  - Generating pages to publish directly without human QA
  - Replicating existing WordPress/Salient/WPBakery site architecture
-->

---

## 1. Visual Theme & Atmosphere
<!--
  Describe the brand's visual personality in 2-3 paragraphs.
  Think: mood, audience, industry, tone, and what makes this brand visually distinct.
  This is the agent's "north star" — it reads this first before touching any token.
  
  REPLACE the block below with your brand's actual atmosphere description.
-->

{{ BRAND_NAME }} presents a {{ BRAND_TONE }} experience with a {{ VISUAL_STYLE }} aesthetic that conveys {{ BRAND_IMPRESSION }}. The design balances {{ BACKGROUND_TREATMENT }} with {{ INTERFACE_STYLE }} elements. The palette emphasizes {{ COLOR_ENERGY }} through {{ ACCENT_DESCRIPTION }} against {{ BACKGROUND_DESCRIPTION }}, creating {{ HIERARCHY_DESCRIPTION }}.

**Key Characteristics**
<!--
  List 6-8 defining visual characteristics of the brand.
  Be specific — "dark moody backgrounds" is better than "modern design".
-->
- {{ KEY_CHARACTERISTIC_1 }}
- {{ KEY_CHARACTERISTIC_2 }}
- {{ KEY_CHARACTERISTIC_3 }}
- {{ KEY_CHARACTERISTIC_4 }}
- {{ KEY_CHARACTERISTIC_5 }}
- {{ KEY_CHARACTERISTIC_6 }}

---

## 2. Color Palette & Roles
<!--
  Pull exact hex values from your live stylesheet or Figma file.
  Include usage frequency if known (e.g., "204 uses in production CSS").
  Every color needs a semantic role — never list a color without explaining when to use it.
-->

### Primary
- **{{ PRIMARY_COLOR_NAME }}** (`{{ PRIMARY_HEX }}`): {{ PRIMARY_ROLE_DESCRIPTION }}
- **{{ PRIMARY_HOVER_NAME }}** (`{{ PRIMARY_HOVER_HEX }}`): {{ PRIMARY_HOVER_ROLE }}

### Accent Colors
- **{{ ACCENT_1_NAME }}** (`{{ ACCENT_1_HEX }}`): {{ ACCENT_1_ROLE }}
- **{{ ACCENT_2_NAME }}** (`{{ ACCENT_2_HEX }}`): {{ ACCENT_2_ROLE }}

### Interactive / Semantic
<!--
  These are typically consistent across brands. Adjust hex values to match yours.
  Do not remove these — agents need explicit success/error/warning references.
-->
- **Interactive Blue** (`{{ INTERACTIVE_BLUE_HEX }}`): Tertiary interactive state for links and focus indicators
- **Success Green** (`{{ SUCCESS_HEX }}`): Positive confirmations and success feedback
- **Error Red** (`{{ ERROR_HEX }}`): Primary error states and destructive actions
- **Warning Yellow** (`{{ WARNING_HEX }}`): Warning alerts and caution states

### Neutral Scale
<!--
  Pull these directly from your stylesheet. Include usage counts if available.
  Order from darkest to lightest.
-->
- **{{ NEUTRAL_1_NAME }}** (`{{ NEUTRAL_1_HEX }}`): {{ NEUTRAL_1_ROLE }}
- **{{ NEUTRAL_2_NAME }}** (`{{ NEUTRAL_2_HEX }}`): {{ NEUTRAL_2_ROLE }}
- **{{ NEUTRAL_3_NAME }}** (`{{ NEUTRAL_3_HEX }}`): {{ NEUTRAL_3_ROLE }}
- **{{ NEUTRAL_4_NAME }}** (`{{ NEUTRAL_4_HEX }}`): {{ NEUTRAL_4_ROLE }}
- **{{ NEUTRAL_5_NAME }}** (`{{ NEUTRAL_5_HEX }}`): {{ NEUTRAL_5_ROLE }}

### Surface & Borders
- **Card Background** (`{{ CARD_BG_HEX }}`): Primary card and modal backgrounds
- **Container Dark** (`{{ CONTAINER_DARK_HEX }}`): Elevated dark containers and secondary surfaces
- **Border** (`{{ BORDER_HEX }}`): Input borders and dividers

---

## 3. Typography Rules

### Font Families
<!--
  Specify the exact Google Fonts or Fontshare font names used in production.
  Include the full CSS font-family stack with fallbacks.
-->

**Primary Font:** {{ PRIMARY_FONT_NAME }} ({{ FONT_SOURCE }})
```
font-family: '{{ PRIMARY_FONT_NAME }}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Secondary Font:** {{ SECONDARY_FONT_NAME }}
```
font-family: {{ SECONDARY_FONT_STACK }};
```

### Hierarchy
<!--
  Map every semantic text role to its exact CSS values.
  Pull from your live stylesheet — do not estimate.
-->

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / Hero | {{ PRIMARY_FONT_NAME }} | {{ HERO_SIZE }} | {{ HERO_WEIGHT }} | {{ HERO_LINE_HEIGHT }} | {{ HERO_SPACING }} | {{ HERO_NOTES }} |
| Heading 1 | {{ PRIMARY_FONT_NAME }} | {{ H1_SIZE }} | {{ H1_WEIGHT }} | {{ H1_LINE_HEIGHT }} | 0px | {{ H1_NOTES }} |
| Heading 2 | {{ PRIMARY_FONT_NAME }} | {{ H2_SIZE }} | {{ H2_WEIGHT }} | {{ H2_LINE_HEIGHT }} | {{ H2_SPACING }} | {{ H2_NOTES }} |
| Heading 3 | {{ SECONDARY_FONT_NAME }} | {{ H3_SIZE }} | {{ H3_WEIGHT }} | {{ H3_LINE_HEIGHT }} | 0px | {{ H3_NOTES }} |
| Body / Paragraph | {{ PRIMARY_FONT_NAME }} | {{ BODY_SIZE }} | {{ BODY_WEIGHT }} | {{ BODY_LINE_HEIGHT }} | 0px | Primary body text |
| Body Small | {{ PRIMARY_FONT_NAME }} | {{ BODY_SM_SIZE }} | {{ BODY_SM_WEIGHT }} | {{ BODY_SM_LINE_HEIGHT }} | 0px | Secondary body text |
| Button Text | {{ PRIMARY_FONT_NAME }} | {{ BTN_SIZE }} | {{ BTN_WEIGHT }} | {{ BTN_LINE_HEIGHT }} | 0px | CTA button copy |
| Label / Caption | {{ PRIMARY_FONT_NAME }} | {{ LABEL_SIZE }} | {{ LABEL_WEIGHT }} | {{ LABEL_LINE_HEIGHT }} | {{ LABEL_SPACING }} | Form labels |
| Link | {{ SECONDARY_FONT_NAME }} | {{ LINK_SIZE }} | {{ LINK_WEIGHT }} | {{ LINK_LINE_HEIGHT }} | 0px | Inline links |
| Badge / Tag | {{ SECONDARY_FONT_NAME }} | {{ BADGE_SIZE }} | {{ BADGE_WEIGHT }} | {{ BADGE_LINE_HEIGHT }} | 0.5px | Small tags |

### Principles
<!--
  3-5 rules that describe how typography is used in this brand specifically.
  Include WCAG requirements — agents need explicit accessibility instructions.
-->
- {{ TYPOGRAPHY_PRINCIPLE_1 }}
- {{ TYPOGRAPHY_PRINCIPLE_2 }}
- {{ TYPOGRAPHY_PRINCIPLE_3 }}
- All text must meet WCAG AA contrast ratios (4.5:1 minimum for normal text, 3:1 for large text)

---

## 4. Component Stylings

### Buttons

#### Primary Button (CTA)
<!--
  Pull every value directly from your production CSS.
  Do not round or estimate — agents use these values exactly.
-->
```css
background-color: {{ PRIMARY_HEX }};
color: #FFFFFF;
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ BTN_SIZE }};
font-weight: {{ BTN_WEIGHT }};
padding: {{ BTN_PADDING }};
border-radius: {{ BTN_RADIUS }};
border: none;
line-height: {{ BTN_LINE_HEIGHT }};
min-height: 40px;
cursor: pointer;
text-transform: uppercase;
letter-spacing: 0.5px;
```

**Hover State:**
```css
background-color: {{ PRIMARY_HOVER_HEX }};
```

**Active State:**
```css
background-color: {{ PRIMARY_ACTIVE_HEX }};
box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
```

**Disabled State:**
```css
background-color: {{ DISABLED_BG_HEX }};
color: {{ DISABLED_TEXT_HEX }};
cursor: not-allowed;
opacity: 0.6;
```

#### Secondary Button
```css
background-color: transparent;
color: {{ NEUTRAL_1_HEX }};
font-family: {{ SECONDARY_FONT_STACK }};
font-size: {{ BTN_SECONDARY_SIZE }};
font-weight: {{ BTN_SECONDARY_WEIGHT }};
padding: {{ BTN_SECONDARY_PADDING }};
border-radius: {{ BTN_SECONDARY_RADIUS }};
border: 1px solid {{ NEUTRAL_1_HEX }};
min-height: 40px;
```

**Hover State:**
```css
background-color: rgba({{ NEUTRAL_1_RGB }}, 0.05);
border-color: {{ NEUTRAL_1_DARKER_HEX }};
```

#### Ghost Button
```css
background-color: transparent;
color: {{ PRIMARY_HEX }};
font-family: {{ SECONDARY_FONT_STACK }};
font-size: {{ BTN_GHOST_SIZE }};
font-weight: {{ BTN_GHOST_WEIGHT }};
padding: 0px;
border: none;
text-decoration: underline;
```

**Hover State:**
```css
color: {{ PRIMARY_HOVER_HEX }};
text-decoration: none;
```

### Cards & Containers

#### Standard Card
```css
background-color: {{ CARD_BG_HEX }};
border-radius: {{ CARD_RADIUS }};
padding: {{ CARD_PADDING }};
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
border: 1px solid {{ BORDER_HEX }};
```

#### Dark Card
```css
background-color: {{ CONTAINER_DARK_HEX }};
border-radius: {{ CARD_RADIUS }};
padding: {{ CARD_PADDING }};
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
border: none;
color: #FFFFFF;
```

#### Modal Container
```css
background-color: {{ CARD_BG_HEX }};
border-radius: {{ CARD_RADIUS }};
padding: {{ MODAL_PADDING }};
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
max-width: {{ MODAL_MAX_WIDTH }};
position: fixed;
```

### Inputs & Forms

#### Text Input
```css
background-color: {{ INPUT_BG_HEX }};
color: {{ INPUT_TEXT_HEX }};
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ LABEL_SIZE }};
font-weight: {{ LABEL_WEIGHT }};
padding: {{ INPUT_PADDING }};
border-radius: {{ INPUT_RADIUS }};
border: 1px solid {{ BORDER_HEX }};
min-height: 40px;
width: 100%;
transition: border-color 0.2s, box-shadow 0.2s;
```

**Focus State:**
```css
border-color: {{ PRIMARY_HEX }};
box-shadow: 0 0 0 3px rgba({{ PRIMARY_RGB }}, 0.1);
outline: none;
```

**Error State:**
```css
border-color: {{ ERROR_HEX }};
background-color: rgba({{ ERROR_RGB }}, 0.05);
```

#### Form Label
```css
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ LABEL_SIZE }};
font-weight: {{ LABEL_WEIGHT }};
color: {{ NEUTRAL_1_HEX }};
margin-bottom: 8px;
display: block;
```

### Navigation

#### Nav Link (Header)
```css
font-family: {{ SECONDARY_FONT_STACK }};
font-size: {{ LINK_SIZE }};
font-weight: {{ LINK_WEIGHT }};
color: {{ NEUTRAL_1_HEX }};
padding: 8px 16px;
text-decoration: none;
```

**Hover:**
```css
color: {{ PRIMARY_HEX }};
```

**Active:**
```css
color: {{ PRIMARY_HEX }};
border-bottom: 2px solid {{ PRIMARY_HEX }};
```

#### Footer Link
```css
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ BADGE_SIZE }};
font-weight: {{ LABEL_WEIGHT }};
color: #FFFFFF;
text-decoration: none;
```

**Hover:**
```css
color: {{ PRIMARY_HOVER_HEX }};
text-decoration: underline;
```

### Badges & Tags

#### Badge (Primary)
```css
background-color: {{ PRIMARY_HEX }};
color: #FFFFFF;
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ BADGE_SIZE }};
font-weight: 700;
padding: 4px 12px;
border-radius: {{ INPUT_RADIUS }};
display: inline-block;
letter-spacing: 0.5px;
```

#### Badge (Secondary)
```css
background-color: {{ ACCENT_2_HEX }};
color: #FFFFFF;
font-family: '{{ PRIMARY_FONT_NAME }}';
font-size: {{ BADGE_SIZE }};
font-weight: 700;
padding: 4px 12px;
border-radius: {{ INPUT_RADIUS }};
```

---

## 5. Layout Principles

### Spacing System
<!--
  Base unit should always be 4px.
  List every spacing value used in production with its use context.
-->

**Base Unit:** `4px`

**Scale:**
- `4px`: Micro spacing, icon margins
- `8px`: Tight spacing, input internal padding
- `12px`: Small margin, label spacing
- `16px`: Standard margin/padding, component spacing
- `20px`: Gap between items, list spacing
- `24px`: Component padding, generous internal spacing
- `32px`: Card padding, section spacing
- `40px`: Large component padding, major sections
- `44px`: Minimum touch target (accessibility requirement)
- `{{ CUSTOM_SPACING_1 }}`: {{ CUSTOM_SPACING_1_CONTEXT }}
- `{{ CUSTOM_SPACING_2 }}`: {{ CUSTOM_SPACING_2_CONTEXT }}

### Grid & Container

- **Max Width:** `{{ CONTENT_MAX_WIDTH }}` for primary content areas
- **Container Padding:** `{{ DESKTOP_CONTAINER_PADDING }}` desktop / `{{ TABLET_CONTAINER_PADDING }}` tablet / `{{ MOBILE_CONTAINER_PADDING }}` mobile
- **Column Strategy:** 12-column grid
  - Cards: {{ CARD_COLUMNS_DESKTOP }} desktop / {{ CARD_COLUMNS_TABLET }} tablet / 1 mobile
  - Modals: Centered, max-width `{{ MODAL_MAX_WIDTH }}`
  - Full-width sections: Edge-to-edge with internal padding

### Whitespace Philosophy
<!--
  Describe in 3-4 sentences how this brand uses whitespace.
  This shapes every layout decision the agent makes.
-->
{{ WHITESPACE_PHILOSOPHY }}

### Border Radius Scale
<!--
  List every border-radius value used in the system with its context.
  Do not add values that don't exist in production — agents will use them.
-->
- `{{ RADIUS_1 }}`: {{ RADIUS_1_CONTEXT }}
- `{{ RADIUS_2 }}`: {{ RADIUS_2_CONTEXT }}
- `{{ RADIUS_3 }}`: {{ RADIUS_3_CONTEXT }}
- `{{ RADIUS_4 }}`: {{ RADIUS_4_CONTEXT }}
- `50%`: Avatar images, circular elements

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (0) | No shadow | Flat text, disabled states, background |
| Level 1 | `0 2px 8px rgba(0, 0, 0, 0.1)` | Standard cards, hover states |
| Level 2 | `0 4px 16px rgba(0, 0, 0, 0.15)` | Floating cards, dropdowns |
| Level 3 | `0 8px 24px rgba(0, 0, 0, 0.2)` | Large modals, major overlays |
| Level 4 | `0 10px 40px rgba(0, 0, 0, 0.3)` | Modal dialogs, maximum emphasis |
| Inset | `inset 0 2px 4px rgba(0, 0, 0, 0.2)` | Pressed button states |

**Shadow Philosophy:** {{ SHADOW_PHILOSOPHY }}

---

## 7. Do's and Don'ts
<!--
  These rules are read directly by the agent as hard constraints.
  Be specific — vague rules get ignored.
  Include any industry-specific compliance requirements here (legal, medical, cannabis, finance, etc.)
-->

### Do
- **Use `{{ PRIMARY_HEX }}` for all primary CTAs** — it is the most recognizable brand element
- **Maintain at least `16px` padding inside all interactive elements** for touch targeting
- **Apply `{{ PRIMARY_FONT_NAME }}` exclusively to headings, buttons, and form labels**
- **Use success (`{{ SUCCESS_HEX }}`), error (`{{ ERROR_HEX }}`), and warning (`{{ WARNING_HEX }}`) colors only for their semantic role**
- **Implement minimum `20px` gaps between logical content blocks**
- **{{ INDUSTRY_COMPLIANCE_DO_1 }}**
- **{{ INDUSTRY_COMPLIANCE_DO_2 }}**
- **{{ BRAND_SPECIFIC_DO_1 }}**
- **{{ BRAND_SPECIFIC_DO_2 }}**

### Don't
- **Never use `{{ PRIMARY_FONT_NAME }}` and system fonts on the same line of text**
- **Don't apply colored borders to primary buttons** — solid fill only
- **Never set padding below `12px` on form labels or `8px` on inputs**
- **Avoid disabled states that fall below 4.5:1 WCAG AA contrast ratio**
- **Never use box shadows larger than Level 4 outside modals**
- **{{ INDUSTRY_COMPLIANCE_DONT_1 }}**
- **{{ INDUSTRY_COMPLIANCE_DONT_2 }}**
- **{{ BRAND_SPECIFIC_DONT_1 }}**
- **{{ BRAND_SPECIFIC_DONT_2 }}**

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Name | Width | Key Changes |
|------------|------|-------|-------------|
| Mobile | sm | 320px–479px | Single column, full-width cards, `{{ MOBILE_CONTAINER_PADDING }}` padding |
| Mobile Large | md | 480px–767px | Single column, `{{ TABLET_SM_CONTAINER_PADDING }}` padding |
| Tablet | lg | 768px–1023px | 2-column grid, max-width `{{ TABLET_MAX_WIDTH }}`, `{{ TABLET_CONTAINER_PADDING }}` padding |
| Desktop | xl | 1024px–1279px | 3-column grid, max-width `{{ DESKTOP_SM_MAX_WIDTH }}`, `{{ DESKTOP_CONTAINER_PADDING }}` padding |
| Desktop Large | 2xl | 1280px+ | 4-column grid, max-width `{{ CONTENT_MAX_WIDTH }}`, `{{ DESKTOP_CONTAINER_PADDING }}` padding |

### Touch Targets
- **Minimum interactive element:** `44px × 44px` (including padding)
- **Button height:** Minimum `40px` on all breakpoints
- **Input height:** Minimum `40px` on all breakpoints
- **Spacing between touch targets:** Minimum `8px`

### Collapsing Strategy
<!--
  Describe how each major section type collapses from desktop to mobile.
  Be explicit — agents cannot guess your intent.
-->
- **Hero section:** {{ HERO_COLLAPSE_BEHAVIOR }}
- **Card grids:** {{ GRID_COLLAPSE_BEHAVIOR }}
- **Navigation:** {{ NAV_COLLAPSE_BEHAVIOR }}
- **Modals:** {{ MODAL_COLLAPSE_BEHAVIOR }}
- **Typography:** {{ TYPOGRAPHY_COLLAPSE_BEHAVIOR }}

---

## 9. Agent Prompt Guide
<!--
  This section is a quick-reference cheat sheet for the AI agent.
  Write it as direct instructions — imperative voice, no ambiguity.
  The agent reads this section last, as a rules summary before generating output.
-->

### Quick Color Reference

- **Primary CTA:** `{{ PRIMARY_HEX }}` — use for all action buttons
- **Secondary CTA:** Transparent with `{{ NEUTRAL_1_HEX }}` text and border
- **Background:** `{{ CARD_BG_HEX }}` for content / `{{ DARK_BG_HEX }}` for hero and footer
- **Heading Text:** `{{ NEUTRAL_1_HEX }}` on light / `#FFFFFF` on dark
- **Body Text:** `{{ NEUTRAL_1_HEX }}` at `{{ BODY_SIZE }}` weight `{{ BODY_WEIGHT }}`
- **Link Text:** `{{ PRIMARY_HEX }}` default / `#FFFFFF` on dark backgrounds
- **Success:** `{{ SUCCESS_HEX }}` — confirmations only
- **Error:** `{{ ERROR_HEX }}` — failures only
- **Warning:** `{{ WARNING_HEX }}` — cautions only
- **Form Input:** `{{ INPUT_BG_HEX }}` background / `{{ BORDER_HEX }}` border / `{{ PRIMARY_HEX }}` focus ring

### Iteration Rules

1. **All CTAs are full-width on mobile ≤767px; constrain to `{{ CTA_MAX_WIDTH_DESKTOP }}` on desktop** — maintain `44px` minimum touch target height.

2. **Primary buttons must always be `{{ PRIMARY_HEX }}` with white text, `{{ BTN_SIZE }}` `{{ PRIMARY_FONT_NAME }}` weight `{{ BTN_WEIGHT }}`, `{{ BTN_PADDING }}` padding, `{{ BTN_RADIUS }}` border-radius — hover darkens to `{{ PRIMARY_HOVER_HEX }}`.**

3. **Every form field requires a visible label above in `{{ LABEL_SIZE }}` `{{ PRIMARY_FONT_NAME }}` weight `{{ LABEL_WEIGHT }}` `{{ NEUTRAL_1_HEX }}`, `8px` margin below label — focus state adds `3px` `{{ PRIMARY_HEX }}` border + 0.1 opacity box-shadow.**

4. **Modals: centered, max `{{ MODAL_MAX_WIDTH }}` width, `{{ CARD_BG_HEX }}` background, `{{ CARD_RADIUS }}` border-radius, `{{ MODAL_PADDING }}` padding desktop / `20px` mobile — dark overlay `rgba(0, 0, 0, 0.5)` behind.**

5. **Typography: use `{{ PRIMARY_FONT_NAME }}` for all headings, buttons, and form labels; use system UI stack for body text and links — never mix on same line.**

6. **Spacing: `16px` standard between components, `20px` gaps in grids, `32px` padding inside cards, `40px`+ for major sections — never below `12px` except icon gaps.**

7. **All interactive elements require visible hover, focus, and active states — buttons darken; links change to `{{ PRIMARY_HEX }}`; inputs show `{{ PRIMARY_HEX }}` border + glow on focus; disabled states reduce opacity to 0.6.**

8. **{{ INDUSTRY_AGENT_RULE_1 }}**

9. **{{ INDUSTRY_AGENT_RULE_2 }}**

10. **{{ BRAND_SPECIFIC_AGENT_RULE }}**

