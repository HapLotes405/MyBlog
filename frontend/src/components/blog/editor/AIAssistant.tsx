'use client';

import { useState, useRef } from 'react';
import { aiApi, AIMessage } from '@/services/api';
import styles from './AIAssistant.module.css';

interface AIAssistantProps {
  /** The full markdown content from the editor */
  content: string;
  /** Currently selected text in the textarea */
  selectedText: string;
  /** Article title */
  title: string;
  /** Callback to insert text at cursor position */
  onInsert: (text: string) => void;
}

type Action = 'polish' | 'outline' | 'continue' | 'summarize' | 'custom';

export default function AIAssistant({ content, selectedText, title, onInsert }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const callAI = async (messages: AIMessage[], action: Action) => {
    setLoading(true);
    setError('');
    setActiveAction(action);
    try {
      const res = await aiApi.chat(messages);
      if (res.success && res.data) {
        setResponse(res.data.content);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ===== Quick Actions =====

  const handlePolish = () => {
    const text = selectedText || content;
    if (!text.trim()) {
      setError('请先选中要润色的文字，或在编辑器中写入内容');
      return;
    }
    callAI(
      [
        {
          role: 'system',
          content: '你是专业的文字润色专家。修正语法错误，优化表达流畅度，保持原意和风格不变。只输出润色后的文本，不加任何解释或前缀。',
        },
        { role: 'user', content: `请润色以下文字：\n\n${text}` },
      ],
      'polish'
    );
  };

  const handleOutline = () => {
    if (!title.trim()) {
      setError('请先填写文章标题');
      return;
    }
    callAI(
      [
        {
          role: 'system',
          content: '你是专业的内容策划师。根据标题生成5-7个章节的文章大纲，每个章节列出2-3个要点。输出 Markdown 格式的大纲。',
        },
        { role: 'user', content: `请为这篇文章生成大纲：${title}\n\n已有内容摘要：${content.slice(0, 500)}` },
      ],
      'outline'
    );
  };

  const handleContinue = () => {
    if (!content.trim()) {
      setError('请先写一些内容再续写');
      return;
    }
    const tail = content.slice(-1500);
    callAI(
      [
        {
          role: 'system',
          content: '你是一个专业写作者。根据用户已有的文章内容，自然地续写下一段。保持一致的风格、语气和格式。只输出续写的内容，不要重复已有内容。输出 Markdown 格式。',
        },
        { role: 'user', content: `请续写这篇文章：\n\n...${tail}` },
      ],
      'continue'
    );
  };

  const handleSummarize = () => {
    if (!content.trim()) {
      setError('请先写一些内容再生成摘要');
      return;
    }
    callAI(
      [
        {
          role: 'system',
          content: '你是专业的编辑。为一篇文章提取核心要点生成摘要，控制在150字以内。只输出摘要，不加任何前缀。',
        },
        { role: 'user', content: `请为以下文章生成摘要：\n\n标题：${title}\n\n${content}` },
      ],
      'summarize'
    );
  };

  const handleCustomPrompt = () => {
    if (!prompt.trim()) {
      setError('请输入你的需求');
      return;
    }
    const systemPrompt = selectedText
      ? `用户选中的文字: "${selectedText.slice(0, 500)}"`
      : '';
    callAI(
      [
        {
          role: 'system',
          content: `你是AI写作助手，帮用户写文章。文章标题: "${title}"。${systemPrompt}。请用 Markdown 格式回复。`,
        },
        { role: 'user', content: prompt },
      ],
      'custom'
    );
  };

  const handleInsert = () => {
    if (response) {
      onInsert(response);
      setResponse('');
      setActiveAction(null);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>🤖 AI 写作助手</span>
        <span className={styles.model}>DeepSeek</span>
      </div>

      {/* Custom prompt input */}
      <div className={styles.inputRow}>
        <input
          className={styles.promptInput}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
          placeholder="输入你的写作需求，如：写一段关于...的介绍"
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={handleCustomPrompt}
          disabled={loading || !prompt.trim()}
        >
          {loading && activeAction === 'custom' ? '思考中...' : '发送'}
        </button>
      </div>

      {/* Quick actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${activeAction === 'polish' ? styles.active : ''}`}
          onClick={handlePolish}
          disabled={loading}
        >
          📝 润色{selectedText ? '选中' : '全文'}
        </button>
        <button
          className={`${styles.actionBtn} ${activeAction === 'outline' ? styles.active : ''}`}
          onClick={handleOutline}
          disabled={loading}
        >
          📋 生成大纲
        </button>
        <button
          className={`${styles.actionBtn} ${activeAction === 'continue' ? styles.active : ''}`}
          onClick={handleContinue}
          disabled={loading}
        >
          ✍️ 续写
        </button>
        <button
          className={`${styles.actionBtn} ${activeAction === 'summarize' ? styles.active : ''}`}
          onClick={handleSummarize}
          disabled={loading}
        >
          📄 生成摘要
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          正在{activeAction === 'polish' ? '润色' : activeAction === 'outline' ? '生成大纲' : activeAction === 'continue' ? '续写' : activeAction === 'summarize' ? '生成摘要' : '思考'}...
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Response */}
      {response && !loading && (
        <div className={styles.responseArea}>
          <div className={styles.responseHeader}>
            <span>
              {activeAction === 'polish' ? '润色结果' :
               activeAction === 'outline' ? '大纲' :
               activeAction === 'continue' ? '续写' :
               activeAction === 'summarize' ? '摘要' : '回复'}
            </span>
            <button className={styles.insertBtn} onClick={handleInsert}>
              ↓ 插入到编辑器
            </button>
          </div>
          <div ref={responseRef} className={styles.responseText}>
            {response}
          </div>
        </div>
      )}
    </div>
  );
}
