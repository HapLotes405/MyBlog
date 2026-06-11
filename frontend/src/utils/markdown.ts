import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

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
    if (langName && hljs.getLanguage(langName)) {
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

// ---- External links → new tab ----
const defaultLinkOpen = md.renderer.rules.link_open!;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrs?.[token.attrIndex('href')][1] || '';
  if (href.startsWith('http')) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
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
  try {
    const html = md.render(content);
    // Sanity check: if output is suspiciously empty but input wasn't, fallback
    if (!html || html.length < 3 && content.length > 3) {
      return `<pre>${md.utils.escapeHtml(content)}</pre>`;
    }
    return html;
  } catch {
    // Return escaped plain text on render failure
    return `<pre>${md.utils.escapeHtml(content)}</pre>`;
  }
}

export default md;
