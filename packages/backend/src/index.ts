import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectToDatabase, closeDatabaseConnection } from './config/database.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'ngaj API',
    version: '0.1.0',
    description: 'Proactive engagement companion for social media',
  });
});

// Placeholder routes for future implementation
app.get('/api/profiles', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Profile endpoints will be implemented after test-writer agent phase',
  });
});

app.get('/api/accounts', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Account endpoints will be implemented after test-writer agent phase',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };

