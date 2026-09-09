import { Router, Request, Response } from 'express';
import { DigitalResource, OfficialDocument, DigitalDownloadLog } from '../models/DigitalResource';

const router = Router();

// GET /api/digital/resources
router.get('/resources', async (_req: Request, res: Response) => {
  try {
    const resources = await DigitalResource.find().sort({ uploadDate: -1 }).lean();
    return res.json({ success: true, digitalResources: resources.map((r) => ({ ...r, id: r.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch digital resources', error: err.message });
  }
});

// POST /api/digital/resources - Upload / Add Digital Resource
router.post('/resources', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const resource = new DigitalResource({
      ...data,
      id: data.id || `dig-${Date.now()}`,
      uploadDate: data.uploadDate || new Date().toISOString().split('T')[0],
      downloadCount: data.downloadCount || 0,
    });

    await resource.save();
    return res.status(201).json({ success: true, resource });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create resource', error: err.message });
  }
});

// DELETE /api/digital/resources/:id
router.delete('/resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DigitalResource.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    return res.json({ success: true, message: 'Resource deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete resource', error: err.message });
  }
});

// POST /api/digital/resources/:id/download - Log download
router.post('/resources/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole } = req.body;

    const resource = await DigitalResource.findOne({ id });
    if (resource) {
      resource.downloadCount = (resource.downloadCount || 0) + 1;
      await resource.save();

      const log = new DigitalDownloadLog({
        id: `dl-${Date.now()}`,
        resourceId: resource.id,
        resourceTitle: resource.title,
        resourceType: resource.resourceType,
        userId: userId || 'anonymous',
        userName: userName || 'Guest User',
        userRole: userRole || 'GUEST',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        fileSizeMb: resource.fileSizeMb || 0,
      });
      await log.save();

      return res.json({ success: true, downloadCount: resource.downloadCount, log });
    }
    return res.status(404).json({ success: false, message: 'Resource not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Download log error', error: err.message });
  }
});

// GET /api/digital/documents - Official Documents
router.get('/documents', async (_req: Request, res: Response) => {
  try {
    const docs = await OfficialDocument.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, officialDocuments: docs.map((d) => ({ ...d, id: d.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch official documents', error: err.message });
  }
});

// POST /api/digital/documents - Create Official Document
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const doc = new OfficialDocument({
      ...data,
      id: data.id || `doc-${Date.now()}`,
      updatedDate: data.updatedDate || new Date().toISOString().split('T')[0],
      createdAt: data.createdAt || new Date().toISOString().split('T')[0],
      downloadCount: data.downloadCount || 0,
    });
    await doc.save();
    return res.status(201).json({ success: true, document: doc });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create official document', error: err.message });
  }
});

export default router;
