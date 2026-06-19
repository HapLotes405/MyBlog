import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import { execute } from '../db';
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
const filesDir = path.join(uploadDir, 'files');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

// Allowed extensions
const imageExts = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
const videoExts = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;
const docExts = /\.(pdf|docx?|xlsx?|pptx?|md|txt|csv|json|xml|ya?ml|log|zip|rar|7z|gz|tar)$/i;

function classifyExt(ext: string): 'video' | 'document' | 'image' {
  if (videoExts.test(ext)) return 'video';
  if (docExts.test(ext)) return 'document';
  return 'image';
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const kind = classifyExt(ext);
    if (kind === 'video') cb(null, videosDir);
    else if (kind === 'document') cb(null, filesDir);
    else cb(null, imagesDir);
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
    const ext = path.extname(file.originalname);
    if (imageExts.test(ext) || videoExts.test(ext) || docExts.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式。支持：图片 (jpg/png/gif/...)、视频 (mp4/webm/...)、文档 (pdf/docx/md/txt/zip/...)'));
    }
  },
});

const router = Router();

// POST /api/upload — upload any file (blogger only)
router.post('/', authMiddleware, bloggerOnly, (req: Request, res: Response): void => {
  upload.single('file')(req, res, async (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传文件' });
      return;
    }

    const ext = path.extname(req.file.filename);
    const kind = classifyExt(ext);
    const subdir = kind === 'video' ? 'videos' : kind === 'document' ? 'files' : 'images';
    const url = `/uploads/${subdir}/${req.file.filename}`;

    let fileId: number | null = null;

    // Store document metadata in the files table
    if (kind === 'document') {
      try {
        const result = await execute(
          `INSERT INTO files (uuid_filename, original_name, mime_type, size, uploaded_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [req.file.filename, req.file.originalname, req.file.mimetype || 'application/octet-stream', req.file.size, req.user!.userId]
        );
        fileId = (result.rows[0] as { id: number }).id;
      } catch (dbErr) {
        console.error('[upload] Failed to insert file record:', dbErr);
        // File is saved to disk; missing DB record is non-fatal but logged
      }
    }

    res.json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: kind,
        fileId: fileId ?? undefined,
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
