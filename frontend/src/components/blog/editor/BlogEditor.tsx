'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlogPost } from '@/types';
import { blogApi, uploadApi, filesApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { renderMarkdown } from '@/utils/markdown';
import SafeHTML from '@/components/common/SafeHTML';
import AIAssistant from './AIAssistant';
import styles from './BlogEditor.module.css';

// ============================================================
//  Helpers
// ============================================================

function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

function calculateReadingTime(content: string): number {
  const chineseChars = (content.match(/[一-鿿]/g) || []).length;
  const englishWords = content.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((chineseChars + englishWords) / 300));
}

function exportPostAsMarkdown(post: BlogPost): void {
  const lines = [
    `---`,
    `title: "${post.title}"`,
    `slug: "${post.slug}"`,
    `summary: "${post.summary}"`,
    `tags: [${post.tags.map((t) => `"${t}"`).join(', ')}]`,
    `date: "${post.createdAt}"`,
    `---`,
    '',
    post.content,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${post.slug}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function surroundSelection(
  textarea: HTMLTextAreaElement,
  setContent: (v: string) => void,
  before: string,
  after: string,
  placeholder: string
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const newValue = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  setContent(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const newCursor = selectionStart + before.length;
    textarea.setSelectionRange(newCursor, newCursor + selected.length);
  });
}

// Safely replace all occurrences of a substring in a string (escapes regex chars)
function replaceAll(str: string, find: string, replacement: string): string {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), replacement);
}

// Extract all image URLs from markdown content: ![alt](url)
function extractImageUrls(content: string): Array<{ fullMatch: string; alt: string; url: string }> {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const results: Array<{ fullMatch: string; alt: string; url: string }> = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({ fullMatch: match[0], alt: match[1], url: match[2] });
  }
  return results;
}

// ============================================================
//  BlogEditor Component
// ============================================================

interface BlogEditorProps {
  post?: BlogPost;
  isNew: boolean;
}

