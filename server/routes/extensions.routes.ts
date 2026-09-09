import { Router, Request, Response } from 'express';
import { ExtensionRequest } from '../models/ExtensionRequest';
import { Transaction } from '../models/Transaction';

const router = Router();

// GET /api/extensions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const extensions = await ExtensionRequest.find().sort({ requestedDate: -1 }).lean();
    return res.json({ success: true, extensionRequests: extensions.map((e) => ({ ...e, id: e.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch extensions', error: err.message });
  }
});

// POST /api/extensions - Submit extension request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { transactionId, requestedExtensionDays = 14, reason } = req.body;

    const tx = await Transaction.findOne({ id: transactionId });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Loan transaction not found' });
    }

    const currentDue = new Date(tx.dueDate.split(' ')[0]);
    currentDue.setDate(currentDue.getDate() + Number(requestedExtensionDays));
    const newDueDateStr = `${currentDue.getFullYear()}-${String(currentDue.getMonth() + 1).padStart(2, '0')}-${String(currentDue.getDate()).padStart(2, '0')}`;

    const ext = new ExtensionRequest({
      id: `ext-${Date.now()}`,
      transactionId: tx.id,
      bookId: tx.bookId,
      bookTitle: tx.bookTitle,
      accessionNo: tx.accessionNo,
      barcode: tx.barcode,
      memberId: tx.memberId,
      memberName: tx.memberName,
      memberCardNo: tx.memberCardNo,
      memberRole: tx.memberType,
      currentDueDate: tx.dueDate,
      requestedExtensionDays: Number(requestedExtensionDays),
      newDueDate: newDueDateStr,
      reason: reason || 'Research and project completion',
      status: 'PENDING',
      requestedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });

    await ext.save();

    return res.status(201).json({
      success: true,
      message: 'Due date extension request submitted for library review.',
      extensionRequest: ext,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit extension', error: err.message });
  }
});

// PUT /api/extensions/:id/review - Approve or Reject
router.put('/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewedByName = 'Admin Librarian', adminNotes } = req.body;

    const ext = await ExtensionRequest.findOne({ id });
    if (!ext) {
      return res.status(404).json({ success: false, message: 'Extension request not found' });
    }

    ext.status = status;
    ext.reviewedByName = reviewedByName;
    ext.reviewedDate = new Date().toISOString().replace('T', ' ').slice(0, 16);
    if (adminNotes) ext.adminNotes = adminNotes;

    // If approved, update loan transaction due date
    if (status === 'APPROVED' && ext.newDueDate) {
      const tx = await Transaction.findOne({ id: ext.transactionId });
      if (tx) {
        tx.dueDate = ext.newDueDate;
        tx.renewalCount = (tx.renewalCount || 0) + 1;
        await tx.save();
      }
    }

    await ext.save();

    return res.json({
      success: true,
      message: `Extension request ${status.toLowerCase()} successfully.`,
      extensionRequest: ext,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review extension', error: err.message });
  }
});

export default router;
