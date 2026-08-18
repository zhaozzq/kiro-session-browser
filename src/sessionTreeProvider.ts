import * as vscode from "vscode";
import { ParsedSession, WorkspaceGroup } from "./types";
import { readAllSessions } from "./sessionReader";

/**
 * Tree item types for the session browser
 */
export class WorkspaceItem extends vscode.TreeItem {
  constructor(public readonly group: WorkspaceGroup) {
    super(group.name, vscode.TreeItemCollapsibleState.Expanded);
    this.tooltip = group.fullPath;
    this.description = `(${group.sessions.length})`;
    this.iconPath = new vscode.ThemeIcon(
      "root-folder",
      new vscode.ThemeColor("charts.blue")
    );
    // Distinguish real workspace paths from unknown/placeholder ones
    const hasValidPath =
      group.fullPath && !group.fullPath.startsWith("_unknown_/");
    this.contextValue = hasValidPath ? "workspace" : "workspaceUnknown";
    // Use resourceUri to get VS Code's native folder styling
    if (hasValidPath) {
      this.resourceUri = vscode.Uri.file(group.fullPath);
    }
  }
}

export class SessionItem extends vscode.TreeItem {
  constructor(public readonly session: ParsedSession) {
    super(
      session.info.title || "Untitled Session",
      vscode.TreeItemCollapsibleState.None
    );

    const date = new Date(session.info.lastModifiedAt);
    const dateStr = formatDate(date);
    const modeIcon = session.info.agentMode === "spec" ? "◆" : "●";

    this.tooltip = [
      `Title: ${session.info.title}`,
      `Mode: ${session.info.agentMode}`,
      `Model: ${session.info.modelId}`,
      `Created: ${formatDate(new Date(session.info.createdAt))}`,
      `Modified: ${dateStr}`,
      `Path: ${session.sessionPath}`,
    ].join("\n");

    this.description = `${modeIcon} ${session.info.agentMode} · ${dateStr}`;
    this.iconPath = new vscode.ThemeIcon(
      session.info.agentMode === "spec" ? "checklist" : "comment-discussion",
      new vscode.ThemeColor("descriptionForeground")
    );
    this.contextValue = "session";

    // Click to open session detail
    this.command = {
      command: "kiroSessionBrowser.openSession",
      title: "Open Session Detail",
      arguments: [this],
    };
  }
}

/**
 * TreeDataProvider for Kiro sessions
 */
export class SessionTreeProvider
  implements vscode.TreeDataProvider<WorkspaceItem | SessionItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    WorkspaceItem | SessionItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private workspaceGroups: WorkspaceGroup[] = [];

  async refresh(): Promise<void> {
    this.workspaceGroups = await readAllSessions();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(
    element: WorkspaceItem | SessionItem
  ): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: WorkspaceItem | SessionItem
  ): Promise<(WorkspaceItem | SessionItem)[]> {
    if (!element) {
      // Root level: show workspace groups
      if (this.workspaceGroups.length === 0) {
        this.workspaceGroups = await readAllSessions();
      }
      return this.workspaceGroups.map((g) => new WorkspaceItem(g));
    }

    if (element instanceof WorkspaceItem) {
      // Workspace level: show sessions
      return element.group.sessions.map((s) => new SessionItem(s));
    }

    return [];
  }
}

/**
 * Format a date to a readable short string
 */
function formatDate(date: Date): string {
  const now = new Date();

  // Compare calendar days instead of raw time difference
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  if (diffDays === 0) {
    return `Today ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday ${timeStr}`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }
}
