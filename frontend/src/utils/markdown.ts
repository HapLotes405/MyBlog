import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

// ============================================================
//  File link detection & custom rendering
// ============================================================

interface FileLinkInfo {
  ext: string;
  icon: string;
  label: string;
  previewable: boolean;
}

const FILE_TYPE_MAP: Record<string, FileLinkInfo> = {
  pdf:  { ext: 'pdf',  icon: '📕', label: 'PDF',   previewable: true },
  doc:  { ext: 'doc',  icon: '📄', label: 'Word',  previewable: false },
  docx: { ext: 'docx', icon: '📄', label: 'Word',  previewable: false },
  xls:  { ext: 'xls',  icon: '📊', label: 'Excel', previewable: false },
  xlsx: { ext: 'xlsx', icon: '📊', label: 'Excel', previewable: false },
  ppt:  { ext: 'ppt',  icon: '📽️', label: 'PPT',   previewable: false },
  pptx: { ext: 'pptx', icon: '📽️', label: 'PPT',   previewable: false },
  md:   { ext: 'md',   icon: '📝', label: 'MD',    previewable: true },
  txt:  { ext: 'txt',  icon: '📃', label: 'TXT',   previewable: true },
  csv:  { ext: 'csv',  icon: '📊', label: 'CSV',   previewable: false },
  json: { ext: 'json', icon: '📋', label: 'JSON',  previewable: false },
  xml:  { ext: 'xml',  icon: '📋', label: 'XML',   previewable: false },
  yaml: { ext: 'yaml', icon: '📋', label: 'YAML',  previewable: false },
  yml:  { ext: 'yml',  icon: '📋', label: 'YAML',  previewable: false },
  zip:  { ext: 'zip',  icon: '📦', label: 'ZIP',   previewable: false },
  rar:  { ext: 'rar',  icon: '📦', label: 'RAR',   previewable: false },
  '7z': { ext: '7z',   icon: '📦', label: '7Z',    previewable: false },
  gz:   { ext: 'gz',   icon: '📦', label: 'GZ',    previewable: false },
  tar:  { ext: 'tar',  icon: '📦', label: 'TAR',   previewable: false },
  log:  { ext: 'log',  icon: '📃', label: 'LOG',   previewable: true },
};

function detectFileLink(href: string): FileLinkInfo | null {
  // Check for /uploads/files/ path
  const match = href.match(/\/uploads\/files\/[^/]+\.(\w+)$/i);
  if (match) {
    const ext = match[1].toLowerCase();
    return FILE_TYPE_MAP[ext] || null;
  }
  // Also match standalone file extensions for direct links
  const extMatch = href.match(/\.(\w+)$/i);
  if (extMatch && FILE_TYPE_MAP[extMatch[1].toLowerCase()]) {
    return FILE_TYPE_MAP[extMatch[1].toLowerCase()];
  }
  return null;
}

// Stack for passing file link state from link_open → link_close
interface StackEntry { fileInfo: FileLinkInfo; href: string; }
const fileLinkStack: StackEntry[] = [];

function pushFileLink(entry: StackEntry) { fileLinkStack.push(entry); }
function popFileLink(): StackEntry | undefined { return fileLinkStack.pop(); }

// ---- MarkdownIt Instance ----
const md = new MarkdownIt({
  html: false,        // 禁用 raw HTML，防止 XSS 和渲染崩溃
  linkify: false,     // 禁用自动链接（2.li 等会被误识别为域名）
  typographer: true,
  breaks: false,
  langPrefix: 'language-',

  highlight: (code: string, lang: string): string => {
    const langName = lang || '';
    let body: string;
    // hljs may be undefined in some browser bundle contexts
    if (langName && typeof hljs !== 'undefined' && hljs && hljs.getLanguage(langName)) {
      try {
        body = hljs.highlight(code, { language: langName, ignoreIllegals: true }).value;
      } catch {
        body = md.utils.escapeHtml(code);
      }
    } else {
      body = md.utils.escapeHtml(code);
    }
    const lines = body.split('\n');
    const nums = lines.map((_, i) => `<span>${i + 1}</span>`).join('\n');
    return [
      `<div class="md-codehead">`,
      `<span>${md.utils.escapeHtml(langName || 'text')}</span>`,
      `<button class="md-codecopy" onclick="var c=this.parentElement.parentElement.querySelector('.md-codepre').textContent;navigator.clipboard.writeText(c);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)">Copy</button>`,
      `</div>`,
      `<div class="md-codebody">`,
      `<pre class="md-codelines">${nums}</pre>`,
      `<pre class="md-codepre"><code>${body}</code></pre>`,
      `</div>`,
    ].join('');
  },
});

// ---- Image renderer (always escape) ----
md.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx];
  const src = token.attrs?.[token.attrIndex('src')][1] || '';
  const alt = token.content || '';
  return `<img src="${md.utils.escapeHtml(src)}" alt="${md.utils.escapeHtml(alt)}" class="md-image" loading="lazy" />`;
};

