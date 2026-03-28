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
    vscode.commands.registerCommand('buildr.codeReview', () => codeReview()),
    vscode.commands.registerCommand('buildr.deployProject', () => deployProject()),
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

const deployProject = async (): Promise<void> => {
  const options = [
    'Deploy to Vercel',
    'Deploy to AWS Amplify',
    'Deploy to Netlify',
    'Copy deploy command'
  ] as const;

  const picked = await vscode.window.showQuickPick([...options], {
    placeHolder: 'Select a deploy target'
  });

  if (!picked) {
    return;
  }

  if (picked === 'Copy deploy command') {
    await vscode.env.clipboard.writeText('npx vercel --prod');
    vscode.window.showInformationMessage('Buildr: deploy command copied to clipboard.');
    return;
  }

  const urlMap: Record<string, string> = {
    'Deploy to Vercel': 'https://vercel.com/new',
    'Deploy to AWS Amplify': 'https://console.aws.amazon.com/amplify',
    'Deploy to Netlify': 'https://app.netlify.com'
  };

  const url = urlMap[picked];
  const confirm = await vscode.window.showInformationMessage(
    `Open ${picked.replace('Deploy to ', '')} in browser?`,
    'Open',
    'Cancel'
  );

  if (confirm === 'Open' && url) {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
};

const codeReview = (): void => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Buildr: open a file in the editor first.');
    return;
  }

  const selection = editor.selection;
  const text = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);

  if (!text) {
    vscode.window.showErrorMessage('Buildr: no text available for review.');
    return;
  }

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const panel = vscode.window.createWebviewPanel(
    'buildr.codeReview',
    'Buildr: Code Review',
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Code Review</title>
  <style>
    body { font-family: sans-serif; padding: 20px; color: #1c1a16; background: #f4f0e6; }
    .hint { color: #5d5a52; margin-bottom: 16px; font-size: 14px; }
    pre { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 16px; overflow: auto; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <h2>Code Review</h2>
  <p class="hint">Ready to review — open Vibe Mode and paste this snippet</p>
  <pre><code>${escaped}</code></pre>
</body>
</html>`;
};

class BuildrSection extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly children: BuildrItem[]
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
  }
}

class BuildrItem extends vscode.TreeItem {
  constructor(label: string, command: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = { command, title: label };
  }
}

class BuildrViewProvider implements vscode.TreeDataProvider<BuildrSection | BuildrItem> {
  private readonly sections: BuildrSection[] = [
    new BuildrSection('🤖 AI Tools', [
      new BuildrItem('Vibe Mode', 'buildr.openVibeMode'),
      new BuildrItem('Code Review', 'buildr.codeReview')
    ]),
    new BuildrSection('🚀 Project', [
      new BuildrItem('Init Project', 'buildr.initProject'),
      new BuildrItem('Deploy Project', 'buildr.deployProject')
    ])
  ];

  getTreeItem(element: BuildrSection | BuildrItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: BuildrSection | BuildrItem): (BuildrSection | BuildrItem)[] {
    if (!element) {
      return this.sections;
    }
    if (element instanceof BuildrSection) {
      return element.children;
    }
    return [];
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

    const poweredByUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'assets', 'powered-by-buildrlab.svg')
    );

    this.panel.webview.html = getVibeModeHtml(this.panel.webview, nonce, poweredByUri.toString());

    this.panel.webview.onDidReceiveMessage(
      (message: Record<string, unknown>) => {
        if (message?.type === 'ready') {
          this.postInit();
          return;
        }
        if (message?.type === 'run') {
          void this.runPrompt(message.prompt as string, message.providerId as string | undefined);
          return;
        }
        if (message?.type === 'requestFileContext') {
          this.handleFileContextRequest();
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

  private handleFileContextRequest(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void this.panel.webview.postMessage({
        type: 'fileContext',
        filename: '',
        content: 'No file is currently open in the editor.'
      });
      return;
    }

    const document = editor.document;
    const filename = path.basename(document.fileName);
    const lineCount = Math.min(document.lineCount, 100);
    const range = new vscode.Range(0, 0, lineCount, 0);
    const content = document.getText(range);

    void this.panel.webview.postMessage({
      type: 'fileContext',
      filename,
      content
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
