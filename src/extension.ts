import * as vscode from 'vscode';
import * as path from 'node:path';
import { access, writeFile } from 'node:fs/promises';
import { buildInitConfig } from './core/config';
import { createChatCompletion } from './core/provider';
import { normalizeModel, normalizeProviders } from './core/settings';
import { BuildrProviderConfig } from './core/types';
import { getVibeModeHtml } from './webview/vibeModeHtml';

export const activate = (context: vscode.ExtensionContext): void => {
  const viewProvider = new BuildrViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('buildr.view', viewProvider),
    vscode.commands.registerCommand('buildr.initProject', () => initProject()),
    vscode.commands.registerCommand('buildr.openVibeMode', () => VibeModePanel.createOrShow(context.extensionUri)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('buildr') && VibeModePanel.currentPanel) {
        VibeModePanel.currentPanel.postInit();
      }
    })
  );
};

export const deactivate = (): void => undefined;

const initProject = async (): Promise<void> => {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage('Buildr: open a workspace folder before initializing.');
    return;
  }

  const configPath = path.join(workspace.uri.fsPath, 'buildr-ide.json');

  try {
    await access(configPath);
    vscode.window.showInformationMessage('Buildr: buildr-ide.json already exists.');
    return;
  } catch {
    // File does not exist yet.
  }

  const config = buildInitConfig(workspace.name);

  try {
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    vscode.window.showInformationMessage('Buildr: project initialized.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to write buildr-ide.json.';
    vscode.window.showErrorMessage(`Buildr: ${message}`);
  }
};

class BuildrViewProvider implements vscode.TreeDataProvider<BuildrItem> {
  private readonly items: BuildrItem[] = [
    new BuildrItem('Open Vibe Mode', 'buildr.openVibeMode'),
    new BuildrItem('Init Project', 'buildr.initProject')
  ];

  getTreeItem(element: BuildrItem): vscode.TreeItem {
    return element;
  }

  getChildren(): BuildrItem[] {
    return this.items;
  }
}

class BuildrItem extends vscode.TreeItem {
  constructor(label: string, command: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = { command, title: label };
  }
}

class VibeModePanel {
  public static currentPanel: VibeModePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (VibeModePanel.currentPanel) {
      VibeModePanel.currentPanel.panel.reveal(column);
      VibeModePanel.currentPanel.postInit();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'buildr.vibeMode',
      'Buildr: Vibe Mode',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    VibeModePanel.currentPanel = new VibeModePanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    const nonce = getNonce();
    this.panel.webview.html = getVibeModeHtml(this.panel.webview, nonce);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message?.type === 'ready') {
          this.postInit();
          return;
        }
        if (message?.type === 'run') {
          void this.runPrompt(message.prompt, message.providerId);
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public postInit(): void {
    const config = vscode.workspace.getConfiguration('buildr');
    const providers = normalizeProviders(config.get('providers'));
    const model = normalizeModel(config.get('model'));

    void this.panel.webview.postMessage({
      type: 'init',
      providers,
      model
    });
  }

  private async runPrompt(prompt: string, providerId?: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('buildr');
    const providers = normalizeProviders(config.get('providers'));
    const model = normalizeModel(config.get('model'));
    const provider = selectProvider(providers, providerId);

    if (!provider) {
      void this.panel.webview.postMessage({
        type: 'error',
        message: 'No providers configured. Update buildr.providers in settings.'
      });
      return;
    }

    const apiKey = provider.apiKey ?? process.env[provider.apiKeyEnvVar];
    if (!apiKey) {
      void this.panel.webview.postMessage({
        type: 'error',
        message: `Missing API key. Set buildr.providers.apiKey or ${provider.apiKeyEnvVar} in your environment.`
      });
      return;
    }

    try {
      const content = await createChatCompletion({
        baseUrl: provider.baseUrl,
        apiKey,
        model,
        prompt
      });

      void this.panel.webview.postMessage({
        type: 'result',
        text: content
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      void this.panel.webview.postMessage({
        type: 'error',
        message
      });
    }
  }

  private dispose(): void {
    VibeModePanel.currentPanel = undefined;

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

const selectProvider = (
  providers: BuildrProviderConfig[],
  providerId?: string
): BuildrProviderConfig | undefined => {
  if (!providers.length) {
    return undefined;
  }

  if (!providerId) {
    return providers[0];
  }

  return providers.find((provider) => provider.id === providerId) ?? providers[0];
};

const getNonce = (): string => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let index = 0; index < 16; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
};
