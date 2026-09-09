import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Member } from '../models/Member';

const router = Router();

// GET /api/members
router.get('/', async (_req: Request, res: Response) => {
  try {
    const members = await Member.find().select('-password').lean();
    return res.json({ success: true, members: members.map((m) => ({ ...m, id: m.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch members', error: err.message });
  }
});

// POST /api/members - Add member directly (by Admin/Staff)
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const existing = await Member.findOne({ email: data.email?.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Member with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password || 'password123', salt);

    const yr = new Date().getFullYear();
    const prefix = data.role === 'STUDENT' ? 'STU' : data.role === 'FACULTY' ? 'FAC' : data.role === 'ADMIN' ? 'ADM' : 'STA';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const memberCardNo = data.memberCardNo || `${prefix}-${yr}-${randomSuffix}`;
    const id = data.id || `mem-${Date.now()}`;

    const newMember = new Member({
      ...data,
      id,
      userId: id,
      password: hashedPassword,
      memberCardNo,
      status: data.status || 'ACTIVE',
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: data.registeredDate || new Date().toISOString().split('T')[0],
      approvedDate: new Date().toISOString().split('T')[0],
      approvedBy: data.approvedBy || 'Admin',
    });

    await newMember.save();
    return res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    console.error('Create member error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add member', error: err.message });
  }
});

// PUT /api/members/:id - Update member details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    delete update.password; // do not overwrite password here

    const member = await Member.findOne({ id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    Object.assign(member, update);
    await member.save();

    return res.json({ success: true, member });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update member', error: err.message });
  }
});

// DELETE /api/members/:id - Delete member
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Member.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    return res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete member', error: err.message });
  }
});

// PUT /api/members/:id/approve - Approve pending membership
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approvedBy = 'Admin Librarian' } = req.body;

    const member = await Member.findOne({ id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.status = 'ACTIVE';
    member.approvedDate = new Date().toISOString().split('T')[0];
    member.approvedBy = approvedBy;
    delete (member as any).rejectionReason;

    await member.save();
    return res.json({ success: true, message: 'Member approved successfully', member });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to approve member', error: err.message });
  }
});

// PUT /api/members/:id/reject - Reject membership application
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason = 'Incomplete verification documents' } = req.body;

    const member = await Member.findOne({ id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.status = 'REJECTED';
    member.rejectionReason = rejectionReason;

    await member.save();
    return res.json({ success: true, message: 'Member application rejected', member });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to reject member', error: err.message });
  }
});

// PUT /api/members/:id/suspend - Suspend membership
router.put('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suspendedReason = 'Disciplinary violation or unpaid dues' } = req.body;

    const member = await Member.findOne({ id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.status = 'SUSPENDED';
    member.suspendedReason = suspendedReason;

    await member.save();
    return res.json({ success: true, message: 'Member account suspended', member });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to suspend member', error: err.message });
  }
});

export default router;
