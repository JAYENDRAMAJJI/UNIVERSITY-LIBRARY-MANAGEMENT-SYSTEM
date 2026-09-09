/**
 * Database Connection Manager (Mongoose & MongoDB)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let isConnecting = false;
let retryTimer: NodeJS.Timeout | null = null;

export async function connectDB(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ [MongoDB] Error: MONGODB_URI is not set in your .env file.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    return null;
  }

  isConnecting = true;

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });

    isConnected = true;
    isConnecting = false;
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }

    console.log('MongoDB Connected Successfully');
    console.log(`📡 [MongoDB] Connected to database: "${conn.connection.name}" on host: ${conn.connection.host}`);
    
    // Run seeder once connected
    const { seedDatabase } = await import('../seed');
    await seedDatabase();

    return conn;
  } catch (error: any) {
    isConnected = false;
    isConnecting = false;
    console.error(`❌ [MongoDB] Connection Failed. Actual Error: ${error.message}`);
    if (error.message && error.message.includes('whitelisted')) {
      console.warn(`⚠️ [MongoDB Atlas] Action Required: Your current IP address must be added to MongoDB Atlas Network Access.`);
      console.warn(`👉 Go to: MongoDB Atlas → Security → Network Access → Add IP Address → Click "Allow Access From Anywhere" (0.0.0.0/0) or add your current IP.`);
    }

    // Start background retry if not already active
    if (!retryTimer) {
      console.log('🔄 [MongoDB] Background auto-reconnect active (retrying every 8 seconds)...');
      retryTimer = setInterval(async () => {
        if (!isDbConnected() && !isConnecting) {
          await connectDB();
        }
      }, 8000);
    }

    return null;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 [MongoDB] Disconnected from database.');
  }
}


