import * as vscode from "vscode";
import { ParsedSession, MessageEntry } from "./types";
import { readSessionMessages } from "./sessionReader";

/**
 * Manages the WebView panel for displaying session conversation details.
 * Design inspired by vscode-acp's ChatWebviewProvider — uses turn-based grouping,
 * collapsible tool calls, and markdown rendering via marked.
 */
export class SessionDetailPanel {
  private static panels = new Map<string, SessionDetailPanel>();

  private readonly panel: vscode.WebviewPanel;
  private readonly session: ParsedSession;
  private disposed = false;

  private constructor(panel: vscode.WebviewPanel, session: ParsedSession) {
    this.panel = panel;
    this.session = session;

    this.panel.onDidDispose(() => {
      this.disposed = true;
      SessionDetailPanel.panels.delete(session.info.id);
    });

    this.update();
  }

  static show(session: ParsedSession): void {
    const existing = SessionDetailPanel.panels.get(session.info.id);
    if (existing && !existing.disposed) {
      existing.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "kiroSessionDetail",
      `${session.info.title || "Untitled"}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const instance = new SessionDetailPanel(panel, session);
    SessionDetailPanel.panels.set(session.info.id, instance);
  }

  private update(): void {
    const messages = readSessionMessages(this.session.sessionPath);
    this.panel.webview.html = this.buildHtml(messages);
  }

  private buildHtml(messages: MessageEntry[]): string {
    const { info } = this.session;
    const turns = this.groupIntoTurns(messages);
    const turnsHtml = turns.map((t) => this.renderTurn(t)).join("\n");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(info.title || "Session")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: 13px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.5;
      overflow-y: auto;
    }

    /* Sticky header */
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .header-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }
    .header-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      align-items: center;
      flex-wrap: wrap;
    }
    .tag {
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 500;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    /* Messages container */
    .messages {
      padding: 10px 14px 32px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Turn container */
    .turn {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 100%;
    }

    /* User message */
    .msg-user {
      align-self: flex-end;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 6px 10px;
      border-radius: 10px 10px 2px 10px;
      max-width: 80%;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
    }

    /* Assistant message */
    .msg-assistant {
      align-self: flex-start;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 6px 10px;
      border-radius: 10px 10px 10px 2px;
      max-width: 90%;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 13px;
    }
    /* Markdown rendered content */
    .msg-assistant.md p { margin: 0 0 0.4em; }
    .msg-assistant.md p:last-child { margin-bottom: 0; }
    .msg-assistant.md { white-space: normal; }
    .msg-assistant.md pre {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow-x: auto;
      margin: 0.4em 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      line-height: 1.4;
    }
    .msg-assistant.md code {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .msg-assistant.md pre code {
      background: none;
      padding: 0;
    }
    .msg-assistant.md ul, .msg-assistant.md ol {
      margin: 0.3em 0;
      padding-left: 1.4em;
    }
    .msg-assistant.md blockquote {
      border-left: 3px solid var(--vscode-focusBorder);
      padding: 0.2em 0.6em;
      margin: 0.3em 0;
      opacity: 0.8;
    }
    .msg-assistant.md h1, .msg-assistant.md h2, .msg-assistant.md h3 {
      margin: 0.5em 0 0.2em;
      font-weight: 600;
    }
    .msg-assistant.md h1 { font-size: 1.2em; }
    .msg-assistant.md h2 { font-size: 1.1em; }
    .msg-assistant.md h3 { font-size: 1.0em; }
    .msg-assistant.md a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .msg-assistant.md a:hover { text-decoration: underline; }
    .msg-assistant.md table {
      border-collapse: collapse;
      margin: 0.3em 0;
      font-size: 12px;
    }
    .msg-assistant.md th, .msg-assistant.md td {
      border: 1px solid var(--vscode-panel-border);
      padding: 3px 6px;
    }
    .msg-assistant.md th {
      background: var(--vscode-editorWidget-background);
      font-weight: 600;
    }

    /* Tool calls group - collapsible */
    .tools-group {
      padding-left: 10px;
      border-left: 2px solid var(--vscode-panel-border);
      margin: 2px 0;
    }
    .tools-group summary {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      user-select: none;
      padding: 2px 0;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tools-group summary::-webkit-details-marker { display: none; }
    .tools-group summary::before {
      content: '▸';
      font-size: 10px;
      transition: transform 0.1s;
    }
    .tools-group[open] summary::before { content: '▾'; }
    .tools-group summary:hover { color: var(--vscode-foreground); }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 1px 4px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      border-radius: 3px;
    }
    .tool-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .tool-icon {
      width: 12px;
      text-align: center;
      flex-shrink: 0;
      font-size: 10px;
    }
    .tool-icon.ok { color: var(--vscode-testing-iconPassed, #73c991); }
    .tool-icon.fail { color: var(--vscode-testing-iconFailed, #f48771); }
    .tool-icon.pending { color: var(--vscode-descriptionForeground); }
    .tool-name {
      color: var(--vscode-textLink-foreground);
      font-weight: 500;
    }
    .tool-file {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      opacity: 0.7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }

    /* Tool detail on click */
    .tool-detail {
      display: none;
      margin: 2px 0 4px 17px;
      padding: 4px 6px;
      background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.1));
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .tool-detail.visible { display: block; }

    /* Timestamps */
    .time {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.5;
      margin-top: 1px;
    }
    .time-right { text-align: right; }

    .empty {
      text-align: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title" title="${esc(info.title || "")}">${esc(info.title || "Untitled")}</span>
    <div class="header-meta">
      <span class="tag">${esc(info.agentMode || "vibe")}</span>
      <span>${esc(info.modelId || "")}</span>
      <span>${formatDate(info.createdAt)} ~ ${formatDate(info.lastModifiedAt)}</span>
      <span title="${esc(this.session.sessionPath)}">${esc((info.workspacePaths && info.workspacePaths[0]) ? baseName(info.workspacePaths[0]) : "")}</span>
    </div>
  </div>
  <div class="messages">
    ${turnsHtml || '<div class="empty">No messages.</div>'}
  </div>
  <script>
    // Toggle tool detail on click
    document.querySelectorAll('.tool-item[data-args]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const detail = el.nextElementSibling;
        if (detail && detail.classList.contains('tool-detail')) {
          detail.classList.toggle('visible');
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Group raw messages into logical turns.
   * A turn starts with either a user message or a turn_start event.
   */
  private groupIntoTurns(messages: MessageEntry[]): Turn[] {
    const turns: Turn[] = [];
    let current: Turn | null = null;

    for (const msg of messages) {
      const { payload } = msg;

      if (payload.type === "user") {
        // Start a new turn with user message
        current = { user: null, assistantTexts: [], toolCalls: [] };
        turns.push(current);
        current.user = { content: String(payload.content || ""), time: msg.timestamp };
      } else if (payload.type === "turn_start") {
        // If no current turn, create one (agent-initiated)
        if (!current) {
          current = { user: null, assistantTexts: [], toolCalls: [] };
          turns.push(current);
        }
      } else if (payload.type === "assistant") {
        const content = String(payload.content || "");
        if (!content.trim()) { continue; }
        if (!current) {
          current = { user: null, assistantTexts: [], toolCalls: [] };
          turns.push(current);
        }
        current.assistantTexts.push({ content, time: msg.timestamp });
      } else if (payload.type === "tool_call") {
        if (!current) {
          current = { user: null, assistantTexts: [], toolCalls: [] };
          turns.push(current);
        }
        current.toolCalls.push({
          toolName: String(payload.toolName || ""),
          status: String(payload.status || ""),
          filePath: String(payload.filePath || ""),
          args: payload.args as Record<string, unknown> | undefined,
          time: msg.timestamp,
        });
      }
      // Skip tool_result, steering_inclusion, etc. for display clarity
    }

    return turns;
  }

  private renderTurn(turn: Turn): string {
    const parts: string[] = [];

    // User message
    if (turn.user) {
      parts.push(`<div class="msg-user">${esc(turn.user.content)}</div>`);
      parts.push(`<div class="time time-right">${formatTime(turn.user.time)}</div>`);
    }

    // Tool calls (collapsible if > 2)
    if (turn.toolCalls.length > 0) {
      const toolsHtml = turn.toolCalls.map((tc) => this.renderToolCall(tc)).join("\n");
      const count = turn.toolCalls.length;

      if (count <= 2) {
        // Show inline without collapsing
        parts.push(`<div class="tools-group" open=""><summary>${count} tool call${count > 1 ? "s" : ""}</summary>${toolsHtml}</div>`);
      } else {
        // Collapsible
        parts.push(`<details class="tools-group"><summary>${count} tool calls</summary>${toolsHtml}</details>`);
      }
    }

    // Assistant texts
    for (const at of turn.assistantTexts) {
      parts.push(`<div class="msg-assistant md">${renderMarkdown(at.content)}</div>`);
    }

    if (turn.assistantTexts.length > 0) {
      const lastTime = turn.assistantTexts[turn.assistantTexts.length - 1].time;
      parts.push(`<div class="time">${formatTime(lastTime)}</div>`);
    }

    return `<div class="turn">${parts.join("\n")}</div>`;
  }

  private renderToolCall(tc: ToolCallInfo): string {
    const statusCls = (tc.status === "approved" || tc.status === "completed") ? "ok"
      : (tc.status === "denied" || tc.status === "failed") ? "fail" : "pending";
    const icon = statusCls === "ok" ? "✓" : statusCls === "fail" ? "✗" : "…";

    const fileHtml = tc.filePath
      ? `<span class="tool-file" title="${esc(tc.filePath)}">${esc(baseName(tc.filePath))}</span>`
      : "";

    const hasArgs = tc.args && Object.keys(tc.args).length > 0;
    const argsAttr = hasArgs ? ` data-args="1"` : "";
    const argsDetail = hasArgs
      ? `<div class="tool-detail">${esc(formatArgs(tc.args!))}</div>`
      : "";

    return `<div class="tool-item"${argsAttr}>
  <span class="tool-icon ${statusCls}">${icon}</span>
  <span class="tool-name">${esc(tc.toolName)}</span>
  ${fileHtml}
</div>${argsDetail}`;
  }
}

// --- Types ---

interface Turn {
  user: { content: string; time: string } | null;
  assistantTexts: { content: string; time: string }[];
  toolCalls: ToolCallInfo[];
}

interface ToolCallInfo {
  toolName: string;
  status: string;
  filePath: string;
  args: Record<string, unknown> | undefined;
  time: string;
}

// --- Helpers ---

function esc(text: unknown): string {
  const s = String(text ?? "");
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function baseName(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) { return ""; }
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return ""; }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

function formatTime(iso: string | undefined | null): string {
  if (!iso) { return ""; }
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return ""; }
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch { return ""; }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) { return ""; }
  return entries.map(([k, v]) => {
    let val = typeof v === "string" ? v : JSON.stringify(v, null, 2);
    if (val.length > 300) { val = val.substring(0, 300) + "…"; }
    return `${k}: ${val}`;
  }).join("\n");
}

/**
 * Simple markdown-to-HTML conversion.
 * Handles: code blocks, inline code, bold, italic, links, headings, lists, blockquotes.
 * For a production extension, consider bundling `marked` (like vscode-acp does).
 */
function renderMarkdown(text: string): string {
  let html = esc(text);

  // Code blocks: ```lang\n...\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${code}</code></pre>`;
  });

  // Inline code: `...`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headings: ### text
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes: > text
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists: - text
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Paragraphs: split by double newline
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");
  // Don't wrap block elements in <p>
  html = html.replace(/<p>(<(?:pre|h[1-3]|ul|blockquote|details))/g, "$1");
  html = html.replace(/(<\/(?:pre|h[1-3]|ul|blockquote|details)>)<\/p>/g, "$1");

  return html;
}
