# Antigravity Discord RPC

> **Note**: This extension is specifically designed for [Antigravity](https://antigravity.dev), an AI-powered coding assistant. It will not work with standard VS Code.

Dynamic Discord Rich Presence integration for Antigravity that displays real-time agent activity across all conversations.

## Features

- 🔄 **Dynamic Conversation Tracking** - Automatically follows the most recently active conversation
- ⏱️ **Persistent Timer** - Shows continuous elapsed time without resetting
- 📝 **Real-time Updates** - Displays current task name and agent activity as you work
- 🎯 **Smart Fallback** - Shows workspace/file editing activity when agent is idle
- 🔌 **Auto-reconnect** - Automatically reconnects to Discord if connection is lost

## What You'll See in Discord

When the agent is working:
- **Details**: Current activity (e.g., "Refactoring extension to use dynamic conversation tracking")
- **State**: Task name (e.g., "Implementing Dynamic Discord RPC")
- **Timer**: Continuous elapsed time
- **Icon**: Antigravity logo with agent indicator

When you're editing:
- **Details**: Current file being edited
- **State**: Project/workspace name
- **Timer**: Continuous elapsed time

## Installation

### From Open VSX Marketplace
1. Open Antigravity
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Antigravity Discord RPC"
4. Click Install

### Manual Installation
```bash
code --install-extension antigravity.antigravity-rpc
```

## Requirements

- Discord desktop application must be running
- Antigravity (VS Code fork) version 1.90.0 or higher

## How It Works

The extension monitors your Antigravity brain directory to detect which conversation is currently active. It reads the `task.md` file from the most recently modified conversation to extract:
- Task name (from the first `#` heading)
- Current activity (from the first `[/]` in-progress item)

This information is then displayed in your Discord Rich Presence, updating in real-time as you work.

## Privacy

This extension only reads local files from your Antigravity brain directory. No data is sent anywhere except to Discord's local RPC client for Rich Presence display.

## Troubleshooting

**Discord not showing activity:**
- Ensure Discord desktop app is running
- Check that "Display current activity as a status message" is enabled in Discord Settings → Activity Privacy
- Reload Antigravity window (Ctrl+Shift+P → "Developer: Reload Window")

**Extension not tracking current conversation:**
- Verify that the conversation has a `task.md` file in its brain directory
- Check the VS Code status bar for RPC connection status

## Contributing

Found a bug or have a feature request? Please open an issue on the [GitHub repository](https://github.com/A-Gift-Of-Flame/antigravity-rpc).

## License

MIT

---

**Made with ❤️ for the Antigravity community**
