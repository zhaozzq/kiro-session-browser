/**
 * Kiro session metadata stored in session.json
 */
export interface SessionInfo {
  schemaVersion: string;
  dataModelVersion: number;
  id: string;
  title: string;
  agentMode: string;
  workspacePaths: string[];
  createdAt: string;
  lastModifiedAt: string;
  modelId: string;
  autopilot: boolean;
}

/**
 * A message entry from messages.jsonl
 */
export interface MessageEntry {
  id: string;
  timestamp: string;
  payload: MessagePayload;
}

export type MessagePayload =
  | UserMessage
  | AssistantMessage
  | ToolCallMessage
  | ToolResultMessage
  | TurnStartMessage
  | SteeringInclusionMessage
  | GenericMessage;

export interface UserMessage {
  type: "user";
  content: string;
  source?: string;
}

export interface AssistantMessage {
  type: "assistant";
  content: string;
  operationType?: string;
  executionId?: string;
}

export interface ToolCallMessage {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: string;
  kind: string;
  executionId?: string;
  actionType?: string;
  filePath?: string;
}

export interface ToolResultMessage {
  type: "tool_result";
  toolCallId: string;
  content: string;
  success: boolean;
  durationMs: number;
  executionId?: string;
}

export interface TurnStartMessage {
  type: "turn_start";
  executionId: string;
}

export interface SteeringInclusionMessage {
  type: "steering_inclusion";
  documents: string[];
  executionId?: string;
}

export interface GenericMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Parsed session with full path info
 */
export interface ParsedSession {
  /** Full path to the session directory */
  sessionPath: string;
  /** Session metadata */
  info: SessionInfo;
  /** Workspace hash (parent directory name) */
  workspaceHash: string;
  /** Derived workspace display name from workspacePaths */
  workspaceName: string;
}

/**
 * Group of sessions under one workspace
 */
export interface WorkspaceGroup {
  /** Display name of the workspace (last segment of path) */
  name: string;
  /** Full workspace path */
  fullPath: string;
  /** Sessions belonging to this workspace */
  sessions: ParsedSession[];
}
