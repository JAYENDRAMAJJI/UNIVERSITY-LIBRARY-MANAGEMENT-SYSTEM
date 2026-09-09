/**
 * Member / User Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
  id: string;
  userId?: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT' | 'STAFF' | 'LIBRARIAN' | 'GUEST';
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';
  department?: string;
  program?: string;
  memberCardNo?: string;
  rollNo?: string;
  academicBatch?: string;
  phone?: string;
  idProofType?: string;
  idProofNumber?: string;
  appliedDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  rejectionReason?: string;
  suspendedReason?: string;
  maxAllowedBooks: number;
  currentActiveLoans: number;
  pendingFines: number;
  avatarUrl?: string;
  address?: string;
  emergencyContact?: string;
  startingYear?: number;
  passoutYear?: number;
  registeredDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'FACULTY', 'STUDENT', 'STAFF', 'LIBRARIAN', 'GUEST'],
      default: 'STUDENT',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    department: { type: String, default: 'General' },
    program: { type: String },
    memberCardNo: { type: String, index: true },
    rollNo: { type: String },
    academicBatch: { type: String },
    phone: { type: String },
    idProofType: { type: String },
    idProofNumber: { type: String },
    appliedDate: { type: String },
    approvedDate: { type: String },
    approvedBy: { type: String },
    rejectionReason: { type: String },
    suspendedReason: { type: String },
    maxAllowedBooks: { type: Number, default: 5 },
    currentActiveLoans: { type: Number, default: 0 },
    pendingFines: { type: Number, default: 0 },
    avatarUrl: { type: String },
    address: { type: String },
    emergencyContact: { type: String },
    startingYear: { type: Number },
    passoutYear: { type: Number },
    registeredDate: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Member = mongoose.model<IMember>('Member', MemberSchema);
