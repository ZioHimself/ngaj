import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectToDatabase, closeDatabaseConnection, getDatabase } from './config/database.js';
import { WizardService } from './services/wizard-service.js';
import { configureSession } from './middleware/session.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Session middleware (must be before auth middleware)
app.use(configureSession());

// Auth middleware (protects routes after session is configured)
app.use(authMiddleware);

// Auth routes (login, logout, status)
app.use('/api/auth', authRoutes);

// Health check endpoint (public route - allowed by auth middleware)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Legacy health check endpoint for backwards compatibility
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

// ============================================================================
// Wizard API Endpoints (ADR-012)
// ============================================================================

// Check if setup wizard is needed
app.get('/api/wizard/check', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const hasProfile = await wizardService.hasProfile();
    res.json({ hasProfile });
  } catch (error) {
    console.error('Error checking profile:', error);
    res.status(500).json({ error: 'Failed to check profile status' });
  }
});

// Get existing wizard data (for form pre-population)
app.get('/api/wizard/existing', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const data = await wizardService.getExistingWizardData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching existing data:', error);
    res.status(500).json({ error: 'Failed to fetch existing data' });
  }
});

// Create profile (Step 1)
app.post('/api/profiles', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const profile = await wizardService.createProfileFromWizard(req.body);
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to create profile';
    const status = message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

// Test connection (Step 2)
app.post('/api/accounts/test-connection', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const result = await wizardService.testConnection(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      handle: '',
      error: 'Failed to test connection',
    });
  }
});

// Create account (Step 2)
app.post('/api/accounts', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const account = await wizardService.createAccountFromWizard(req.body);
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// Update discovery schedule (Step 3)
app.patch('/api/accounts/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const wizardService = new WizardService(db);
    const account = await wizardService.setDiscoverySchedule(req.params.id, req.body);
    res.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    const message = error instanceof Error ? error.message : 'Failed to update account';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// ============================================================================
// Placeholder routes for future implementation
// ============================================================================

app.get('/api/profiles', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const profiles = await db.collection('profiles').find({}).toArray();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

app.get('/api/accounts', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const accounts = await db.collection('accounts').find({}).toArray();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// ============================================================================
// Static Files & SPA Fallback
// ============================================================================

// Serve frontend static files (production build)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA fallback: serve index.html for non-API routes
app.use((req: Request, res: Response, next) => {
  // Skip API routes - let them fall through to 404
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Serve index.html for all other routes (SPA client-side routing)
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist (dev mode), fall through to 404
      next();
    }
  });
});

// 404 handler (API routes only, or if frontend not built)
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

