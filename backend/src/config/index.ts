import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Only load .env file if it exists (Docker uses env vars from compose)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback: load from CWD (e.g. .env.docker)
}

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
