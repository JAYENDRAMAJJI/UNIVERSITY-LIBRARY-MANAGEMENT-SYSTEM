import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  id: string;
  title: string;
  content: string;
  targetAudience?: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientMemberId?: string;
  createdDate: string;
  isUrgent?: boolean;
  senderName?: string;
  category?: string;
  readBy?: string[];
}

const NoticeSchema = new Schema<INotice>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    targetAudience: { type: String },
    recipientEmail: { type: String },
    recipientName: { type: String },
    recipientMemberId: { type: String },
    createdDate: { type: String, required: true },
    isUrgent: { type: Boolean, default: false },
    senderName: { type: String },
    category: {
      type: String,
      enum: [
        'DUE_REMINDER',
        'OVERDUE_WARNING',
        'FINE_PAYMENT',
        'GENERAL',
        'EXTENSION_UPDATE',
        'ACCOUNT_APPROVAL',
        'ACCOUNT_REJECTION',
        'ACCOUNT_REGISTRATION',
        'ACCOUNT_SUSPENSION',
      ],
      default: 'GENERAL',
    },
    readBy: [{ type: String }],
  },
  { timestamps: true }
);

export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);
