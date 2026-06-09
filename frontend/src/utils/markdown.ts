import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  langPrefix: 'language-',

  highlight: (code: string, lang: string): string => {
    const langName = lang || '';
    let body: string;
    if (langName && hljs.getLanguage(langName)) {
      try {
        body = hljs.highlight(code, { language: langName, ignoreIllegals: true }).value;
      } catch { body = md.utils.escapeHtml(code); }
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

// Images
md.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx];
  const src = token.attrs?.[token.attrIndex('src')][1] || '';
  const alt = token.content || '';
  return `<img src="${md.utils.escapeHtml(src)}" alt="${md.utils.escapeHtml(alt)}" class="md-image" loading="lazy" />`;
};

// External links → new tab
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

// Admonition plugin
md.block.ruler.before('fence', 'admonition', (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const lineText = state.src.slice(pos, max);
  const match = lineText.match(/^!!!\s+(\w+)\s*(?:"([^"]*)")?\s*$/);
  if (!match) return false;
  if (silent) return true;

  const admType = match[1].toLowerCase();
  const admTitle = match[2] || admType;
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
      <p class="md-admonition-title"><span class="md-admonition-icon">${icons[admType] || '📝'}</span>${md.utils.escapeHtml(admTitle)}</p>
      <div class="md-admonition-body">${bodyHtml}</div>
    </div>`;
  state.line = nextLine;
  return true;
});

export function renderMarkdown(content: string): string {
  if (!content) return '';
  return md.render(content);
}

export default md;
