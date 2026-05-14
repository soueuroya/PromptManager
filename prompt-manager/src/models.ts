export type TaskCategory =
  | "bugfix"
  | "feature"
  | "refactor"
  | "research"
  | "design"
  | "other";

export type TaskStatus = "todo" | "running" | "done" | "failed";
export type CriteriaStatus = "pending" | "passed" | "failed";

export interface ReferenceItem {
  id: string;
  label: string;
  uri: string;
  type: "file" | "folder" | "unknown";
}

export interface AcceptanceCriterion {
  text: string;
  status: CriteriaStatus;
}

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  references: ReferenceItem[];
  isCollapsed: boolean;
  createdAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  acceptanceCriteria: AcceptanceCriterion[];
  prompts: PromptItem[];
  references: ReferenceItem[];
  isCollapsed: boolean;
  createdAt: number;
}

export type QueueItemType = "task" | "prompt";
export type QueueItemStatus = "queued" | "active" | "done" | "failed";

export interface ExecutionQueueItem {
  id: string;
  type: QueueItemType;
  sourceId: string;
  parentTaskId?: string;
  title: string;
  payload: string;
  status: QueueItemStatus;
}