import { Router, Request, Response } from 'express';
import { Fine } from '../models/Fine';
import { Transaction } from '../models/Transaction';
import { Member } from '../models/Member';

const router = Router();

// GET /api/fines
router.get('/', async (_req: Request, res: Response) => {
  try {
    const fines = await Fine.find().sort({ createdDate: -1 }).lean();
    return res.json({ success: true, fines: fines.map((f) => ({ ...f, id: f.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch fines', error: err.message });
  }
});

// POST /api/fines/create - Manual assessment (damaged / lost / special fee)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { memberId, amount, reason = 'DAMAGED', bookTitle = 'Library Material', transactionId = '' } = req.body;

    const member = await Member.findOne({
      $or: [{ id: memberId }, { memberCardNo: memberId }, { email: memberId }],
    });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const fine = new Fine({
      id: `fine-${Date.now()}`,
      transactionId,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      bookTitle,
      amount: Number(amount),
      paidAmount: 0,
      reason,
      status: 'UNPAID',
      createdDate: new Date().toISOString().split('T')[0],
    });

    member.pendingFines = (member.pendingFines || 0) + Number(amount);
    await Promise.all([fine.save(), member.save()]);

    return res.status(201).json({ success: true, fine });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create fine', error: err.message });
  }
});

// POST /api/fines/pay - Settle / Pay Fine
router.post('/pay', async (req: Request, res: Response) => {
  try {
    const { fineId, paymentMethod = 'UPI / Online' } = req.body;

    const fine = await Fine.findOne({ id: fineId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine record not found' });
    }

    if (fine.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Fine has already been paid.' });
    }

    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toISOString().split('T')[0];

    fine.status = 'PAID';
    fine.paidAmount = fine.amount;
    fine.paidDate = nowStr;
    fine.receiptNo = receiptNo;
    fine.paymentMethod = paymentMethod;

    // Update associated transaction if exists
    if (fine.transactionId) {
      const tx = await Transaction.findOne({ id: fine.transactionId });
      if (tx) {
        tx.fineStatus = 'PAID';
        await tx.save();
      }
    }

    // Update member pending fines
    const member = await Member.findOne({ id: fine.memberId });
    if (member) {
      member.pendingFines = Math.max(0, (member.pendingFines || 0) - fine.amount);
      await member.save();
    }

    await fine.save();

    return res.json({
      success: true,
      message: `Payment of ₹${fine.amount} processed successfully. Receipt: ${receiptNo}`,
      fine,
      receiptNo,
    });
  } catch (err: any) {
    console.error('Pay fine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process payment', error: err.message });
  }
});

// POST /api/fines/waive - Waive Fine
router.post('/waive', async (req: Request, res: Response) => {
  try {
    const { fineId, waivedBy = 'Chief Librarian', waiveReason = 'Academic Exemption / Approved' } = req.body;

    const fine = await Fine.findOne({ id: fineId });
    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine record not found' });
    }

    fine.status = 'WAIVED';
    fine.waivedBy = waivedBy;
    fine.waiveReason = waiveReason;

    if (fine.transactionId) {
      const tx = await Transaction.findOne({ id: fine.transactionId });
      if (tx) {
        tx.fineStatus = 'WAIVED';
        await tx.save();
      }
    }

    const member = await Member.findOne({ id: fine.memberId });
    if (member) {
      member.pendingFines = Math.max(0, (member.pendingFines || 0) - fine.amount);
      await member.save();
    }

    await fine.save();

    return res.json({
      success: true,
      message: `Fine of ₹${fine.amount} waived by ${waivedBy}.`,
      fine,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to waive fine', error: err.message });
  }
});

export default router;
