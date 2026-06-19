import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, execute } from '../db';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import { userRowToUser, toDateString } from '../utils';
import { UserRow, BlogRow, FileRow } from '../types';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/** Convert BlogRow to the API-facing BlogPost */
async function blogRowToPost(row: BlogRow): Promise<Record<string, unknown>> {
  const authorRow = await queryOne('SELECT * FROM users WHERE id = $1', [row.author_id]) as unknown as UserRow | undefined;
  const author = authorRow ? userRowToUser(authorRow) : null;

  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    coverImage: row.cover_image,
    tags: row.tags, // JSONB: pg auto-parses to string[]
    author,
    createdAt: toDateString(row.created_at),
    updatedAt: toDateString(row.updated_at),
    readingTime: row.reading_time,
    likes: row.likes_count,
    favorites: row.favorites_count,
    views: row.views,
  };
}

function calculateReadingTime(content: string): number {
  const chineseChars = (content.match(/[一-鿿]/g) || []).length;
  const englishWords = content.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  const totalWords = chineseChars + englishWords;
  return Math.max(1, Math.ceil(totalWords / 300));
}

// GET /api/posts - list with pagination & optional tag filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const tag = req.query.tag as string | undefined;
    const offset = (page - 1) * pageSize;

    if (tag) {
      const countRow = await queryOne(
        "SELECT COUNT(*)::int as total FROM blogs WHERE tags @> $1",
        [JSON.stringify([tag])]
      ) as { total: number };
      const total = countRow.total;
      const totalPages = Math.ceil(total / pageSize);

      const rows = await queryAll(
        'SELECT * FROM blogs WHERE tags @> $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [JSON.stringify([tag]), pageSize, offset]
      ) as unknown as BlogRow[];

      const posts = await Promise.all(rows.map(blogRowToPost));
      res.json({ success: true, data: posts, total, page, pageSize, totalPages });
    } else {
      const countRow = await queryOne('SELECT COUNT(*)::int as total FROM blogs') as { total: number };
      const total = countRow.total;
      const totalPages = Math.ceil(total / pageSize);

      const rows = await queryAll(
        'SELECT * FROM blogs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset]
      ) as unknown as BlogRow[];

      const posts = await Promise.all(rows.map(blogRowToPost));
      res.json({ success: true, data: posts, total, page, pageSize, totalPages });
    }
  } catch (err) {
    console.error('[blog/list]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/posts/tags
router.get('/tags', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await queryAll('SELECT tags FROM blogs') as { tags: string[] }[];
    const tagSet = new Set<string>();
    rows.forEach((r) => {
      r.tags.forEach((t) => tagSet.add(t));
    });
    res.json({ success: true, data: Array.from(tagSet) });
  } catch (err) {
    console.error('[blog/tags]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/posts/:slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('SELECT * FROM blogs WHERE slug = $1', [req.params.slug]) as unknown as BlogRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    // Only increment views if ?count=false is NOT set (default: count=true)
    const shouldCount = req.query.count !== 'false';
    if (shouldCount) {
      await execute('UPDATE blogs SET views = views + 1 WHERE id = $1', [row.id]);
      row.views += 1;
    }

    const post = await blogRowToPost(row);
    res.json({ success: true, data: post });
  } catch (err) {
    console.error('[blog/get]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// POST /api/posts - create post (blogger only)
router.post('/', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  const { title, summary, content, coverImage, tags, slug } = req.body;

  if (!title || !content) {
    res.status(400).json({ success: false, message: '标题和内容不能为空' });
    return;
  }

  const finalSlug = slug || title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `${uuidv4().slice(0, 8)}`;

  const readingTime = calculateReadingTime(content);

  try {
    const result = await execute(
      `INSERT INTO blogs (slug, title, summary, content, cover_image, tags, author_id, reading_time)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING id`,
      [finalSlug, title, summary || '', content, coverImage || '',
       JSON.stringify(tags || []), req.user!.userId, readingTime]
    );

    const row = await queryOne('SELECT * FROM blogs WHERE id = $1', [result.rows[0].id]) as unknown as BlogRow;
    const post = await blogRowToPost(row);

    res.status(201).json({ success: true, data: post });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ success: false, message: '该文章别名已存在，请换一个标题' });
      return;
    }
    console.error('[blog/create]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// PUT /api/posts/:id - update post (blogger only)
router.put('/:id', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, summary, content, coverImage, tags, slug } = req.body;
    const row = await queryOne('SELECT * FROM blogs WHERE id = $1', [req.params.id]) as unknown as BlogRow | undefined;

    if (!row) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    const updatedTitle = title ?? row.title;
    const updatedContent = content ?? row.content;
    const readingTime = calculateReadingTime(updatedContent);

    await execute(
      `UPDATE blogs SET title = $1, summary = $2, content = $3, cover_image = $4, tags = $5::jsonb,
        slug = $6, reading_time = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        updatedTitle, summary ?? row.summary, updatedContent,
        coverImage ?? row.cover_image,
        JSON.stringify(tags ?? row.tags),
        slug ?? row.slug, readingTime, row.id,
      ]
    );

    const updatedRow = await queryOne('SELECT * FROM blogs WHERE id = $1', [row.id]) as unknown as BlogRow;
    const post = await blogRowToPost(updatedRow);

    res.json({ success: true, data: post });
  } catch (err) {
    console.error('[blog/update]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// DELETE /api/posts/:id - delete post (blogger only)
router.delete('/:id', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('SELECT * FROM blogs WHERE id = $1', [req.params.id]) as unknown as BlogRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    // Clean up associated files from disk
    const files = await queryAll('SELECT * FROM files WHERE post_id = $1', [row.id]) as unknown as FileRow[];
    const filesDir = path.join(path.resolve(config.uploadDir), 'files');
    for (const f of files) {
      const filePath = path.join(filesDir, f.uuid_filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
    // Delete file records (cascade would SET NULL, but we want to delete)
    if (files.length > 0) {
      await execute('DELETE FROM files WHERE post_id = $1', [row.id]);
    }

    await execute('DELETE FROM blogs WHERE id = $1', [row.id]);
    res.json({ success: true, data: null, message: '文章已删除' });
  } catch (err) {
    console.error('[blog/delete]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
