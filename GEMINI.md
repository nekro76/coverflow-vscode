# GEMINI.md - CoverFlow VSCode Extension

This file provides foundational context and instructions for the Gemini CLI agent working on the CoverFlow VSCode extension project.

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Project Name** | CoverFlow VSCode |
| **Type** | VSCode Extension (macOS only) |
| **Goal** | Control Apple Music from VSCode with a CoverFlow UI |
| **Status** | Phase 2.5 Infrastructure (Refactoring & Async) |

## Technical Stack Refinement

- **Asynchronous Execution:** Moving from `execSync` to `exec` for all AppleScript calls to ensure smooth UI.
- **Native Artwork Pipeline:** Using AppleScript `as «class PNG »` for robust image fetching.
- **Externalized UI:** HTML/CSS/JS for CoverFlow are being moved from strings in `extension.ts` to dedicated files.

## Workflow & Agents (Current Phase)

We are currently in **Phase 2.5: Infrastructure**.
1. **Refactor** `music-controller.ts` for async and native artwork.
2. **Externalize** WebView assets.
3. **Initialize** Testing with Jest.

## Workflow & Agents

This project follows an agent-based workflow. When acting as one of these roles, refer to their specific instruction files in `ai/agents/`.

- **@pm (Project Manager):** `ai/agents/pm.md` - Strategy and oversight.
- **@uxui (UX/UI Design):** `ai/agents/uxui.md` - UI/UX design and assets.
- **@dev (Developer):** `ai/agents/dev.md` - Implementation and coding.
- **@testy (Testing):** `ai/agents/testy.md` - QA and test automation.
- **@kittyhub (PR Management):** `ai/agents/kittyhub.md` - Code review and PRs.

**Workflow Sequence:**
`@pm → @uxui → @dev → @testy → @pm → @kittyhub → User`

## Architecture

```
coverflow-vscode/
├── src/
│   ├── extension.ts        # Entry point
│   ├── music-controller.ts # AppleScript interface
│   └── ...
├── out/                    # Compiled JS
├── package.json            # Extension manifest
└── tsconfig.json           # TS Configuration
```

## Core Mandates & Design Decisions

1. **AppleScript Dependency:** The extension relies on macOS `osascript` to control Music.app. It is **macOS only**.
2. **No External Dependencies for Music Control:** Do not introduce external libraries for Music.app control; stick to `osascript`.
3. **WebView UI:** The primary UI (CoverFlow) is implemented via VSCode WebViews using HTML/CSS/JS.
4. **Animation Logic:** Reuse/adapt animation logic from the sibling project `coverflow` (SwiftUI) where applicable for the web-based implementation.

## Features & Roadmap

### MVP (Phase 1) - Complete
- Extension installation and activation.
- Play/Pause, Next/Previous commands.
- Status bar integration.

### Phase 2 - Complete
- Side panel with HTML WebView.
- Track info and album artwork display.

### Phase 3 (CoverFlow) - PENDING
- 3D CoverFlow carousel implementation.
- Spring animations and drag gesture navigation.

### Phase 4 (Enhanced) - Planned
- Library browser and search.
- Shuffle/Repeat controls.

## Success Metrics

- **MVP:** Functional playback control and status bar updates.
- **Full Success:** Smooth 3D CoverFlow carousel and high user engagement on the VSCode Marketplace.

---
*Last updated: 2026-04-13*
