import express, { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoose from 'mongoose';
import droneRoutes from './routes/drone.routes';
// import { Server } from 'socket.io';
import SocketService from './services/socket-service';

const app = express();

// MongoDB connection
const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://td3_user:td3_password@mongodb:27017/td3';

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
        : ['http://localhost:3000', 'http://localhost:8000'],
  })
);
app.use(express.json()); // Body parsing
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Basic error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

app.use('/api', droneRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Your existing welcome endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to backend!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});

const socketService = new SocketService(server);

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

// Socket.io setup
// const io = new Server(server, {
//   cors: {
//     origin:
//       process.env.NODE_ENV === 'production'
//         ? 'your-production-domain'
//         : 'http://localhost:3000',
//     methods: ['GET', 'POST'],
//   },
// });

// // Socket.io connection handling
// io.on('connection', (socket) => {
//   console.log('Client connected');

//   socket.on('disconnect', () => {
//     console.log('Client disconnected');
//   });
// });
