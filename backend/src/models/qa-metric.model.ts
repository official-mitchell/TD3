/**
 * QAMetric Mongoose model. QA metrics: loading times, session activity.
 * Session per visitor (no IP stored). Used for loading performance and active session counts.
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IQAMetricDocument extends Document {
  sessionId: string;
  loadStartMs: number;
  loadEndMs: number;
  loadingTimeMs: number;
  activeAt: Date;
  createdAt: Date;
}

const QAMetricSchema = new Schema<IQAMetricDocument>(
  {
    sessionId: { type: String, required: true, index: true },
    loadStartMs: { type: Number, required: true },
    loadEndMs: { type: Number, required: true },
    loadingTimeMs: { type: Number, required: true },
    activeAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IQAMetricDocument>('QAMetric', QAMetricSchema);
