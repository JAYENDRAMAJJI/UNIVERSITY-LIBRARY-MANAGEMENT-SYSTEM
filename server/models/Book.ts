/**
 * Book, Category, Author, and Publisher Models (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBookCopy {
  id: string;
  bookId?: string;
  copyNumber?: number;
  accessionNo: string;
  barcode: string;
  qrCode?: string;
  rackNumber: string;
  shelfNumber: string;
  status: 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'MAINTENANCE' | 'LOST' | 'DISPOSED' | 'DAMAGED';
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  addedDate?: string;
  isReferenceOnly?: boolean;
}

export interface ICategory extends Document {
  id: string;
  name: string;
  code: string;
  description?: string;
  bookCount?: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    bookCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export interface IAuthor extends Document {
  id: string;
  name: string;
  biography?: string;
  email?: string;
  bookCount?: number;
}

const AuthorSchema = new Schema<IAuthor>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    biography: { type: String },
    email: { type: String },
    bookCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export interface IPublisher extends Document {
  id: string;
  name: string;
  address?: string;
  contactPerson?: string;
  bookCount?: number;
}

const PublisherSchema = new Schema<IPublisher>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: { type: String },
    contactPerson: { type: String },
    bookCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export interface IBook extends Document {
  id: string;
  title: string;
  isbn: string;
  categoryId?: string;
  categoryName?: string;
  authorId?: string;
  authorName?: string;
  publisherId?: string;
  publisherName?: string;
  edition?: string;
  publishingYear?: number;
  language?: string;
  price?: number;
  description?: string;
  coverUrl?: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies?: number;
  isFeatured?: boolean;
  isBookOfMonth?: boolean;
  rackNumber?: string;
  shelfNumber?: string;
  department?: string;
  program?: string;
  specialization?: string;
  subject?: string;
  collectionType?: string;
  format?: 'PHYSICAL' | 'DIGITAL' | 'HYBRID';
  digitalUrl?: string;
  keywords?: string[];
  borrowCount?: number;
  isReferenceOnly?: boolean;
  copies: IBookCopy[];
  createdAt?: Date;
  updatedAt?: Date;
}

const BookCopySchema = new Schema<IBookCopy>(
  {
    id: { type: String, required: true },
    bookId: { type: String },
    copyNumber: { type: Number },
    accessionNo: { type: String, required: true, index: true },
    barcode: { type: String, required: true, index: true },
    qrCode: { type: String },
    rackNumber: { type: String, required: true },
    shelfNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ISSUED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DISPOSED', 'DAMAGED'],
      default: 'AVAILABLE',
      index: true,
    },
    condition: {
      type: String,
      enum: ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
      default: 'GOOD',
    },
    addedDate: { type: String },
    isReferenceOnly: { type: Boolean, default: false },
  },
  { _id: false }
);

const BookSchema = new Schema<IBook>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    isbn: { type: String, required: true, trim: true, index: true },
    categoryId: { type: String },
    categoryName: { type: String, default: 'General' },
    authorId: { type: String },
    authorName: { type: String, default: 'Unknown Author' },
    publisherId: { type: String },
    publisherName: { type: String, default: 'University Press' },
    edition: { type: String, default: '1st Edition' },
    publishingYear: { type: Number, default: 2024 },
    language: { type: String, default: 'English' },
    price: { type: Number, default: 0 },
    description: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    totalCopies: { type: Number, default: 0 },
    availableCopies: { type: Number, default: 0 },
    issuedCopies: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isBookOfMonth: { type: Boolean, default: false },
    rackNumber: { type: String, default: 'R01' },
    shelfNumber: { type: String, default: 'R01-S01' },
    department: { type: String, default: 'General' },
    program: { type: String },
    specialization: { type: String },
    subject: { type: String },
    collectionType: { type: String, default: 'ACADEMIC' },
    format: { type: String, enum: ['PHYSICAL', 'DIGITAL', 'HYBRID'], default: 'PHYSICAL' },
    digitalUrl: { type: String },
    keywords: [{ type: String }],
    borrowCount: { type: Number, default: 0 },
    isReferenceOnly: { type: Boolean, default: false },
    copies: [BookCopySchema],
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

export const Book = mongoose.model<IBook>('Book', BookSchema);
export const Category = mongoose.model<ICategory>('Category', CategorySchema);
export const Author = mongoose.model<IAuthor>('Author', AuthorSchema);
export const Publisher = mongoose.model<IPublisher>('Publisher', PublisherSchema);
