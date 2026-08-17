# Kiro Session Browser

A VS Code / Kiro IDE extension to browse and view all Kiro conversation sessions, grouped by project/workspace.

## Features

- **Workspace Grouping** — Sessions are automatically grouped by the project/workspace they belong to.
- **Session Detail View** — Click any session to view the full conversation in a webview panel.
- **Open in Kiro IDE** — Quickly open a workspace in Kiro IDE directly from the tree view.
- **Open Cache Directory** — Reveal the session cache directory in Finder/Explorer for both workspace groups and individual sessions.
- **Copy Session Path** — Copy the full session directory path to clipboard.
- **Refresh** — Reload sessions on demand.

## Installation

Install from a `.vsix` file:

```bash
code --install-extension kiro-session-browser-0.1.1.vsix
```

Or in Kiro IDE:

```bash
kiro --install-extension kiro-session-browser-0.1.1.vsix
```

## Usage

1. After installation, a new **Kiro Sessions** icon appears in the Activity Bar.
2. Click it to open the Sessions panel.
3. Sessions are grouped by workspace/project.
4. Use inline buttons on each item:
   - **Workspace**: Open in Kiro IDE, Open Cache Directory
   - **Session**: Open Detail, Copy Path, Open Cache Directory

## Data Source

The extension reads session data from `~/.kiro/sessions/`. Each workspace has a hashed directory containing session folders with `session.json` metadata and `messages.jsonl` conversation logs.

## Commands

| Command | Description |
|---------|-------------|
| `kiroSessionBrowser.refresh` | Refresh the session list |
| `kiroSessionBrowser.openSession` | Open session detail panel |
| `kiroSessionBrowser.copySessionPath` | Copy session path to clipboard |
| `kiroSessionBrowser.openInKiro` | Open workspace in Kiro IDE |
| `kiroSessionBrowser.openCacheDir` | Open cache directory in file manager |

## License

[MIT](LICENSE)
