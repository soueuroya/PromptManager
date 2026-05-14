# Architecture

## Current Structure

```txt
root/
 |-- media/
 |   |-- icon.png
 |   `-- icon.svg
 |
 |-- src/
 |   |-- extension.ts
 |   |-- models.ts
 |   |
 |   |-- state/
 |   |   `-- PromptManagerState.ts
 |   |
 |   `-- ui/
 |       |-- PromptManagerViewProvider.ts
 |       `-- PromptManagerHtmlRenderer.ts
 |
 |-- dist/
 |   `-- extension.js
 |
 |-- AGENTS.md
 |-- PROJECT_CONTEXT.md
 |-- ARCHITECTURE.md
 |-- TASK_GUIDE.md
 |-- ROADMAP.md
 |
 |-- package.json
 |-- tsconfig.json
 |-- esbuild.js
 |-- README.md
 |-- CHANGELOG.md
 `-- LICENSE
```

## Layer Responsibilities

### extension.ts

Registers the VS Code extension.

Responsibilities:

- Activate extension
- Register webview provider
- Connect VS Code lifecycle

Should remain minimal.

### models.ts

Contains all shared data structures.

Examples:

- TaskItem
- PromptItem
- AcceptanceCriterion
- ExecutionQueueItem
- ReferenceItem

Rules:

- Keep serializable
- Avoid logic
- Avoid VS Code APIs

Persistence depends on these models remaining stable.

### PromptManagerState.ts

Main business logic runtime.

Responsibilities:

- Task creation/update/delete
- Prompt creation/update/delete
- Queue orchestration
- Payload generation
- Acceptance criteria logic
- Queue progression
- Auto-next behavior
- Persistence snapshots
- State recalculation

This is the core orchestration layer.

Rules:

- No HTML generation
- No VS Code APIs
- No webview code

### PromptManagerViewProvider.ts

Bridge between:

- VS Code
- Webview
- State layer

Responsibilities:

- Receive postMessage events
- Route commands to state
- Save/load persistence
- Clipboard interactions
- File/folder picker
- Refresh rendering

Rules:

- Avoid business logic
- Mostly orchestration

### PromptManagerHtmlRenderer.ts

Webview rendering layer.

Responsibilities:

- HTML generation
- CSS
- Webview client-side JS
- Drag/drop UI
- Cards
- Queue panel
- Inline editing

Rules:

- Avoid persistence logic
- Avoid business logic
- Avoid VS Code APIs

## Data Flow

```txt
User Interaction
    |
    v
Webview JS
    |
    v
postMessage()
    |
    v
PromptManagerViewProvider
    |
    v
PromptManagerState
    |
    v
workspaceState save
    |
    v
Renderer rebuild
    |
    v
UI refresh
```

## Persistence

Current persistence uses both VS Code workspace state and optional file-backed workspace files.

Primary VS Code storage uses:

```txt
context.workspaceState
```

Storage key:

```txt
promptManager.workspaceState
```

This keeps state per VS Code workspace.

File-backed persistence uses:

```txt
.promptmanager/
 |-- tasks.json
 |-- queue.json
 |-- workflows/
 `-- templates/
```

`tasks.json` stores tasks and detached prompts.

`queue.json` stores the execution queue and queue UI/runtime flags.

The webview provider also supports exporting the entire PromptManager snapshot into one JSON file and importing it later. This is the sharing format for moving tasks, prompts, criteria, references, and queue state between workspaces or users.

### Important Persistence Rule

Changes to models or snapshots can break existing saved workspaces.

If changing persistence structure:

- Preserve backwards compatibility
- Or add migration logic

Avoid silently breaking user data.

## package.json Responsibilities

`package.json` controls:

- Activation events
- Activity bar registration
- Extension metadata
- VSIX packaging metadata
- Commands
- View containers

Important IDs that should not change casually:

- `promptManager`
- `promptManagerView`

Changing them can break:

- Persistence
- Activation
- Sidebar registration

## Build System

Build pipeline:

```txt
TypeScript
    |
    v
esbuild.js
    |
    v
dist/extension.js
    |
    v
vsce package
    |
    v
.vsix
```

## Packaging

VSIX packaging uses:

```bash
vsce package
```

Before packaging:

```bash
npm run compile
```

Always ensure:

- Media files exist
- Icons resolve correctly
- Dist build exists
- No TypeScript errors
- No lint errors

## Design Philosophy

Architecture should remain:

- Modular
- Scalable
- Incremental
- Serialization-safe
- AI-agent-friendly

Avoid:

- Giant monolithic files
- Duplicated logic
- Tight coupling
- Mixing UI and state logic
