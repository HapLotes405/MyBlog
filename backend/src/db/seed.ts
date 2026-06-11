import bcrypt from 'bcryptjs';
import { initDb, closeDb, queryOne, execute } from './index';
import { config } from '../config';

async function seed(): Promise<void> {
  await initDb();

  // Create or update blogger user (identified by username)
  const existing = await queryOne(
    'SELECT id FROM users WHERE username = $1',
    [config.bloggerUsername]
  );

  const passwordHash = bcrypt.hashSync(config.bloggerPassword, 10);

  if (existing) {
    // Update password + email to match env config
    await execute(
      'UPDATE users SET password_hash = $1, email = $2, role = $3 WHERE username = $4',
      [passwordHash, config.bloggerEmail, 'blogger', config.bloggerUsername]
    );
    console.log(`[seed] Blogger "${config.bloggerUsername}" password updated.`);
  } else {
    await execute(
      `INSERT INTO users (username, email, password_hash, role, bio, nickname)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [config.bloggerUsername, config.bloggerEmail, passwordHash, 'blogger', 'Wiki owner & blogger', config.bloggerUsername]
    );
    console.log(`[seed] Blogger "${config.bloggerUsername}" created.`);
  }

  await closeDb();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
