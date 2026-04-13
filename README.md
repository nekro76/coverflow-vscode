# CoverFlow VSCode Extension

Apple Music player with CoverFlow UI for VSCode on macOS.

---

## Prerequisites

- macOS 12.0+ (Monterey or later)
- VSCode 1.75.0 or later
- Apple Music app installed
- **First run**: You may need to grant Automation permission for Music.app (macOS will prompt you)

---

## Quick Start

### Option 1: Run in Development Mode (Recommended)

```bash
# Clone and install dependencies
cd coverflow-vscode
npm install
```

Then press **F5** in VSCode to launch the **Extension Development Host** (a new VSCode window with the extension loaded).

### Option 2: Install Pre-built .vsix

1. Open VSCode
2. Go to **Extensions** (Cmd+Shift+X)
3. Click the **...** menu (top right)
4. Select **Install from VSIX**
5. Choose: `coverflow-vscode-0.0.1.vsix`

---

## Current MVP Features

| Feature | Status | How to Test |
|---------|--------|-------------|
| Status bar item | ✅ Working | Look at bottom-left corner |
| Play command | ✅ Working | Cmd+Shift+P → "CoverFlow: Play" |
| Pause command | ✅ Working | Cmd+Shift+P → "CoverFlow: Pause" |
| Next Track | ✅ Working | Cmd+Shift+P → "CoverFlow: Next Track" |
| Previous Track | ✅ Working | Cmd+Shift+P → "CoverFlow: Previous Track" |
| Show Panel | ✅ Working | Click status bar item |
| Volume Up/Down | ✅ Working | Cmd+Shift+P → commands |
| Shuffle/Repeat | ✅ Working | Cmd+Shift+P → commands |
| Side panel UI | ⚠️ Basic | Shows placeholder text |
| Album artwork | ❌ Not yet | Coming in Phase 3 |
| CoverFlow carousel | ❌ Not yet | Coming in Phase 3 |

---

## Commands

All available via **Command Palette** (Cmd+Shift+P):

- `CoverFlow: Play` - Play current track
- `CoverFlow: Pause` - Pause playback
- `CoverFlow: Next Track` - Skip to next
- `CoverFlow: Previous Track` - Go to previous
- `CoverFlow: Show Panel` - Open side panel

### Keyboard Shortcut

- **Cmd+Shift+P** (when editor not focused) - Play/Pause toggle

---

## Troubleshooting

### "AppleScript error" or "Permission denied"
- Open **System Settings → Privacy & Security → Automation**
- Enable Automation for Music.app

### Extension not loading
- Make sure you're on macOS
- Run `npm install` first
- Try pressing F5 to debug

### Status bar not showing
- Check `coverflow.showInStatusBar` setting is enabled (default: true)

---

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Watch for changes
npm run watch

# Package as .vsix
npm run package
```

---

## Project Structure

```
coverflow-vscode/
├── src/
│   ├── extension.ts       # Entry point, registers commands & panel
│   └── music-controller.ts # AppleScript integration
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript config
└── coverflow-vscode-0.0.1.vsix  # Pre-built extension
```

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: MVP | ✅ Done | Basic controls, status bar |
| Phase 2: Side Panel | ⚠️ Basic | HTML panel (placeholder UI) |
| Phase 3: CoverFlow | 🔜 In Progress | Full CoverFlow carousel UI |
| Phase 4: Enhanced | 📋 Planned | Library browser, search |

### Phase 3 Approved Features
- ✅ Dark VSCode color scheme
- ✅ Keyboard shortcuts (arrow keys, space, Cmd+W)
- ✅ Library button in header

---

*Last updated: 2026-04-13*