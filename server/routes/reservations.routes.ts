import { Router, Request, Response } from 'express';
import { Reservation } from '../models/Reservation';
import { Book } from '../models/Book';
import { Member } from '../models/Member';

const router = Router();

// GET /api/reservations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const reservations = await Reservation.find().sort({ requestDate: -1 }).lean();
    return res.json({ success: true, reservations: reservations.map((r) => ({ ...r, id: r.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reservations', error: err.message });
  }
});

// POST /api/reservations - Place a hold / reservation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { bookId, memberId } = req.body;

    const book = await Book.findOne({ id: bookId });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const member = await Member.findOne({
      $or: [
        { id: memberId },
        { memberCardNo: new RegExp(`^${memberId}$`, 'i') },
        { barcode: new RegExp(`^${memberId}$`, 'i') },
        { rollNo: new RegExp(`^${memberId}$`, 'i') },
        { email: memberId.toLowerCase().trim() },
      ],
    });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const existingHold = await Reservation.findOne({
      bookId: book.id,
      memberId: member.id,
      status: { $in: ['PENDING', 'APPROVED'] },
    });

    if (existingHold) {
      return res.status(400).json({ success: false, message: 'You already have an active hold on this book.' });
    }

    const currentPendingCount = await Reservation.countDocuments({
      bookId: book.id,
      status: { $in: ['PENDING', 'APPROVED'] },
    });

    const reservation = new Reservation({
      id: `res-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      coverUrl: book.coverUrl,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      requestDate: new Date().toISOString().split('T')[0],
      queuePosition: currentPendingCount + 1,
      status: 'PENDING',
    });

    await reservation.save();

    return res.status(201).json({
      success: true,
      message: `Hold placed for '${book.title}'. Queue Position: #${reservation.queuePosition}`,
      reservation,
    });
  } catch (err: any) {
    console.error('Reservation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to place reservation', error: err.message });
  }
});

// PUT /api/reservations/:id/cancel
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findOne({ id });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    return res.json({ success: true, message: 'Reservation cancelled', reservation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to cancel reservation', error: err.message });
  }
});

// PUT /api/reservations/:id/approve
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findOne({ id });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48);

    reservation.status = 'APPROVED';
    reservation.expiryDate = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')} ${String(expiry.getHours()).padStart(2, '0')}:${String(expiry.getMinutes()).padStart(2, '0')}`;

    await reservation.save();

    return res.json({ success: true, message: 'Reservation approved (Held for 48 hours)', reservation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to approve reservation', error: err.message });
  }
});

export default router;
