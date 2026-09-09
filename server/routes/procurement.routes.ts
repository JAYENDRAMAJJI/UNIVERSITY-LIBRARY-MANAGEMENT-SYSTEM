import { Router, Request, Response } from 'express';
import { ProcurementRequest, Vendor } from '../models/Procurement';

const router = Router();

// GET /api/procurement/requests
router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const requests = await ProcurementRequest.find().sort({ requestedDate: -1 }).lean();
    return res.json({ success: true, procurementRequests: requests.map((p) => ({ ...p, id: p.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch procurement requests', error: err.message });
  }
});

// POST /api/procurement/requests
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const proc = new ProcurementRequest({
      ...data,
      id: data.id || `proc-${Date.now()}`,
      requestedDate: data.requestedDate || nowStr,
      status: data.status || 'PENDING',
      timeline: data.timeline || [
        {
          status: 'PENDING',
          label: 'Procurement Requisition Created',
          timestamp: nowStr,
          actorName: data.requestedByName || 'User',
          actorRole: data.requestedByRole || 'FACULTY',
          notes: data.reason,
        },
      ],
    });

    await proc.save();
    return res.status(201).json({ success: true, procurementRequest: proc });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create procurement request', error: err.message });
  }
});

// PUT /api/procurement/requests/:id/status - Update Status / PO / Received info
router.put('/requests/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actorName = 'Admin Librarian', actorRole = 'ADMIN', notes, vendorId, vendorName, poNumber, poDate, approvedPrice, actualPrice, invoiceNo, receivedDate, receivedQuantity, qualityStatus, assignedCategoryId, assignedCategoryName, assignedRackNumber, assignedShelfNumber, generatedAccessionNos, generatedBarcodes } = req.body;

    const proc = await ProcurementRequest.findOne({ id });
    if (!proc) {
      return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    proc.status = status;
    if (vendorId !== undefined) proc.vendorId = vendorId;
    if (vendorName !== undefined) proc.vendorName = vendorName;
    if (poNumber !== undefined) proc.poNumber = poNumber;
    if (poDate !== undefined) proc.poDate = poDate;
    if (approvedPrice !== undefined) proc.approvedPrice = approvedPrice;
    if (actualPrice !== undefined) proc.actualPrice = actualPrice;
    if (invoiceNo !== undefined) proc.invoiceNo = invoiceNo;
    if (receivedDate !== undefined) proc.receivedDate = receivedDate;
    if (receivedQuantity !== undefined) proc.receivedQuantity = receivedQuantity;
    if (qualityStatus !== undefined) proc.qualityStatus = qualityStatus;
    if (assignedCategoryId !== undefined) proc.assignedCategoryId = assignedCategoryId;
    if (assignedCategoryName !== undefined) proc.assignedCategoryName = assignedCategoryName;
    if (assignedRackNumber !== undefined) proc.assignedRackNumber = assignedRackNumber;
    if (assignedShelfNumber !== undefined) proc.assignedShelfNumber = assignedShelfNumber;
    if (generatedAccessionNos !== undefined) proc.generatedAccessionNos = generatedAccessionNos;
    if (generatedBarcodes !== undefined) proc.generatedBarcodes = generatedBarcodes;

    if (!proc.timeline) proc.timeline = [];
    proc.timeline.push({
      status,
      label: `Procurement status updated to ${status}`,
      timestamp: nowStr,
      actorName,
      actorRole,
      notes: notes || `Updated to ${status}`,
    });

    await proc.save();
    return res.json({ success: true, procurementRequest: proc });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update procurement request', error: err.message });
  }
});

// Vendors routes
router.get('/vendors', async (_req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find().lean();
    return res.json({ success: true, vendors: vendors.map((v) => ({ ...v, id: v.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const v = new Vendor({ ...req.body, id: req.body.id || `v-${Date.now()}` });
    await v.save();
    return res.status(201).json({ success: true, vendor: v });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
