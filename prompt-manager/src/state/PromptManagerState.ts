import {
  AcceptanceCriterion,
  ExecutionQueueItem,
  PromptItem,
  ReferenceItem,
  TaskCategory,
  TaskItem,
  TaskStatus
} from "../models";

export interface PromptManagerSnapshot {
  version: number;
  autoSendNext: boolean;
  isQueueCollapsed: boolean;
  detachedPrompts: PromptItem[];
  tasks: TaskItem[];
  executionQueue: ExecutionQueueItem[];
}

export class PromptManagerState {
  public autoSendNext = false;
  public isQueueCollapsed = false;
  public detachedPrompts: PromptItem[] = [];
  public tasks: TaskItem[] = [];
  public executionQueue: ExecutionQueueItem[] = [];

  public static createEmpty(): PromptManagerState {
    return new PromptManagerState();
  }

  public load(snapshot: PromptManagerSnapshot | undefined): void {
    if (!snapshot) {
      return;
    }

    this.autoSendNext = snapshot.autoSendNext ?? false;
    this.isQueueCollapsed = snapshot.isQueueCollapsed ?? false;
    this.detachedPrompts = snapshot.detachedPrompts ?? [];
    this.tasks = snapshot.tasks ?? [];
    this.executionQueue = snapshot.executionQueue ?? [];
  }

  public toSnapshot(): PromptManagerSnapshot {
    return {
      version: 1,
      autoSendNext: this.autoSendNext,
      isQueueCollapsed: this.isQueueCollapsed,
      detachedPrompts: this.detachedPrompts,
      tasks: this.tasks,
      executionQueue: this.executionQueue
    };
  }

  public createTask(): void {
    this.tasks.push({
      id: `task-${Date.now()}`,
      title: "New Task",
      category: "other",
      status: "todo",
      acceptanceCriteria: [],
      prompts: [],
      references: [],
      isCollapsed: false,
      createdAt: Date.now()
    });
  }

  public createDetachedPrompt(): void {
    this.detachedPrompts.push({
      id: `detached-prompt-${Date.now()}`,
      title: "New Detached Prompt",
      content: "Describe what the AI should do here...",
      references: [],
      isCollapsed: false,
      createdAt: Date.now()
    });
  }

  public toggleTask(taskId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.isCollapsed = !task.isCollapsed;
  }

  public togglePrompt(promptId: string): void {
    const prompt = this.getPromptById(promptId);

    if (!prompt) {
      return;
    }

    prompt.isCollapsed = !prompt.isCollapsed;
  }

