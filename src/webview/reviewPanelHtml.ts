import * as vscode from 'vscode';

export const getReviewPanelHtml = (webview: vscode.Webview, nonce: string): string => {
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>Buildr: Code Review</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --panel: var(--vscode-panel-background, #252526);
      --border: var(--vscode-panel-border, #3c3c3c);
      --fg: var(--vscode-editor-foreground, #cccccc);
      --muted: var(--vscode-descriptionForeground, #888888);
      --accent: var(--vscode-textLink-foreground, #3794ff);
      --critical-bg: rgba(220, 38, 38, 0.12);
      --critical-border: rgba(220, 38, 38, 0.4);
      --warning-bg: rgba(234, 179, 8, 0.12);
      --warning-border: rgba(234, 179, 8, 0.4);
      --suggestion-bg: rgba(34, 197, 94, 0.12);
      --suggestion-border: rgba(34, 197, 94, 0.4);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background: var(--bg);
      padding: 12px 16px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 6px;
    }

    .btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
    }

    .btn:hover { background: var(--panel); }

    .spinner {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 20px 0;
      color: var(--muted);
      font-size: 13px;
    }

    .spinner.visible { display: flex; }

    .spinner-dot {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      color: var(--muted);
      font-size: 13px;
      padding: 20px 0;
      text-align: center;
    }

    .issues { display: grid; gap: 8px; }

    .issue {
      border-radius: 6px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .issue[data-severity="critical"] {
      border-color: var(--critical-border);
      background: var(--critical-bg);
    }

    .issue[data-severity="warning"] {
      border-color: var(--warning-border);
      background: var(--warning-bg);
    }

    .issue[data-severity="suggestion"] {
      border-color: var(--suggestion-border);
      background: var(--suggestion-bg);
    }

    .issue-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
    }

    .issue-header:hover { opacity: 0.85; }

    .issue-chevron {
      font-size: 10px;
      transition: transform 0.15s ease;
      flex-shrink: 0;
    }

    .issue.expanded .issue-chevron { transform: rotate(90deg); }

    .issue-severity { flex-shrink: 0; }

    .issue-title {
      flex: 1;
      font-weight: 500;
    }

    .issue-body {
      display: none;
      padding: 0 12px 10px 34px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg);
    }

    .issue.expanded .issue-body { display: block; }

    .issue-body pre {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 10px;
      margin-top: 6px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      white-space: pre-wrap;
    }

    .show-fix-btn {
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      margin-top: 6px;
      font-family: inherit;
    }

    .show-fix-btn:hover { background: rgba(55, 148, 255, 0.1); }

    .summary {
      font-size: 12px;
      color: var(--muted);
      padding-top: 8px;
      border-top: 1px solid var(--border);
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h2>Buildr Code Review</h2>
    </div>
    <div class="header-actions">
      <button class="btn" id="copy-btn" title="Copy all issues">Copy all</button>
      <button class="btn" id="clear-btn" title="Clear results">Clear</button>
    </div>
  </div>

  <div id="spinner" class="spinner">
    <div class="spinner-dot"></div>
    <span>Reviewing code...</span>
  </div>

  <div id="empty" class="empty-state">
    Select code and run <strong>Buildr: Review Selection</strong>, or run <strong>Buildr: Review File</strong> to get started.
  </div>

  <div id="issues" class="issues"></div>
  <div id="summary" class="summary" style="display:none;"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const issuesEl = document.getElementById('issues');
    const spinnerEl = document.getElementById('spinner');
    const emptyEl = document.getElementById('empty');
    const summaryEl = document.getElementById('summary');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    let currentIssues = [];

    const severityIcon = (severity) => {
      if (severity === 'critical') return '\\u{1F534}';
      if (severity === 'warning') return '\\u{1F7E1}';
      return '\\u{1F7E2}';
    };

    const renderIssues = (issues) => {
      currentIssues = issues;
      issuesEl.innerHTML = '';

      issues.forEach((issue, idx) => {
        const el = document.createElement('div');
        el.className = 'issue expanded';
        el.dataset.severity = issue.severity || 'suggestion';

        let bodyHtml = '<p>' + escapeHtml(issue.description || '') + '</p>';
        if (issue.fix) {
          bodyHtml += '<button class="show-fix-btn" data-idx="' + idx + '">Show fix</button>';
          bodyHtml += '<pre style="display:none;" id="fix-' + idx + '">' + escapeHtml(issue.fix) + '</pre>';
        }

        el.innerHTML =
          '<div class="issue-header">' +
            '<span class="issue-chevron">&#9654;</span>' +
            '<span class="issue-severity">' + severityIcon(issue.severity) + '</span>' +
            '<span class="issue-title">' + escapeHtml(issue.title || 'Issue') + '</span>' +
          '</div>' +
          '<div class="issue-body">' + bodyHtml + '</div>';

        el.querySelector('.issue-header').addEventListener('click', () => {
          el.classList.toggle('expanded');
        });

        const fixBtn = el.querySelector('.show-fix-btn');
        if (fixBtn) {
          fixBtn.addEventListener('click', () => {
            const pre = document.getElementById('fix-' + idx);
            if (pre) {
              pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
              fixBtn.textContent = pre.style.display === 'none' ? 'Show fix' : 'Hide fix';
            }
          });
        }

        issuesEl.appendChild(el);
      });

      const critCount = issues.filter(i => i.severity === 'critical').length;
      const warnCount = issues.filter(i => i.severity === 'warning').length;
      const sugCount = issues.filter(i => i.severity === 'suggestion').length;

      if (issues.length > 0) {
        summaryEl.style.display = 'block';
        summaryEl.textContent = issues.length + ' issue' + (issues.length === 1 ? '' : 's') +
          ' found: ' + critCount + ' critical, ' + warnCount + ' warning, ' + sugCount + ' suggestion';
      } else {
        summaryEl.style.display = 'block';
        summaryEl.textContent = 'No issues found. Code looks good!';
      }
    };

    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const clear = () => {
      currentIssues = [];
      issuesEl.innerHTML = '';
      summaryEl.style.display = 'none';
      emptyEl.style.display = 'block';
    };

    clearBtn.addEventListener('click', clear);

    copyBtn.addEventListener('click', () => {
      if (!currentIssues.length) return;
      const text = currentIssues.map((issue) => {
        const icon = severityIcon(issue.severity);
        let line = icon + ' [' + (issue.severity || 'suggestion').toUpperCase() + '] ' + (issue.title || 'Issue');
        line += '\\n   ' + (issue.description || '');
        if (issue.fix) line += '\\n   Fix: ' + issue.fix;
        return line;
      }).join('\\n\\n');
      vscode.postMessage({ type: 'copy', text: text });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;

      if (msg.type === 'loading') {
        emptyEl.style.display = 'none';
        spinnerEl.classList.add('visible');
        issuesEl.innerHTML = '';
        summaryEl.style.display = 'none';
        return;
      }

      if (msg.type === 'result') {
        spinnerEl.classList.remove('visible');
        emptyEl.style.display = 'none';
        renderIssues(msg.issues || []);
        return;
      }

      if (msg.type === 'error') {
        spinnerEl.classList.remove('visible');
        emptyEl.style.display = 'none';
        issuesEl.innerHTML = '<div class="empty-state" style="color:#f87171;">' + escapeHtml(msg.message || 'Review failed.') + '</div>';
        return;
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
};
