/**
 * Book Due Date Extension Request Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExtensionRequest extends Document {
  id: string;
  transactionId: string;
  bookCopyId: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  accessionNo: string;
  barcode: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberRole: 'STUDENT' | 'FACULTY' | 'STAFF' | 'OTHER';
  currentDueDate: string;
  requestedExtensionDays: number;
  newRequestedDueDate: string;
  reason: string;
  appliedDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExtensionRequestSchema = new Schema<IExtensionRequest>(
  {
    id: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, required: true, index: true },
    bookCopyId: { type: String, required: true },
    bookId: { type: String, required: true },
    bookTitle: { type: String, required: true },
    bookCoverUrl: { type: String },
    accessionNo: { type: String, required: true },
    barcode: { type: String, required: true },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true },
    memberRole: { type: String, default: 'STUDENT' },
    currentDueDate: { type: String, required: true },
    requestedExtensionDays: { type: Number, default: 7 },
    newRequestedDueDate: { type: String, required: true },
    reason: { type: String, required: true },
    appliedDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String },
    reviewedBy: { type: String },
    reviewedDate: { type: String },
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

export const ExtensionRequest = mongoose.model<IExtensionRequest>('ExtensionRequest', ExtensionRequestSchema);
