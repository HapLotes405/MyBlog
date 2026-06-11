import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initDb, closeDb } from './db';
import { runMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import blogRoutes from './routes/blog';
import commentRoutes from './routes/comment';
import interactionRoutes from './routes/interaction';
import profileRoutes from './routes/profile';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/user';
import gameScoreRoutes from './routes/game-scores';

async function main(): Promise<void> {
  // ===== Initialize database =====
  console.log('[Server] Initializing database...');
  await initDb();
  await runMigrations();
  console.log('[Server] Database ready.');

  const app = express();

  // ===== Middleware =====
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded files
  app.use('/uploads', express.static(path.resolve(config.uploadDir)));

  // ===== API Routes =====
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', blogRoutes);
  app.use('/api', commentRoutes);
  app.use('/api', interactionRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/game-scores', gameScoreRoutes);

  // ===== Health check =====
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  // ===== Error handling =====
  app.use(errorHandler);

  // ===== Graceful shutdown =====
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    closeDb().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // ===== Start server =====
  app.listen(config.port, () => {
    console.log(`[Server] Backend running at http://localhost:${config.port}`);
    console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
  });
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