  public updateTaskTitle(taskId: string, value: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.title = value || "Untitled Task";
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updateTaskCategory(taskId: string, value: TaskCategory): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.category = value;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updateTaskStatus(taskId: string, value: TaskStatus): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.status = value;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public createPrompt(taskId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.prompts.push({
      id: `prompt-${Date.now()}`,
      title: "New Prompt",
      content: "Describe what the AI should do here...",
      references: [],
      isCollapsed: false,
      createdAt: Date.now()
    });

    task.isCollapsed = false;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updatePromptTitle(taskId: string, promptId: string, value: string): void {
    const prompt = this.getTask(taskId)?.prompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.title = value || "Untitled Prompt";
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updatePromptContent(taskId: string, promptId: string, value: string): void {
    const prompt = this.getTask(taskId)?.prompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.content = value;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updateDetachedPromptTitle(promptId: string, value: string): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.title = value || "Untitled Prompt";
    this.refreshQueuePayloadsForPrompt(promptId);
  }

  public updateDetachedPromptContent(promptId: string, value: string): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.content = value;
    this.refreshQueuePayloadsForPrompt(promptId);
  }

  public deletePrompt(taskId: string, promptId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.prompts = task.prompts.filter(p => p.id !== promptId);
    this.executionQueue = this.executionQueue.filter(item => item.sourceId !== promptId);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public deleteDetachedPrompt(promptId: string): void {
    this.detachedPrompts = this.detachedPrompts.filter(p => p.id !== promptId);
    this.executionQueue = this.executionQueue.filter(item => item.sourceId !== promptId);
  }

  public addAcceptanceCriteria(taskId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.acceptanceCriteria.push({
      text: "New acceptance criteria",
      status: "pending"
    });

    task.isCollapsed = false;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updateAcceptanceCriteria(taskId: string, index: number, value: string): void {
    const task = this.getTask(taskId);

    if (!task || !task.acceptanceCriteria[index]) {
      return;
    }

    task.acceptanceCriteria[index].text = value;
    this.refreshQueuePayloadsForTask(taskId);
  }

  public updateCriteriaStatus(
    taskId: string,
    index: number,
    value: AcceptanceCriterion["status"]
  ): void {
    const task = this.getTask(taskId);

    if (!task || !task.acceptanceCriteria[index]) {
      return;
    }

    task.acceptanceCriteria[index].status = value;
    this.recalculateTaskStatus(task);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public deleteAcceptanceCriteria(taskId: string, index: number): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.acceptanceCriteria.splice(index, 1);
    this.recalculateTaskStatus(task);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public addReferenceToTask(taskId: string, reference: ReferenceItem): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.references.push(reference);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public addReferenceToPrompt(taskId: string, promptId: string, reference: ReferenceItem): void {
    const prompt = this.getTask(taskId)?.prompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.references.push(reference);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public addReferenceToDetachedPrompt(promptId: string, reference: ReferenceItem): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.references.push(reference);
    this.refreshQueuePayloadsForPrompt(promptId);
  }

  public removeReferenceFromTask(taskId: string, referenceId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    task.references = task.references.filter(r => r.id !== referenceId);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public removeReferenceFromPrompt(taskId: string, promptId: string, referenceId: string): void {
    const prompt = this.getTask(taskId)?.prompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.references = prompt.references.filter(r => r.id !== referenceId);
    this.refreshQueuePayloadsForTask(taskId);
  }

  public removeReferenceFromDetachedPrompt(promptId: string, referenceId: string): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    prompt.references = prompt.references.filter(r => r.id !== referenceId);
    this.refreshQueuePayloadsForPrompt(promptId);
  }

  public addTaskToQueue(taskId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    this.executionQueue.push({
      id: `queue-${Date.now()}`,
      type: "task",
      sourceId: task.id,
      title: task.title,
      payload: this.buildTaskPayload(task),
      status: "queued"
    });

    this.isQueueCollapsed = false;
  }

  public addPromptToQueue(taskId: string, promptId: string): void {
    const task = this.getTask(taskId);
    const prompt = task?.prompts.find(p => p.id === promptId);

    if (!task || !prompt) {
      return;
    }

    this.executionQueue.push({
      id: `queue-${Date.now()}`,
      type: "prompt",
      sourceId: prompt.id,
      parentTaskId: task.id,
      title: prompt.title,
      payload: this.buildPromptPayload(prompt, task),
      status: "queued"
    });

    this.isQueueCollapsed = false;
  }

  public addDetachedPromptToQueue(promptId: string): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    this.executionQueue.push({
      id: `queue-${Date.now()}`,
      type: "prompt",
      sourceId: prompt.id,
      title: prompt.title,
      payload: this.buildPromptPayload(prompt),
      status: "queued"
    });

    this.isQueueCollapsed = false;
  }

  public removeQueueItem(queueId: string): void {
    this.executionQueue = this.executionQueue.filter(item => item.id !== queueId);
  }

  public moveQueueItem(fromIndex: number, toIndex: number): void {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.executionQueue.length ||
      toIndex >= this.executionQueue.length
    ) {
      return;
    }

    const [item] = this.executionQueue.splice(fromIndex, 1);
    this.executionQueue.splice(toIndex, 0, item);
  }

  public markQueueItem(queueId: string, status: ExecutionQueueItem["status"]): void {
    const item = this.executionQueue.find(q => q.id === queueId);

    if (!item) {
      return;
    }

    item.status = status;

    if (item.type === "task") {
      const task = this.getTask(item.sourceId);

      if (task && status === "done") {
        task.status = "done";
      }

      if (task && status === "failed") {
        task.status = "failed";
      }
    }

    if (this.autoSendNext && status === "done") {
      const next = this.executionQueue.find(q => q.status === "queued");

      if (next) {
        next.status = "active";
      }
    }
  }

  public moveTask(fromIndex: number, toIndex: number): void {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.tasks.length ||
      toIndex >= this.tasks.length
    ) {
      return;
    }

    const [task] = this.tasks.splice(fromIndex, 1);
    this.tasks.splice(toIndex, 0, task);
  }

  public movePrompt(
    fromTaskId: string | undefined,
    fromPromptId: string,
    toTaskId: string,
    toPromptIndex: number
  ): void {
    const toTask = this.getTask(toTaskId);

    if (!toTask) {
      return;
    }

    let movedPrompt: PromptItem | undefined;

    if (fromTaskId) {
      const fromTask = this.getTask(fromTaskId);

      if (!fromTask) {
        return;
      }

      const fromIndex = fromTask.prompts.findIndex(p => p.id === fromPromptId);

      if (fromIndex < 0) {
        return;
      }

      [movedPrompt] = fromTask.prompts.splice(fromIndex, 1);
      this.refreshQueuePayloadsForTask(fromTaskId);
    } else {
      const fromIndex = this.detachedPrompts.findIndex(p => p.id === fromPromptId);

      if (fromIndex < 0) {
        return;
      }

      [movedPrompt] = this.detachedPrompts.splice(fromIndex, 1);
      this.refreshQueuePayloadsForPrompt(fromPromptId);
    }

    const safeIndex = Math.max(0, Math.min(toPromptIndex, toTask.prompts.length));
    toTask.prompts.splice(safeIndex, 0, movedPrompt);
    toTask.isCollapsed = false;

    this.refreshQueuePayloadsForTask(toTaskId);
  }

  public getNextQueuedItem(): ExecutionQueueItem | undefined {
    return this.executionQueue.find(q => q.status === "queued");
  }

  private getTask(taskId: string): TaskItem | undefined {
    return this.tasks.find(t => t.id === taskId);
  }

  private getPromptById(promptId: string): PromptItem | undefined {
    const taskPrompt = this.tasks.flatMap(t => t.prompts).find(p => p.id === promptId);
    return taskPrompt ?? this.detachedPrompts.find(p => p.id === promptId);
  }

  private recalculateTaskStatus(task: TaskItem): void {
    if (task.acceptanceCriteria.some(c => c.status === "failed")) {
      task.status = "failed";
      return;
    }

    if (
      task.acceptanceCriteria.length > 0 &&
      task.acceptanceCriteria.every(c => c.status === "passed")
    ) {
      task.status = "done";
      return;
    }

    task.status = "running";
  }

  private refreshQueuePayloadsForTask(taskId: string): void {
    const task = this.getTask(taskId);

    if (!task) {
      return;
    }

    for (const item of this.executionQueue) {
      if (item.type === "task" && item.sourceId === taskId) {
        item.title = task.title;
        item.payload = this.buildTaskPayload(task);
      }

      if (item.type === "prompt" && item.parentTaskId === taskId) {
        const prompt = task.prompts.find(p => p.id === item.sourceId);

        if (prompt) {
          item.title = prompt.title;
          item.payload = this.buildPromptPayload(prompt, task);
        }
      }
    }
  }

  private refreshQueuePayloadsForPrompt(promptId: string): void {
    const prompt = this.detachedPrompts.find(p => p.id === promptId);

    if (!prompt) {
      return;
    }

    for (const item of this.executionQueue) {
      if (item.type === "prompt" && item.sourceId === promptId && !item.parentTaskId) {
        item.title = prompt.title;
        item.payload = this.buildPromptPayload(prompt);
      }
    }
  }

  private buildTaskPayload(task: TaskItem): string {
    const taskReferences = task.references
      .map(r => `- ${r.label}: ${r.uri}`)
      .join("\n");

    const prompts = task.prompts
      .map((prompt, index) => {
        const promptRefs = prompt.references
          .map(r => `  - ${r.label}: ${r.uri}`)
          .join("\n");

        return [
          `PROMPT ${index + 1}: ${prompt.title}`,
          prompt.content,
          promptRefs ? `Prompt References:\n${promptRefs}` : "Prompt References: none"
        ].join("\n");
      })
      .join("\n\n");

    const criteria = task.acceptanceCriteria
      .map((criterion, index) => `${index + 1}. [${criterion.status}] ${criterion.text}`)
      .join("\n");

    return [
      "# PromptManager Agent Execution Task",
      "",
      "You are receiving a structured task from PromptManager.",
      "You must run this as a two-step agent cycle: IMPLEMENTATION first, VALIDATION second.",
      "",
      "## Task Metadata",
      `Title: ${task.title}`,
      `Category: ${task.category}`,
      `Current PromptManager Status: ${task.status}`,
      `Auto Next Enabled: ${this.autoSendNext ? "YES" : "NO"}`,
      "",
      "## References",
      taskReferences || "No task-level references provided.",
      "",
      "## STEP 1 — IMPLEMENTATION",
      "Work through the prompts below in order.",
      "Make the required project changes.",
      "Do not validate yet until implementation is complete.",
      "",
      prompts || "No prompts were provided.",
      "",
      "When implementation is complete, internally flag this task as:",
      "",
      "PROMPTMANAGER_TASK_STATE: IMPLEMENTED",
      "",
      "Then immediately continue to STEP 2.",
      "",
      "## STEP 2 — ACCEPTANCE CRITERIA TESTING PROMPT",
      "Now run this as a second validation prompt/action:",
      "",
      "Validate the implementation against every acceptance criterion below.",
      "Use code inspection, tests, build checks, and project context where possible.",
      "Do not mark DONE unless every criterion passes.",
      "",
      criteria || "No acceptance criteria were provided.",
      "",
      "## REQUIRED VALIDATION RESULT",
      "",
      "Return this exact structure at the end:",
      "",
      "PROMPTMANAGER_IMPLEMENTATION_SUMMARY:",
      "- Files changed",
      "- Systems touched",
      "- Important decisions",
      "",
      "PROMPTMANAGER_ACCEPTANCE_RESULTS:",
      "- Criterion 1: PASS/FAIL/UNKNOWN — explanation",
      "- Criterion 2: PASS/FAIL/UNKNOWN — explanation",
      "",
      "PROMPTMANAGER_FINAL_STATUS:",
      "DONE = all criteria passed",
      "IN_PROGRESS = implementation exists but more work is needed",
      "FAILED = blocked, broken, or criteria failed",
      "",
      "PROMPTMANAGER_NEXT_ACTION:",
      this.autoSendNext
        ? "If DONE, continue with the next queued PromptManager item. If IN_PROGRESS or FAILED, stop and explain what must be fixed."
        : "Do not continue automatically. Stop after reporting the final status.",
      "",
      "IMPORTANT:",
      "The validation step is mandatory.",
      "Do not skip acceptance criteria.",
      "If something cannot be verified, mark it UNKNOWN and do not claim DONE."
    ].join("\n");
  }

  private buildPromptPayload(prompt: PromptItem, task?: TaskItem): string {
    const promptReferences = prompt.references
      .map(r => `- ${r.label}: ${r.uri}`)
      .join("\n");

    const taskCriteria = task
      ? task.acceptanceCriteria
          .map((criterion, index) => `${index + 1}. [${criterion.status}] ${criterion.text}`)
          .join("\n")
      : "";

    return [
      "# PromptManager Agent Execution Prompt",
      "",
      "You are receiving a structured prompt from PromptManager.",
      "Run it as an agent action, then validate the result if task criteria are available.",
      "",
      task ? "## Parent Task" : "## Detached Prompt",
      task ? `Task: ${task.title}` : "This prompt is not attached to a task.",
      task ? `Task Category: ${task.category}` : "",
      `Auto Next Enabled: ${this.autoSendNext ? "YES" : "NO"}`,
      "",
      "## STEP 1 — EXECUTE PROMPT",
      `Prompt Title: ${prompt.title}`,
      "",
      prompt.content,
      "",
      "## References",
      promptReferences || "No references provided.",
      "",
      task ? "## STEP 2 — VALIDATE AGAINST TASK ACCEPTANCE CRITERIA" : "",
      task ? "After executing the prompt, validate against these criteria:" : "",
      task ? taskCriteria || "No acceptance criteria were provided." : "",
      "",
      "## REQUIRED FINAL RESPONSE",
      "",
      "PROMPTMANAGER_IMPLEMENTATION_SUMMARY:",
      "- What changed",
      "- Files touched",
      "",
      task
        ? [
            "PROMPTMANAGER_ACCEPTANCE_RESULTS:",
            "- Criterion 1: PASS/FAIL/UNKNOWN — explanation",
            "",
            "PROMPTMANAGER_FINAL_STATUS:",
            "DONE = all criteria passed",
            "IN_PROGRESS = more work is needed",
            "FAILED = blocked or criteria failed",
            "",
            "PROMPTMANAGER_NEXT_ACTION:",
            this.autoSendNext
              ? "If DONE, continue with the next queued PromptManager item. Otherwise stop and explain what is needed."
              : "Do not continue automatically. Stop after reporting status."
          ].join("\n")
        : [
            "PROMPTMANAGER_FINAL_STATUS:",
            "DONE = prompt completed successfully",
            "IN_PROGRESS = more work is needed",
            "FAILED = blocked",
            "",
            "PROMPTMANAGER_NEXT_ACTION:",
            this.autoSendNext
              ? "If DONE, continue with the next queued PromptManager item."
              : "Do not continue automatically."
          ].join("\n")
    ].join("\n");
  }
}