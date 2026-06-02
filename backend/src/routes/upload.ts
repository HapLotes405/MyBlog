import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import fs from 'fs';

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

export default router;
