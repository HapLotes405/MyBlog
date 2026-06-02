import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  jwtSecret: requireEnv('JWT_SECRET'),
  databaseUrl: requireEnv('DATABASE_URL'),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  bloggerEmail: requireEnv('BLOGGER_EMAIL'),
  bloggerPassword: requireEnv('BLOGGER_PASSWORD'),
};
