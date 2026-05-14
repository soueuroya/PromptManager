import * as vscode from "vscode";
import { TaskItem, PromptItem, TaskCategory } from "../models";

type NodeType = "root" | "task" | "prompt";

export class PMNode extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly type: NodeType,
    public readonly data?: TaskItem | PromptItem
  ) {
    super(
      label,
      type === "root" || type === "task"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.contextValue = type;
  }
}

export class PromptTreeProvider implements vscode.TreeDataProvider<PMNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tasks: TaskItem[] = [];

  constructor() {
    this.tasks = [
      {
        id: "t1",
        title: "Fix login bug",
        category: "bugfix",
        acceptanceCriteria: [
          "User can login successfully",
          "Error handling added"
        ],
        prompts: [
          {
            id: "p1",
            title: "Debug analysis",
            content: "Analyze login failure logs",
            createdAt: Date.now()
          }
        ],
        createdAt: Date.now()
      }
    ];
  }

  getTreeItem(element: PMNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PMNode): Thenable<PMNode[]> {
    if (!element) {
      return Promise.resolve([
        new PMNode("tasks", "Tasks", "root")
      ]);
    }

    if (element.id === "tasks") {
      return Promise.resolve(
        this.tasks.map(
          t => new PMNode(t.id, `${t.title} [${t.category}]`, "task", t)
        )
      );
    }

    const task = this.tasks.find(t => t.id === element.id);
    if (task) {
      return Promise.resolve(
        task.prompts.map(
          p => new PMNode(p.id, p.title, "prompt", p)
        )
      );
    }

    return Promise.resolve([]);
  }

  // ----------------------------
  // DATA HELPERS
  // ----------------------------

  getTask(taskId: string) {
    return this.tasks.find(t => t.id === taskId);
  }

  addTask(title: string) {
    this.tasks.push({
      id: Date.now().toString(),
      title,
      category: "other",
      acceptanceCriteria: [],
      prompts: [],
      createdAt: Date.now()
    });

    this.refresh();
  }

  addPrompt(taskId: string, title: string, content: string) {
    const task = this.getTask(taskId);
    if (!task) return;

    task.prompts.push({
      id: Date.now().toString(),
      title,
      content,
      createdAt: Date.now()
    });

    this.refresh();
  }

  setCategory(taskId: string, category: TaskCategory) {
    const task = this.getTask(taskId);
    if (!task) return;

    task.category = category;
    this.refresh();
  }

  addAcceptanceCriteria(taskId: string, criteria: string) {
    const task = this.getTask(taskId);
    if (!task) return;

    task.acceptanceCriteria.push(criteria);
    this.refresh();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}