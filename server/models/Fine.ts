/**
 * Fine and Payment Record Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IFine extends Document {
  id: string;
  transactionId?: string;
  bookId?: string;
  bookTitle?: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberType?: string;
  amount: number;
  paidAmount: number;
  balance: number;
  reason: string;
  status: 'PENDING' | 'PAID' | 'WAIVED' | 'PARTIALLY_PAID';
  createdDate: string;
  paidDate?: string;
  paymentMethod?: 'CASH' | 'ONLINE_UPI' | 'CARD' | 'UNIVERSITY_WALLET' | 'WAIVED';
  receiptNo?: string;
  waivedBy?: string;
  waivedReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const FineSchema = new Schema<IFine>(
  {
    id: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, index: true },
    bookId: { type: String },
    bookTitle: { type: String },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true, index: true },
    memberType: { type: String, default: 'STUDENT' },
    amount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'WAIVED', 'PARTIALLY_PAID'],
      default: 'PENDING',
      index: true,
    },
    createdDate: { type: String, required: true },
    paidDate: { type: String },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'ONLINE_UPI', 'CARD', 'UNIVERSITY_WALLET', 'WAIVED'],
    },
    receiptNo: { type: String },
    waivedBy: { type: String },
    waivedReason: { type: String },
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

export const Fine = mongoose.model<IFine>('Fine', FineSchema);
