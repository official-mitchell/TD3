// more structured with specific fields with additional validations

import mongoose, { Schema, Document } from 'mongoose';

// Interface for type safety
export interface IDrone extends Document {
  droneId: string;
  status: 'Detected' | 'Identified' | 'Confirmed' | 'Engagement Ready';
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
  engagementHistory: any[]; // We can make this more specific if needed
}

// The actual schema
const DroneSchema: Schema = new Schema({
  droneId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['Detected', 'Identified', 'Confirmed', 'Engagement Ready'],
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
