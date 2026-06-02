import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db';
import { authMiddleware } from '../middleware/auth';
import { userRowToUser, toDateString } from '../utils';
import { UserRow, CommentRow } from '../types';

const router = Router();

async function commentRowToComment(row: CommentRow, postId: number): Promise<Record<string, unknown>> {
  const authorRow = await queryOne('SELECT * FROM users WHERE id = $1', [row.author_id]) as unknown as UserRow | undefined;
  const author = authorRow ? userRowToUser(authorRow) : null;

  const replyRows = await queryAll(
    'SELECT * FROM comments WHERE parent_id = $1 ORDER BY created_at ASC',
    [row.id]
  ) as unknown as CommentRow[];

  const replies = await Promise.all(replyRows.map(async (r) => {
    const a = await queryOne('SELECT * FROM users WHERE id = $1', [r.author_id]);
    return {
      id: String(r.id),
      postId: String(r.post_id),
      author: a ? userRowToUser(a as unknown as UserRow) : null,
      content: r.content,
      createdAt: toDateString(r.created_at),
      likes: r.likes_count,
      parentId: r.parent_id !== null ? String(r.parent_id) : null,
      replies: [],
    };
  }));

  return {
    id: String(row.id),
    postId: String(postId),
    author,
    content: row.content,
    createdAt: toDateString(row.created_at),
    likes: row.likes_count,
    parentId: row.parent_id !== null ? String(row.parent_id) : null,
    replies,
  };
}

/** Resolve postId from slug or numeric ID */
async function resolvePostId(param: string): Promise<number | null> {
  let postId = parseInt(param);
  if (isNaN(postId)) {
    const blogRow = await queryOne('SELECT id FROM blogs WHERE slug = $1', [param]) as { id: number } | undefined;
    if (!blogRow) return null;
    postId = blogRow.id;
  }
  return postId;
}

// GET /api/posts/:postId/comments
router.get('/posts/:postId/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.json({ success: true, data: [] });
      return;
    }

    const rows = await queryAll(
      'SELECT * FROM comments WHERE post_id = $1 AND parent_id IS NULL ORDER BY created_at DESC',
      [postId]
    ) as unknown as CommentRow[];

    const comments = await Promise.all(rows.map((r) => commentRowToComment(r, postId)));
    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('[comment/list]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// POST /api/posts/:postId/comments - create comment (auth required)
router.post('/posts/:postId/comments', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: '评论内容不能为空' });
      return;
    }

    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    if (parentId) {
      const parent = await queryOne('SELECT id FROM comments WHERE id = $1 AND post_id = $2', [parentId, postId]);
      if (!parent) {
        res.status(404).json({ success: false, message: '父评论不存在' });
        return;
      }
    }

    const result = await execute(
      'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [postId, req.user!.userId, content.trim(), parentId || null]
    );

    const row = await queryOne('SELECT * FROM comments WHERE id = $1', [result.rows[0].id]) as unknown as CommentRow;
    const comment = await commentRowToComment(row, postId);

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.error('[comment/create]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// DELETE /api/comments/:id (blogger or comment author)
router.delete('/comments/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const commentId = parseInt(req.params.id);
    const row = await queryOne('SELECT * FROM comments WHERE id = $1', [commentId]) as unknown as CommentRow | undefined;

    if (!row) {
      res.status(404).json({ success: false, message: '评论不存在' });
      return;
    }

    if (row.author_id !== req.user!.userId && req.user!.role !== 'blogger') {
      res.status(403).json({ success: false, message: '无权删除此评论' });
      return;
    }

    await execute('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true, data: null, message: '评论已删除' });
  } catch (err) {
    console.error('[comment/delete]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
