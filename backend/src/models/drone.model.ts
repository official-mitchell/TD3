import mongoose, { Schema, Document } from 'mongoose';

export type DroneType = 'Quadcopter' | 'FixedWing' | 'VTOL' | 'Unknown';
export type DroneStatus =
  | 'Detected'
  | 'Identified'
  | 'Confirmed'
  | 'Engagement Ready'
  | 'Hit'
  | 'Destroyed';
// Interface for type safety
export interface IDrone extends Document {
  droneId: string;
  droneType: DroneType;
  status: DroneStatus;
  position: {
    lat: number;
    lng: number;
    altitude: number;
  };
  speed: number;
  heading: number;
  threatLevel: number;
  lastUpdated: Date;
  isEngaged: boolean;
  engagementHistory: any[];
}

export interface IDroneDocument extends IDrone, Document {
  droneType: DroneType;
}

// The actual schema
const DroneSchema: Schema = new Schema({
  droneId: { type: String, required: true, unique: true },
  droneType: {
    type: String,
    enum: ['Quadcopter', 'Fixed Wing', 'VTOL', 'Unknown'],
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
  threatLevel: { type: Number, required: true, min: 1, max: 5 },
  lastUpdated: { type: Date, default: Date.now },
  isEngaged: { type: Boolean, default: false },
  engagementHistory: [{ type: Schema.Types.Mixed }],
  capabilities: [
    {
      type: String,
      enum: ['Surveillance', 'Cargo', 'Combat', 'Unknown'],
    },
  ],
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large'],
    default: 'Medium',
  },
});

export default mongoose.model<IDrone>('Drone', DroneSchema);
// import mongoose, { Schema, Document } from 'mongoose';

// // Interface for type safety
// export interface IDrone extends Document {
//   droneId: string;
//   status: 'Detected' | 'Identified' | 'Confirmed' | 'Engagement Ready';
//   position: {
//     lat: number;
//     lng: number;
//     altitude: number;
//   };
//   speed: number;
//   heading: number;
//   threatLevel: number;
//   lastUpdated: Date;
//   isEngaged: boolean;
//   engagementHistory: any[]; // We can make this more specific if needed
// }

// // The actual schema
// const DroneSchema: Schema = new Schema({
//   droneId: { type: String, required: true, unique: true },
//   status: {
//     type: String,
//     enum: ['Detected', 'Identified', 'Confirmed', 'Engagement Ready'],
//     required: true,
//   },
//   position: {
//     lat: { type: Number, required: true },
//     lng: { type: Number, required: true },
//     altitude: { type: Number, required: true },
//   },
//   speed: { type: Number, required: true },
//   heading: { type: Number, required: true },
//   threatLevel: { type: Number, required: true, min: 1, max: 5 },
//   lastUpdated: { type: Date, default: Date.now },
//   isEngaged: { type: Boolean, default: false },
//   engagementHistory: [{ type: Schema.Types.Mixed }],
// });

// export default mongoose.model<IDrone>('Drone', DroneSchema);
