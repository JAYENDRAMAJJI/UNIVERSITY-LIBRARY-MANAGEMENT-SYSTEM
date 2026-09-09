import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  rating?: number;
  specializationCategories?: string[];
}

const VendorSchema = new Schema<IVendor>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    rating: { type: Number, default: 4.5 },
    specializationCategories: [{ type: String }],
  },
  { timestamps: true }
);

export interface IProcurementRequest extends Document {
  id: string;
  bookTitle: string;
  authorName: string;
  isbn?: string;
  publisherName?: string;
  estimatedPrice?: number;
  requestedById: string;
  requestedByName: string;
  requestedByRole: string;
  reason: string;
  status: string;
  requestedDate: string;
  adminNotes?: string;
  reviewedByName?: string;
  reviewedDate?: string;
  vendorId?: string;
  vendorName?: string;
  vendorContact?: string;
  poNumber?: string;
  poDate?: string;
  quantityRequested?: number;
  approvedPrice?: number;
  actualPrice?: number;
  invoiceNo?: string;
  receivedDate?: string;
  receivedQuantity?: number;
  qualityStatus?: string;
  assignedCategoryId?: string;
  assignedCategoryName?: string;
  assignedRackNumber?: string;
  assignedShelfNumber?: string;
  generatedAccessionNos?: string[];
  generatedBarcodes?: string[];
  isDuplicate?: boolean;
  duplicateOfRequestId?: string;
  duplicateCount?: number;
  timeline?: Array<{
    status: string;
    label: string;
    timestamp: string;
    actorName: string;
    actorRole: string;
    notes?: string;
  }>;
}

const ProcurementRequestSchema = new Schema<IProcurementRequest>(
  {
    id: { type: String, required: true, unique: true, index: true },
    bookTitle: { type: String, required: true },
    authorName: { type: String, required: true },
    isbn: { type: String },
    publisherName: { type: String },
    estimatedPrice: { type: Number, default: 0 },
    requestedById: { type: String, required: true },
    requestedByName: { type: String, required: true },
    requestedByRole: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'PENDING',
        'UNDER_REVIEW',
        'ON_HOLD',
        'APPROVED',
        'REJECTED',
        'PO_GENERATED',
        'ORDERED',
        'RECEIVED',
        'QUALITY_CHECKED',
        'CATALOGED',
        'AVAILABLE',
        'CLOSED',
      ],
      default: 'PENDING',
      index: true,
    },
    requestedDate: { type: String, required: true },
    adminNotes: { type: String },
    reviewedByName: { type: String },
    reviewedDate: { type: String },
    vendorId: { type: String },
    vendorName: { type: String },
    vendorContact: { type: String },
    poNumber: { type: String },
    poDate: { type: String },
    quantityRequested: { type: Number, default: 1 },
    approvedPrice: { type: Number },
    actualPrice: { type: Number },
    invoiceNo: { type: String },
    receivedDate: { type: String },
    receivedQuantity: { type: Number },
    qualityStatus: { type: String },
    assignedCategoryId: { type: String },
    assignedCategoryName: { type: String },
    assignedRackNumber: { type: String },
    assignedShelfNumber: { type: String },
    generatedAccessionNos: [{ type: String }],
    generatedBarcodes: [{ type: String }],
    isDuplicate: { type: Boolean, default: false },
    duplicateOfRequestId: { type: String },
    duplicateCount: { type: Number, default: 1 },
    timeline: [
      {
        status: { type: String, required: true },
        label: { type: String, required: true },
        timestamp: { type: String, required: true },
        actorName: { type: String, required: true },
        actorRole: { type: String, required: true },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
export const ProcurementRequest = mongoose.model<IProcurementRequest>('ProcurementRequest', ProcurementRequestSchema);
