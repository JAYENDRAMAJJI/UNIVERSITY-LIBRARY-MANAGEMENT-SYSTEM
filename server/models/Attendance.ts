/**
 * Library Attendance Record Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  id: string;
  memberId: string;
  memberName: string;
  memberCardNo: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF' | 'GUEST';
  department?: string;
  purpose?: string;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  status: 'IN_LIBRARY' | 'CHECKED_OUT';
  durationMinutes?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    id: { type: String, required: true, unique: true, index: true },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    memberCardNo: { type: String, required: true, index: true },
    memberType: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'STAFF', 'GUEST'],
      default: 'STUDENT',
    },
    department: { type: String },
    purpose: { type: String, default: 'General Reading & Research' },
    checkInTime: { type: String, required: true },
    checkOutTime: { type: String },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['IN_LIBRARY', 'CHECKED_OUT'],
      default: 'IN_LIBRARY',
      index: true,
    },
    durationMinutes: { type: Number, default: 0 },
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

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
