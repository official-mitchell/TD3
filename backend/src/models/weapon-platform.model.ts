/**
 * WeaponPlatform Mongoose model. Uses shared types from @td3/shared-types.
 * Schema mirrors IWeaponPlatform with ammoCount and killCount per Implementation Plan Step 1.3.2.
 */
import mongoose, { Document, Schema } from 'mongoose';
import type { IWeaponPlatform } from '@td3/shared-types';

export interface IWeaponPlatformDocument extends IWeaponPlatform, Document {}

const WeaponPlatformSchema = new Schema<IWeaponPlatformDocument>({
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  heading: {
    type: Number,
    required: true,
    min: 0,
    max: 359,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  ammoCount: {
    type: Number,
    default: 300,
  },
  killCount: {
    type: Number,
    default: 0,
  },
});

export { type IWeaponPlatform } from '@td3/shared-types';
export default mongoose.model<IWeaponPlatformDocument>(
  'WeaponPlatform',
  WeaponPlatformSchema
);