export default function BlogEditor({ post, isNew }: BlogEditorProps) {
  const router = useRouter();
  const { isBlogger } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileDocInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post?.title || '');
  const [summary, setSummary] = useState(post?.summary || '');
  const [tagsStr, setTagsStr] = useState(post?.tags?.join(', ') || '');
  const [content, setContent] = useState(post?.content || '');
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Track background uploads: blobUrl → { file, promise }
  // Blob URLs are replaced silently with server URLs as uploads complete
  const pendingUploads = useRef<Map<string, { file: File; promise: Promise<void> }>>(new Map());

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSummary(post.summary);
      setTagsStr(post.tags.join(', '));
      setContent(post.content);
      setCoverImage(post.coverImage);
    }
  }, [post]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const uploads = pendingUploads.current;
    return () => {
      uploads.forEach((_, blobUrl) => URL.revokeObjectURL(blobUrl));
      uploads.clear();
    };
  }, []);

  const insertFormat = useCallback((before: string, after: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    surroundSelection(ta, setContent, before, after, placeholder);
  }, []);

  // Helper: insert a local image (File) into the editor as blob URL for instant preview,
  // then silently upload in background and replace blob URL with server URL
  const insertLocalImage = useCallback((file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const ta = textareaRef.current;
    const alt = file.name || `image-${Date.now()}`;
    const mdImage = `![${alt}](${blobUrl})`;

    // 1. Insert blob URL immediately for instant preview
    if (ta) {
      surroundSelection(ta, setContent, '', mdImage, '');
    } else {
      setContent((prev) => prev + '\n' + mdImage + '\n');
    }

    // 2. Background upload — silently replace blob URL when done
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const baseUrl = apiBase.replace(/\/api$/, '');

    const promise = uploadApi.uploadImage(file)
      .then((res) => {
        if (res.success && res.data) {
          const serverUrl = `${baseUrl}${res.data.url}`;
          // Silently replace blob URL with server URL in content
          setContent((prev) => replaceAll(prev, blobUrl, serverUrl));
          URL.revokeObjectURL(blobUrl);
          pendingUploads.current.delete(blobUrl);
        }
      })
      .catch(() => {
        // Upload failed — blob URL stays, will be retried on save
      });

    pendingUploads.current.set(blobUrl, { file, promise });
  }, []);

  // ===== Paste handler: detect clipboard images =====
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          insertLocalImage(file);
        }
        return;
      }
    }
  }, [insertLocalImage]);

  // Direct upload for drag-drop (no file input event)
  const uploadDocFileDirect = useCallback(async (file: File) => {
    try {
      const res = await filesApi.upload(file);
      if (res.success && res.data) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const baseUrl = apiBase.replace(/\/api$/, '');
        const fileUrl = `${baseUrl}${res.data.url}`;
        const fileName = res.data.originalName || file.name;
        const fileMd = `[📄 ${fileName}](${fileUrl})`;
        const ta = textareaRef.current;
        if (ta) {
          surroundSelection(ta, setContent, '', fileMd, '');
        } else {
          setContent((prev) => prev + '\n' + fileMd + '\n');
        }
      }
    } catch {
      setMessage(`文件 "${file.name}" 上传失败`);
    }
  }, []);

  // ===== Drag-and-drop handlers =====
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the drop zone itself
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        insertLocalImage(files[i]);
      } else if (files[i].type.startsWith('video/')) {
        // Videos go through the existing handleFileUpload flow
        setMessage(`视频文件请使用"插入视频"按钮上传`);
      } else {
        // Documents and other files → upload directly
        uploadDocFileDirect(files[i]);
      }
    }
  }, [insertLocalImage, uploadDocFileDirect]);

  // ===== Save (with image processing) =====
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage('标题和内容不能为空');
      return;
    }
    setSaving(true);
    setMessage('');

    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const baseUrl = apiBase.replace(/\/api$/, '');

    try {
      // --- Step 1: Wait for all in-flight background uploads ---
      const pending = [...pendingUploads.current.values()].map((v) => v.promise);
      if (pending.length > 0) {
        setMessage('正在完成图片上传...');
        await Promise.allSettled(pending);
      }

      // --- Step 2: Read latest content (background uploads may have replaced blob URLs) ---
      let processedContent = textareaRef.current?.value || content;

      // --- Step 3: Handle remaining blob URLs (failed background uploads → retry) ---
      const imageUrls = extractImageUrls(processedContent);
      const blobEntries = imageUrls.filter((img) => img.url.startsWith('blob:'));
      const externalEntries = imageUrls.filter(
        (img) => img.url.startsWith('http://') || img.url.startsWith('https://')
      );

      let totalToProcess = blobEntries.length + externalEntries.filter(
        (img) => !(img.url.startsWith('/uploads/') || (baseUrl && img.url.startsWith(baseUrl)))
      ).length;

      if (totalToProcess > 0) {
        let processed = 0;
        setMessage(`正在处理图片 (0/${totalToProcess})...`);

        // Retry failed blob uploads
        for (const img of blobEntries) {
          const entry = pendingUploads.current.get(img.url);
          if (entry) {
            try {
              const res = await uploadApi.uploadImage(entry.file);
              if (res.success && res.data) {
                const serverUrl = `${baseUrl}${res.data.url}`;
                processedContent = replaceAll(processedContent, img.url, serverUrl);
                URL.revokeObjectURL(img.url);
                pendingUploads.current.delete(img.url);
              }
            } catch {
              console.warn(`Failed to upload image: ${img.alt}`);
              setMessage(`图片 "${img.alt}" 上传失败，保留原始引用`);
            }
          }
          processed++;
          if (totalToProcess > 1) setMessage(`正在处理图片 (${processed}/${totalToProcess})...`);
        }

        // Download external URLs to server
        for (const img of externalEntries) {
          const isLocalUrl = img.url.startsWith('/uploads/') || (baseUrl && img.url.startsWith(baseUrl));
          if (isLocalUrl) continue;

          try {
            const res = await uploadApi.downloadImage(img.url);
            if (res.success && res.data) {
              const serverUrl = `${baseUrl}${res.data.url}`;
              processedContent = replaceAll(processedContent, img.url, serverUrl);
            }
          } catch {
            console.warn(`Failed to download image: ${img.url}`);
            if (!message.includes('下载失败')) {
              setMessage(`图片 "${img.alt}" 下载失败，保留原始 URL`);
            }
          }
          processed++;
          if (totalToProcess > 1) setMessage(`正在处理图片 (${processed}/${totalToProcess})...`);
        }
      }

      // --- Step 4: Save post ---
      const slug = isNew ? generateSlugFromTitle(title) : post!.slug;
      const tags = tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean);

      if (isNew) {
        const res = await blogApi.create({
          title: title.trim(),
          summary: summary.trim(),
          content: processedContent,
          slug,
          tags: tags as unknown as string[],
          coverImage,
        } as Partial<BlogPost>);
        if (res.success && res.data) {
          const newPost = res.data as BlogPost;
          // Clean up any remaining blob URLs
          pendingUploads.current.forEach((_, blobUrl) => URL.revokeObjectURL(blobUrl));
          pendingUploads.current.clear();
          setMessage('文章已发布！');
          setTimeout(() => router.push(`/blog/${newPost.slug}`), 800);
        }
      } else {
        await blogApi.update(post!.id, {
          title: title.trim(),
          summary: summary.trim(),
          content: processedContent,
          tags: tags as unknown as string[],
          slug: generateSlugFromTitle(title),
          coverImage,
        } as Partial<BlogPost>);
        pendingUploads.current.forEach((_, blobUrl) => URL.revokeObjectURL(blobUrl));
        pendingUploads.current.clear();
        setMessage('文章已更新！');
        setSaving(false);
      }
    } catch (err) {
      setMessage(`保存失败：${(err as Error).message}`);
      setSaving(false);
    }
  };

  // ===== Delete =====
  const handleDelete = async () => {
    if (!isNew && post && confirm('确定要删除这篇文章吗？此操作不可撤销。')) {
      try {
        await blogApi.delete(post.id);
        router.push('/');
      } catch {
        setMessage('删除失败，请重试');
      }
    }
  };

  // ===== Download =====
  const handleDownload = () => {
    const tempPost: BlogPost = {
      ...post!,
      id: post?.id || 'temp',
      slug: generateSlugFromTitle(title),
      title: title.trim() || 'untitled',
      summary: summary.trim(),
      content,
      coverImage,
      tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      createdAt: post?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      readingTime: calculateReadingTime(content),
      likes: post?.likes || 0,
      favorites: post?.favorites || 0,
      views: post?.views || 0,
    } as BlogPost;
    exportPostAsMarkdown(tempPost);
  };

  // ===== Image/Video Upload =====
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      if (res.success && res.data) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const baseUrl = apiBase.replace(/\/api$/, '');
        const fileUrl = `${baseUrl}${res.data.url}`;
        const ta = textareaRef.current;
        if (isVideo) {
          const mimeType = file.name.endsWith('.webm') ? 'webm' : file.name.endsWith('.ogg') ? 'ogg' : 'mp4';
          const videoMd = `\n<video controls width="100%">\n  <source src="${fileUrl}" type="video/${mimeType}">\n</video>\n`;
          setContent((prev) => prev + videoMd);
        } else if (ta) {
          surroundSelection(ta, setContent, `![`, `](${fileUrl})`, file.name);
        } else {
          setContent((prev) => prev + `\n![${file.name}](${fileUrl})\n`);
        }
        setMessage(`${isVideo ? '视频' : '图片'}上传成功！`);
      }
    } catch {
      setMessage(`${isVideo ? '视频' : '图片'}上传失败`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // ===== Document file upload (PDF, DOCX, MD, etc.) =====
  const handleFileDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await filesApi.upload(file);
      if (res.success && res.data) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const baseUrl = apiBase.replace(/\/api$/, '');
        const fileUrl = `${baseUrl}${res.data.url}`;
        const fileName = res.data.originalName || file.name;
        const fileMd = `[📄 ${fileName}](${fileUrl})`;
        const ta = textareaRef.current;
        if (ta) {
          surroundSelection(ta, setContent, '', fileMd, '');
        } else {
          setContent((prev) => prev + '\n' + fileMd + '\n');
        }
        setMessage(`文件 "${fileName}" 上传成功！`);
      }
    } catch {
      setMessage('文件上传失败');
    } finally {
      setUploading(false);
      if (fileDocInputRef.current) fileDocInputRef.current.value = '';
    }
  };

  // ===== Keyboard =====
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      setContent(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  // Preview HTML (rendered by markdown-it)
  const previewHtml = title
    ? `<h1 class="md-preview-title">${title}</h1>\n${renderMarkdown(content)}`
    : renderMarkdown(content);

  if (!isBlogger) {
    return (
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>无权限</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          仅博主可以创建或编辑文章。
        </p>
        <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
          去登录 →
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>← 返回首页</Link>
        <div className={styles.headerActions}>
          <button className={styles.btn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            {uploading ? '上传中...' : '插入图片'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} style={{ display: 'none' }} />
          <button className={styles.btn} onClick={() => videoInputRef.current?.click()} disabled={uploading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            {uploading ? '上传中...' : '插入视频'}
          </button>
          <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleFileUpload(e, true)} style={{ display: 'none' }} />
          <button className={styles.btn} onClick={() => fileDocInputRef.current?.click()} disabled={uploading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {uploading ? '上传中...' : '上传文件'}
          </button>
          <input ref={fileDocInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.md,.txt,.csv,.json,.xml,.yaml,.yml,.log,.zip,.rar,.7z,.gz,.tar" onChange={handleFileDocUpload} style={{ display: 'none' }} />
          <button className={styles.btn} onClick={handleDownload}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出 .md
          </button>
          {!isNew && <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDelete}>删除</button>}
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : isNew ? '发布文章' : '更新文章'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={message.includes('失败') || message.includes('不能') ? styles.msgError : styles.msgSuccess}>
          {message}
        </div>
      )}

      {/* Form */}
      <div
        className={`${styles.form} ${isDragOver ? styles.dragOver : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.field}>
          <input className={styles.titleInput} type="text" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="文章标题" />
        </div>
        <div className={styles.field}>
          <input type="text" value={summary}
            onChange={(e) => setSummary(e.target.value)} placeholder="文章摘要（可选）" />
        </div>
        <div className={styles.field}>
          <input type="text" value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)} placeholder="封面图片 URL（可选）" />
        </div>
        <div className={styles.field}>
          <input className={styles.tagsInput} type="text" value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)} placeholder="标签，用逗号分隔，例如：React, TypeScript" />
          <p className={styles.tagHint}>多个标签用逗号分隔</p>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button className={styles.tbBtn} title="标题" onClick={() => insertFormat('## ', '', '标题')}>H2</button>
          <button className={styles.tbBtn} title="子标题" onClick={() => insertFormat('### ', '', '子标题')}>H3</button>
          <span className={styles.tbSep} />
          <button className={styles.tbBtn} title="粗体" onClick={() => insertFormat('**', '**', '粗体')}><strong>B</strong></button>
          <button className={styles.tbBtn} title="斜体" onClick={() => insertFormat('*', '*', '斜体')}><em>I</em></button>
          <button className={styles.tbBtn} title="删除线" onClick={() => insertFormat('~~', '~~', '删除')}><del>S</del></button>
          <button className={styles.tbBtn} title="行内代码" onClick={() => insertFormat('`', '`', 'code')}>&lt;/&gt;</button>
          <span className={styles.tbSep} />
          <button className={styles.tbBtn} title="链接" onClick={() => insertFormat('[', '](url)', '文字')}>🔗</button>
          <button className={styles.tbBtn} title="无序列表" onClick={() => insertFormat('- ', '', '列表')}>☰</button>
          <button className={styles.tbBtn} title="有序列表" onClick={() => insertFormat('1. ', '', '列表')}>1.</button>
          <button className={styles.tbBtn} title="引用" onClick={() => insertFormat('> ', '', '引用')}>❝</button>
          <button className={styles.tbBtn} title="分割线" onClick={() => insertFormat('\n---\n', '', '')}>―</button>
          <span className={styles.tbSep} />
          <button className={styles.tbBtn} title="JS代码块" onClick={() => insertFormat('\n```javascript\n', '\n```\n', '// code')}>JS</button>
          <button className={styles.tbBtn} title="TS代码块" onClick={() => insertFormat('\n```typescript\n', '\n```\n', '// code')}>TS</button>
          <button className={styles.tbBtn} title="Python代码块" onClick={() => insertFormat('\n```python\n', '\n```\n', '# code')}>PY</button>
          <button className={styles.tbBtn} title="表格" onClick={() => insertFormat('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| ', ' |  |  |\n', '内容')}>⊞</button>
          <span className={styles.tbSep} />
          <button className={styles.tbBtn} title="提示框" onClick={() => insertFormat('\n!!! tip "提示"\n    ', '\n', '内容')}>💡</button>
          <button className={styles.tbBtn} title="注意框" onClick={() => insertFormat('\n!!! note "注意"\n    ', '\n', '内容')}>📝</button>
          <button className={styles.tbBtn} title="警告框" onClick={() => insertFormat('\n!!! warning "警告"\n    ', '\n', '内容')}>⚠️</button>
          <span className={styles.tbSep} />
          <button
            className={`${styles.tbBtn} ${showAI ? styles.tbBtnActive : ''}`}
            title="AI 写作助手"
            onClick={() => setShowAI((v) => !v)}
          >
            🤖 AI
          </button>
        </div>

        {/* AI Assistant */}
        {showAI && (
          <AIAssistant
            content={content}
            selectedText={selectedText}
            title={title}
            onInsert={(text) => {
              const ta = textareaRef.current;
              if (ta) {
                surroundSelection(ta, setContent, '', text, '');
              } else {
                setContent((prev) => prev + '\n' + text + '\n');
              }
            }}
          />
        )}

        {/* Editor + Preview */}
        <div className={styles.editorArea}>
          {isDragOver && (
            <div className={styles.dropOverlay}>
              <span>📁 释放以插入图片或文件</span>
            </div>
          )}

          <div className={styles.editorPane}>
            <div className={styles.paneHeader}>
              <span>Markdown 编辑</span>
              <span className={styles.paneHint}>Ctrl+S 保存</span>
            </div>
            <textarea
              ref={textareaRef}
              className={styles.contentTextarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onSelect={(e) => {
                const ta = e.currentTarget;
                setSelectedText(ta.value.slice(ta.selectionStart, ta.selectionEnd));
              }}
              placeholder={`在这里写 Markdown 正文...\n\n## 使用工具栏快速插入格式\n\n\`\`\`typescript\nconst greeting = "Hello World";\n\`\`\`\n\n> 引用文字\n\n- 列表项\n\n![图片](https://example.com/image.png)\n\n**粗体** *斜体* \`code\``}
            />
          </div>
          <div className={styles.editorPane}>
            <div className={styles.paneHeader}>
              实时预览
              <span className={styles.paneHint}>{calculateReadingTime(content)} 分钟阅读</span>
            </div>
            <SafeHTML
              html={previewHtml}
              className={`${styles.previewPane} md-preview-pane`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
