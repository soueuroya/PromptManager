import * as vscode from "vscode";
import { PromptManagerViewProvider } from "./ui/PromptManagerViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new PromptManagerViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PromptManagerViewProvider.viewType,
      provider
    )
  );

  console.log("PromptManager activated");
}

export function deactivate() {
  console.log("PromptManager deactivated");
}