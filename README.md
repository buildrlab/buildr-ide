# Buildr-IDE

Buildr-IDE is a VS Code extension-first project scaffold. It adds a **Buildr activity bar**, commands, and the **Vibe Mode** webview panel for OpenAI-compatible chat completions.

## Install (VSIX)

1. Download the latest `buildr-ide-*.vsix` from GitHub Releases.
2. In VS Code:
   - `Extensions` → `…` → **Install from VSIX…**
   - or run: `code --install-extension buildr-ide-0.1.0.vsix`

## Features

- **Buildr activity bar** with quick actions.
- **Vibe Mode webview** with provider selection, prompt input, and local adapter calls.
- **Init Project** command to create a per-workspace `buildr-ide.json`.

## Commands

- **Buildr: Init Project** — creates `buildr-ide.json` in the workspace root.
- **Buildr: Open Vibe Mode** — opens the Vibe Mode webview panel.

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

Set the API key through your environment, or store it in user settings (not committed):

```bash
export OPENAI_API_KEY="your-key"
```

## Development

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

### Run locally

1. Open this folder in VS Code.
2. Press `F5` to launch an **Extension Development Host**.
3. Run the **Buildr: Open Vibe Mode** command.

### Build a VSIX

```bash
pnpm vsix
```

## Notes

- No API keys are stored in this repository.
- The provider adapter uses OpenAI-compatible `POST /chat/completions`.
