# Markora

I wanted to fix a page without taking a screenshot and explaining which bit I meant every time. Markora lets you point at that bit and say what you want to change.

It's a small desktop companion for Windows. Click the pet to open its tools, or drag it somewhere out of the way. You can build a website from your documents, work on an existing project, and undo changes when the result isn't right.

<img src="docs/screenshots/studio.png" alt="The Markora workspace" width="1000">

## Download

Get [Markora for Windows](https://github.com/asifahamed11/Markora/releases/download/v0.14.4/Markora-Setup-0.14.4.exe). If you prefer to skip installation, use the [portable version](https://github.com/asifahamed11/Markora/releases/download/v0.14.4/Markora-Portable-0.14.4.exe).

The installer adds **Open with Markora** to the folder right-click menu. You can also open a folder from the pet. Both versions include the app runtime, so you don't need Node.js just to use the app.

## Getting started

1. Open Settings and connect ChatGPT, Google or OpenRouter. ChatGPT uses the official [Codex tool](https://developers.openai.com/codex/cli/); Google uses the [Antigravity CLI](https://www.antigravity.google/docs/cli/install/). OpenRouter takes an API key. For an account connection, click **Test model & use this account** before saving.
2. Choose a folder. It can be empty, contain your documents, or already have a project in it.
3. Type or speak what you want to make. Review the plan, then start the build. The preview updates as files are written.
4. To change something, choose **Pen + voice**, mark it on the page and speak your instruction. Text input works too.

For example: "Build a portfolio from my resume." Then mark a button and say, "Make this green."

Voice needs a one-time download in **Voice & microphone**. It runs locally and supports Bengali, English and other Whisper languages. You can correct the recognized words before applying a change. Your AI service decides which models you can use and what limits apply.

<img src="docs/screenshots/tools.png" alt="Click the pet to choose a tool" width="280">

## Editing a page

You can mark a single letter in supported text, rather than selecting the whole heading. In existing React/Vite projects, the pen targets a mapped source element. Undo and redo are available after an edit. Your project stays in the folder you chose.

<img src="docs/screenshots/precise-selection.png" alt="The pen selects only G in this heading" width="1000">

<details>
<summary>More screenshots</summary>

**Reviewing a plan**

<img src="docs/screenshots/plan.png" alt="A website plan before building" width="330">

**Editing the selected detail**

<img src="docs/screenshots/selected-detail.png" alt="The selected letter and text input in the pet" width="330">

**Connecting a service**

<img src="docs/screenshots/settings.png" alt="Settings with an empty API key field" width="900">

</details>

These screenshots use the fictional [Maya Chen sample](examples/portfolio.md) and the app's offline preset. They show the controls and selection flow.

## A few things to know

New websites normally use React and Vite. You can ask for plain HTML or a specific design instead. Project checkup can inspect source and check the page at desktop and mobile sizes; the browser check needs Chrome or Edge.

The app can also write software and other text-file projects. Those come with run instructions. It doesn't run arbitrary generated programs or deploy them for you. AI output and automated checks still need a look over, especially with dynamic React content.

Voice, file parsing, history and preview run on your PC. The relevant document content and source context go to the AI service you choose. API keys are encrypted on the PC, and account sign-in stays with the official tool.

## Run from source

You'll need Windows and Node.js 22.12 or newer. The install step downloads Electron.

```sh
git clone https://github.com/asifahamed11/Markora.git
cd Markora
npm ci
npm start
```

To open a particular folder:

```powershell
npm start -- --folder "C:\Projects\my-site"
```

Use `npm start -- --studio` for the larger workspace window.

To verify the bundled resources and build your own installer:

```sh
npm run verify:integrations
npm run package:win
```

Electron handles the desktop app, Vite serves the preview, and local Whisper handles speech. The bundled design guidance and component defaults are described in [the toolkit notes](docs/DESIGN-TOOLKIT.md). For more detail, see [architecture](docs/ARCHITECTURE.md), [voice setup](docs/VOICE_MODELS.md) and [third-party credits](THIRD_PARTY_NOTICES.md).
