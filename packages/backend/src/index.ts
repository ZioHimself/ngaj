import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Db } from 'mongodb';
import { BskyAgent } from '@atproto/api';
import { connectToDatabase, closeDatabaseConnection, getDatabase } from './config/database.js';
import { WizardService } from './services/wizard-service.js';
import { configureSession } from './middleware/session.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import { CronScheduler, type ICronScheduler } from './scheduler/cron-scheduler.js';
import { DiscoveryService } from './services/discovery-service.js';
import { ScoringService } from './services/scoring-service.js';
import { BlueskyAdapter } from './adapters/bluesky-adapter.js';

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

// ============================================================================
// Scheduler Instance (Issue #35)
// ============================================================================

// Module-level scheduler instance
let scheduler: ICronScheduler | null = null;

/**
 * Create and configure the CronScheduler with all dependencies.
 * 
 * This function:
 * 1. Checks for Bluesky credentials in environment
 * 2. Creates authenticated BskyAgent
 * 3. Builds dependency chain: BlueskyAdapter -> ScoringService -> DiscoveryService -> CronScheduler
 * 
 * @param db - MongoDB database instance
 * @returns CronScheduler instance, or null if credentials are missing
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 */
export async function createScheduler(db: Db): Promise<ICronScheduler | null> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;

  // Skip scheduler creation if credentials are missing
  if (!handle || !appPassword) {
    console.log('⚠️ Bluesky credentials not configured - scheduler disabled');
    return null;
  }

  try {
    // 1. Create and authenticate BskyAgent
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const identifier = handle.startsWith('@') ? handle.slice(1) : handle;
    await agent.login({ identifier, password: appPassword });
    console.log('✅ Bluesky authentication successful');

    // 2. Create dependencies
    const platformAdapter = new BlueskyAdapter(agent);
    const scoringService = new ScoringService();
    const discoveryService = new DiscoveryService(db, platformAdapter, scoringService);

    // 3. Create scheduler
    const cronScheduler = new CronScheduler(db, discoveryService);

    return cronScheduler;
  } catch (error) {
    console.error('❌ Failed to create scheduler:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get the running scheduler instance.
 * 
 * @returns Current scheduler instance, or null if not initialized
 */
export function getScheduler(): ICronScheduler | null {
  return scheduler;
}

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
// Opportunities API Endpoints (ADR-013)
// ============================================================================

// Get opportunities (paginated)
app.get('/api/opportunities', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, limit = '20', offset = '0' } = req.query;

    // Build query - get first account for now (MVP simplification)
    const accountsCollection = db.collection('accounts');
    const account = await accountsCollection.findOne({});
    
    if (!account) {
      // No account configured - return empty list
      res.json({
        opportunities: [],
        total: 0,
        hasMore: false,
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { accountId: account._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const opportunitiesCollection = db.collection('opportunities');
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    const opportunities = await opportunitiesCollection
      .find(query)
      .sort({ 'scoring.total': -1 })
      .skip(offsetNum)
      .limit(limitNum)
      .toArray();

    const total = await opportunitiesCollection.countDocuments(query);

    // Populate authors
    const authorsCollection = db.collection('authors');
    const populatedOpportunities = await Promise.all(
      opportunities.map(async (opp) => {
        const author = await authorsCollection.findOne({ _id: opp.authorId });
        return { ...opp, author };
      })
    );

    res.json({
      opportunities: populatedOpportunities,
      total,
      hasMore: offsetNum + opportunities.length < total,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// ============================================================================
// Responses API Endpoints (ADR-009, ADR-010)
// ============================================================================

// Get responses for opportunities
app.get('/api/responses', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { opportunityIds } = req.query;

    if (!opportunityIds) {
      res.json({ responses: [] });
      return;
    }

    const ids = (opportunityIds as string).split(',').filter(Boolean);
    if (ids.length === 0) {
      res.json({ responses: [] });
      return;
    }

    const { ObjectId } = await import('mongodb');
    const responsesCollection = db.collection('responses');
    
    const responses = await responsesCollection
      .find({ opportunityId: { $in: ids.map(id => new ObjectId(id)) } })
      .toArray();

    res.json({ responses });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Update opportunity status (dismiss, etc.)
app.patch('/api/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const { ObjectId } = await import('mongodb');
    const opportunitiesCollection = db.collection('opportunities');
    
    const result = await opportunitiesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// ============================================================================
// Discovery API Endpoints (ADR-008, Issue #34)
// ============================================================================

/**
 * Manually trigger opportunity discovery
 * 
 * This endpoint allows users to trigger discovery on-demand without
 * waiting for scheduled cron jobs. Useful for dashboard refresh button.
 * 
 * @see ADR-008: Opportunity Discovery Architecture
 * @see GitHub Issue #34
 */
app.post('/api/discovery/run', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ObjectId } = await import('mongodb');

    // Get first account (MVP simplification - single account)
    const accountsCollection = db.collection('accounts');
    const account = await accountsCollection.findOne({});

    if (!account) {
      // No account configured - return empty result
      res.json({
        discoveredCount: 0,
        repliesCount: 0,
        searchCount: 0,
        message: 'No account configured',
      });
      return;
    }

    // Get scheduler to access discovery service
    const currentScheduler = getScheduler();
    if (!currentScheduler) {
      // Scheduler not available (credentials not configured)
      res.status(500).json({
        error: 'Discovery service not available',
        message: 'Bluesky credentials not configured',
      });
      return;
    }

    // Run discovery for enabled schedule types
    let repliesCount = 0;
    let searchCount = 0;

    // Check which schedules are enabled
    const repliesSchedule = account.discovery?.schedules?.find(
      (s: { type: string; enabled: boolean }) => s.type === 'replies' && s.enabled
    );
    const searchSchedule = account.discovery?.schedules?.find(
      (s: { type: string; enabled: boolean }) => s.type === 'search' && s.enabled
    );

    // Run replies discovery if enabled
    if (repliesSchedule) {
      try {
        const repliesOpportunities = await currentScheduler.triggerNow(
          new ObjectId(account._id),
          'replies'
        );
        repliesCount = repliesOpportunities.length;
      } catch (error) {
        console.error('Error running replies discovery:', error);
        // Continue with search even if replies fails
      }
    }

    // Run search discovery if enabled
    if (searchSchedule) {
      try {
        const searchOpportunities = await currentScheduler.triggerNow(
          new ObjectId(account._id),
          'search'
        );
        searchCount = searchOpportunities.length;
      } catch (error) {
        console.error('Error running search discovery:', error);
        // Continue even if search fails
      }
    }

    const discoveredCount = repliesCount + searchCount;

    res.json({
      discoveredCount,
      repliesCount,
      searchCount,
    });
  } catch (error) {
    console.error('Error running discovery:', error);
    res.status(500).json({ error: 'Failed to run discovery' });
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

    // Initialize scheduler (Issue #35)
    const db = getDatabase();
    scheduler = await createScheduler(db);
    
    if (scheduler) {
      await scheduler.initialize();
      console.log('✅ Scheduler initialized');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);

      // Start scheduler after server is listening (Issue #35)
      if (scheduler) {
        scheduler.start();
        console.log('✅ Scheduler started - discovery jobs active');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop scheduler first (Issue #35)
  if (scheduler) {
    scheduler.stop();
    console.log('✅ Scheduler stopped');
  }
  
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  // Stop scheduler first (Issue #35)
  if (scheduler) {
    scheduler.stop();
    console.log('✅ Scheduler stopped');
  }
  
  await closeDatabaseConnection();
  process.exit(0);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };

