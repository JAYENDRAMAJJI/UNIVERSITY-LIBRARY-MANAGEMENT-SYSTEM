/**
 * Book Reservation / Hold Queue Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IReservation extends Document {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberEmail?: string;
  requestDate: string;
  availableDate?: string;
  expiryDate?: string;
  queuePosition: number;
  status: 'PENDING' | 'AVAILABLE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  notificationSent?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookId: { type: String, required: true, index: true },
    bookTitle: { type: String, required: true },
    bookCoverUrl: { type: String },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true, index: true },
    memberEmail: { type: String },
    requestDate: { type: String, required: true },
    availableDate: { type: String },
    expiryDate: { type: String },
    queuePosition: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'AVAILABLE', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    notificationSent: { type: Boolean, default: false },
    notes: { type: String },
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

export const Reservation = mongoose.model<IReservation>('Reservation', ReservationSchema);
