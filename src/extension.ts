import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as os from "os";
import {
  SessionTreeProvider,
  SessionItem,
  WorkspaceItem,
} from "./sessionTreeProvider";
import { SessionDetailPanel } from "./sessionDetailPanel";

export function activate(context: vscode.ExtensionContext): void {
  // Create the tree data provider
  const treeProvider = new SessionTreeProvider();

  // Register the tree view
  const treeView = vscode.window.createTreeView("kiroSessionsTree", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Command: Refresh sessions
  context.subscriptions.push(
    vscode.commands.registerCommand("kiroSessionBrowser.refresh", () => {
      treeProvider.refresh();
    })
  );

  // Command: Copy session file path
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kiroSessionBrowser.copySessionPath",
      (item: SessionItem) => {
        if (item && item.session) {
          vscode.env.clipboard.writeText(item.session.sessionPath);
          vscode.window.showInformationMessage(
            `Copied: ${item.session.sessionPath}`
          );
        }
      }
    )
  );

  // Command: Open session detail
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kiroSessionBrowser.openSession",
      (item: SessionItem) => {
        if (item && item.session) {
          SessionDetailPanel.show(item.session);
        }
      }
    )
  );

  // Command: Open workspace in Kiro IDE
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kiroSessionBrowser.openInKiro",
      (item: WorkspaceItem) => {
        if (item && item.group) {
          const folderPath = item.group.fullPath;
          cp.exec(`kiro "${folderPath}"`, (err) => {
            if (err) {
              vscode.window.showErrorMessage(
                `Failed to open in Kiro IDE: ${err.message}`
              );
            }
          });
        }
      }
    )
  );

  // Command: Open cache directory (sessions storage)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kiroSessionBrowser.openCacheDir",
      (item: WorkspaceItem | SessionItem) => {
        let cacheDir: string | undefined;

        if (item instanceof WorkspaceItem && item.group) {
          cacheDir = path.join(
            os.homedir(),
            ".kiro",
            "sessions",
            item.group.hash
          );
        } else if (item instanceof SessionItem && item.session) {
          cacheDir = item.session.sessionPath;
        }

        if (cacheDir) {
          const uri = vscode.Uri.file(cacheDir);
          vscode.commands.executeCommand("revealFileInOS", uri);
        }
      }
    )
  );

  // Initial load
  treeProvider.refresh();
}

export function deactivate(): void {
  // Nothing to clean up
}
