/**
 * TD3 Backend entry point. Phase 2.3: cleaned error middleware.
 * CORS: uses CORS_ORIGIN in production (normalized: no trailing slash). Logs at startup.
 * Default MONGODB_URI uses localhost for local dev; Docker Compose sets mongodb hostname.
 */
import mongoose from 'mongoose';
import { createApp } from './app';
import SocketService from './services/socket-service';

const app = createApp();

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

const { getCorsConfig } = require('./lib/cors');
if (process.env.NODE_ENV === 'production' || process.env.CORS_ORIGIN) {
  const corsOrigin = getCorsConfig();
  console.log('CORS origin:', corsOrigin === '*' ? '*' : corsOrigin || 'NOT SET (requests from frontend will be blocked)');
}

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
