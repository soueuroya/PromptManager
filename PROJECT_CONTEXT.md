# Project Context

## What is PromptManager

PromptManager is a VS Code extension focused on AI workflow orchestration.

The objective is to help developers organize:

- Tasks
- Prompts
- Validation flows
- Acceptance criteria
- Execution queues
- AI context references

Instead of manually rewriting prompts for AI agents every time.

## Core Idea

The user creates structured development workflows.

Example flow:

1. Create a task
2. Add prompts to the task
3. Add acceptance criteria
4. Add project/file references
5. Queue the task
6. Send or drop queue item into AI agent
7. Agent implements
8. Agent validates acceptance criteria
9. Agent reports status
10. Queue optionally continues automatically

## Current Product Direction

PromptManager is evolving toward:

- AI workflow dashboard
- Prompt orchestration tool
- Agent coordination system
- DAG/task graph system
- AI implementation and validation runtime

The current version is an MVP foundation.

## Current Features

Implemented:

- VS Code Activity Bar integration
- Webview UI
- Task cards
- Nested prompts
- Detached prompts
- Acceptance criteria
- File/folder references
- Execution queue
- Auto-next toggle
- Keep-history queue archive toggle
- Drag/drop interactions
- Workspace persistence
- File-backed workspace persistence
- VSIX packaging

Not implemented yet:

- Direct AI integrations
- Agent adapters
- DAG graph
- Automatic queue progression
- Response parsing
- Team workflow sync

## Important UX Direction

The extension should feel:

- Visual
- Compact
- Modular
- Workflow-oriented

Avoid turning it into:

- Only a tree view
- Only a markdown editor
- Only a prompt list

The experience should feel closer to:

- Workflow boards
- Node systems
- Orchestration tools
- Lightweight AI pipeline editors

## Queue Philosophy

The queue is the most important system.

Queue items should contain enough structured context for an AI agent to:

1. Understand the task
2. Implement changes
3. Validate acceptance criteria
4. Report status
5. Continue workflow execution

Queue payloads are intentionally verbose and structured for AI readability.

Completed queue items are consumed from the active queue. When Keep History is
enabled, completed items are archived in queue history; when it is disabled,
completed items are deleted from the queue.

Every generated task or prompt queue payload must end with a required
`PROMPTMANAGER_STATE_UPDATE_BLOCK`. This block is the machine-readable contract
future response parsing will use for task, prompt, queue, acceptance criteria,
Auto Next, and next-action updates.

The required fields are:

```txt
TASK_STATUS:
PROMPT_STATUS:
QUEUE_STATUS:
ACCEPTANCE_CRITERIA:
- [index] PASS | FAIL | UNKNOWN — explanation
NEXT_QUEUE_ACTION:
AUTO_NEXT_ALLOWED:
```

`DONE` can only be reported when every acceptance criterion is `PASS`.
`UNKNOWN` prevents `DONE`. Auto Next may only continue when it is enabled and
all criteria pass; otherwise the next queue action must be `STOP`.

## Long-Term Vision

PromptManager eventually becomes:

- A multi-agent orchestration layer
- A workflow graph runtime
- An AI development operating system inside VS Code
