#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================
// Configuration (all via environment variables)
// ============================================================

const BLOG_API_BASE = process.env.BLOG_API_BASE || "http://localhost:8000/api";
const BLOG_TOKEN = process.env.BLOG_TOKEN || "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function blogHeaders() {
  return {
    "Content-Type": "application/json",
    ...(BLOG_TOKEN ? { Authorization: `Bearer ${BLOG_TOKEN}` } : {}),
  };
}

function deepseekHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEEPSEEK_KEY}`,
  };
}

// ============================================================
// Blog API helpers
// ============================================================

async function blogList(tag) {
  const params = tag ? `?tag=${encodeURIComponent(tag)}` : "?pageSize=50";
  const res = await fetch(`${BLOG_API_BASE}/posts${params}`, { headers: blogHeaders() });
  if (!res.ok) throw new Error(`获取文章列表失败: ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

async function blogGet(slug) {
  const res = await fetch(`${BLOG_API_BASE}/posts/${slug}?count=false`, { headers: blogHeaders() });
  if (!res.ok) throw new Error(`获取文章失败: ${res.status}`);
  const data = await res.json();
  return data.data;
}

async function blogCreate(post) {
  const res = await fetch(`${BLOG_API_BASE}/posts`, {
    method: "POST",
    headers: blogHeaders(),
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建文章失败: ${res.status}`);
  }
  return (await res.json()).data;
}

async function blogUpdate(id, post) {
  const res = await fetch(`${BLOG_API_BASE}/posts/${id}`, {
    method: "PUT",
    headers: blogHeaders(),
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `更新文章失败: ${res.status}`);
  }
  return (await res.json()).data;
}

async function blogDelete(id) {
  const res = await fetch(`${BLOG_API_BASE}/posts/${id}`, {
    method: "DELETE",
    headers: blogHeaders(),
  });
  if (!res.ok) throw new Error(`删除文章失败: ${res.status}`);
  return true;
}

// ============================================================
// DeepSeek API helper
// ============================================================

async function deepseekChat(messages, { temperature = 0.7, maxTokens = 4096 } = {}) {
  if (!DEEPSEEK_KEY) throw new Error("未配置 DEEPSEEK_API_KEY");

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: deepseekHeaders(),
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================================
// MCP Server
// ============================================================

const server = new McpServer({
  name: "haplotes-blog",
  version: "1.0.0",
  description: "博客管理 + DeepSeek AI 写作。可在 Claude Code 中撰写、发布、编辑博客文章。",
});

// ---- Blog Tools ----

server.tool(
  "blog_list",
  "列出所有博客文章（最多50篇），可按标签过滤。返回标题、slug、摘要、标签、发布日期。",
  {
    tag: z.string().optional().describe("按标签过滤，如 'React'、'TypeScript'"),
  },
  async ({ tag }) => {
    const posts = await blogList(tag);
    const summary = posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary || "",
      tags: p.tags || [],
      createdAt: p.createdAt,
      readingTime: p.readingTime,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  }
);

server.tool(
  "blog_get",
  "获取一篇博客文章的完整内容（Markdown 格式）。",
  {
    slug: z.string().describe("文章的 slug 标识符"),
  },
  async ({ slug }) => {
    const post = await blogGet(slug);
    return {
      content: [
        {
          type: "text",
          text: `# ${post.title}\n\n**slug:** ${post.slug}\n**标签:** ${(post.tags || []).join(", ")}\n**摘要:** ${post.summary || ""}\n**发布日期:** ${post.createdAt}\n\n---\n\n${post.content}`,
        },
      ],
    };
  }
);

server.tool(
  "blog_create",
  "创建并发布一篇新的博客文章。title 和 content 为必填项，slug 会自动从标题生成，tags 为字符串数组。",
  {
    title: z.string().describe("文章标题"),
    content: z.string().describe("文章正文（Markdown 格式）"),
    summary: z.string().optional().describe("文章摘要（可选，不填则自动生成）"),
    tags: z.array(z.string()).optional().default([]).describe("标签列表，如 ['React', 'TypeScript']"),
    coverImage: z.string().optional().describe("封面图片 URL（可选）"),
  },
  async ({ title, content, summary, tags, coverImage }) => {
    const post = await blogCreate({ title, content, summary: summary || "", tags, coverImage: coverImage || "" });
    return {
      content: [
        {
          type: "text",
          text: `✅ 文章已发布！\n\n标题: ${post.title}\n链接: /blog/${post.slug}\nID: ${post.id}`,
        },
      ],
    };
  }
);

