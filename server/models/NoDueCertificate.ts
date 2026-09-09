import mongoose, { Schema, Document } from 'mongoose';

export interface INoDueApplication extends Document {
  id: string;
  applicationNo: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  program: string;
  batch: string;
  semesterYear: string;
  libraryMembershipId: string;
  email: string;
  phone?: string;
  purpose: string;
  purposeOtherDetails?: string;
  applicationDate: string;
  status: string;
  adminRemarks?: string;
  rejectionReason?: string;
  verifiedDate?: string;
  verifiedBy?: string;
  certificateNo?: string;
  certificateIssuedDate?: string;
  outstandingLoansCount: number;
  outstandingFinesAmount: number;
  history: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    remarks?: string;
  }>;
}

const NoDueApplicationSchema = new Schema<INoDueApplication>(
  {
    id: { type: String, required: true, unique: true, index: true },
    applicationNo: { type: String, required: true, unique: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    rollNo: { type: String, required: true },
    department: { type: String, required: true },
    program: { type: String, required: true },
    batch: { type: String, required: true },
    semesterYear: { type: String, required: true },
    libraryMembershipId: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    purpose: { type: String, required: true },
    purposeOtherDetails: { type: String },
    applicationDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'CERTIFICATE_ISSUED'],
      default: 'SUBMITTED',
      index: true,
    },
    adminRemarks: { type: String },
    rejectionReason: { type: String },
    verifiedDate: { type: String },
    verifiedBy: { type: String },
    certificateNo: { type: String },
    certificateIssuedDate: { type: String },
    outstandingLoansCount: { type: Number, default: 0 },
    outstandingFinesAmount: { type: Number, default: 0 },
    history: [
      {
        status: { type: String, required: true },
        changedAt: { type: String, required: true },
        changedBy: { type: String, required: true },
        remarks: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export interface INoDueCertificate extends Document {
  id: string;
  certificateNo: string;
  applicationId?: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  rollNo?: string;
  role: string;
  department?: string;
  program?: string;
  academicBatch?: string;
  semesterYear?: string;
  purpose?: string;
  issuedDate: string;
  issuedBy: string;
  issuedByRole?: string;
  activeLoansCount: number;
  pendingFinesAmount: number;
  status: 'ISSUED' | 'REVOKED';
  verificationQrCode?: string;
  remarks?: string;
}

const NoDueCertificateSchema = new Schema<INoDueCertificate>(
  {
    id: { type: String, required: true, unique: true, index: true },
    certificateNo: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true },
    rollNo: { type: String },
    role: { type: String, required: true },
    department: { type: String },
    program: { type: String },
    academicBatch: { type: String },
    semesterYear: { type: String },
    purpose: { type: String },
    issuedDate: { type: String, required: true },
    issuedBy: { type: String, required: true },
    issuedByRole: { type: String },
    activeLoansCount: { type: Number, default: 0 },
    pendingFinesAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['ISSUED', 'REVOKED'], default: 'ISSUED' },
    verificationQrCode: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

export const NoDueApplication = mongoose.model<INoDueApplication>('NoDueApplication', NoDueApplicationSchema);
export const NoDueCertificate = mongoose.model<INoDueCertificate>('NoDueCertificate', NoDueCertificateSchema);
