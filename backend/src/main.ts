/**
 * TD3 Backend entry point. Phase 2.3: cleaned error middleware.
 * Default MONGODB_URI uses localhost for local dev; Docker Compose sets mongodb hostname.
 * CORS: added localhost:4200 for Vite dev server.
 */
import express, { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoose from 'mongoose';
import droneRoutes from './routes/drone.routes';
import SocketService from './services/socket-service';

const app = express();

// MongoDB connection
const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://td3_user:td3_password@localhost:27017/td3?authSource=admin';

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    waitQueueTimeoutMS: 15000,
  })
  .then(() => {
    console.log('Connected to MongoDB successfully');
    console.log('Connection URI:', mongoUri);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    console.error('Attempted connection URI:', mongoUri);
  });

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Middleware
app.use(morgan('dev')); // Logging
app.use(helmet()); // Security headers
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? 'your-production-domain'
        : ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:8000'],
  })
);
app.use(express.json()); // Body parsing
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Error handling middleware (catches errors passed to next())
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use('/api', droneRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to backend!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

const socketService = new SocketService(server);
app.set('socketService', socketService);

// Error handling for server
server.on('error', console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export { socketService };
