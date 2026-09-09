import { Router, Request, Response } from 'express';
import { Attendance } from '../models/Attendance';
import { Member } from '../models/Member';

const router = Router();

// GET /api/attendance
router.get('/', async (_req: Request, res: Response) => {
  try {
    const records = await Attendance.find().sort({ checkInTime: -1 }).lean();
    return res.json({ success: true, records: records.map((r) => ({ ...r, id: r.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: err.message });
  }
});

// POST /api/attendance/check-in
router.post('/check-in', async (req: Request, res: Response) => {
  try {
    const {
      memberIdOrCardOrRoll,
      purposeOfVisit = 'GENERAL_READING',
      verificationMethod = 'CARD_SCAN',
      entryGate = 'Main Gate - North Wing',
      checkedInBy = 'Gate Staff',
      notes,
    } = req.body;

    const term = (memberIdOrCardOrRoll || '').trim();
    if (!term) {
      return res.status(400).json({ success: false, message: 'Member identifier (ID / Card No / Roll No / Email) required' });
    }

    const member = await Member.findOne({
      $or: [
        { id: term },
        { memberCardNo: new RegExp(`^${term}$`, 'i') },
        { rollNo: new RegExp(`^${term}$`, 'i') },
        { email: term.toLowerCase() },
      ],
    });

    if (!member) {
      return res.status(404).json({ success: false, message: `Member not found for '${term}'.` });
    }

    // Check if already checked in
    const existingActive = await Attendance.findOne({
      memberId: member.id,
      status: 'IN_LIBRARY',
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `${member.name} is already checked in at ${existingActive.checkInTime}. Please check out first.`,
        activeRecord: existingActive,
      });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const record = new Attendance({
      id: `att-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      role: member.role,
      department: member.department,
      email: member.email,
      checkInTime: timeStr,
      status: 'IN_LIBRARY',
      entryGate,
      purposeOfVisit,
      verificationMethod,
      checkedInBy,
      notes,
      date: dateStr,
    });

    await record.save();

    return res.status(201).json({
      success: true,
      message: `Welcome ${member.name}! Check-in recorded at ${timeStr}.`,
      record,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record check-in', error: err.message });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req: Request, res: Response) => {
  try {
    const { attendanceId, memberIdOrCardOrRoll, checkedOutBy = 'Gate Staff' } = req.body;

    let record: any;
    if (attendanceId) {
      record = await Attendance.findOne({ id: attendanceId });
    } else if (memberIdOrCardOrRoll) {
      const term = memberIdOrCardOrRoll.trim();
      const member = await Member.findOne({
        $or: [
          { id: term },
          { memberCardNo: new RegExp(`^${term}$`, 'i') },
          { rollNo: new RegExp(`^${term}$`, 'i') },
          { email: term.toLowerCase() },
        ],
      });

      if (member) {
        record = await Attendance.findOne({ memberId: member.id, status: 'IN_LIBRARY' }).sort({ checkInTime: -1 });
      }
    }

    if (!record || record.status !== 'IN_LIBRARY') {
      return res.status(404).json({ success: false, message: 'Active in-library attendance session not found.' });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const checkOutTimeStr = `${dateStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const inTime = new Date(record.checkInTime.replace(' ', 'T')).getTime();
    const outTime = now.getTime();
    const durationMinutes = Math.max(1, Math.round((outTime - inTime) / 60000));

    record.checkOutTime = checkOutTimeStr;
    record.durationMinutes = durationMinutes;
    record.status = 'COMPLETED';
    record.checkedOutBy = checkedOutBy;

    await record.save();

    return res.json({
      success: true,
      message: `Goodbye ${record.memberName}! Session ended (${durationMinutes} mins).`,
      record,
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record check-out', error: err.message });
  }
});

export default router;
