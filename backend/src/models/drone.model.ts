/**
 * Drone Mongoose model. Uses shared types from @td3/shared-types.
 * Schema mirrors IDrone exactly per Implementation Plan Step 1.3.1.
 */
import mongoose, { Schema, Document } from 'mongoose';
import type { DroneType, DroneStatus, IDrone } from '@td3/shared-types';

export interface IDroneDocument extends Omit<IDrone, 'lastUpdated'>, Document {
  lastUpdated: Date;
}

const DroneSchema: Schema = new Schema<IDroneDocument>({
  droneId: { type: String, required: true, unique: true },
  droneType: {
    type: String,
    enum: ['Quadcopter', 'FixedWing', 'VTOL', 'Unknown'],
    default: 'Unknown',
    required: true,
  },
  status: {
    type: String,
    enum: [
      'Detected',
      'Identified',
      'Confirmed',
      'Engagement Ready',
      'Hit',
      'Destroyed',
    ],
    required: true,
  },
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    altitude: { type: Number, required: true },
  },
  speed: { type: Number, required: true },
  heading: { type: Number, required: true },
  threatLevel: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

export { type DroneType, type DroneStatus, type IDrone } from '@td3/shared-types';
export default mongoose.model<IDroneDocument>('Drone', DroneSchema);
