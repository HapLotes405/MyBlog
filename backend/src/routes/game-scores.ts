import { Router, Request, Response } from 'express';
import { queryAll, execute } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/game-scores - Submit or update score (auth required)
// Body: { level: number, timeMs: number }
// Keeps only the best (lowest) time per user per level
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { level, timeMs } = req.body;
    if (!level || typeof timeMs !== 'number' || timeMs <= 0) {
      res.status(400).json({ success: false, message: '参数无效' });
      return;
    }
    if (level < 1 || level > 8) {
      res.status(400).json({ success: false, message: '关卡编号无效' });
      return;
    }

    const userId = req.user!.userId;
    // Upsert — only update if new time is strictly better (lower)
    const result = await execute(
      `INSERT INTO game_scores (user_id, level, time_ms)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, level)
       DO UPDATE SET time_ms = LEAST(game_scores.time_ms, $3),
                     created_at = CASE WHEN $3 < game_scores.time_ms THEN NOW() ELSE game_scores.created_at END
       RETURNING id, time_ms, created_at, (xmax = 0) AS is_new`,
      [userId, level, timeMs]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: String(row.id),
        level,
        timeMs: Number(row.time_ms),
        createdAt: (row.created_at as Date).toISOString(),
        isNewBest: row.time_ms === timeMs && Number(row.is_new) === 1,
      },
    });
  } catch (err) {
    console.error('[game-scores/submit]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/game-scores?level=1&limit=20 - Leaderboard (public, no auth)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const level = parseInt(req.query.level as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const rows = await queryAll(
      `SELECT gs.id, gs.user_id, gs.level, gs.time_ms, gs.created_at,
              u.username, u.nickname, u.avatar,
              RANK() OVER (PARTITION BY gs.level ORDER BY gs.time_ms ASC) AS rank
       FROM game_scores gs
       INNER JOIN users u ON gs.user_id = u.id
       WHERE gs.level = $1
       ORDER BY gs.time_ms ASC
       LIMIT $2`,
      [level, limit]
    );

    const leaderboard = rows.map((r: Record<string, unknown>) => ({
      rank: Number(r.rank),
      userId: String(r.user_id),
      username: r.username as string,
      nickname: (r.nickname as string) || (r.username as string),
      avatar: (r.avatar as string) || '',
      timeMs: Number(r.time_ms),
      createdAt: (r.created_at as Date).toISOString(),
    }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    console.error('[game-scores/leaderboard]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
