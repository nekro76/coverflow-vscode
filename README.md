# CoverFlow VSCode Extension

Apple Music player for VSCode on macOS.

---

## Prerequisites

- macOS 12.0+ (Monterey or later)
- VSCode 1.75.0 or later
- Apple Music app installed
- **First run**: Grant Automation permission for Music.app when prompted

---

## Installation

### Option 1: Install Pre-built .vsix

1. Open VSCode
2. Go to **Extensions** (Cmd+Shift+X)
3. Click the **...** menu (top right)
4. Select **Install from VSIX**
5. Choose: `coverflow-vscode-0.0.1.vsix`

### Option 2: Run in Development Mode

```bash
cd coverflow-vscode
npm install
```

Press **F5** to launch Extension Development Host.

---

## Features

| Feature | Status |
|---------|--------|
| Status bar with track info | ✅ |
| Play/Pause/Next/Previous | ✅ |
| Album artwork display | ✅ |
| Two layout options | ✅ |
| Auto-sync with Music.app | ✅ |

---

## Layout Options

**Horizontal** (default - cover left, info center, controls right):
```
┌─────────────────────────────────────────────┐
│  NOW PLAYING                                │
├─────────────────────────────────────────────┤
│ [🎵]  Song Title                   ⏮ ▶ ⏭  │
│       Artist                               │
└─────────────────────────────────────────────┘
```

**Vertical** (centered stack):
```
┌─────────────────────────┐
│      Now Playing      │
├─────────────────────────┤
│                     │
│   [Album Artwork]   │
│                     │
├─────────────────────────┤
│  Song Title         │
│  Artist - Album     │
├─────────────────────────┤
│  ⏮    ▶️    ⏭      │
└─────────────────────────┘
```

**To change layout**: VSCode Settings → `coverflow.panelLayout` → select `horizontal` or `vertical`

---

## Commands

Access via **Command Palette** (Cmd+Shift+P):

- `CoverFlow: Play`
- `CoverFlow: Pause`
- `CoverFlow: Toggle Play/Pause`
- `CoverFlow: Next Track`
- `CoverFlow: Previous Track`
- `CoverFlow: Show Panel`

**Keyboard Shortcut**: `Cmd+Shift+P` (when editor not focused) - Play/Pause toggle

---

## Troubleshooting

### "AppleScript error" or Permission denied
1. Open **System Settings → Privacy & Security → Automation**
2. Enable Automation for **Music.app**

### Extension not loading
- Make sure you're on macOS
- Run `npm install` first
- Try pressing F5 to debug

### Status bar not showing
- Check `coverflow.showInStatusBar` setting is enabled (default: true)

---

## Settings

| Setting | Default | Description |
|---------|---------|------------|
| `coverflow.panelLayout` | `horizontal` | Panel layout: `horizontal` or `vertical` |
| `coverflow.showInStatusBar` | `true` | Show current track in status bar |

---

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Package as .vsix
npm run package
```

---

## Project Structure

```
coverflow-vscode/
├── src/
│   ├── extension.ts           ← Entry point
│   ├── music-controller.ts   ← AppleScript integration
│   └── webview/
│       ├── coverflow.html           ← Horizontal layout
│       └── coverflow-vertical.html  ← Vertical layout
├── media/
│   └── coverflow.css         ← Styles
├── package.json             ← Manifest
└── coverflow-vscode-0.0.1.vsix  ← Pre-built extension
```

---

## Limitations

- **Platform**: macOS only
- **Panel location**: Editor area only. VSCode does not support WebView in sidebar or bottom panel.
- **Permissions**: Requires Automation permission for Music.app

---

*Last updated: 2026-04-14*