# AGENTS.md

## Project

PromptManager is a VS Code extension for managing AI development workflows.

It allows users to create:

- Tasks
- Nested prompts
- Detached prompts
- Acceptance criteria
- File/folder references
- Execution queues for AI agents

The main goal is to help developers prepare structured prompts and task queues that can be dragged or copied into AI agents.

## Required Reading

Before modifying the project, read:

1. AGENTS.md
2. PROJECT_CONTEXT.md
3. ARCHITECTURE.md
4. TASK_GUIDE.md
5. ROADMAP.md

Then inspect the relevant implementation files.

## Important Behavior

PromptManager is not just a prompt list.

It is an AI task orchestration workspace.

Tasks should support this flow:

1. User creates a task.
2. User adds prompts and acceptance criteria.
3. User queues the task or prompt.
4. User sends or drops the queued payload into an AI agent.
5. Agent implements.
6. Agent validates acceptance criteria.
7. Agent reports DONE, IN_PROGRESS, or FAILED.
8. If Auto Next is enabled, the workflow can continue to the next queue item.

## Tech Stack

- VS Code Extension API
- TypeScript
- Webview View Provider
- esbuild
- workspaceState persistence
- VSIX packaging with vsce

## Important Commands

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Package VSIX:

```bash
vsce package
```
