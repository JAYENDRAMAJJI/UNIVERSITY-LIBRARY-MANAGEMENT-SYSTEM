import { Router, Request, Response } from 'express';
import { SystemConfigModel, CalendarEventModel, RolePermissionModel, UserPermissionModel } from '../models/Setting';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/settings/config - Public read for system library name / operating status
router.get('/config', async (_req: Request, res: Response) => {
  try {
    let config = await SystemConfigModel.findOne({ key: 'main_config' }).lean();
    if (!config) {
      config = await SystemConfigModel.create({ key: 'main_config' });
    }
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings config', error: err.message });
  }
});

// PUT /api/settings/config - Admin only
router.put('/config', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const update = req.body;
    let config = await SystemConfigModel.findOne({ key: 'main_config' });
    if (!config) {
      config = new SystemConfigModel({ key: 'main_config', ...update });
    } else {
      Object.assign(config, update);
    }
    await config.save();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update settings config', error: err.message });
  }
});

// GET /api/settings/permissions - Authenticated
router.get('/permissions', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const roleDocs = await RolePermissionModel.find().lean();
    const userDocs = await UserPermissionModel.find().lean();

    const rolePermissions: Record<string, any> = {};
    roleDocs.forEach((r) => {
      rolePermissions[r.role] = r.permissions;
    });

    const userPermissions: Record<string, any> = {};
    userDocs.forEach((u) => {
      userPermissions[u.userId] = u.permissions;
    });

    return res.json({ success: true, rolePermissions, userPermissions });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch permissions', error: err.message });
  }
});

// PUT /api/settings/permissions/role/:role - Admin only
router.put('/permissions/role/:role', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    let doc = await RolePermissionModel.findOne({ role });
    if (!doc) {
      doc = new RolePermissionModel({ role, permissions });
    } else {
      doc.permissions = permissions;
    }
    await doc.save();

    return res.json({ success: true, role, permissions: doc.permissions });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update role permissions', error: err.message });
  }
});

// PUT /api/settings/permissions/user/:userId - Admin only
router.put('/permissions/user/:userId', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    let doc = await UserPermissionModel.findOne({ userId });
    if (!doc) {
      doc = new UserPermissionModel({ userId, permissions });
    } else {
      doc.permissions = permissions;
    }
    await doc.save();

    return res.json({ success: true, userId, permissions: doc.permissions });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update user permissions', error: err.message });
  }
});

// Calendar Events - Public read, authenticated edit
router.get('/calendar', async (_req: Request, res: Response) => {
  try {
    const events = await CalendarEventModel.find().sort({ date: 1 }).lean();
    return res.json({ success: true, calendarEvents: events.map((e) => ({ ...e, id: e.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch calendar events', error: err.message });
  }
});

router.post('/calendar', authenticateToken, requireRole('ADMIN', 'STAFF', 'LIBRARIAN'), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const event = new CalendarEventModel({
      ...data,
      id: data.id || `cal-${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString().split('T')[0],
    });
    await event.save();
    return res.status(201).json({ success: true, calendarEvent: event });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create calendar event', error: err.message });
  }
});

router.delete('/calendar/:id', authenticateToken, requireRole('ADMIN', 'STAFF', 'LIBRARIAN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await CalendarEventModel.deleteOne({ id });
    return res.json({ success: true, message: 'Calendar event removed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
