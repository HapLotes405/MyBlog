import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import fs from 'fs';
import https from 'https';
import http from 'http';

const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Subdirectories for different file types
const imagesDir = path.join(uploadDir, 'images');
const videosDir = path.join(uploadDir, 'videos');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(path.extname(file.originalname));
    cb(null, isVideo ? videosDir : imagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    const allowedImages = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
    const allowedVideos = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;
    const ext = path.extname(file.originalname);
    if (allowedImages.test(ext) || allowedVideos.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片 (jpg/png/gif/webp/svg/bmp) 和视频 (mp4/webm/ogg/mov/avi/mkv) 文件'));
    }
  },
});

const router = Router();

// POST /api/upload — upload image or video (blogger only)
router.post('/', authMiddleware, bloggerOnly, (req: Request, res: Response): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传文件' });
      return;
    }

    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(path.extname(req.file.filename));
    const url = `/uploads/${isVideo ? 'videos' : 'images'}/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        size: req.file.size,
        type: isVideo ? 'video' : 'image',
      },
    });
  });
});

// POST /api/upload/download-url — download image from external URL (blogger only)
router.post('/download-url', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: '请提供图片 URL' });
      return;
    }

    // Validate URL protocol
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.status(400).json({ success: false, message: '仅支持 http/https 协议的图片' });
      return;
    }

    // Determine file extension from URL path or default to .jpg
    const urlPath = parsed.pathname;
    let ext = path.extname(urlPath).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    if (!allowedExts.includes(ext)) {
      // Try to infer from common patterns or default to .png
      ext = '.png';
    }

    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(imagesDir, filename);

    // Download the image
    await new Promise<void>((resolve, reject) => {
      const client = parsed.protocol === 'https:' ? https : http;
      client.get(url, { timeout: 30000 }, (response) => {
        // Handle redirects (up to 3)
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, url);
          const redirectClient = redirectUrl.protocol === 'https:' ? https : http;
          redirectClient.get(redirectUrl.toString(), { timeout: 30000 }, (redirectRes) => {
            const writeStream = fs.createWriteStream(filepath);
            redirectRes.pipe(writeStream);
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
          }).on('error', reject);
          return;
        }

        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`下载失败：HTTP ${response.statusCode}`));
          return;
        }

        const writeStream = fs.createWriteStream(filepath);
        response.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      }).on('error', reject);
    });

    const stats = fs.statSync(filepath);
    const fileUrl = `/uploads/images/${filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename,
        size: stats.size,
        type: 'image' as const,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '下载图片失败';
    res.status(500).json({ success: false, message });
  }
});

export default router;
