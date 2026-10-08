# Markora open-source toolkit

These integrations ship inside the desktop app. Skills are available to the next eligible Markora build/edit request. They are not installed into the user's Codex, Claude or global editor configuration.

| Component | Upstream | License | Actual integration |
| --- | --- | --- | --- |
| Frontend design | [Anthropic skills](https://github.com/anthropics/skills/tree/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/frontend-design) | Apache-2.0 | Design guidance in website planning/building and visual React edits. |
| Webapp testing | [Anthropic skills](https://github.com/anthropics/skills/tree/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/webapp-testing) | Apache-2.0 | Testing/repair guidance for eligible AI requests; bundled Python helpers are reference assets, not executed by Markora. |
| React best practices | [Vercel agent skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices) | MIT | Priority overview plus relevant rules for React requests; full rule library remains bundled. |
| Playwright MCP 0.0.83 | [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | A real MCP client/server handshake and `browser_snapshot` call on the local preview. |
| MCP SDK 1.32.1 | [Official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | In-memory MCP transport; no public MCP port or arbitrary server configuration. |
| axe-core 4.13.0 | [Deque axe-core](https://github.com/dequelabs/axe-core) | MPL-2.0 | Automated WCAG A/AA checks at desktop and mobile sizes. Unmodified package and license notices retained. |

Skills are pinned to the listed Git commit. `manifest.json` records each downloaded file's SHA-256 and exact npm package versions. `npm run verify:integrations` checks the installation. `package-lock.json` pins the package graph. Updating the reviewed manifest is a deliberate maintenance operation, not an automatic fetch from `main`.

Skill Apache licenses are inside their respective skill folders. Package notices and the Vercel skill MIT terms are in `licenses/`. Vercel declares MIT in its skill frontmatter; that declaration and author metadata are retained. The vendored skill files are unmodified. Markora's adapters select excerpts and add application constraints without editing upstream files. Free licenses do not mean free model inference.

## Use

1. Settings → Toolkit: independently enable design, React, testing guidance and after-change source checks. Click Save changes.
2. Build or edit normally. Applicable skills are loaded automatically; local color/size shortcuts still bypass AI entirely.
3. Project checkup → Check live page: run a fresh isolated Chrome/Edge check. Browser tools require Chrome or Edge installed, but no extra account or API key.
4. A source-mapped finding offers Select for voice fix. It selects the precise mapped element and attaches the reported finding to the next edit request. Speak or type the desired change, then undo if needed.
5. Save report exports the local evidence as JSON. A newer/branched revision marks earlier browser evidence stale.

## Hooks, harness and extensions

`core/skill-pack.js` is the before-model hook. `core/toolkit-hooks.js` performs a real static source check after a completed build or edit. `core/browser-harness.js` combines the upstream MCP snapshot with axe, overflow and initial runtime checks. `ui/toolkit.js` supplies the extension controls and finding-to-selection workflow. These lifecycle adapters are Markora code using the upstream tools; they are not downloaded generic shell-hook frameworks.

The adapter does not expose arbitrary MCP tool calls to the model. It creates a temporary browser context with no saved logins, restricts requests to the current preview origin, blocks non-GET/HEAD requests, and never clicks or submits anything. Project frontend JavaScript still executes during rendering. This is not an OS sandbox, security audit or complete behavioral test. Backends, external CDNs/fonts and authenticated pages may need separate tests. Downloads, arbitrary shell hooks, user cookies, browser extensions, remote documentation services and deployment plugins are not enabled by this pack.

Browser checks run only on demand, keeping everyday pen edits quick. Desktop is 1440×1000; mobile is 390×844. axe's incomplete checks are shown as needing manual review. Repeated React instances share component source. Findings on unmapped library elements remain readable but do not pretend to have a safe source edit target.

Adding a new extension requires reviewed source/license, pinned package/ref, integrity entries, a constrained app adapter and focused integration tests. Dropping an arbitrary skill/server into the workspace does not execute it.

## Design reference pack

Version 0.11 adds eight original presets and eighteen section layouts, plus selected MIT design documents and component examples. `core/design-context.js` routes bounded guidance into the shared skill layer for every retained provider. Root DESIGN.md files supply visual data; selected edits retain their source scope. Third-party sources remain unmodified and SHA-256-verified. See [reviewed sources and exclusions](../docs/DESIGN-TOOLKIT.md).

React Bits and Animate UI include Commons Clause conditions in the reviewed versions, so their source is not redistributed here. Atris has no verified repository license and the supplied Frontend design HTML source could not be resolved. Inspiration sites and marketplace entries are links only. No paid MCP or automatic scraper is enabled.
