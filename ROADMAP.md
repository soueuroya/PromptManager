# Roadmap

## Current MVP

Implemented:

- Webview dashboard
- Task cards
- Nested prompts
- Detached prompts
- Acceptance criteria
- References
- Queue system
- Auto-next toggle
- Workspace persistence
- VSIX packaging

## Next Milestone: Better Queue Runtime

Add richer execution states:

```txt
queued
implementing
implemented
validating
done
failed
blocked
waiting-input
```

Improve:

- Queue progression
- Auto-next behavior
- Payload structure
- Agent status reporting
- Acceptance criteria validation loops

## Future Milestones

### File-Based Persistence

Potential future workspace structure:

```txt
.promptmanager/
 |-- tasks.json
 |-- queue.json
 |-- workflows/
 `-- templates/
```

This would make PromptManager state more portable, reviewable, and shareable.

### Agent Integration

Future systems may include:

- Agent adapters
- Runtime status parsing
- Validation callbacks
- Queue continuation rules
- Multi-agent dispatch

### Graph Workflows

Future architecture may include:

- Runtime graph layer
- Task dependencies
- Branching workflows
- Validators
- Prompt templates

## Product Direction

PromptManager should continue moving toward:

- AI workflow dashboard
- Prompt orchestration tool
- Agent coordination system
- Lightweight workflow graph runtime
