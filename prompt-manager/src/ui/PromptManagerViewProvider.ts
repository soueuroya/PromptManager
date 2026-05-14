import * as vscode from "vscode";
import { ReferenceItem } from "../models";
import { PromptManagerSnapshot, PromptManagerState } from "../state/PromptManagerState";
import { PromptManagerHtmlRenderer } from "./PromptManagerHtmlRenderer";

export class PromptManagerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "promptManagerView";
  private static readonly storageKey = "promptManager.workspaceState";
  private static readonly workspaceFolderName = ".promptmanager";

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
    void this.initializeFilePersistence();

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

        case "toggleKeepHistory":
          this.state.keepHistory = Boolean(message.value);
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

        case "removeQueueHistoryItem":
          this.state.removeQueueHistoryItem(message.queueId);
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

        case "clearQueueHistory":
          this.state.clearQueueHistory();
          break;

        case "saveWorkspaceFiles":
          shouldSave = false;
          await this.saveWorkspaceFiles(true);
          await this.saveWorkspaceState();
          break;

        case "loadWorkspaceFiles":
          shouldSave = false;
          await this.loadWorkspaceFiles(true);
          await this.saveWorkspaceState();
          break;

        case "exportWorkspaceFile":
          shouldSave = false;
          await this.exportWorkspaceFile();
          break;

        case "importWorkspaceFile":
          shouldSave = false;
          await this.importWorkspaceFile();
          await this.save();
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
    await this.saveWorkspaceState();
    await this.saveWorkspaceFiles(false);
  }

  private async saveWorkspaceState(): Promise<void> {
    await this.context.workspaceState.update(
      PromptManagerViewProvider.storageKey,
      this.state.toSnapshot()
    );
  }

  private async initializeFilePersistence(): Promise<void> {
    const root = this.getWorkspaceRoot();

    if (!root) {
      return;
    }

    try {
      const hasFileState = await this.hasWorkspaceFileState(root);
      await this.ensureWorkspacePersistenceStructure(root);

      if (hasFileState) {
        await this.loadWorkspaceFiles(false);
        await this.saveWorkspaceState();
      } else {
        await this.saveWorkspaceFiles(false);
      }

      this.refresh();
    } catch (error) {
      this.showPersistenceError("initialize file persistence", error);
    }
  }

  private async saveWorkspaceFiles(showMessage: boolean): Promise<void> {
    const root = this.getWorkspaceRoot();

    if (!root) {
      if (showMessage) {
        vscode.window.showWarningMessage("Open a workspace folder before saving PromptManager files.");
      }
      return;
    }

    try {
      await this.ensureWorkspacePersistenceStructure(root);
      const snapshot = this.state.toSnapshot();

      await this.writeJson(this.getTasksFileUri(root), {
        version: snapshot.version,
        detachedPrompts: snapshot.detachedPrompts,
        tasks: snapshot.tasks
      });

      await this.writeJson(this.getQueueFileUri(root), {
        version: snapshot.version,
        autoSendNext: snapshot.autoSendNext,
        keepHistory: snapshot.keepHistory,
        isQueueCollapsed: snapshot.isQueueCollapsed,
        executionQueue: snapshot.executionQueue,
        queueHistory: snapshot.queueHistory
      });

      if (showMessage) {
        vscode.window.showInformationMessage("PromptManager workspace files saved.");
      }
    } catch (error) {
      this.showPersistenceError("save PromptManager workspace files", error);
    }
  }

  private async loadWorkspaceFiles(showMessage: boolean): Promise<void> {
    const root = this.getWorkspaceRoot();

    if (!root) {
      if (showMessage) {
        vscode.window.showWarningMessage("Open a workspace folder before loading PromptManager files.");
      }
      return;
    }

    try {
      const tasksFile = await this.readJson<Partial<PromptManagerSnapshot>>(this.getTasksFileUri(root));
      const queueFile = await this.readJson<Partial<PromptManagerSnapshot>>(this.getQueueFileUri(root));
      const current = this.state.toSnapshot();

      this.state.load({
        version: 1,
        autoSendNext: queueFile.autoSendNext ?? current.autoSendNext,
        keepHistory: queueFile.keepHistory ?? current.keepHistory,
        isQueueCollapsed: queueFile.isQueueCollapsed ?? current.isQueueCollapsed,
        detachedPrompts: tasksFile.detachedPrompts ?? current.detachedPrompts,
        tasks: tasksFile.tasks ?? current.tasks,
        executionQueue: queueFile.executionQueue ?? current.executionQueue,
        queueHistory: queueFile.queueHistory ?? current.queueHistory
      });

      if (showMessage) {
        vscode.window.showInformationMessage("PromptManager workspace files loaded.");
      }
    } catch (error) {
      this.showPersistenceError("load PromptManager workspace files", error);
    }
  }

  private async exportWorkspaceFile(): Promise<void> {
    const target = await vscode.window.showSaveDialog({
      defaultUri: this.getWorkspaceRoot()
        ? vscode.Uri.joinPath(this.getWorkspaceRoot()!, "promptmanager-workspace.json")
        : undefined,
      filters: {
        "PromptManager Workspace": ["json"]
      },
      saveLabel: "Export PromptManager Workspace"
    });

    if (!target) {
      return;
    }

    try {
      await this.writeJson(target, this.state.toSnapshot());
      vscode.window.showInformationMessage("PromptManager workspace exported.");
    } catch (error) {
      this.showPersistenceError("export PromptManager workspace", error);
    }
  }

  private async importWorkspaceFile(): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "PromptManager Workspace": ["json"]
      },
      openLabel: "Import PromptManager Workspace"
    });

    if (!selected || selected.length === 0) {
      return;
    }

    try {
      const snapshot = await this.readJson<PromptManagerSnapshot>(selected[0]);
      this.state.load(snapshot);
      vscode.window.showInformationMessage("PromptManager workspace imported.");
    } catch (error) {
      this.showPersistenceError("import PromptManager workspace", error);
    }
  }

  private async ensureWorkspacePersistenceStructure(root: vscode.Uri): Promise<void> {
    const base = this.getPersistenceFolderUri(root);

    await vscode.workspace.fs.createDirectory(base);
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(base, "workflows"));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(base, "templates"));
  }

  private async hasWorkspaceFileState(root: vscode.Uri): Promise<boolean> {
    return (await this.exists(this.getTasksFileUri(root))) || (await this.exists(this.getQueueFileUri(root)));
  }

  private getWorkspaceRoot(): vscode.Uri | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri;
  }

  private getPersistenceFolderUri(root: vscode.Uri): vscode.Uri {
    return vscode.Uri.joinPath(root, PromptManagerViewProvider.workspaceFolderName);
  }

  private getTasksFileUri(root: vscode.Uri): vscode.Uri {
    return vscode.Uri.joinPath(this.getPersistenceFolderUri(root), "tasks.json");
  }

  private getQueueFileUri(root: vscode.Uri): vscode.Uri {
    return vscode.Uri.joinPath(this.getPersistenceFolderUri(root), "queue.json");
  }

  private async exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async readJson<T>(uri: vscode.Uri): Promise<T> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as T;
  }

  private async writeJson(uri: vscode.Uri, value: unknown): Promise<void> {
    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(`${JSON.stringify(value, undefined, 2)}\n`, "utf8")
    );
  }

  private showPersistenceError(action: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Could not ${action}: ${detail}`);
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
