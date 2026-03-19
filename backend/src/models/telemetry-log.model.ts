/**
 * TelemetryLog Mongoose model. Uses shared types from @td3/shared-types.
 * Schema mirrors ITelemetryLog exactly per Implementation Plan Step 2.2.
 */
import mongoose, { Schema, Document } from 'mongoose';
import type { ITelemetryLog, EngagementOutcome } from '@td3/shared-types';

export interface ITelemetryLogDocument extends Omit<ITelemetryLog, 'engagementOutcome'>, Document {
  engagementOutcome: EngagementOutcome;
}

const TelemetryLogSchema = new Schema<ITelemetryLogDocument>({
  timestamp: { type: String, required: true },
  droneId: { type: String, required: true },
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    altitude: { type: Number, required: true },
  },
  status: { type: String, required: true },
  engagementOutcome: { type: String, default: null },
});

export default mongoose.model<ITelemetryLogDocument>('TelemetryLog', TelemetryLogSchema);
