# PromptManager

PromptManager is a VS Code extension for orchestrating AI workflows using structured tasks, prompts, execution queues, references, and acceptance criteria.

It is designed for developers working with AI coding agents such as:

- Claude
- ChatGPT
- Gemini
- Windsurf
- Antigravity
- Continue.dev
- RooCode
- Cline

---

# Features

## Task Management

Create structured tasks with:

- Categories
- Status
- Acceptance criteria
- Nested prompts
- File/folder references

---

## Prompt Queue System

Queue prompts and tasks for execution.

The queue system supports:

- Sequential execution
- Auto-next workflows
- Validation cycles
- Drag & drop prompt delivery

---

## Acceptance Criteria Validation

Tasks can contain validation rules that AI agents should verify after implementation.

PromptManager generates structured prompts that guide the AI through:

1. Implementation
2. Validation
3. Final status reporting

---

## Detached Prompts

Create loose prompts not attached to tasks.

Useful for:

- brainstorming
- code reviews
- architecture planning
- bug investigations

---

## Drag & Drop Workflow

Drag tasks/prompts into AI agents.

PromptManager automatically generates structured execution payloads.

---

## Workspace Persistence

All PromptManager data is saved per VS Code workspace.

---

# Current Status

Current version focuses on:

- local workspace persistence
- queue orchestration
- AI-ready prompt generation
- task validation cycles

Future plans include:

- AI provider integrations
- DAG workflows
- automated agent execution
- multi-agent orchestration
- graph visualization

---

# Development

## Run Extension

```bash
npm install
npm run compile