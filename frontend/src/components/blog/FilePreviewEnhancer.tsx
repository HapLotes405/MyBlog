'use client';

import { useEffect, useRef } from 'react';

/**
 * FilePreviewEnhancer — 纯客户端副作用组件
 *
 * 查询 markdown 渲染产生的 `.md-file-card[data-file-preview="true"]` 元素
 * （当前仅 MD / TXT / LOG），fetch 文件内容并插入折叠预览块。
 * PDF 预览已在服务端渲染时内联为 <details><iframe>，无需 JS 介入。
 */
export default function FilePreviewEnhancer() {
  const initialized = useRef(false);
  const MAX_PREVIEW_BYTES = 200_000; // 200 KB limit for text previews

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const cards = document.querySelectorAll<HTMLAnchorElement>(
      '.md-file-card[data-file-preview="true"]'
    );

    cards.forEach((card) => {
      const ext = card.dataset.fileExt;
      const href = card.getAttribute('href');
      if (!href || !ext) return;

      // Skip PDF (already handled server-side in markdown renderer)
      if (ext === 'pdf') return;

      // Fetch text-based files for inline preview
      fetch(href, { signal: AbortSignal.timeout(10000) })
        .then(async (res) => {
          if (!res.ok) return;

          const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
          const truncated = contentLength > MAX_PREVIEW_BYTES || !contentLength;

          let text: string;
          if (truncated && contentLength > 0) {
            // Only read first MAX_PREVIEW_BYTES
            const reader = res.body?.getReader();
            if (!reader) {
              text = await res.text();
            } else {
              const chunks: Uint8Array[] = [];
              let received = 0;
              while (received < MAX_PREVIEW_BYTES) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  const remaining = MAX_PREVIEW_BYTES - received;
                  chunks.push(value.slice(0, remaining));
                  received += Math.min(value.length, remaining);
                }
              }
              reader.cancel();
              text = new TextDecoder().decode(
                chunks.reduce((acc, c) => {
                  const combined = new Uint8Array(acc.length + c.length);
                  combined.set(acc, 0);
                  combined.set(c, acc.length);
                  return combined;
                }, new Uint8Array(0))
              );
            }
          } else {
            text = await res.text();
          }

          const truncatedNote = truncated
            ? '\n\n⚠️ 文件较大，仅显示前 200KB 内容。点击上方卡片下载完整文件。'
            : '';

          const details = document.createElement('details');
          details.className = 'md-file-preview';
          details.innerHTML = `
            <summary>📖 预览 ${ext.toUpperCase()}</summary>
            <pre class="md-file-text-preview">${escapeHtml(text)}${truncatedNote}</pre>
          `;

          card.insertAdjacentElement('afterend', details);
        })
        .catch(() => {
          // Silently fail — download link is always available
        });
    });
  }, []);

  return null;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}
