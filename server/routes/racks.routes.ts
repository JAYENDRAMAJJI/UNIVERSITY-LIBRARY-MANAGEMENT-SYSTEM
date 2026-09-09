import { Router, Request, Response } from 'express';
import { Rack } from '../models/Rack';

const router = Router();

// GET /api/racks - Return all 24 racks with shelves
router.get('/', async (_req: Request, res: Response) => {
  try {
    const racks = await Rack.find().sort({ rackCode: 1 }).lean();
    return res.json({ success: true, racks: racks.map((r) => ({ ...r, id: r.rackId })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch racks', error: err.message });
  }
});

// PUT /api/racks/:rackId - Update rack details
router.put('/:rackId', async (req: Request, res: Response) => {
  try {
    const { rackId } = req.params;
    const update = req.body;

    const rack = await Rack.findOne({ $or: [{ rackId }, { rackCode: rackId }] });
    if (!rack) {
      return res.status(404).json({ success: false, message: 'Rack not found' });
    }

    Object.assign(rack, update);
    await rack.save();

    return res.json({ success: true, rack });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update rack', error: err.message });
  }
});

export default router;
