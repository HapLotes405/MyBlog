import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wiki',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  bloggerEmail: process.env.BLOGGER_EMAIL || 'admin@hapLotes405.wiki',
  bloggerPassword: process.env.BLOGGER_PASSWORD || 'blog405admin',
};
