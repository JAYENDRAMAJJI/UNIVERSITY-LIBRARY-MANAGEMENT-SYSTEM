import { Router, Request, Response } from 'express';
import { Notice } from '../models/Notice';

const router = Router();

// GET /api/notices
router.get('/', async (_req: Request, res: Response) => {
  try {
    const notices = await Notice.find().sort({ createdDate: -1 }).lean();
    return res.json({ success: true, notices: notices.map((n) => ({ ...n, id: n.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notices', error: err.message });
  }
});

// POST /api/notices - Create Notice
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const notice = new Notice({
      ...data,
      id: data.id || `notif-${Date.now()}`,
      createdDate: data.createdDate || dateStr,
      readBy: data.readBy || [],
    });

    await notice.save();
    return res.status(201).json({ success: true, notice });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create notice', error: err.message });
  }
});

// DELETE /api/notices/:id - Delete Notice
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Notice.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }
    return res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete notice', error: err.message });
  }
});

// POST /api/notices/mark-read - Mark notice as read for a user
router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const { noticeId, userKey } = req.body;
    if (!noticeId || !userKey) {
      return res.status(400).json({ success: false, message: 'noticeId and userKey required' });
    }

    const notice = await Notice.findOne({ id: noticeId });
    if (notice) {
      if (!notice.readBy) notice.readBy = [];
      if (!notice.readBy.includes(userKey)) {
        notice.readBy.push(userKey);
        await notice.save();
      }
    }

    return res.json({ success: true, message: 'Notice marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to mark notice read', error: err.message });
  }
});

export default router;
