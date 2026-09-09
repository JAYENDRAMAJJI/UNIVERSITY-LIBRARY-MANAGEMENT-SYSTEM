import { Router, Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';

const router = Router();

// GET /api/audit
router.get('/', async (_req: Request, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(1000).lean();
    return res.json({ success: true, auditLogs: logs.map((l) => ({ ...l, id: l.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: err.message });
  }
});

// POST /api/audit - Add audit log entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const log = new AuditLog({
      ...data,
      id: data.id || `audit-${Date.now()}`,
      timestamp: data.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    await log.save();
    return res.status(201).json({ success: true, auditLog: log });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record audit log', error: err.message });
  }
});

export default router;
