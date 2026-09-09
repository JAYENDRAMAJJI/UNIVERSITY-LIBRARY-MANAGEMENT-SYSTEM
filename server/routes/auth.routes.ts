import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isDbConnected } from '../config/db';
import { Member } from '../models/Member';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'university_library_secure_jwt_secret_key_2026_x89';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Please verify your MONGODB_URI in the backend .env file.',
      isDbConnected: false,
    });
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const member = await Member.findOne({ email: email.toLowerCase().trim() });
    if (!member) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, member.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (member.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your account registration is pending administrator approval.',
        status: member.status,
      });
    }

    if (member.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        message: `Your account was rejected. Reason: ${member.rejectionReason || 'Contact library admin.'}`,
        status: member.status,
      });
    }

    if (member.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended. Reason: ${member.suspendedReason || 'Contact library admin.'}`,
        status: member.status,
      });
    }

    const payload = {
      id: member.id,
      email: member.email,
      role: member.role,
      name: member.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    const userObj = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      department: member.department,
      memberCardNo: member.memberCardNo,
      rollNo: member.rollNo,
      avatarUrl: member.avatarUrl,
      phone: member.phone,
      gender: member.gender,
    };

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userObj,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.', error: error.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department, rollNo, phone, gender, program, startingYear, passoutYear, academicBatch, address, emergencyContact, idProofType, idProofNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await Member.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const yr = new Date().getFullYear();
    const prefix = role === 'STUDENT' ? 'STU' : role === 'FACULTY' ? 'FAC' : 'STA';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const memberCardNo = `${prefix}-${yr}-${randomSuffix}`;
    const id = `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMember = new Member({
      id,
      userId: id,
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role.toUpperCase(),
      status: 'PENDING_APPROVAL',
      department: department || 'General',
      memberCardNo,
      rollNo,
      phone,
      gender: gender || 'OTHER',
      program,
      startingYear,
      passoutYear,
      academicBatch,
      address,
      emergencyContact,
      idProofType,
      idProofNumber,
      maxAllowedBooks: role === 'FACULTY' ? 10 : 4,
      currentActiveLoans: 0,
      pendingFines: 0,
      registeredDate: new Date().toISOString().split('T')[0],
      appliedDate: new Date().toISOString().split('T')[0],
    });

    await newMember.save();

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your account is pending administrator approval.',
      memberId: newMember.id,
      memberCardNo: newMember.memberCardNo,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const member = await Member.findOne({ id: req.user.id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        department: member.department,
        memberCardNo: member.memberCardNo,
        rollNo: member.rollNo,
        avatarUrl: member.avatarUrl,
        phone: member.phone,
        gender: member.gender,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error fetching profile.', error: error.message });
  }
});

export default router;
