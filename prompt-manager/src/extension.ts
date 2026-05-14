import * as vscode from "vscode";
import { PromptTreeProvider, PMNode } from "./tree/PromptTreeProvider";
import { TaskCategory } from "./models";

export function activate(context: vscode.ExtensionContext) {

	console.log("🔥 PromptManager ACTIVATED");
  const provider = new PromptTreeProvider();

  vscode.window.registerTreeDataProvider("promptExplorer", provider);

  // -------------------------
  // OPEN DASHBOARD
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand("promptManager.openDashboard", () => {
      vscode.window.showInformationMessage("PromptManager opened");
    })
  );

  // -------------------------
  // CREATE TASK
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand("promptManager.createTask", async () => {
      const title = await vscode.window.showInputBox({
        prompt: "Task title"
      });

      if (!title) return;

      provider.addTask(title);
    })
  );

  // -------------------------
  // CREATE PROMPT
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "promptManager.createPrompt",
      async (node: PMNode) => {
        const title = await vscode.window.showInputBox({
          prompt: "Prompt title"
        });

        const content = await vscode.window.showInputBox({
          prompt: "Prompt content"
        });

        if (!title || !content) return;

        provider.addPrompt(node.id, title, content);
      }
    )
  );

  // -------------------------
  // SET CATEGORY
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "promptManager.setTaskCategory",
      async (node: PMNode) => {
        const category = await vscode.window.showQuickPick(
          ["bugfix", "feature", "refactor", "research", "design", "other"],
          { placeHolder: "Select category" }
        );

        if (!category) return;

        provider.setCategory(node.id, category as TaskCategory);
      }
    )
  );

  // -------------------------
  // ACCEPTANCE CRITERIA
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "promptManager.addAcceptanceCriteria",
      async (node: PMNode) => {
        const criteria = await vscode.window.showInputBox({
          prompt: "Acceptance criteria"
        });

        if (!criteria) return;

        provider.addAcceptanceCriteria(node.id, criteria);
      }
    )
  );

  // -------------------------
  // AI HOOK (placeholder)
  // -------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "promptManager.askAiToBuildPrompt",
      async () => {
        vscode.window.showInformationMessage(
          "AI integration coming next (OpenRouter / MCP / Agent)"
        );
      }
    )
  );
}

export function deactivate() {
	console.log("🔥 PromptManager DEACTIVATED");
}