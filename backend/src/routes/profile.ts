import { Router, Request, Response } from 'express';
import { queryOne, execute } from '../db';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import { PersonalInfoRow } from '../types';

const router = Router();

async function getPersonalInfo(): Promise<Record<string, unknown>> {
  const row = await queryOne('SELECT * FROM personal_info WHERE id = 1') as unknown as PersonalInfoRow | undefined;
  if (!row) {
    return {
      name: 'HapLotes405',
      nickname: '',
      avatar: '',
      coverImage: '',
      title: '',
      bio: '',
      location: '',
      email: '',
      socialLinks: [],
      skills: [],
      timeline: [],
      interests: [],
      photos: [],
    };
  }

  // JSONB columns are auto-parsed by pg — no need for JSON.parse
  return {
    name: row.name,
    nickname: row.nickname,
    avatar: row.avatar,
    coverImage: row.cover_image,
    title: row.title,
    bio: row.bio,
    location: row.location,
    email: row.email,
    socialLinks: row.social_links,
    skills: row.skills,
    timeline: row.timeline,
    interests: row.interests,
    photos: row.photos,
  };
}

// GET /api/profile
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const profile = await getPersonalInfo();
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('[profile/get]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// PUT /api/profile (blogger only)
router.put('/', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, nickname, avatar, coverImage, title, bio, location, email,
      socialLinks, skills, timeline, interests, photos,
    } = req.body;

    const current = await getPersonalInfo();

    await execute(
      `UPDATE personal_info SET
        name = $1, nickname = $2, avatar = $3, cover_image = $4, title = $5,
        bio = $6, location = $7, email = $8,
        social_links = $9::jsonb, skills = $10::jsonb, timeline = $11::jsonb,
        interests = $12::jsonb, photos = $13::jsonb
       WHERE id = 1`,
      [
        name ?? current.name,
        nickname ?? current.nickname,
        avatar ?? current.avatar,
        coverImage ?? current.coverImage,
        title ?? current.title,
        bio ?? current.bio,
        location ?? current.location,
        email ?? current.email,
        JSON.stringify(socialLinks ?? current.socialLinks),
        JSON.stringify(skills ?? current.skills),
        JSON.stringify(timeline ?? current.timeline),
        JSON.stringify(interests ?? current.interests),
        JSON.stringify(photos ?? current.photos),
      ]
    );

    const updated = await getPersonalInfo();
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[profile/update]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
