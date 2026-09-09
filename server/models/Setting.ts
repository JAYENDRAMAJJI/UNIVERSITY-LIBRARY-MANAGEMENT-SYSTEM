import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string; // e.g. 'main_config'
  libraryName: string;
  fineRatePerDay: number;
  studentMaxLoanDays: number;
  studentMaxBooks: number;
  facultyMaxLoanDays: number;
  facultyMaxBooks: number;
  maxRenewalLimit: number;
  reservationHoldHours: number;
  autoSendEmailAlerts: boolean;
  enableMaintenanceMode: boolean;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'main_config' },
    libraryName: { type: String, default: 'University Central Library & Learning Resource Center' },
    fineRatePerDay: { type: Number, default: 5.0 },
    studentMaxLoanDays: { type: Number, default: 14 },
    studentMaxBooks: { type: Number, default: 4 },
    facultyMaxLoanDays: { type: Number, default: 30 },
    facultyMaxBooks: { type: Number, default: 10 },
    maxRenewalLimit: { type: Number, default: 2 },
    reservationHoldHours: { type: Number, default: 48 },
    autoSendEmailAlerts: { type: Boolean, default: true },
    enableMaintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export interface IUniversityCalendarEvent extends Document {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  type: string;
  category: string;
  isLibraryOpen: boolean;
  openTime?: string;
  closeTime?: string;
  customHoursText?: string;
  description?: string;
  declaredBy?: string;
  affectedBranches?: string[];
  isRecurringAnnually?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

const UniversityCalendarEventSchema = new Schema<IUniversityCalendarEvent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    endDate: { type: String },
    title: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    isLibraryOpen: { type: Boolean, default: true },
    openTime: { type: String },
    closeTime: { type: String },
    customHoursText: { type: String },
    description: { type: String },
    declaredBy: { type: String },
    affectedBranches: [{ type: String }],
    isRecurringAnnually: { type: Boolean, default: false },
    notes: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  { timestamps: true }
);

export interface IRolePermissionDoc extends Document {
  role: string;
  permissions: Record<string, any>;
}

const RolePermissionSchema = new Schema<IRolePermissionDoc>(
  {
    role: { type: String, required: true, unique: true, index: true },
    permissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export interface IUserPermissionDoc extends Document {
  userId: string;
  permissions: Record<string, any>;
}

const UserPermissionSchema = new Schema<IUserPermissionDoc>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    permissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const SystemConfigModel = mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
export const CalendarEventModel = mongoose.model<IUniversityCalendarEvent>('CalendarEvent', UniversityCalendarEventSchema);
export const RolePermissionModel = mongoose.model<IRolePermissionDoc>('RolePermission', RolePermissionSchema);
export const UserPermissionModel = mongoose.model<IUserPermissionDoc>('UserPermission', UserPermissionSchema);
