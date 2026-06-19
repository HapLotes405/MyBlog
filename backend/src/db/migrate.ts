import { withClient, queryOne } from './index';

export async function runMigrations(): Promise<void> {
  await withClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('blogger', 'user')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Add nickname column for existing databases
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT '';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Make email nullable (username is the primary identifier)
    await client.query(`
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `).catch(() => {
      // Already nullable — ignore
    });

    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        summary TEXT DEFAULT '',
        content TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        tags JSONB DEFAULT '[]',
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reading_time INTEGER DEFAULT 1,
        likes_count INTEGER DEFAULT 0,
        favorites_count INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_blogs_created ON blogs(created_at)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_info (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        name TEXT NOT NULL DEFAULT 'HapLotes405',
        nickname TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        title TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        location TEXT DEFAULT '',
        email TEXT DEFAULT '',
        social_links JSONB DEFAULT '[]',
        skills JSONB DEFAULT '[]',
        timeline JSONB DEFAULT '[]',
        interests JSONB DEFAULT '[]',
        photos JSONB DEFAULT '[]'
      )
    `);

    // Ensure personal_info has the single row
    await client.query(
      'INSERT INTO personal_info (id) VALUES (1) ON CONFLICT (id) DO NOTHING'
    );

    // Game leaderboard scores
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level INTEGER NOT NULL CHECK(level >= 1 AND level <= 8),
        time_ms INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, level)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_scores_level_time ON game_scores(level, time_ms ASC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id)');

    // File attachments for blog posts
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        uuid_filename TEXT UNIQUE NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        size BIGINT NOT NULL DEFAULT 0,
        post_id INTEGER REFERENCES blogs(id) ON DELETE SET NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_post ON files(post_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)');
  });

  console.log('[DB] Migrations completed successfully.');
}

// Run directly: npx tsx src/db/migrate.ts
if (require.main === module) {
  import('./index').then(({ initDb, closeDb }) => {
    return initDb().then(() => runMigrations()).then(() => closeDb());
  }).then(() => {
    console.log('[DB] Migration script finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('[DB] Migration failed:', err);
    process.exit(1);
  });
}
