export type TaskCategory =
  | "bugfix"
  | "feature"
  | "refactor"
  | "research"
  | "design"
  | "other";

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  acceptanceCriteria: string[];
  prompts: PromptItem[];
  createdAt: number;
}