/**
 * Circulation Issue / Return Transaction Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  id: string;
  bookCopyId: string;
  bookId: string;
  bookTitle: string;
  accessionNo: string;
  barcode: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF' | 'OTHER';
  memberDepartment?: string;
  issuedByUserId?: string;
  issuedByName?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  renewalCount: number;
  maxRenewals: number;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'RENEWED';
  fineAmount: number;
  finePaid?: boolean;
  notes?: string;
  conditionOnReturn?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookCopyId: { type: String, required: true, index: true },
    bookId: { type: String, required: true, index: true },
    bookTitle: { type: String, required: true },
    accessionNo: { type: String, required: true },
    barcode: { type: String, required: true, index: true },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true, index: true },
    memberType: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'STAFF', 'OTHER'],
      default: 'STUDENT',
    },
    memberDepartment: { type: String },
    issuedByUserId: { type: String },
    issuedByName: { type: String },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true, index: true },
    returnDate: { type: String },
    renewalCount: { type: Number, default: 0 },
    maxRenewals: { type: Number, default: 3 },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED', 'OVERDUE', 'LOST', 'RENEWED'],
      default: 'ISSUED',
      index: true,
    },
    fineAmount: { type: Number, default: 0 },
    finePaid: { type: Boolean, default: false },
    notes: { type: String },
    conditionOnReturn: { type: String },
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

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
