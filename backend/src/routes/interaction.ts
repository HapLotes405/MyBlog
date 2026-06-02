import { Router, Request, Response } from 'express';
import { queryOne, queryAll, execute } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

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

// POST /api/posts/:postId/like - toggle like
router.post('/posts/:postId/like', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    const userId = req.user!.userId;
    const existing = await queryOne('SELECT id FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    if (existing) {
      await execute('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      await execute('UPDATE blogs SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
      res.json({ success: true, data: { liked: false } });
    } else {
      await execute('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      await execute('UPDATE blogs SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
      res.json({ success: true, data: { liked: true } });
    }
  } catch (err) {
    console.error('[interaction/like]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// DELETE /api/posts/:postId/like - unlike
router.delete('/posts/:postId/like', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    const userId = req.user!.userId;
    await execute('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    await execute('UPDATE blogs SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
    res.json({ success: true, data: { liked: false } });
  } catch (err) {
    console.error('[interaction/unlike]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// POST /api/posts/:postId/favorite - toggle favorite
router.post('/posts/:postId/favorite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    const userId = req.user!.userId;
    const existing = await queryOne('SELECT id FROM favorites WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    if (existing) {
      await execute('DELETE FROM favorites WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      await execute('UPDATE blogs SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = $1', [postId]);
      res.json({ success: true, data: { favorited: false } });
    } else {
      await execute('INSERT INTO favorites (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      await execute('UPDATE blogs SET favorites_count = favorites_count + 1 WHERE id = $1', [postId]);
      res.json({ success: true, data: { favorited: true } });
    }
  } catch (err) {
    console.error('[interaction/favorite]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// DELETE /api/posts/:postId/favorite - unfavorite
router.delete('/posts/:postId/favorite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = await resolvePostId(req.params.postId);
    if (!postId) {
      res.status(404).json({ success: false, message: '文章不存在' });
      return;
    }

    const userId = req.user!.userId;
    await execute('DELETE FROM favorites WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    await execute('UPDATE blogs SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = $1', [postId]);
    res.json({ success: true, data: { favorited: false } });
  } catch (err) {
    console.error('[interaction/unfavorite]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/user/favorites
router.get('/user/favorites', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rows = await queryAll(
      `SELECT b.* FROM blogs b
       INNER JOIN favorites f ON b.id = f.post_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[interaction/favorites]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/user/likes
router.get('/user/likes', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rows = await queryAll(
      `SELECT b.* FROM blogs b
       INNER JOIN likes l ON b.id = l.post_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[interaction/likes]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
