# Buildr-IDE — Vision

## What it is
Buildr-IDE is a **VS Code extension-first** “vibe coding OS” for software projects.

It’s not trying to replace VS Code.
It layers:
- a **project-aware workflow** (Plan → Build → Test → PR)
- a **model-agnostic router** (any model/provider)
- **guardrails** that keep changes safe (tests/PRs/policies)

## Why it wins
- Works with upstream VS Code + existing extensions.
- Model choice is a config decision, not a lock-in.
- Opinionated defaults for BuildrLab-style shipping (TypeScript strict, Next.js, AWS Lambda, Terraform).

## MVP (Phase 1)
- Extension with a “Buildr” sidebar panel
- Workspace config: `buildr-ide.json`
- Providers:
  - OpenAI-compatible HTTP adapter (covers OpenAI + local LM Studio/Ollama + many hosted gateways)
- Commands:
  - `Buildr: Init Project`
  - `Buildr: Plan`
  - `Buildr: Build`
  - `Buildr: Test`
  - `Buildr: Create PR` (shells out to `gh`)

## Guardrails (MVP)
- Block obviously dangerous commands by default (rm -rf, terraform apply, etc.)
- Require explicit enablement per workspace

## Phase 2 (sidecar)
- `buildr-ide` local daemon handles secrets + caching + tool execution
- Enables editor-agnostic future (JetBrains, Cursor, etc.)
