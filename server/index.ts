/**
 * Express Backend Entry Point
 * University Library Management System
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB, isDbConnected } from './config/db';
import { seedDatabase } from './seed';

// Import Routes
import authRoutes from './routes/auth.routes';
import syncRoutes from './routes/sync.routes';
import booksRoutes from './routes/books.routes';
import circulationRoutes from './routes/circulation.routes';
import membersRoutes from './routes/members.routes';
import attendanceRoutes from './routes/attendance.routes';
import finesRoutes from './routes/fines.routes';
import reservationsRoutes from './routes/reservations.routes';
import extensionsRoutes from './routes/extensions.routes';
import nodueRoutes from './routes/nodue.routes';
import noticesRoutes from './routes/notices.routes';
import digitalRoutes from './routes/digital.routes';
import procurementRoutes from './routes/procurement.routes';
import racksRoutes from './routes/racks.routes';
import auditRoutes from './routes/audit.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const connected = isDbConnected();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'University Library Management API',
    database: connected ? 'MongoDB Connected' : 'Waiting for MongoDB Atlas IP Whitelist',
    isDbConnected: connected,
  });
});

// Database Connection Guard for API endpoints
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health') return next();
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Please verify your MONGODB_URI in the backend .env file.',
      isDbConnected: false,
    });
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/circulation', circulationRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fines', finesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/extensions', extensionsRoutes);
app.use('/api/nodue', nodueRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/digital', digitalRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/racks', racksRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server & Connect Database
async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 University Library Backend API running at http://localhost:${PORT}`);
      console.log(`📡 Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start library server:', error);
    process.exit(1);
  }
}

startServer();