server.tool(
  "blog_update",
  "更新一篇已有的博客文章。需要提供文章 ID（可通过 blog_list 获取）以及要修改的字段。",
  {
    id: z.string().describe("文章 ID"),
    title: z.string().optional().describe("新标题"),
    content: z.string().optional().describe("新正文（Markdown 格式）"),
    summary: z.string().optional().describe("新摘要"),
    tags: z.array(z.string()).optional().describe("新标签列表"),
    coverImage: z.string().optional().describe("新封面图 URL"),
  },
  async ({ id, title, content, summary, tags, coverImage }) => {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (summary !== undefined) updates.summary = summary;
    if (tags !== undefined) updates.tags = tags;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    const post = await blogUpdate(id, updates);
    return {
      content: [{ type: "text", text: `✅ 文章已更新！\n\n标题: ${post.title}\n链接: /blog/${post.slug}` }],
    };
  }
);

server.tool(
  "blog_delete",
  "删除一篇博客文章（需要确认）。",
  { id: z.string().describe("要删除的文章 ID") },
  async ({ id }) => {
    await blogDelete(id);
    return { content: [{ type: "text", text: `✅ 文章 ID=${id} 已删除` }] };
  }
);

// ---- DeepSeek AI Tools ----

server.tool(
  "ai_write",
  "使用 DeepSeek AI 撰写一篇完整的博客文章。提供主题和风格要求，返回 Markdown 格式的全文。",
  {
    topic: z.string().describe("文章主题/标题"),
    style: z.enum(["technical", "tutorial", "essay", "news"]).optional().default("technical").describe("文章风格"),
    requirements: z.string().optional().describe("额外要求，如字数、包含的要点、读者群体等"),
  },
  async ({ topic, style, requirements }) => {
    const styleHints = {
      technical: "技术深度文章，包含原理分析、代码示例、最佳实践对比",
      tutorial: "教程风格，分步骤讲解，包含可运行的代码片段和注意事项",
      essay: "随笔风格，有观点有论证，语言生动但不失严谨",
      news: "资讯风格，简洁扼要，先结论后展开，突出新特性和影响",
    };
    const extra = requirements ? `\n额外要求：${requirements}` : "";
    const content = await deepseekChat([
      {
        role: "system",
        content: `你是一个专业的技术博客作者。写作风格：${styleHints[style]}。用 Markdown 格式输出，包含适当数量的二级标题、代码块（标注语言）、列表和引用。直接输出文章内容，不要加前言后语。**重要：禁止使用 LaTeX 数学公式（$...$ 或 $$...$$），请使用 Unicode 符号或纯文本替代。例如用 "⊆" 代替 "\\subseteq"，用 "*P*" 代替 "$P$"，用 "C(n,k)" 代替 "\\binom{n}{k}"。**`,
      },
      { role: "user", content: `写一篇关于「${topic}」的博客文章。${extra}` },
    ]);
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "ai_polish",
  "使用 DeepSeek AI 润色文字：修正语法、优化表达、提升流畅度，保持原意不变。",
  {
    text: z.string().describe("要润色的文本"),
    style: z.enum(["general", "academic", "casual"]).optional().default("general").describe("润色风格"),
  },
  async ({ text, style }) => {
    const hints = {
      general: "专业但易懂",
      academic: "严谨规范的学术风格",
      casual: "轻松口语化的风格",
    };
    const result = await deepseekChat([
      { role: "system", content: `你是文字润色专家。${hints[style]}。修正语法错误，优化表达流畅度，保持原意不变。只输出润色后的文本，不加解释。` },
      { role: "user", content: text },
    ]);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "ai_outline",
  "使用 DeepSeek AI 为文章生成结构化大纲。",
  {
    topic: z.string().describe("文章主题"),
    sections: z.number().min(3).max(10).optional().default(5).describe("章节数量"),
  },
  async ({ topic, sections }) => {
    const result = await deepseekChat([
      { role: "system", content: `你是专业内容策划。生成${sections}个章节的文章大纲，每个章节2-3个要点。用 Markdown 格式输出：## 章节名\n- 要点\n- 要点` },
      { role: "user", content: `为「${topic}」生成大纲` },
    ]);
    return { content: [{ type: "text", text: result }] };
  }
);

// ============================================================
// Start
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[haplotes-blog-mcp] Server started");
  if (!BLOG_TOKEN) console.error("[haplotes-blog-mcp] WARNING: BLOG_TOKEN not set — blog CRUD tools will fail");
  if (!DEEPSEEK_KEY) console.error("[haplotes-blog-mcp] WARNING: DEEPSEEK_API_KEY not set — AI tools will fail");
}

main().catch((err) => {
  console.error("[haplotes-blog-mcp] Fatal:", err);
  process.exit(1);
});
