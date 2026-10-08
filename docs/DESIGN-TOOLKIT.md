# Design toolkit

The toolkit combines design instructions with local verification. Those are separate jobs: guidance helps the model decide what to make; checks inspect what it actually made.

## Guidance

The pinned integration pack includes Anthropic frontend-design and webapp-testing skills and Vercel React best practices. Markora selects relevant excerpts and rules within a bounded request budget. The same assembly step applies to ChatGPT accounts, Google accounts and OpenRouter. User instructions and application constraints take priority.

Original local presets provide palette/type roles, composition patterns, motion preferences and review prompts. A root `DESIGN.md` in the workspace supplies additional bounded design context. Design-system references help organize these choices; the app does not clone company websites.

## Components

New React websites normally receive small local adaptations of shadcn/ui Button, ReUI Button and Magic UI BlurFade. Explicit custom styling or no-animation requests take priority. Native JSX/CSS avoids extra runtime downloads and retains source notices. See [component defaults](COMPONENT-DEFAULTS.md).

React Bits and Animate UI are not bundled. Marketplace and inspiration sites remain references; listing a link is not proof that a library is installed or that a component has a suitable license.

## Verification

Settings, Toolkit controls design, React and testing guidance and after-change source checks. The app records references attached to the latest eligible AI request. Local color/size shortcuts can skip model calls, so they do not claim that guidance was used.

Project checkup runs local structure/syntax checks. Check live page uses Playwright MCP and axe-core in an isolated Chrome/Edge session at desktop and mobile sizes. New React build completion can include a browser inspection and a final refinement; check results cover only what was inspected. They do not guarantee an exceptional design or every interaction.

Source revisions mark older browser reports stale. A mapped finding can become a pen-edit target. AI repair differences remain reviewable and reversible through history.

Pinned commits, resource hashes and licenses are in [the integration manifest](../integrations/manifest.json) and [third-party notices](../THIRD_PARTY_NOTICES.md). Run `npm run verify:integrations` to verify the shipped pack.
