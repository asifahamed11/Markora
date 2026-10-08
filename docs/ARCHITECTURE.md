# Architecture

Markora has three local surfaces: a floating companion, a project studio and the website preview. The companion and studio share a restricted preload API. Electron's main process owns settings, project access, voice jobs and AI requests.

## Runtime layout

| Directory | Responsibility |
| --- | --- |
| `electron/` | App lifecycle, preload bridges, encrypted key vault and Explorer integration |
| `ui/` | Companion, Settings, studio, microphone capture and progress feedback |
| `core/` | Parsing, account/API transport, planning, project engines, patch validation and history |
| `preview/` | Browser pen overlay, stroke geometry, text ranges and selection-to-source mapping |
| `integrations/` | Pinned skill/reference files, source hashes and retained licenses |
| `knowledge/` | Original rules, component recipes, local controls and licensed fonts |
| `scripts/` | Development launcher, Windows installer hooks and resource verification |

Vite builds `ui/` into `ui/dist/`. Electron loads those local pages. Each website preview has a local server with a project-specific capability; exports omit the editor overlay.

## Creation and editing

The workspace scanner separates input documents from generated source. Text/PDF/DOCX parsing is local. Image inputs can use the selected model's image support or local OCR. New website requests normally use the React engine, while explicit static requests and existing saved HTML projects use the static engine. Existing React/Vite projects have a separate source-editing adapter. General projects use bounded file patches.

The AI returns structured plans and changes. The app validates schemas, relative paths and exact expected source. Stale edits, untracked collisions and unsafe paths stop a write. Saved revisions support undo/redo and restart recovery. These checks do not provide an OS sandbox or guarantee the correctness of generated code.

The pen records a point, stroke or enclosed region. Text selection uses DOM ranges and grapheme boundaries; element selection resolves a supported DOM node. The preview attaches source location, relevant markup and layout details to the request. Existing JSX/TSX mapping uses an injected transform and leaves the original source unchanged until an approved patch is applied.

## Local data and model access

The public application name is Markora. Legacy storage identifiers remain stable so existing installations keep credentials, model downloads and saved project history. Windows app data lives under `%APPDATA%\easy-web-ai`; project history uses `.easy-web-ai/` inside the chosen folder. Neither belongs in Git.

OpenRouter keys use Electron `safeStorage`. ChatGPT and Google accounts use their official provider tools with isolated app profiles. Login status and successful model inference are tracked separately. Browser authentication cannot activate an account that has failed its model test.

Relevant instructions, extracted content and source context leave the PC when sent to the selected AI service. Voice decoding, parsing, local files and preview remain on the PC. Downloads and cloud inference require internet access.

## Checks

After-change hooks perform local source checks. The browser harness opens an isolated Chrome/Edge session, establishes a real Playwright MCP connection, takes a page snapshot and runs axe-core at desktop/mobile sizes. It restricts requests to the current preview origin and blocks non-GET/HEAD traffic. Page JavaScript still executes; this is an inspection harness, not a system sandbox.

Guidance can improve a request, but attaching it does not establish design quality. The app records guidance and browser-check evidence separately. Findings and design reviews are limited to the content inspected.
