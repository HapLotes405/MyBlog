import bcrypt from 'bcryptjs';
import { initDb, closeDb, queryOne, execute } from './index';
import { config } from '../config';

async function seed(): Promise<void> {
  await initDb();

  // Create blogger user if not exists
  const existing = await queryOne(
    'SELECT id FROM users WHERE email = $1',
    [config.bloggerEmail]
  );

  if (!existing) {
    const passwordHash = bcrypt.hashSync(config.bloggerPassword, 10);
    await execute(
      `INSERT INTO users (username, email, password_hash, role, bio, nickname)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['HapLotes405', config.bloggerEmail, passwordHash, 'blogger', 'Wiki owner & blogger', 'HapLotes405']
    );
    console.log(`[seed] Blogger user created: ${config.bloggerEmail}`);
  } else {
    console.log('[seed] Blogger user already exists, skipping.');
  }

  await closeDb();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