// ---- Link renderers (file card for known document types, external-link new tab for others) ----
const defaultLinkOpen = md.renderer.rules.link_open || ((tokens: any, idx: any, options: any, env: any, self: any) => self.renderToken(tokens, idx, options));
const defaultLinkClose = md.renderer.rules.link_close || ((tokens: any, idx: any, options: any, env: any, self: any) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  const href = token.attrs?.[hrefIndex]?.[1] || '';

  // Detect file links → suppress normal <a>, render custom card in link_close
  const fileInfo = detectFileLink(href);
  if (fileInfo) {
    pushFileLink({ fileInfo, href });
    return ''; // suppress default opening <a>
  }

  // External links open in new tab
  if (href.startsWith('http')) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
  const entry = popFileLink();
  if (entry) {
    const { fileInfo, href } = entry;
    const safeHref = md.utils.escapeHtml(href);
    const previewAttr = fileInfo.previewable ? ` data-file-preview="true"` : '';
    const dataExt = ` data-file-ext="${md.utils.escapeHtml(fileInfo.ext)}"`;

    // Build file card HTML
    const card = [
      `<a href="${safeHref}" class="md-file-card"${dataExt}${previewAttr} download>`,
        `<span class="md-file-icon">${fileInfo.icon}</span>`,
        `<span class="md-file-info">`,
          `<span class="md-file-name">${md.utils.escapeHtml(href.split('/').pop() || fileInfo.label + ' 文件')}</span>`,
          `<span class="md-file-type">${fileInfo.label} 文件 · 点击下载</span>`,
        `</span>`,
        `<span class="md-file-dl-icon">`,
          `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`,
            `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>`,
            `<polyline points="7 10 12 15 17 10"/>`,
            `<line x1="12" y1="15" x2="12" y2="3"/>`,
          `</svg>`,
        `</span>`,
      `</a>`,
    ].join('');

    // PDF gets server-rendered preview block (no JS needed)
    if (fileInfo.ext === 'pdf') {
      return card + [
        `<details class="md-file-preview">`,
          `<summary>📖 预览 PDF</summary>`,
          `<iframe src="${safeHref}" class="md-file-pdf-preview" title="PDF Preview" loading="lazy"></iframe>`,
        `</details>`,
      ].join('');
    }

    return card;
  }

  return defaultLinkClose(tokens, idx, options, env, self);
};

// ---- Admonition plugin (!!! type "title") ----
md.block.ruler.before('fence', 'admonition', (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const lineText = state.src.slice(pos, max);
  const match = lineText.match(/^!!!\s+(\w+)\s*(?:"([^"]*)")?\s*$/);
  if (!match) return false;
  if (silent) return true;

  const admType = md.utils.escapeHtml(match[1].toLowerCase());
  const admTitle = md.utils.escapeHtml(match[2] || match[1]);
  let nextLine = startLine + 1;
  const bodyLines: string[] = [];
  while (nextLine < endLine) {
    const content = state.getLines(nextLine, nextLine + 1, 4, false);
    if (content.trim() === '') { nextLine++; continue; }
    bodyLines.push(content.trim());
    nextLine++;
  }

  const bodyHtml = md.renderInline(bodyLines.join('\n'));
  const icons: Record<string, string> = {
    tip: '💡', note: '📝', warning: '⚠️', danger: '🔥',
    info: 'ℹ️', success: '✅', question: '❓',
  };

  const token = state.push('html_block', '', 0);
  token.content = `
    <div class="md-admonition md-adm-${admType}">
      <p class="md-admonition-title"><span class="md-admonition-icon">${icons[admType] || '📝'}</span>${admTitle}</p>
      <div class="md-admonition-body">${bodyHtml}</div>
    </div>`;
  state.line = nextLine;
  return true;
});

// ---- Safe renderer (catches markdown-it crashes) ----
export function renderMarkdown(content: string): string {
  if (!content) return '';
  // Clear file link stack before each render
  fileLinkStack.length = 0;
  try {
    const html = md.render(content);
    // Sanity check: if output is suspiciously empty but input wasn't, fallback
    if (!html || (html.length < 3 && content.length > 3)) {
      const reason = !html ? `html is ${JSON.stringify(html)}` : `html.length=${html.length} < 3 && content.length=${content.length} > 3`;
      return `<!-- renderMarkdown SANITY FAIL: ${md.utils.escapeHtml(reason)} --><pre>${md.utils.escapeHtml(content)}</pre>`;
    }
    return html;
  } catch (err) {
    // Return escaped plain text on render failure — embed diagnosis in HTML comment
    const errMsg = err instanceof Error ? (err.message || err.constructor.name) : String(err);
    return `<!-- renderMarkdown CRASH: ${md.utils.escapeHtml(errMsg)} --><pre>${md.utils.escapeHtml(content)}</pre>`;
  }
}

export default md;
