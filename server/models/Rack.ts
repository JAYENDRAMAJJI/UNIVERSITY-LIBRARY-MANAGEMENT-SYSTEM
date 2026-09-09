/**
 * Rack and Shelf Model (MongoDB)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IShelfTier {
  physicalShelfId: string;
  physicalShelfNumber: number;
  name: string;
  capacity: number;
  startCopy: number;
  endCopy: number;
  allocatedCopiesCount?: number;
}

export interface IShelf {
  shelfId: string;
  shelfNumber: number;
  shelfName: string;
  focus?: string;
  defaultBookTitles?: number;
  defaultCopiesPerTitle?: number;
  maxCapacity?: number;
  physicalShelves?: IShelfTier[];
}

export interface IRack extends Document {
  rackId: string;
  rackCode: string; // R01 .. R24
  rackName: string;
  degreeName: string;
  program: string;
  department: string;
  domain: string;
  shortCode: string;
  description: string;
  colorTheme: string;
  shelves: IShelf[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ShelfTierSchema = new Schema<IShelfTier>(
  {
    physicalShelfId: { type: String, required: true },
    physicalShelfNumber: { type: Number, required: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 50 },
    startCopy: { type: Number, required: true },
    endCopy: { type: Number, required: true },
    allocatedCopiesCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShelfSchema = new Schema<IShelf>(
  {
    shelfId: { type: String, required: true },
    shelfNumber: { type: Number, required: true },
    shelfName: { type: String, required: true },
    focus: { type: String },
    defaultBookTitles: { type: Number, default: 20 },
    defaultCopiesPerTitle: { type: Number, default: 5 },
    maxCapacity: { type: Number, default: 100 },
    physicalShelves: [ShelfTierSchema],
  },
  { _id: false }
);

const RackSchema = new Schema<IRack>(
  {
    rackId: { type: String, required: true, unique: true, index: true },
    rackCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    rackName: { type: String, required: true },
    degreeName: { type: String, required: true },
    program: { type: String, required: true },
    department: { type: String, required: true },
    domain: { type: String, required: true },
    shortCode: { type: String, required: true },
    description: { type: String, default: '' },
    colorTheme: { type: String, default: 'blue' },
    shelves: [ShelfSchema],
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

export const Rack = mongoose.model<IRack>('Rack', RackSchema);
