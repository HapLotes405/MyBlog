import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, execute } from '../db';
import { authMiddleware, bloggerOnly } from '../middleware/auth';
import { config } from '../config';
import { FileRow } from '../types';

const router = Router();
const filesDir = path.join(path.resolve(config.uploadDir), 'files');

function fileRowToResponse(row: FileRow): Record<string, unknown> {
  return {
    id: String(row.id),
    uuidFilename: row.uuid_filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    postId: row.post_id ? String(row.post_id) : null,
    uploadedBy: String(row.uploaded_by),
    downloadCount: row.download_count,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
    url: `/uploads/files/${row.uuid_filename}`,
    extension: path.extname(row.uuid_filename).replace('.', '').toLowerCase(),
  };
}

// GET /api/files — list files (public, paginated, optional ?postId= filter)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const postId = req.query.postId as string | undefined;
    const offset = (page - 1) * pageSize;

    if (postId) {
      const countRow = await queryOne(
        'SELECT COUNT(*)::int as total FROM files WHERE post_id = $1',
        [postId]
      ) as { total: number };
      const total = countRow.total;
      const totalPages = Math.ceil(total / pageSize);

      const rows = await queryAll(
        'SELECT * FROM files WHERE post_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [postId, pageSize, offset]
      ) as unknown as FileRow[];

      res.json({
        success: true,
        data: rows.map(fileRowToResponse),
        total,
        page,
        pageSize,
        totalPages,
      });
    } else {
      const countRow = await queryOne('SELECT COUNT(*)::int as total FROM files') as { total: number };
      const total = countRow.total;
      const totalPages = Math.ceil(total / pageSize);

      const rows = await queryAll(
        'SELECT * FROM files ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [pageSize, offset]
      ) as unknown as FileRow[];

      res.json({
        success: true,
        data: rows.map(fileRowToResponse),
        total,
        page,
        pageSize,
        totalPages,
      });
    }
  } catch (err) {
    console.error('[files/list]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/files/:id — single file metadata (public)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('SELECT * FROM files WHERE id = $1', [req.params.id]) as unknown as FileRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, message: '文件不存在' });
      return;
    }
    res.json({ success: true, data: fileRowToResponse(row) });
  } catch (err) {
    console.error('[files/get]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// GET /api/files/:id/download — download file (public, increments counter)
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('SELECT * FROM files WHERE id = $1', [req.params.id]) as unknown as FileRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, message: '文件不存在' });
      return;
    }

    const filePath = path.join(filesDir, row.uuid_filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: '文件已被删除' });
      return;
    }

    // Increment download count (fire-and-forget, don't block the response)
    execute('UPDATE files SET download_count = download_count + 1 WHERE id = $1', [row.id])
      .catch((e) => console.error('[files/download] counter update failed:', e));

    const safeName = encodeURIComponent(row.original_name);
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
    res.setHeader('Content-Length', row.size);
    res.sendFile(filePath);
  } catch (err) {
    console.error('[files/download]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// DELETE /api/files/:id — delete file (blogger only)
router.delete('/:id', authMiddleware, bloggerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne('SELECT * FROM files WHERE id = $1', [req.params.id]) as unknown as FileRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, message: '文件不存在' });
      return;
    }

    // Remove from disk
    const filePath = path.join(filesDir, row.uuid_filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    await execute('DELETE FROM files WHERE id = $1', [row.id]);

    res.json({ success: true, data: null, message: '文件已删除' });
  } catch (err) {
    console.error('[files/delete]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
