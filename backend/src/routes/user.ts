import { Router, Request, Response } from 'express';
import { queryOne, execute } from '../db';
import { authMiddleware } from '../middleware/auth';
import { UserRow } from '../types';
import { userRowToUser } from '../utils';

const router = Router();

// GET /api/user/profile — get current user's profile
router.get('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userRow = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.userId]) as unknown as UserRow | undefined;
    if (!userRow) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    res.json({ success: true, data: userRowToUser(userRow) });
  } catch (err) {
    console.error('[user/profile/get]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// PUT /api/user/profile — update nickname / avatar
router.put('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { nickname, avatar } = req.body;

    const userRow = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.userId]) as unknown as UserRow | undefined;
    if (!userRow) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const newNickname = nickname !== undefined ? nickname : userRow.nickname;
    const newAvatar = avatar !== undefined ? avatar : userRow.avatar;

    await execute(
      'UPDATE users SET nickname = $1, avatar = $2 WHERE id = $3',
      [newNickname, newAvatar, req.user!.userId]
    );

    const updated = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.userId]) as unknown as UserRow;
    res.json({ success: true, data: userRowToUser(updated) });
  } catch (err) {
    console.error('[user/profile/update]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
