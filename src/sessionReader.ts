import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  SessionInfo,
  ParsedSession,
  WorkspaceGroup,
  MessageEntry,
} from "./types";

/**
 * Get the Kiro sessions root directory
 */
export function getSessionsDir(): string {
  return path.join(os.homedir(), ".kiro", "sessions");
}

/**
 * Read all sessions from ~/.kiro/sessions and group them by workspace
 */
export async function readAllSessions(): Promise<WorkspaceGroup[]> {
  const sessionsDir = getSessionsDir();

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const workspaceHashes = fs
    .readdirSync(sessionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  const allSessions: ParsedSession[] = [];

  for (const hash of workspaceHashes) {
    const workspaceDir = path.join(sessionsDir, hash);
    const sessionDirs = fs
      .readdirSync(workspaceDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."));

    for (const sessionDir of sessionDirs) {
      const sessionPath = path.join(workspaceDir, sessionDir.name);
      const sessionJsonPath = path.join(sessionPath, "session.json");

      if (!fs.existsSync(sessionJsonPath)) {
        continue;
      }

      try {
        const raw = fs.readFileSync(sessionJsonPath, "utf-8");
        const info: SessionInfo = JSON.parse(raw);

        const workspaceName = deriveWorkspaceName(info.workspacePaths);

        allSessions.push({
          sessionPath,
          info,
          workspaceHash: hash,
          workspaceName,
        });
      } catch {
        // Skip malformed session files
        continue;
      }
    }
  }

  return groupByWorkspace(allSessions);
}

/**
 * Read messages from a session's messages.jsonl file
 */
export function readSessionMessages(sessionPath: string): MessageEntry[] {
  const messagesPath = path.join(sessionPath, "messages.jsonl");

  if (!fs.existsSync(messagesPath)) {
    return [];
  }

  const content = fs.readFileSync(messagesPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const messages: MessageEntry[] = [];
  for (const line of lines) {
    try {
      const entry: MessageEntry = JSON.parse(line);
      messages.push(entry);
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  return messages;
}

/**
 * Derive a human-readable workspace name from workspace paths
 */
function deriveWorkspaceName(workspacePaths: string[]): string {
  if (!workspacePaths || workspacePaths.length === 0) {
    return "Unknown Workspace";
  }

  // Use the last segment of the first workspace path
  const firstPath = workspacePaths[0];
  const name = path.basename(firstPath);
  return name || "Unknown Workspace";
}

/**
 * Group sessions by their workspace path
 */
function groupByWorkspace(sessions: ParsedSession[]): WorkspaceGroup[] {
  const groups = new Map<string, WorkspaceGroup>();

  for (const session of sessions) {
    const fullPath =
      session.info.workspacePaths?.[0] || `_unknown_/${session.workspaceHash}`;
    const name = session.workspaceName;

    if (!groups.has(fullPath)) {
      groups.set(fullPath, {
        name,
        fullPath,
        sessions: [],
      });
    }

    groups.get(fullPath)!.sessions.push(session);
  }

  // Sort sessions within each group by lastModifiedAt (newest first)
  for (const group of groups.values()) {
    group.sessions.sort(
      (a, b) =>
        new Date(b.info.lastModifiedAt).getTime() -
        new Date(a.info.lastModifiedAt).getTime()
    );
  }

  // Sort groups by the most recent session in each group
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aLatest = a.sessions[0]?.info.lastModifiedAt || "";
    const bLatest = b.sessions[0]?.info.lastModifiedAt || "";
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });

  return sortedGroups;
}
