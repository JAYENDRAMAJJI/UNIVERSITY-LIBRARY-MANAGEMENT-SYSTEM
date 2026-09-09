import { Router, Request, Response } from 'express';
import { isDbConnected } from '../config/db';
import { Book, Category, Author, Publisher } from '../models/Book';
import { Member } from '../models/Member';
import { Transaction } from '../models/Transaction';
import { Reservation } from '../models/Reservation';
import { Fine } from '../models/Fine';
import { DigitalResource, OfficialDocument, DigitalDownloadLog } from '../models/DigitalResource';
import { AuditLog } from '../models/AuditLog';
import { SystemConfigModel, CalendarEventModel, RolePermissionModel, UserPermissionModel } from '../models/Setting';
import { ProcurementRequest, Vendor } from '../models/Procurement';
import { Notice } from '../models/Notice';
import { ExtensionRequest } from '../models/ExtensionRequest';
import { Attendance } from '../models/Attendance';
import { NoDueApplication, NoDueCertificate } from '../models/NoDueCertificate';
import { Rack } from '../models/Rack';

const router = Router();

// GET /api/sync - Master snapshot endpoint
router.get('/', async (_req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Please verify your MONGODB_URI in the backend .env file.',
      isDbConnected: false,
    });
  }

  try {
    const [
      books,
      categories,
      authors,
      publishers,
      members,
      transactions,
      reservations,
      fines,
      digitalResources,
      officialDocuments,
      downloadLogs,
      auditLogs,
      configDoc,
      calendarEvents,
      rolePermissionsList,
      userPermissionsList,
      procurementRequests,
      vendors,
      notices,
      extensionRequests,
      attendanceRecords,
      noDueApplications,
      noDueCertificates,
      racks,
    ] = await Promise.all([
      Book.find().lean(),
      Category.find().lean(),
      Author.find().lean(),
      Publisher.find().lean(),
      Member.find().select('-password').lean(),
      Transaction.find().lean(),
      Reservation.find().lean(),
      Fine.find().lean(),
      DigitalResource.find().lean(),
      OfficialDocument.find().lean(),
      DigitalDownloadLog.find().lean(),
      AuditLog.find().sort({ timestamp: -1 }).limit(1000).lean(),
      SystemConfigModel.findOne({ key: 'main_config' }).lean(),
      CalendarEventModel.find().lean(),
      RolePermissionModel.find().lean(),
      UserPermissionModel.find().lean(),
      ProcurementRequest.find().lean(),
      Vendor.find().lean(),
      Notice.find().sort({ createdDate: -1 }).lean(),
      ExtensionRequest.find().lean(),
      Attendance.find().sort({ checkInTime: -1 }).lean(),
      NoDueApplication.find().lean(),
      NoDueCertificate.find().lean(),
      Rack.find().lean(),
    ]);

    const rolePermissions: Record<string, any> = {};
    rolePermissionsList.forEach((rp) => {
      rolePermissions[rp.role] = rp.permissions;
    });

    const userPermissions: Record<string, any> = {};
    userPermissionsList.forEach((up) => {
      userPermissions[up.userId] = up.permissions;
    });

    const config = configDoc || {
      libraryName: 'University Central Library & Learning Resource Center',
      fineRatePerDay: 5.0,
      studentMaxLoanDays: 14,
      studentMaxBooks: 4,
      facultyMaxLoanDays: 30,
      facultyMaxBooks: 10,
      maxRenewalLimit: 2,
      reservationHoldHours: 48,
      autoSendEmailAlerts: true,
      enableMaintenanceMode: false,
    };

    return res.json({
      success: true,
      state: {
        books: books.map((b) => ({ ...b, id: b.id })),
        categories: categories.map((c) => ({ ...c, id: c.id })),
        authors: authors.map((a) => ({ ...a, id: a.id })),
        publishers: publishers.map((p) => ({ ...p, id: p.id })),
        members: members.map((m) => ({ ...m, id: m.id })),
        transactions: transactions.map((t) => ({ ...t, id: t.id })),
        reservations: reservations.map((r) => ({ ...r, id: r.id })),
        fines: fines.map((f) => ({ ...f, id: f.id })),
        digitalResources: digitalResources.map((d) => ({ ...d, id: d.id })),
        officialDocuments: officialDocuments.map((o) => ({ ...o, id: o.id })),
        downloadLogs: downloadLogs.map((dl) => ({ ...dl, id: dl.id })),
        auditLogs: auditLogs.map((al) => ({ ...al, id: al.id })),
        config,
        calendarEvents: calendarEvents.map((ce) => ({ ...ce, id: ce.id })),
        rolePermissions,
        userPermissions,
        procurementRequests: procurementRequests.map((pr) => ({ ...pr, id: pr.id })),
        vendors: vendors.map((v) => ({ ...v, id: v.id })),
        notices: notices.map((n) => ({ ...n, id: n.id })),
        extensionRequests: extensionRequests.map((er) => ({ ...er, id: er.id })),
        attendanceRecords: attendanceRecords.map((ar) => ({ ...ar, id: ar.id })),
        noDueApplications: noDueApplications.map((nda) => ({ ...nda, id: nda.id })),
        noDueCertificates: noDueCertificates.map((ndc) => ({ ...ndc, id: ndc.id })),
        racks: racks.map((rk) => ({ ...rk, id: rk.rackId })),
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve library state sync.', error: error.message });
  }
});

// POST /api/sync/reset-database - Resets operational collections to 0 in MongoDB
router.post('/reset-database', async (_req: Request, res: Response) => {
  try {
    const { resetDatabaseToZero } = await import('../seed');
    const result = await resetDatabaseToZero();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to reset database.' });
  }
});

export default router;

