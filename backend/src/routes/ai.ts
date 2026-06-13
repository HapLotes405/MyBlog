import { Router, Request, Response } from 'express';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

// ============================================================
// DeepSeek API configuration
// ============================================================

function getApiKey(): string {
  // 1. Environment variable
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  // 2. Fallback file (docker cp friendly)
  const keyFile = process.env.DEEPSEEK_KEY_FILE || path.join(__dirname, '../../deepseek.key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf-8').trim();
  }
  return '';
}

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// ============================================================
// POST /api/ai/chat — blogger-only AI chat
// ============================================================

interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

router.post('/api/ai/chat', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({ success: false, message: 'DeepSeek API 未配置（缺少 DEEPSEEK_API_KEY 环境变量或 deepseek.key 文件）' });
      return;
    }

    const { messages, temperature, maxTokens } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: '请提供 messages 数组' });
      return;
    }

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] DeepSeek API error:', response.status, errorText);
      res.status(502).json({
        success: false,
        message: `DeepSeek API 返回错误 (${response.status})`,
      });
      return;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    res.json({
      success: true,
      data: {
        content,
        usage: usage
          ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
          : undefined,
        model: data.model || DEEPSEEK_MODEL,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 请求失败';
    console.error('[AI] Error:', message);
    res.status(500).json({ success: false, message });
  }
});

export default router;
