import { Router, Request, Response } from 'express';
import { NoDueApplication, NoDueCertificate } from '../models/NoDueCertificate';
import { Member } from '../models/Member';
import { Transaction } from '../models/Transaction';
import { Fine } from '../models/Fine';

const router = Router();

// GET /api/nodue/applications
router.get('/applications', async (_req: Request, res: Response) => {
  try {
    const apps = await NoDueApplication.find().sort({ applicationDate: -1 }).lean();
    return res.json({ success: true, noDueApplications: apps.map((a) => ({ ...a, id: a.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch applications', error: err.message });
  }
});

// GET /api/nodue/certificates
router.get('/certificates', async (_req: Request, res: Response) => {
  try {
    const certs = await NoDueCertificate.find().sort({ issuedDate: -1 }).lean();
    return res.json({ success: true, noDueCertificates: certs.map((c) => ({ ...c, id: c.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch certificates', error: err.message });
  }
});

// POST /api/nodue/applications - Submit application
router.post('/applications', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const student = await Member.findOne({
      $or: [
        { id: data.studentId },
        { memberCardNo: data.memberCardNo },
        { barcode: data.barcode },
        { rollNo: data.rollNo },
        { email: data.email?.toLowerCase().trim() },
      ],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const activeLoans = await Transaction.countDocuments({
      memberId: student.id,
      status: { $in: ['ISSUED', 'OVERDUE', 'RENEWED'] },
    });

    const pendingFinesList = await Fine.find({
      memberId: student.id,
      status: 'UNPAID',
    });
    const pendingFinesTotal = pendingFinesList.reduce((acc, f) => acc + (f.amount || 0), 0);

    const yr = new Date().getFullYear();
    const appNo = `ND-${yr}-${Math.floor(10000 + Math.random() * 90000)}`;
    const id = `nda-${Date.now()}`;
    const nowStr = new Date().toISOString().split('T')[0];

    const app = new NoDueApplication({
      id,
      applicationNo: appNo,
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo || data.rollNo || 'N/A',
      department: student.department || data.department || 'General',
      program: student.program || data.program || 'Undergraduate',
      batch: student.academicBatch || data.batch || `${yr - 4}-${yr}`,
      semesterYear: data.semesterYear || 'Final Year',
      libraryMembershipId: student.memberCardNo || student.id,
      email: student.email,
      phone: student.phone || data.phone,
      purpose: data.purpose || 'COURSE_COMPLETION',
      purposeOtherDetails: data.purposeOtherDetails,
      applicationDate: nowStr,
      status: activeLoans === 0 && pendingFinesTotal === 0 ? 'UNDER_VERIFICATION' : 'SUBMITTED',
      outstandingLoansCount: activeLoans,
      outstandingFinesAmount: pendingFinesTotal,
      history: [
        {
          status: 'SUBMITTED',
          changedAt: `${nowStr} 10:00`,
          changedBy: student.name,
          remarks: 'No Due Certificate application submitted online.',
        },
      ],
    });

    await app.save();

    return res.status(201).json({
      success: true,
      message: `No Due Application ${appNo} submitted successfully.`,
      application: app,
    });
  } catch (err: any) {
    console.error('Submit NoDue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit application', error: err.message });
  }
});

// PUT /api/nodue/applications/:id/review - Review/Approve/Reject Application
router.put('/applications/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks, reviewerName = 'Chief Librarian', rejectionReason } = req.body;

    const app = await NoDueApplication.findOne({ id });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const nowStr = new Date().toISOString().split('T')[0];
    app.status = status;
    app.verifiedDate = nowStr;
    app.verifiedBy = reviewerName;
    if (remarks) app.adminRemarks = remarks;
    if (rejectionReason) app.rejectionReason = rejectionReason;

    app.history.push({
      status,
      changedAt: `${nowStr} 12:00`,
      changedBy: reviewerName,
      remarks: remarks || rejectionReason || `Status changed to ${status}`,
    });

    // If APPROVED or CERTIFICATE_ISSUED, automatically generate Certificate if not exists
    let cert = null;
    if (status === 'APPROVED' || status === 'CERTIFICATE_ISSUED') {
      const yr = new Date().getFullYear();
      const certNo = `NDC-${yr}-${Math.floor(100000 + Math.random() * 900000)}`;
      app.certificateNo = certNo;
      app.certificateIssuedDate = nowStr;
      app.status = 'CERTIFICATE_ISSUED';

      cert = new NoDueCertificate({
        id: `ndc-${Date.now()}`,
        certificateNo: certNo,
        applicationId: app.id,
        memberId: app.studentId,
        memberName: app.studentName,
        memberCardNo: app.libraryMembershipId,
        rollNo: app.rollNo,
        role: 'STUDENT',
        department: app.department,
        program: app.program,
        academicBatch: app.batch,
        semesterYear: app.semesterYear,
        purpose: app.purpose,
        issuedDate: nowStr,
        issuedBy: reviewerName,
        issuedByRole: 'Chief Admin Librarian & Head of Library',
        activeLoansCount: 0,
        pendingFinesAmount: 0,
        status: 'ISSUED',
        verificationQrCode: `https://library.university.edu/verify-ndc/${certNo}`,
        remarks: 'All library books returned and dues cleared. Clearance granted.',
      });

      await cert.save();

      // Update Member profile
      const member = await Member.findOne({ id: app.studentId });
      if (member) {
        member.noDueStatus = 'ISSUED';
        member.noDueCertificateNo = certNo;
        member.noDueIssuedDate = nowStr;
        member.noDueIssuedBy = reviewerName;
        await member.save();
      }
    }

    await app.save();

    return res.json({
      success: true,
      message: `No Due Application updated to ${app.status}.`,
      application: app,
      certificate: cert,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review application', error: err.message });
  }
});

// POST /api/nodue/certificates - Direct Issue Certificate
router.post('/certificates', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const yr = new Date().getFullYear();
    const certNo = data.certificateNo || `NDC-${yr}-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toISOString().split('T')[0];

    const cert = new NoDueCertificate({
      ...data,
      id: data.id || `ndc-${Date.now()}`,
      certificateNo: certNo,
      issuedDate: data.issuedDate || nowStr,
      issuedBy: data.issuedBy || 'Chief Librarian',
      status: 'ISSUED',
    });

    await cert.save();

    const member = await Member.findOne({ id: data.memberId });
    if (member) {
      member.noDueStatus = 'ISSUED';
      member.noDueCertificateNo = certNo;
      member.noDueIssuedDate = nowStr;
      member.noDueIssuedBy = data.issuedBy || 'Chief Librarian';
      await member.save();
    }

    return res.status(201).json({ success: true, certificate: cert });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to issue certificate', error: err.message });
  }
});

export default router;
