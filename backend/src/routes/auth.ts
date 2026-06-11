import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '../db';
import { authMiddleware, generateToken, AuthPayload } from '../middleware/auth';
import { config } from '../config';
import { userRowToUser } from '../utils';
import { UserRow } from '../types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: '密码长度不能少于6位' });
    return;
  }

  const role = username === config.bloggerUsername ? 'blogger' : 'user';

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email || null, passwordHash, role]
    );
    const userId = result.rows[0].id as number;

    const userRow = await queryOne('SELECT * FROM users WHERE id = $1', [userId]) as unknown as UserRow;
    const user = userRowToUser(userRow);

    const tokenPayload: AuthPayload = {
      userId: Number(userRow.id),
      email: userRow.email || '',
      role: userRow.role,
    };
    const token = generateToken(tokenPayload);

    res.status(201).json({ success: true, data: { token, user } });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ success: false, message: '用户名已存在' });
      return;
    }
    console.error('[auth/register]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// POST /api/auth/login — supports username or email
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { login, password } = req.body;

  if (!login || !password) {
    res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    return;
  }

  try {
    // Try username first, then email
    let userRow = await queryOne(
      'SELECT * FROM users WHERE username = $1', [login]
    ) as unknown as UserRow | undefined;

    if (!userRow) {
      userRow = await queryOne(
        'SELECT * FROM users WHERE email = $1', [login]
      ) as unknown as UserRow | undefined;
    }

    if (!userRow) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }

    const valid = bcrypt.compareSync(password, userRow.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }

    const user = userRowToUser(userRow);
    const tokenPayload: AuthPayload = {
      userId: Number(userRow.id),
      email: userRow.email || '',
      role: userRow.role,
    };
    const token = generateToken(tokenPayload);

    res.json({ success: true, data: { token, user } });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userRow = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.userId]) as unknown as UserRow | undefined;
    if (!userRow) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    const user = userRowToUser(userRow);
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
