import mongoose, { Schema, Document } from 'mongoose';

export interface IDigitalResource extends Document {
  id: string;
  title: string;
  resourceType: string;
  categoryName: string;
  authorName: string;
  fileUrl: string;
  fileSizeMb: number;
  downloadCount: number;
  uploadDate: string;
  description?: string;
  department?: string;
  subject?: string;
  semester?: string;
  year?: number;
  isArchived?: boolean;
  externalUrl?: string;
  publisherName?: string;
  issnIsbn?: string;
  language?: string;
  accessLevel?: string;
  newspaperEdition?: string;
  newspaperRssFeedUrl?: string;
  contentSnippet?: string;
  thumbnailUrl?: string;
  uploadedFileData?: string;
  uploadedFileName?: string;
  fileMimeType?: string;
}

const DigitalResourceSchema = new Schema<IDigitalResource>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    resourceType: { type: String, required: true, index: true },
    categoryName: { type: String, required: true },
    authorName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSizeMb: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    uploadDate: { type: String, required: true },
    description: { type: String },
    department: { type: String },
    subject: { type: String },
    semester: { type: String },
    year: { type: Number },
    isArchived: { type: Boolean, default: false },
    externalUrl: { type: String },
    publisherName: { type: String },
    issnIsbn: { type: String },
    language: { type: String },
    accessLevel: {
      type: String,
      enum: ['OPEN_ACCESS', 'CAMPUS_ONLY', 'SUBSCRIBED', 'RESTRICTED'],
      default: 'OPEN_ACCESS',
    },
    newspaperEdition: { type: String },
    newspaperRssFeedUrl: { type: String },
    contentSnippet: { type: String },
    thumbnailUrl: { type: String },
    uploadedFileData: { type: String },
    uploadedFileName: { type: String },
    fileMimeType: { type: String },
  },
  { timestamps: true }
);

export interface IOfficialDocument extends Document {
  id: string;
  title: string;
  category: string;
  description: string;
  fileSize: string;
  fileType: string;
  updatedDate: string;
  uploadedFileData?: string;
  uploadedFileName?: string;
  isArchived?: boolean;
  downloadCount: number;
  createdAt: string;
  uploadedBy?: string;
}

const OfficialDocumentSchema = new Schema<IOfficialDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    fileSize: { type: String, default: '1 MB' },
    fileType: { type: String, default: 'PDF' },
    updatedDate: { type: String, required: true },
    uploadedFileData: { type: String },
    uploadedFileName: { type: String },
    isArchived: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    createdAt: { type: String, required: true },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

export interface IDigitalDownloadLog extends Document {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  fileSizeMb: number;
}

const DigitalDownloadLogSchema = new Schema<IDigitalDownloadLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    resourceId: { type: String, required: true },
    resourceTitle: { type: String, required: true },
    resourceType: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    timestamp: { type: String, required: true },
    fileSizeMb: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DigitalResource = mongoose.model<IDigitalResource>('DigitalResource', DigitalResourceSchema);
export const OfficialDocument = mongoose.model<IOfficialDocument>('OfficialDocument', OfficialDocumentSchema);
export const DigitalDownloadLog = mongoose.model<IDigitalDownloadLog>('DigitalDownloadLog', DigitalDownloadLogSchema);
