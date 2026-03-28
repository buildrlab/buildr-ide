# Buildr-IDE

Buildr-IDE &mdash; AI-powered VS Code extension for BuildrLab developers

[![CI](https://github.com/buildrlab/buildr-ide/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/buildrlab/buildr-ide/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![VS Code Extension](https://img.shields.io/badge/VS_Code-Extension-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/api)
[![License](https://img.shields.io/github/license/buildrlab/buildr-ide)](LICENSE)

## What it is

Buildr-IDE is a VS Code extension with Vibe Mode (AI chat panel), provider selection, and project scaffolding. Think GitHub Copilot + Replit AI, self-hosted and provider-agnostic.

## Key features

- Vibe Mode webview with OpenAI-compatible providers and model selection
- Buildr activity bar for quick access
- Init Project command for workspace scaffolding
- No vendor lock-in: bring your own provider and API keys

## Installation

### VSIX (recommended for now)

1. Download the latest `buildr-ide-*.vsix` from GitHub Releases.
2. In VS Code:
   - Extensions -> ... -> Install from VSIX...
   - or run: `code --install-extension buildr-ide-0.1.0.vsix`

### Marketplace

Marketplace listing is coming soon.

## Configuration

Settings live under the `buildr` namespace.

```json
{
  "buildr.providers": [
    {
      "id": "openai",
      "label": "OpenAI Compatible",
      "baseUrl": "https://api.openai.com/v1",
      "apiKeyEnvVar": "OPENAI_API_KEY",
      "apiKey": ""
    }
  ],
  "buildr.model": "gpt-4o-mini"
}
```

Store API keys in your environment or user settings (do not commit them):

```bash
export OPENAI_API_KEY="your-key"
```

## Development setup

1. `pnpm install`
2. `pnpm compile` (TypeScript build; see scripts below)
3. Press `F5` to launch the Extension Development Host.

## Available scripts

| Script  | Purpose                     | Command                                           |
| ------- | --------------------------- | ------------------------------------------------- |
| compile | TypeScript build (tsc)      | `pnpm exec tsc -p tsconfig.json`                  |
| watch   | TypeScript watch            | `pnpm exec tsc -w -p tsconfig.json`               |
| test    | Unit tests (vitest)         | `pnpm test`                                       |
| package | Build a VSIX                | `npx --yes @vscode/vsce package --no-dependencies` |

## How it compares to GitHub Codespaces and Replit

Buildr-IDE stays lightweight and extension-first: it runs inside your local VS Code, keeps your code local, and lets you bring any OpenAI-compatible provider. No vendor lock-in and no hosted IDE requirement.

## Commands

- Buildr: Init Project - creates `buildr-ide.json` in the workspace root
- Buildr: Open Vibe Mode - opens the Vibe Mode webview panel
