import {
  AcceptanceCriterion,
  PromptItem,
  ReferenceItem,
  TaskCategory,
  TaskItem,
  TaskStatus
} from "../models";
import { PromptManagerState } from "../state/PromptManagerState";

export class PromptManagerHtmlRenderer {
  public render(state: PromptManagerState): string {
    const queuePayloads: Record<string, string> = {};

    for (const item of state.executionQueue) {
      queuePayloads[item.id] = item.payload;
    }

    for (const item of state.queueHistory) {
      queuePayloads[item.id] = item.payload;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${this.getStyles()}
      </head>

      <body>
        <div class="app">
          <div class="header">
            <div class="title">PromptManager</div>
            <div class="subtitle">
              Build tasks, prompts, references, acceptance criteria, and execution queues for AI agents.
            </div>

            <div class="toolbar">
              <button onclick="post('createTask')">+ Task</button>
              <button onclick="post('createDetachedPrompt')">+ Detached Prompt</button>
              <button onclick="post('saveWorkspaceFiles')">Save Files</button>
              <button onclick="post('loadWorkspaceFiles')">Load Files</button>
              <button onclick="post('exportWorkspaceFile')">Export</button>
              <button onclick="post('importWorkspaceFile')">Import</button>
              <button onclick="post('askAi')">Ask AI</button>
            </div>
          </div>

          <div class="content">
            <div class="section-title">Detached Prompts</div>
            ${this.getDetachedPromptsHtml(state.detachedPrompts)}

            <div class="divider"></div>

            <div class="section-title">Tasks</div>
            ${state.tasks.length > 0 ? this.getTasksHtml(state.tasks) : `<div class="empty-small">No tasks yet.</div>`}
          </div>

          ${this.getQueueHtml(state)}
        </div>

        ${this.getScripts(queuePayloads)}
      </body>
      </html>
    `;
  }

  private getDetachedPromptsHtml(prompts: PromptItem[]): string {
    if (prompts.length === 0) {
      return `<div class="empty-small">No detached prompts yet.</div>`;
    }

    return prompts
      .map(
        prompt => `
          <div
            class="prompt-card detached-prompt-card"
          >
            <div class="prompt-row">
              <button class="collapse-button" onclick="post('togglePrompt', { promptId: '${prompt.id}' })">
                ${prompt.isCollapsed ? "▶" : "▼"}
              </button>

              <span
                class="drag-handle"
                draggable="true"
                title="Drag prompt"
                ondragstart="handlePromptDrag(event, null, '${prompt.id}')"
              >⋮⋮</span>

              <input
                class="prompt-title-input"
                value="${this.escapeHtml(prompt.title)}"
                onchange="post('updateDetachedPromptTitle', { promptId: '${prompt.id}', value: this.value })"
              />

              <button onclick="post('addDetachedPromptToQueue', { promptId: '${prompt.id}' })">Queue</button>
              <button class="danger small-button" onclick="post('deleteDetachedPrompt', { promptId: '${prompt.id}' })">×</button>
            </div>

            <div class="${prompt.isCollapsed ? "hidden" : ""}">
              <textarea
                class="prompt-content-input"
                placeholder="${this.escapeHtml(PromptManagerState.promptContentPlaceholder)}"
                onfocus="clearPromptPlaceholder(this)"
                onchange="post('updateDetachedPromptContent', { promptId: '${prompt.id}', value: this.value })"
              >${this.escapeHtml(prompt.content)}</textarea>

              <div class="section">
                <div class="section-title">References</div>
                ${this.getReferencesHtml(prompt.references, "detachedPrompt", undefined, prompt.id)}
                <button onclick="post('addReferenceToDetachedPrompt', { promptId: '${prompt.id}' })">+ Reference</button>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  private getTasksHtml(tasks: TaskItem[]): string {
    return tasks
      .map((task, taskIndex) => {
        const collapsedClass = task.isCollapsed ? "collapsed" : "";

        return `
          <div
            class="task-card ${collapsedClass}"
            ondragover="allowDrop(event)"
            ondrop="handleTaskDrop(event, ${taskIndex})"
          >
            <div class="task-top">
              <button class="collapse-button" onclick="post('toggleTask', { taskId: '${task.id}' })">
                ${task.isCollapsed ? "▶" : "▼"}
              </button>

              <span
                class="drag-handle"
                draggable="true"
                title="Drag task"
                ondragstart="handleTaskDrag(event, ${taskIndex})"
              >⋮⋮</span>

              <input
                class="task-title-input"
                value="${this.escapeHtml(task.title)}"
                onchange="post('updateTaskTitle', { taskId: '${task.id}', value: this.value })"
              />

              <span class="status-pill ${task.status}">${task.status}</span>
            </div>

            <div class="task-body">
              <select
                class="category-select"
                onchange="post('updateTaskCategory', { taskId: '${task.id}', value: this.value })"
              >
                ${this.getCategoryOptions(task.category)}
              </select>

              <select
                class="status-select"
                onchange="post('updateTaskStatus', { taskId: '${task.id}', value: this.value })"
              >
                ${this.getTaskStatusOptions(task.status)}
              </select>

              <div class="section">
                <div class="section-title">Task References</div>
                ${this.getReferencesHtml(task.references, "task", task.id)}
                <button onclick="post('addReferenceToTask', { taskId: '${task.id}' })">+ Reference</button>
              </div>

              <div class="section">
                <div class="section-title">Prompts</div>
                <div
                  ondragover="allowDrop(event)"
                  ondrop="handlePromptDrop(event, '${task.id}', ${task.prompts.length})"
                >
                  ${this.getTaskPromptsHtml(task)}
                </div>
              </div>

              <div class="section">
                <div class="section-title">Acceptance Criteria</div>
                ${this.getCriteriaHtml(task)}
              </div>

              <div class="actions">
                <button onclick="post('createPrompt', { taskId: '${task.id}' })">+ Prompt</button>
                <button onclick="post('addAcceptanceCriteria', { taskId: '${task.id}' })">+ Criteria</button>
                <button onclick="post('addTaskToQueue', { taskId: '${task.id}' })">Queue Task</button>
                <button onclick="post('askAi', { taskId: '${task.id}' })">Ask AI</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  private getTaskPromptsHtml(task: TaskItem): string {
    if (task.prompts.length === 0) {
      return `
        <div
          class="drop-zone"
          ondragover="allowDrop(event)"
          ondrop="handlePromptDrop(event, '${task.id}', 0)"
        >
          Drop prompts here or create one.
        </div>
      `;
    }

    return task.prompts
      .map(
        (prompt, promptIndex) => `
          <div
            class="prompt-card"
            ondragover="allowDrop(event)"
            ondrop="handlePromptDrop(event, '${task.id}', ${promptIndex})"
          >
            <div class="prompt-row">
              <button class="collapse-button" onclick="post('togglePrompt', { promptId: '${prompt.id}' })">
                ${prompt.isCollapsed ? "▶" : "▼"}
              </button>

              <span
                class="drag-handle"
                draggable="true"
                title="Drag prompt"
                ondragstart="handlePromptDrag(event, '${task.id}', '${prompt.id}')"
              >⋮⋮</span>

              <input
                class="prompt-title-input"
                value="${this.escapeHtml(prompt.title)}"
                onchange="post('updatePromptTitle', { taskId: '${task.id}', promptId: '${prompt.id}', value: this.value })"
              />

              <button onclick="post('addPromptToQueue', { taskId: '${task.id}', promptId: '${prompt.id}' })">Queue</button>
              <button class="danger small-button" onclick="post('deletePrompt', { taskId: '${task.id}', promptId: '${prompt.id}' })">×</button>
            </div>

            <div class="${prompt.isCollapsed ? "hidden" : ""}">
              <textarea
                class="prompt-content-input"
                placeholder="${this.escapeHtml(PromptManagerState.promptContentPlaceholder)}"
                onfocus="clearPromptPlaceholder(this)"
                onchange="post('updatePromptContent', { taskId: '${task.id}', promptId: '${prompt.id}', value: this.value })"
              >${this.escapeHtml(prompt.content)}</textarea>

              <div class="section">
                <div class="section-title">Prompt References</div>
                ${this.getReferencesHtml(prompt.references, "prompt", task.id, prompt.id)}
                <button onclick="post('addReferenceToPrompt', { taskId: '${task.id}', promptId: '${prompt.id}' })">+ Reference</button>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  private getCriteriaHtml(task: TaskItem): string {
    if (task.acceptanceCriteria.length === 0) {
      return `<div class="empty-small">No acceptance criteria yet.</div>`;
    }

    return task.acceptanceCriteria
      .map(
        (criteria, index) => `
          <div class="criteria-row">
            <select
              class="criteria-status ${criteria.status}"
              onchange="post('updateCriteriaStatus', { taskId: '${task.id}', index: ${index}, value: this.value })"
            >
              ${this.getCriteriaStatusOptions(criteria.status)}
            </select>

            <textarea
              class="criteria-input"
              onchange="post('updateAcceptanceCriteria', { taskId: '${task.id}', index: ${index}, value: this.value })"
            >${this.escapeHtml(criteria.text)}</textarea>

            <button class="danger small-button" onclick="post('deleteAcceptanceCriteria', { taskId: '${task.id}', index: ${index} })">×</button>
          </div>
        `
      )
      .join("");
  }

  private getReferencesHtml(
    references: ReferenceItem[],
    ownerType: "task" | "prompt" | "detachedPrompt",
    taskId?: string,
    promptId?: string
  ): string {
    if (references.length === 0) {
      return `<div class="empty-small">No references added.</div>`;
    }

    return references
      .map(ref => {
        let type = "removeReferenceFromDetachedPrompt";
        const payload: Record<string, string | undefined> = {
          promptId,
          referenceId: ref.id
        };

        if (ownerType === "task") {
          type = "removeReferenceFromTask";
          payload.taskId = taskId;
        }

        if (ownerType === "prompt") {
          type = "removeReferenceFromPrompt";
          payload.taskId = taskId;
        }

        return `
          <div class="reference-row">
            <span title="${this.escapeHtml(ref.uri)}">📎 ${this.escapeHtml(ref.label)}</span>
            <button class="danger small-button" onclick='post("${type}", ${JSON.stringify(payload)})'>×</button>
          </div>
        `;
      })
      .join("");
  }

  private getQueueHtml(state: PromptManagerState): string {
    const queueHtml =
      state.executionQueue.length > 0
        ? state.executionQueue
            .map(
              (item, index) => `
                <div
                  class="queue-item ${item.status}"
                  ondragover="allowDrop(event)"
                  ondrop="handleQueueDrop(event, ${index})"
                >
                  <div class="queue-title">
                    <span
                      class="drag-handle"
                      draggable="true"
                      title="Drag queue item"
                      ondragstart="handleQueueDrag(event, ${index}, '${item.id}')"
                    >⋮⋮</span>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    <span class="queue-type">${item.type}</span>
                    <span class="queue-status">${item.status}</span>
                  </div>

                  <div class="queue-actions">
                    <button onclick="copyQueuePayload('${item.id}')">Copy</button>
                    <button onclick="post('markQueueItem', { queueId: '${item.id}', value: 'done' })">Done</button>
                    <button onclick="post('markQueueItem', { queueId: '${item.id}', value: 'failed' })">Failed</button>
                    <button class="danger small-button" onclick="post('removeQueueItem', { queueId: '${item.id}' })">×</button>
                  </div>
                </div>
              `
            )
            .join("")
        : `<div class="empty-small">Queue is empty. Add tasks or prompts to start execution planning.</div>`;
    const historyHtml =
      state.queueHistory.length > 0
        ? `
          <div class="queue-history-header">
            <span>History</span>
            <button class="small-text-button" onclick="post('clearQueueHistory')">Clear History</button>
          </div>
          ${state.queueHistory
            .map(
              item => `
                <div class="queue-item done queue-history-item">
                  <div class="queue-title">
                    <strong>${this.escapeHtml(item.title)}</strong>
                    <span class="queue-type">${item.type}</span>
                    <span class="queue-status">done</span>
                  </div>

                  <div class="queue-actions">
                    <button onclick="copyQueuePayload('${item.id}')">Copy</button>
                    <button class="danger small-button" onclick="post('removeQueueHistoryItem', { queueId: '${item.id}' })">Ã—</button>
                  </div>
                </div>
              `
            )
            .join("")}
        `
        : "";

    return `
      <div class="queue-panel ${state.isQueueCollapsed ? "collapsed" : ""}">
        <div class="queue-header">
          <button class="collapse-button" onclick="post('toggleQueue')">
            ${state.isQueueCollapsed ? "▲" : "▼"}
          </button>

          <strong>Execution Queue</strong>

          <button onclick="post('sendNextQueueItem')">Send Next</button>
          <button onclick="post('clearQueue')">Clear</button>

          <label>
            <input
              type="checkbox"
              ${state.autoSendNext ? "checked" : ""}
              onchange="post('toggleAutoSend', { value: this.checked })"
            />
            Auto next
          </label>

          <label>
            <input
              type="checkbox"
              ${state.keepHistory ? "checked" : ""}
              onchange="post('toggleKeepHistory', { value: this.checked })"
            />
            Keep history
          </label>

          <label>
            <input
              type="checkbox"
              ${state.fullTest ? "checked" : ""}
              onchange="post('toggleFullTest', { value: this.checked })"
            />
            Full Test
          </label>
        </div>

        <div class="queue-body">
          ${queueHtml}
          ${historyHtml}
        </div>
      </div>
    `;
  }

  private getStyles(): string {
    return `
      <style>
        html, body {
          height: 100%;
          overflow: hidden;
        }

        body {
          margin: 0;
          color: var(--vscode-foreground);
          background: var(--vscode-sideBar-background);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
        }

        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          flex: 0 0 auto;
          padding: 12px;
          border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, #333);
        }

        .content {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 12px;
        }

        .queue-panel {
          flex: 0 0 auto;
          max-height: 40vh;
          border-top: 1px solid var(--vscode-sideBarSectionHeader-border, #333);
          background: var(--vscode-editor-background);
        }

        .queue-panel.collapsed .queue-body {
          display: none;
        }

        .queue-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          flex-wrap: wrap;
        }

        .queue-body {
          overflow-y: auto;
          max-height: 32vh;
          padding: 0 12px 12px;
        }

        .title {
          font-size: 16px;
          font-weight: 700;
        }

        .subtitle,
        .empty-small {
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
          line-height: 1.4;
        }

        .toolbar,
        .actions,
        .queue-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        button {
          border: 1px solid var(--vscode-button-border, transparent);
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          padding: 6px 9px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .small-button {
          width: 26px;
          min-width: 26px;
          padding: 4px;
        }

        .danger {
          background: var(--vscode-inputValidation-errorBackground);
          color: var(--vscode-errorForeground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
        }

        .task-card,
        .prompt-card,
        .queue-item {
          border: 1px solid var(--vscode-sideBarSectionHeader-border, #333);
          background: var(--vscode-editor-background);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 12px;
        }

        .queue-history-item {
          opacity: 0.78;
        }

        .queue-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--vscode-descriptionForeground);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 10px 0 6px;
        }

        .small-text-button {
          padding: 3px 6px;
          font-size: 11px;
        }

        .prompt-card {
          border-left: 3px solid var(--vscode-focusBorder);
          background: var(--vscode-input-background);
        }

        .detached-prompt-card {
          border-left-color: var(--vscode-charts-purple, var(--vscode-focusBorder));
        }

        .task-top,
        .prompt-row,
        .criteria-row,
        .queue-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .criteria-row {
          align-items: flex-start;
          margin-bottom: 6px;
        }

        .collapse-button {
          width: 28px;
          min-width: 28px;
          padding: 4px;
          background: var(--vscode-input-background);
          color: var(--vscode-foreground);
        }

        .task-body {
          margin-top: 10px;
        }

        .task-card.collapsed .task-body,
        .hidden {
          display: none;
        }

        input,
        textarea,
        select {
          width: 100%;
          box-sizing: border-box;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border, transparent);
          border-radius: 4px;
          padding: 6px;
          font-family: var(--vscode-font-family);
        }

        textarea {
          resize: vertical;
          min-height: 52px;
        }

        .task-title-input,
        .prompt-title-input {
          font-weight: 700;
        }

        .prompt-content-input {
          min-height: 70px;
        }

        .criteria-input {
          min-height: 44px;
        }

        .section {
          margin-top: 12px;
        }

        .section-title {
          color: var(--vscode-descriptionForeground);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .divider {
          height: 1px;
          background: var(--vscode-sideBarSectionHeader-border, #333);
          margin: 14px 0;
        }

        .status-pill,
        .queue-status,
        .queue-type {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 999px;
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          text-transform: uppercase;
          white-space: nowrap;
        }

        .done,
        .passed {
          outline: 1px solid var(--vscode-testing-iconPassed, #73c991);
        }

        .failed {
          outline: 1px solid var(--vscode-testing-iconFailed, #f14c4c);
        }

        .active,
        .running {
          outline: 1px solid var(--vscode-progressBar-background);
        }

        .drag-handle {
          color: var(--vscode-descriptionForeground);
          cursor: grab;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          width: 18px;
          user-select: none;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .task-card.drag-over,
        .prompt-card.drag-over,
        .queue-item.drag-over,
        .drop-zone.drag-over {
          outline: 1px solid var(--vscode-focusBorder);
        }

        .drop-zone {
          border: 1px dashed var(--vscode-descriptionForeground);
          border-radius: 6px;
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
          padding: 10px;
          text-align: center;
        }

        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }

        label input {
          width: auto;
        }

        .reference-row {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          align-items: center;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          background: var(--vscode-input-background);
          border-radius: 4px;
          padding: 5px;
          margin-bottom: 4px;
        }
      </style>
    `;
  }

  private getScripts(queuePayloads: Record<string, string>): string {
    return `
      <script>
        const vscode = acquireVsCodeApi();
        const queuePayloads = ${JSON.stringify(queuePayloads)};
        const scrollContainerSelectors = [".content", ".queue-body"];
        const promptContentPlaceholder = ${JSON.stringify(PromptManagerState.promptContentPlaceholder)};

        function getPersistedState() {
          return vscode.getState() || {};
        }

        function persistScrollPositions() {
          const currentState = getPersistedState();
          const scrollPositions = { ...(currentState.scrollPositions || {}) };

          for (const selector of scrollContainerSelectors) {
            const element = document.querySelector(selector);

            if (element) {
              scrollPositions[selector] = element.scrollTop;
            }
          }

          vscode.setState({
            ...currentState,
            scrollPositions
          });
        }

        function restoreScrollPositions() {
          const scrollPositions = getPersistedState().scrollPositions || {};

          for (const selector of scrollContainerSelectors) {
            const element = document.querySelector(selector);
            const scrollTop = scrollPositions[selector];

            if (element && typeof scrollTop === "number") {
              element.scrollTop = scrollTop;
            }
          }
        }

        function post(type, data = {}) {
          persistScrollPositions();

          vscode.postMessage({
            type,
            ...data
          });
        }

        function copyQueuePayload(queueId) {
          navigator.clipboard.writeText(queuePayloads[queueId] || "");
        }

        function clearPromptPlaceholder(textarea) {
          if (textarea.value === promptContentPlaceholder) {
            textarea.value = "";
          }
        }

        function allowDrop(event) {
          event.preventDefault();
          event.currentTarget.classList.add("drag-over");
        }

        function handleTaskDrag(event, fromIndex) {
          event.stopPropagation();
          event.dataTransfer.setData("application/json", JSON.stringify({
            kind: "task",
            fromIndex
          }));
        }

        function handleTaskDrop(event, toIndex) {
          event.preventDefault();

          const payload = getPayload(event);
          if (!payload || payload.kind !== "task") {
            return;
          }

          post("moveTask", {
            fromIndex: payload.fromIndex,
            toIndex
          });
        }

        function handlePromptDrag(event, fromTaskId, fromPromptId) {
          event.stopPropagation();
          event.dataTransfer.setData("application/json", JSON.stringify({
            kind: "prompt",
            fromTaskId,
            fromPromptId
          }));
        }

        function handlePromptDrop(event, toTaskId, toPromptIndex) {
          event.preventDefault();
          event.stopPropagation();

          const payload = getPayload(event);
          if (!payload || payload.kind !== "prompt") {
            return;
          }

          post("movePrompt", {
            fromTaskId: payload.fromTaskId,
            fromPromptId: payload.fromPromptId,
            toTaskId,
            toPromptIndex
          });
        }

        function handleQueueDrag(event, fromIndex, queueId) {
          event.stopPropagation();
          event.dataTransfer.setData("application/json", JSON.stringify({
            kind: "queue",
            fromIndex
          }));

          event.dataTransfer.setData("text/plain", queuePayloads[queueId] || "");
        }

        function handleQueueDrop(event, toIndex) {
          event.preventDefault();

          const payload = getPayload(event);
          if (!payload || payload.kind !== "queue") {
            return;
          }

          post("moveQueueItem", {
            fromIndex: payload.fromIndex,
            toIndex
          });
        }

        function getPayload(event) {
          try {
            const raw = event.dataTransfer.getData("application/json");
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }

        document.addEventListener("drop", () => {
          document.querySelectorAll(".drag-over").forEach(element => {
            element.classList.remove("drag-over");
          });
        });

        document.addEventListener("dragleave", event => {
          if (event.target && event.target.classList) {
            event.target.classList.remove("drag-over");
          }
        });

        window.addEventListener("DOMContentLoaded", () => {
          restoreScrollPositions();

          for (const selector of scrollContainerSelectors) {
            const element = document.querySelector(selector);

            if (element) {
              element.addEventListener("scroll", persistScrollPositions, { passive: true });
            }
          }

          requestAnimationFrame(restoreScrollPositions);
        });
      </script>
    `;
  }

  private getCategoryOptions(selected: TaskCategory): string {
    const categories: TaskCategory[] = ["bugfix", "feature", "refactor", "research", "design", "other"];

    return categories
      .map(category => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`)
      .join("");
  }

  private getTaskStatusOptions(selected: TaskStatus): string {
    const statuses: TaskStatus[] = ["todo", "running", "done", "failed"];

    return statuses
      .map(status => `<option value="${status}" ${status === selected ? "selected" : ""}>${status}</option>`)
      .join("");
  }

  private getCriteriaStatusOptions(selected: AcceptanceCriterion["status"]): string {
    const statuses: AcceptanceCriterion["status"][] = ["pending", "passed", "failed"];

    return statuses
      .map(status => `<option value="${status}" ${status === selected ? "selected" : ""}>${status}</option>`)
      .join("");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
