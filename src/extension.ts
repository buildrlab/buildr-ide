import * as vscode from 'vscode';
import * as path from 'node:path';
import { access, writeFile } from 'node:fs/promises';
import { buildInitConfig } from './core/config';
import { createChatCompletion } from './core/provider';
import { normalizeModel, normalizeProviders } from './core/settings';
import { BuildrProviderConfig } from './core/types';
import { getVibeModeHtml } from './webview/vibeModeHtml';
import { getReviewPanelHtml } from './webview/reviewPanelHtml';
import { reviewCode, ReviewIssue } from './review/reviewer';

export const activate = (context: vscode.ExtensionContext): void => {
  const viewProvider = new BuildrViewProvider();
  const statusBarItem = createStatusBarItem();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('buildr.view', viewProvider),
    vscode.commands.registerCommand('buildr.initProject', () => initProject()),
    vscode.commands.registerCommand('buildr.openVibeMode', () => VibeModePanel.createOrShow(context.extensionUri)),
    vscode.commands.registerCommand('buildr.reviewSelection', () => runReview(context, 'selection')),
    vscode.commands.registerCommand('buildr.reviewFile', () => runReview(context, 'file')),
    vscode.commands.registerCommand('buildr.reviewFromStatusBar', () => runReviewFromStatusBar(context)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('buildr') && VibeModePanel.currentPanel) {
        VibeModePanel.currentPanel.postInit();
      }
    }),
    statusBarItem
  );

  registerAutoReview(context);
};

export const deactivate = (): void => undefined;

// ── Status bar ──────────────────────────────────────────────────────

const createStatusBarItem = (): vscode.StatusBarItem => {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.text = '$(shield) Buildr Review';
  item.command = 'buildr.reviewFromStatusBar';
  item.tooltip = 'Run AI code review (selection or file)';
  item.show();
  return item;
};

const runReviewFromStatusBar = (context: vscode.ExtensionContext): void => {
  const editor = vscode.window.activeTextEditor;
  if (editor && !editor.selection.isEmpty) {
    void runReview(context, 'selection');
  } else {
    void runReview(context, 'file');
  }
};

// ── Auto-review on save ─────────────────────────────────────────────

const registerAutoReview = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const config = vscode.workspace.getConfiguration('buildrIde');
      if (config.get<boolean>('review.autoReview', false)) {
        void runReview(context, 'file', document);
      }
    })
  );
};

// ── Review logic ────────────────────────────────────────────────────

const runReview = async (
  context: vscode.ExtensionContext,
  mode: 'selection' | 'file',
  savedDocument?: vscode.TextDocument
): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  const document = savedDocument ?? editor?.document;

  if (!document) {
    vscode.window.showErrorMessage('Buildr: no active editor.');
    return;
  }

  const config = vscode.workspace.getConfiguration('buildr');
  const reviewConfig = vscode.workspace.getConfiguration('buildrIde');
  const providers = normalizeProviders(config.get('providers'));
  const reviewModel = reviewConfig.get<string>('review.model') ?? normalizeModel(config.get('model'));
  const maxLines = reviewConfig.get<number>('review.maxLines', 200);
  const provider = providers[0];

  if (!provider) {
    vscode.window.showErrorMessage('Buildr: no providers configured.');
    return;
  }

  const apiKey = provider.apiKey ?? process.env[provider.apiKeyEnvVar];
  if (!apiKey) {
    vscode.window.showErrorMessage(`Buildr: missing API key. Set ${provider.apiKeyEnvVar} in your environment.`);
    return;
  }

  const language = document.languageId;
  let code: string;
  let contextLines: string | undefined;
  let truncated = false;

  if (mode === 'selection' && editor && !editor.selection.isEmpty) {
    const selection = editor.selection;
    code = document.getText(selection);

    // Grab surrounding context (10 lines above/below)
    const startLine = Math.max(0, selection.start.line - 10);
    const endLine = Math.min(document.lineCount - 1, selection.end.line + 10);
    const aboveRange = new vscode.Range(startLine, 0, selection.start.line, 0);
    const belowRange = new vscode.Range(selection.end.line + 1, 0, endLine + 1, 0);
    const above = document.getText(aboveRange).trim();
    const below = document.getText(belowRange).trim();
    contextLines = [above, '/* ... selected code ... */', below].filter(Boolean).join('\n');
  } else {
    const totalLines = document.lineCount;
    if (totalLines > maxLines) {
      code = document.getText(new vscode.Range(0, 0, maxLines, 0));
      truncated = true;
    } else {
      code = document.getText();
    }
  }

  if (!code.trim()) {
    vscode.window.showWarningMessage('Buildr: no code to review.');
    return;
  }

  // Show review panel
  const panel = ReviewPanel.createOrShow(context.extensionUri);
  panel.postLoading();

  try {
    const issues = await reviewCode({
      code,
      language,
      context: contextLines,
      baseUrl: provider.baseUrl,
      apiKey,
      model: reviewModel
    });

    panel.postResult(issues, truncated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review failed.';
    panel.postError(message);
  }
};

// ── Init project ────────────────────────────────────────────────────

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

// ── Tree view ───────────────────────────────────────────────────────

class BuildrViewProvider implements vscode.TreeDataProvider<BuildrItem> {
  private readonly items: BuildrItem[] = [
    new BuildrItem('Open Vibe Mode', 'buildr.openVibeMode'),
    new BuildrItem('Init Project', 'buildr.initProject'),
    new BuildrItem('Review Selection', 'buildr.reviewSelection'),
    new BuildrItem('Review File', 'buildr.reviewFile')
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

// ── Review panel ────────────────────────────────────────────────────

class ReviewPanel {
  public static currentPanel: ReviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri): ReviewPanel {
    if (ReviewPanel.currentPanel) {
      ReviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      return ReviewPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'buildr.review',
      'Buildr: Code Review',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    ReviewPanel.currentPanel = new ReviewPanel(panel, extensionUri);
    return ReviewPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri) {
    this.panel = panel;

    const nonce = getNonce();
    this.panel.webview.html = getReviewPanelHtml(this.panel.webview, nonce);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message?.type === 'copy' && typeof message.text === 'string') {
          void vscode.env.clipboard.writeText(message.text).then(() => {
            vscode.window.showInformationMessage('Buildr: review copied to clipboard.');
          });
        }
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public postLoading(): void {
    void this.panel.webview.postMessage({ type: 'loading' });
  }

  public postResult(issues: ReviewIssue[], truncated: boolean): void {
    void this.panel.webview.postMessage({
      type: 'result',
      issues,
      truncated
    });
  }

  public postError(message: string): void {
    void this.panel.webview.postMessage({ type: 'error', message });
  }

  private dispose(): void {
    ReviewPanel.currentPanel = undefined;
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

// ── Vibe Mode panel ─────────────────────────────────────────────────

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
