/**
 * Database Seeder for MongoDB
 * Seeds canonical 24 Academic Racks (275 Shelves), default Admin account, and System Configuration.
 * Initializes all collection namespaces so they appear in MongoDB Atlas Data Explorer.
 */

import bcrypt from 'bcryptjs';
import { isDbConnected } from './config/db';
import { Rack } from './models/Rack';
import { Member } from './models/Member';
import { Book, Category, Author, Publisher } from './models/Book';
import { Transaction } from './models/Transaction';
import { Attendance } from './models/Attendance';
import { Fine } from './models/Fine';
import { Reservation } from './models/Reservation';
import { ExtensionRequest } from './models/ExtensionRequest';
import { NoDueApplication, NoDueCertificate } from './models/NoDueCertificate';
import { ProcurementRequest, Vendor } from './models/Procurement';
import { Notice } from './models/Notice';
import { DigitalResource, OfficialDocument, DigitalDownloadLog } from './models/DigitalResource';
import { AuditLog } from './models/AuditLog';
import { SystemConfigModel } from './models/Setting';
import { ACADEMIC_RACK_HIERARCHY } from '../src/data/rackShelfHierarchy';

export async function seedDatabase(): Promise<void> {
  if (!isDbConnected()) {
    console.warn('⚠️ [Seeder] Database not connected. Skipping automatic seed until connection is established.');
    return;
  }

  try {
    // 0. Ensure all collection namespaces are created in MongoDB Atlas
    const models = [
      Rack,
      Member,
      Book,
      Category,
      Author,
      Publisher,
      Transaction,
      Attendance,
      Fine,
      Reservation,
      ExtensionRequest,
      NoDueApplication,
      NoDueCertificate,
      ProcurementRequest,
      Vendor,
      Notice,
      DigitalResource,
      OfficialDocument,
      DigitalDownloadLog,
      AuditLog,
      SystemConfigModel,
    ];

    for (const model of models) {
      try {
        await model.createCollection();
      } catch (err: any) {
        // Ignore if collection already exists
      }
    }

    // 1. Seed 24 Academic Racks & 275 Shelves
    const rackCount = await Rack.countDocuments();
    if (rackCount === 0) {
      console.log('📦 Seeding 24 Academic Library Racks and 275 Shelves into MongoDB...');
      const rackDocs = ACADEMIC_RACK_HIERARCHY.map((r) => ({
        rackId: r.rackId,
        rackCode: r.rackCode,
        rackName: r.rackName,
        degreeName: r.degreeName,
        program: r.program,
        department: r.department,
        domain: r.domain,
        shortCode: r.shortCode,
        description: r.description,
        colorTheme: r.colorTheme,
        shelves: r.shelves.map((s) => ({
          shelfId: s.shelfId,
          shelfNumber: s.shelfNumber,
          shelfName: s.shelfName,
          focus: s.focus,
          defaultBookTitles: s.defaultBookTitles || 20,
          defaultCopiesPerTitle: s.defaultCopiesPerTitle || 5,
          maxCapacity: s.maxCapacity || 100,
          physicalShelves: s.physicalShelves || [],
        })),
      }));

      await Rack.insertMany(rackDocs);
      console.log(`✅ Successfully seeded ${rackDocs.length} Racks into MongoDB.`);
    } else {
      console.log(`ℹ️ MongoDB already has ${rackCount} racks configured.`);
    }

    // 2. Seed Default Admin Account if no Admin exists
    const adminCount = await Member.countDocuments({ role: 'ADMIN' });
    if (adminCount === 0) {
      console.log('👤 Seeding default Admin user account into MongoDB...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const defaultAdmin = new Member({
        id: 'mem-admin-1',
        userId: 'admin-1',
        name: 'Chief Admin Librarian',
        email: 'admin@college.edu',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        memberCardNo: 'ADM-2026-1001',
        department: 'Central Library Administration',
        maxAllowedBooks: 20,
        currentActiveLoans: 0,
        pendingFines: 0,
        registeredDate: new Date().toISOString().split('T')[0],
        appliedDate: new Date().toISOString().split('T')[0],
        approvedDate: new Date().toISOString().split('T')[0],
        approvedBy: 'SYSTEM_BOOTSTRAP',
        gender: 'OTHER',
      });

      await defaultAdmin.save();
      console.log('✅ Default Admin account created: admin@college.edu / password123');
    }

    // 3. Seed System Config if missing
    const configCount = await SystemConfigModel.countDocuments();
    if (configCount === 0) {
      console.log('⚙️ Seeding default Library System Configuration...');
      await SystemConfigModel.create({
        key: 'main_config',
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
      });
      console.log('✅ Library System Configuration seeded.');
    }
  } catch (error) {
    console.error('❌ Database seeding error:', error);
  }
}

/**
 * Resets all operational data collections in MongoDB to zero records,
 * while preserving the 24 Racks (275 Shelves), System Config, and Admin account.
 */
export async function resetDatabaseToZero(): Promise<{ success: boolean; message: string }> {
  if (!isDbConnected()) {
    throw new Error('Database is not connected.');
  }

  try {
    // Delete all transactional and operational data
    await Promise.all([
      Book.deleteMany({}),
      Category.deleteMany({}),
      Author.deleteMany({}),
      Publisher.deleteMany({}),
      Transaction.deleteMany({}),
      Attendance.deleteMany({}),
      Fine.deleteMany({}),
      Reservation.deleteMany({}),
      ExtensionRequest.deleteMany({}),
      NoDueApplication.deleteMany({}),
      NoDueCertificate.deleteMany({}),
      ProcurementRequest.deleteMany({}),
      Vendor.deleteMany({}),
      Notice.deleteMany({}),
      DigitalResource.deleteMany({}),
      OfficialDocument.deleteMany({}),
      DigitalDownloadLog.deleteMany({}),
      AuditLog.deleteMany({}),
      // Keep only ADMIN members, delete all student/faculty/staff demo members
      Member.deleteMany({ role: { $ne: 'ADMIN' } }),
    ]);

    // Ensure Racks, Admin, and Config exist
    await seedDatabase();

    return {
      success: true,
      message: 'Database successfully reset to zero records. All books, loans, members, fines, and attendance are cleared.',
    };
  } catch (error: any) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  }
}

