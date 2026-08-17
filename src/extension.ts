import * as vscode from "vscode";
import {
  SessionTreeProvider,
  SessionItem,
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

  // Initial load
  treeProvider.refresh();
}

export function deactivate(): void {
  // Nothing to clean up
}
