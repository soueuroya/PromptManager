import * as vscode from "vscode";
import { ReferenceItem } from "../models";
import { PromptManagerSnapshot, PromptManagerState } from "../state/PromptManagerState";
import { PromptManagerHtmlRenderer } from "./PromptManagerHtmlRenderer";

export class PromptManagerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "promptManagerView";
  private static readonly storageKey = "promptManager.workspaceState";

  private view?: vscode.WebviewView;
  private readonly state = PromptManagerState.createEmpty();
  private readonly renderer = new PromptManagerHtmlRenderer();

  constructor(private readonly context: vscode.ExtensionContext) {
    const snapshot = this.context.workspaceState.get<PromptManagerSnapshot>(
      PromptManagerViewProvider.storageKey
    );

    this.state.load(snapshot);
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    this.refresh();

    webviewView.webview.onDidReceiveMessage(async message => {
      let shouldSave = true;

      switch (message.type) {
        case "createTask":
          this.state.createTask();
          break;

        case "createDetachedPrompt":
          this.state.createDetachedPrompt();
          break;

        case "toggleTask":
          this.state.toggleTask(message.taskId);
          break;

        case "togglePrompt":
          this.state.togglePrompt(message.promptId);
          break;

        case "toggleQueue":
          this.state.isQueueCollapsed = !this.state.isQueueCollapsed;
          break;

        case "toggleAutoSend":
          this.state.autoSendNext = Boolean(message.value);
          break;

        case "updateTaskTitle":
          this.state.updateTaskTitle(message.taskId, message.value);
          break;

        case "updateTaskCategory":
          this.state.updateTaskCategory(message.taskId, message.value);
          break;

        case "updateTaskStatus":
          this.state.updateTaskStatus(message.taskId, message.value);
          break;

        case "createPrompt":
          this.state.createPrompt(message.taskId);
          break;

        case "updatePromptTitle":
          this.state.updatePromptTitle(message.taskId, message.promptId, message.value);
          break;

        case "updatePromptContent":
          this.state.updatePromptContent(message.taskId, message.promptId, message.value);
          break;

        case "updateDetachedPromptTitle":
          this.state.updateDetachedPromptTitle(message.promptId, message.value);
          break;

        case "updateDetachedPromptContent":
          this.state.updateDetachedPromptContent(message.promptId, message.value);
          break;

        case "deletePrompt":
          this.state.deletePrompt(message.taskId, message.promptId);
          break;

        case "deleteDetachedPrompt":
          this.state.deleteDetachedPrompt(message.promptId);
          break;

        case "addAcceptanceCriteria":
          this.state.addAcceptanceCriteria(message.taskId);
          break;

        case "updateAcceptanceCriteria":
          this.state.updateAcceptanceCriteria(message.taskId, message.index, message.value);
          break;

        case "updateCriteriaStatus":
          this.state.updateCriteriaStatus(message.taskId, message.index, message.value);
          break;

        case "deleteAcceptanceCriteria":
          this.state.deleteAcceptanceCriteria(message.taskId, message.index);
          break;

        case "addReferenceToTask":
          await this.addReferenceToTask(message.taskId);
          break;

        case "addReferenceToPrompt":
          await this.addReferenceToPrompt(message.taskId, message.promptId);
          break;

        case "addReferenceToDetachedPrompt":
          await this.addReferenceToDetachedPrompt(message.promptId);
          break;

        case "removeReferenceFromTask":
          this.state.removeReferenceFromTask(message.taskId, message.referenceId);
          break;

        case "removeReferenceFromPrompt":
          this.state.removeReferenceFromPrompt(message.taskId, message.promptId, message.referenceId);
          break;

        case "removeReferenceFromDetachedPrompt":
          this.state.removeReferenceFromDetachedPrompt(message.promptId, message.referenceId);
          break;

        case "addTaskToQueue":
          this.state.addTaskToQueue(message.taskId);
          break;

        case "addPromptToQueue":
          this.state.addPromptToQueue(message.taskId, message.promptId);
          break;

        case "addDetachedPromptToQueue":
          this.state.addDetachedPromptToQueue(message.promptId);
          break;

        case "removeQueueItem":
          this.state.removeQueueItem(message.queueId);
          break;

        case "moveQueueItem":
          this.state.moveQueueItem(message.fromIndex, message.toIndex);
          break;

        case "markQueueItem":
          this.state.markQueueItem(message.queueId, message.value);
          break;

        case "moveTask":
          this.state.moveTask(message.fromIndex, message.toIndex);
          break;

        case "movePrompt":
          this.state.movePrompt(
            message.fromTaskId,
            message.fromPromptId,
            message.toTaskId,
            message.toPromptIndex
          );
          break;

        case "sendNextQueueItem":
          await this.sendNextQueueItem();
          break;

        case "clearQueue":
          this.state.executionQueue = [];
          break;

        case "askAi":
          shouldSave = false;
          vscode.window.showInformationMessage("AI prompt generation will be connected next.");
          break;

        default:
          shouldSave = false;
          break;
      }

      if (shouldSave) {
        await this.save();
      }

      this.refresh();
    });
  }

  public refresh(): void {
    if (!this.view) {
      return;
    }

    this.view.webview.html = this.renderer.render(this.state);
  }

  private async save(): Promise<void> {
    await this.context.workspaceState.update(
      PromptManagerViewProvider.storageKey,
      this.state.toSnapshot()
    );
  }

  private async sendNextQueueItem(): Promise<void> {
    const next = this.state.getNextQueuedItem();

    if (!next) {
      vscode.window.showInformationMessage("No queued item available.");
      return;
    }

    next.status = "active";
    await vscode.env.clipboard.writeText(next.payload);
    await this.save();

    vscode.window.showInformationMessage("Next queue item copied. Paste/drop it into your AI agent.");
  }

  private async addReferenceToTask(taskId: string): Promise<void> {
    const reference = await this.createReference();
    if (!reference) {
      return;
    }

    this.state.addReferenceToTask(taskId, reference);
  }

  private async addReferenceToPrompt(taskId: string, promptId: string): Promise<void> {
    const reference = await this.createReference();
    if (!reference) {
      return;
    }

    this.state.addReferenceToPrompt(taskId, promptId, reference);
  }

  private async addReferenceToDetachedPrompt(promptId: string): Promise<void> {
    const reference = await this.createReference();
    if (!reference) {
      return;
    }

    this.state.addReferenceToDetachedPrompt(promptId, reference);
  }

  private async createReference(): Promise<ReferenceItem | undefined> {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Add as AI Reference"
    });

    if (!selected || selected.length === 0) {
      return undefined;
    }

    const uri = selected[0];
    let type: ReferenceItem["type"] = "unknown";

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      type = stat.type === vscode.FileType.Directory ? "folder" : "file";
    } catch {
      type = "unknown";
    }

    return {
      id: `ref-${Date.now()}`,
      label: uri.path.split("/").pop() || uri.toString(),
      uri: uri.toString(),
      type
    };
  }
}