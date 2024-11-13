import mongoose, { Document, Schema } from 'mongoose';

export interface IWeaponPlatform {
  position: {
    lat: number;
    lng: number;
  };
  heading: number; // Current direction turret is facing (0-359 degrees)
  isActive: boolean;
}

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
});

export default mongoose.model<IWeaponPlatformDocument>(
  'WeaponPlatform',
  WeaponPlatformSchema
);
