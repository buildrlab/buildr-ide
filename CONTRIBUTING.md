# Contributing to Buildr-IDE

Thanks for helping improve Buildr-IDE. This project is a VS Code extension written in TypeScript with strict compiler settings.

## Project overview

- Extension-first workflow for AI-powered assistance in VS Code
- TypeScript strict mode across the codebase
- No `any` types (use `unknown` plus narrowing instead)

## Development setup

1. `pnpm install`
2. `pnpm compile` (TypeScript build; see README for script details)
3. Open the repo in VS Code and press `F5` to launch the Extension Development Host.

## Branch naming

Use one of the following prefixes:

- `feat/` for new features
- `fix/` for bug fixes
- `chore/` for maintenance work
- `docs/` for documentation changes

Example: `feat/vibe-mode-history`

## Pull request process

- Always target the `dev` branch.
- Keep PRs focused and small when possible.
- Describe user-facing changes clearly and include screenshots for UI updates.

## Commit style

Use Conventional Commits, for example:

- `feat: add provider presets`
- `fix: handle empty model selection`
- `chore: update tooling`
- `docs: clarify setup steps`

## TypeScript strict policy

- Do not introduce `any`.
- Prefer `unknown`, explicit interfaces, and type guards.

## Testing

Run unit tests with Vitest:

- `pnpm test`
