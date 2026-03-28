import * as vscode from 'vscode';

export const getVibeModeHtml = (webview: vscode.Webview, nonce: string, poweredBySrc: string): string => {
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>Buildr: Vibe Mode</title>
  <style>
    :root {
      --bg: #f4f0e6;
      --bg-2: #e4f1e8;
      --panel: #ffffff;
      --ink: #1c1a16;
      --muted: #5d5a52;
      --accent: #0f766e;
      --accent-2: #14b8a6;
      --ring: rgba(15, 118, 110, 0.35);
      --shadow: rgba(28, 26, 22, 0.12);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
      color: var(--ink);
      background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 55%),
        radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.12), transparent 45%),
        linear-gradient(140deg, var(--bg), var(--bg-2));
      min-height: 100vh;
      padding: 28px;
    }

    .app {
      max-width: 920px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }

    footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
      opacity: 0.9;
    }

    footer img {
      height: 22px;
    }

    header {
      display: grid;
      gap: 6px;
      animation: rise 0.6s ease-out;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 11px;
      color: var(--muted);
    }

    h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--muted);
      max-width: 620px;
      line-height: 1.5;
    }

    .card {
      background: var(--panel);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 12px 30px var(--shadow);
      border: 1px solid rgba(28, 26, 22, 0.08);
      display: grid;
      gap: 14px;
      animation: rise 0.6s ease-out;
      animation-delay: var(--delay, 0s);
      animation-fill-mode: both;
    }

    label {
      font-weight: 600;
      font-size: 14px;
    }

    select,
    textarea,
    input,
    button {
      font-family: inherit;
    }

    select,
    textarea {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(28, 26, 22, 0.2);
      padding: 12px 14px;
      font-size: 14px;
      background: #fdfbf7;
      color: var(--ink);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 4px var(--ring);
    }

    textarea {
      min-height: 160px;
      resize: vertical;
    }

    .meta {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    button {
      border: none;
      background: linear-gradient(120deg, var(--accent), var(--accent-2));
      color: white;
      padding: 10px 18px;
      border-radius: 999px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 8px 18px rgba(15, 118, 110, 0.28);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    button:not(:disabled):hover {
      transform: translateY(-1px);
    }

    .status {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
    }

    .status[data-tone="error"] {
      color: #b42318;
    }

    .status[data-tone="ok"] {
      color: #027a48;
    }

    #output {
      min-height: 140px;
      background: #f7f5f0;
      border-radius: 14px;
      border: 1px dashed rgba(28, 26, 22, 0.2);
      padding: 12px 14px;
      font-size: 14px;
      color: var(--ink);
      white-space: pre-wrap;
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid rgba(15, 118, 110, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 20px auto;
    }

    .spinner-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60px;
    }

    .validation-error {
      color: #b42318;
      font-size: 13px;
      font-weight: 600;
      margin-top: 4px;
      min-height: 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 720px) {
      body {
        padding: 18px;
      }

      h1 {
        font-size: 26px;
      }

      .card {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="eyebrow">Buildr</div>
      <h1>Vibe Mode</h1>
      <p>Pick a provider, craft a prompt, and run it through the local adapter.</p>
    </header>

    <section class="card" style="--delay: 0.1s;">
      <label for="provider-select">Provider</label>
      <select id="provider-select"></select>
      <div class="meta">
        <span id="provider-meta">Loading providers...</span>
        <span id="model-meta"></span>
      </div>
      <button id="attach-context" type="button" style="align-self: start; font-size: 13px; padding: 7px 14px;">📎 Attach file context</button>
      <div id="file-context" style="display:none; background: #f7f5f0; border-radius: 12px; border: 1px solid rgba(28,26,22,0.15); padding: 12px 14px; font-size: 13px;">
        <strong id="file-context-name"></strong>
        <pre style="margin: 8px 0 0; white-space: pre-wrap; max-height: 200px; overflow: auto; font-size: 12px; line-height: 1.4;"><code id="file-context-content"></code></pre>
      </div>
    </section>

    <section class="card" style="--delay: 0.2s;">
      <label for="prompt">Prompt</label>
      <textarea id="prompt" placeholder="Ask Buildr for a vibe check..." maxlength="4000"></textarea>
      <div id="prompt-error" class="validation-error" aria-live="polite"></div>
    </section>

    <section class="card" style="--delay: 0.3s;">
      <div class="action-row">
        <button id="run" type="button">Run</button>
        <span id="status" class="status">Ready.</span>
      </div>
      <div id="output" aria-live="polite"></div>
    </section>

    <footer>
      <img src="${poweredBySrc}" alt="Powered by BuildrLab" />
    </footer>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const selectEl = document.getElementById('provider-select');
    const providerMetaEl = document.getElementById('provider-meta');
    const modelMetaEl = document.getElementById('model-meta');
    const promptEl = document.getElementById('prompt');
    const runButton = document.getElementById('run');
    const statusEl = document.getElementById('status');
    const outputEl = document.getElementById('output');
    const promptErrorEl = document.getElementById('prompt-error');

    let providers = [];
    let model = '';

    const setStatus = (text, tone) => {
      statusEl.textContent = text;
      statusEl.dataset.tone = tone || '';
    };

    const setRunning = (running) => {
      runButton.disabled = running;
      runButton.textContent = running ? 'Running...' : 'Run';
    };

    const updateProviderMeta = () => {
      const selected = providers.find((provider) => provider.id === selectEl.value) || providers[0];
      if (!selected) {
        providerMetaEl.textContent = 'No providers configured.';
        return;
      }
      providerMetaEl.textContent = String(selected.baseUrl) + ' | ' + String(selected.apiKeyEnvVar);
    };

    const renderProviders = () => {
      selectEl.innerHTML = '';
      providers.forEach((provider) => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = String(provider.label) + ' (' + String(provider.baseUrl) + ', ' + String(provider.apiKeyEnvVar) + ')';
        selectEl.appendChild(option);
      });

      if (providers.length > 0) {
        selectEl.value = providers[0].id;
      }
      updateProviderMeta();
    };

    selectEl.addEventListener('change', updateProviderMeta);

    const validatePrompt = (value) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length < 3) {
        return 'Please enter a prompt (minimum 3 characters)';
      }
      if (value.length > 4000) {
        return 'Prompt too long (max 4000 characters)';
      }
      return '';
    };

    const showSpinner = () => {
      outputEl.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    };

    const hideSpinner = (text) => {
      outputEl.textContent = text;
    };

    promptEl.addEventListener('input', () => {
      promptErrorEl.textContent = '';
    });

    runButton.addEventListener('click', () => {
      const prompt = promptEl.value.trim();
      const validationError = validatePrompt(promptEl.value);
      if (validationError) {
        promptErrorEl.textContent = validationError;
        setStatus('Add a prompt to continue.', 'error');
        return;
      }
      promptErrorEl.textContent = '';
      setStatus('Sending prompt...', '');
      setRunning(true);
      showSpinner();
      vscode.postMessage({
        type: 'run',
        prompt,
        providerId: selectEl.value
      });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'init') {
        providers = message.providers || [];
        model = message.model || '';
        renderProviders();
        modelMetaEl.textContent = model ? 'Model: ' + String(model) : '';
        setStatus('Ready.', '');
        return;
      }
      if (message.type === 'result') {
        hideSpinner(message.text || '');
        setStatus('Completed.', 'ok');
        setRunning(false);
        return;
      }
      if (message.type === 'error') {
        hideSpinner(message.message || 'Something went wrong.');
        setStatus('Error.', 'error');
        setRunning(false);
        return;
      }
      if (message.type === 'fileContext') {
        fileContextName.textContent = message.filename || 'No file';
        fileContextContent.textContent = message.content || '';
        fileContextEl.style.display = 'block';
      }
    });

    const attachBtn = document.getElementById('attach-context');
    const fileContextEl = document.getElementById('file-context');
    const fileContextName = document.getElementById('file-context-name');
    const fileContextContent = document.getElementById('file-context-content');

    attachBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'requestFileContext' });
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
};
