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
import { ClaudeClient } from './clients/claude-client.js';
import { ResponseSuggestionService, type IChromaClient } from './services/response-suggestion-service.js';
import type { KBChunk } from './utils/prompt-builder.js';
import { CleanupService, type ICleanupService } from './services/cleanup-service.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
// When running as workspace, cwd may be package dir, so we specify the path
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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

// Module-level scheduler, discovery, and cleanup service instances
let scheduler: ICronScheduler | null = null;
let discoveryService: DiscoveryService | null = null;
let cleanupService: ICleanupService | null = null;

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
    discoveryService = new DiscoveryService(db, platformAdapter, scoringService);

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

/**
 * Get the discovery service instance.
 * 
 * @returns Current discovery service instance, or null if not initialized
 */
export function getDiscoveryService(): DiscoveryService | null {
  return discoveryService;
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
// ADR-018: When querying 'pending' status, exclude opportunities that have expired (expiresAt < now)
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
      // ADR-018: When querying 'pending', also exclude expired opportunities
      // (those with expiresAt in the past that haven't been marked expired yet)
      if (status === 'pending') {
        query.expiresAt = { $gt: new Date() };
      }
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

/**
 * Refresh opportunities - trigger discovery and return updated list
 * 
 * This endpoint:
 * 1. Triggers discovery for both 'replies' and 'search' types
 * 2. Returns the updated opportunities list (same format as GET)
 * 
 * Use this instead of GET when you want to fetch fresh opportunities from the platform.
 */
app.post('/api/opportunities/refresh', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const discovery = getDiscoveryService();
    
    if (!discovery) {
      res.status(503).json({ 
        error: 'Discovery service not available',
        message: 'Bluesky credentials may not be configured'
      });
      return;
    }

    // Get account (MVP: first account)
    const accountsCollection = db.collection('accounts');
    const account = await accountsCollection.findOne({});
    
    if (!account) {
      res.status(404).json({ error: 'No account configured' });
      return;
    }

    const { ObjectId } = await import('mongodb');
    const accountId = account._id instanceof ObjectId ? account._id : new ObjectId(account._id);

    // Trigger discovery for both types (run in parallel)
    const [repliesResult, searchResult] = await Promise.allSettled([
      discovery.discover(accountId, 'replies'),
      discovery.discover(accountId, 'search'),
    ]);

    // Log any errors but continue
    if (repliesResult.status === 'rejected') {
      console.error('Replies discovery failed:', repliesResult.reason);
    }
    if (searchResult.status === 'rejected') {
      console.error('Search discovery failed:', searchResult.reason);
    }

    // Parse query params for filtering (same as GET)
    const { status, limit = '20', offset = '0' } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { accountId: account._id };
    if (status && status !== 'all') {
      query.status = status;
      if (status === 'pending') {
        query.expiresAt = { $gt: new Date() };
      }
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

    // Include discovery stats in response
    const newReplies = repliesResult.status === 'fulfilled' ? repliesResult.value.length : 0;
    const newSearch = searchResult.status === 'fulfilled' ? searchResult.value.length : 0;

    res.json({
      opportunities: populatedOpportunities,
      total,
      hasMore: offsetNum + opportunities.length < total,
      discovery: {
        newOpportunities: newReplies + newSearch,
        replies: repliesResult.status === 'fulfilled' ? { found: newReplies } : { error: 'failed' },
        search: searchResult.status === 'fulfilled' ? { found: newSearch } : { error: 'failed' },
      },
    });
  } catch (error) {
    console.error('Error refreshing opportunities:', error);
    res.status(500).json({ error: 'Failed to refresh opportunities' });
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

// Generate response for an opportunity (ADR-009)
app.post('/api/responses/generate', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { opportunityId } = req.body;

    if (!opportunityId) {
      res.status(400).json({ error: 'opportunityId is required' });
      return;
    }

    // Check for Claude API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      res.status(503).json({
        error: 'AI service not configured',
        message: 'ANTHROPIC_API_KEY not set. Please configure your Claude API key.',
      });
      return;
    }

    const { ObjectId } = await import('mongodb');

    // Get first account and profile (MVP simplification)
    const accountsCollection = db.collection('accounts');
    const profilesCollection = db.collection('profiles');
    
    const account = await accountsCollection.findOne({});
    if (!account) {
      res.status(400).json({ error: 'No account configured' });
      return;
    }

    const profile = await profilesCollection.findOne({});
    if (!profile) {
      res.status(400).json({ error: 'No profile configured' });
      return;
    }

    // Create Claude client
    const claudeClient = new ClaudeClient(anthropicApiKey);

    // Create stub ChromaDB client (KB search not yet implemented - graceful degradation)
    const chromaClient: IChromaClient = {
      search: async (): Promise<KBChunk[]> => [],
    };

    // Create platform adapter
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const platformAdapter = new BlueskyAdapter(agent);

    // Create response suggestion service
    const responseSuggestionService = new ResponseSuggestionService(
      db,
      claudeClient,
      chromaClient,
      platformAdapter
    );

    // Generate response
    const response = await responseSuggestionService.generateResponse(
      new ObjectId(opportunityId),
      new ObjectId(account._id),
      new ObjectId(profile._id)
    );

    res.json(response);
  } catch (error) {
    console.error('Error generating response:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate response';
    res.status(500).json({ error: message });
  }
});

// Post a response (ADR-010)
app.post('/api/responses/:id/post', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Check for Bluesky credentials
    const handle = process.env.BLUESKY_HANDLE;
    const appPassword = process.env.BLUESKY_APP_PASSWORD;

    if (!handle || !appPassword) {
      res.status(503).json({
        error: 'Bluesky not configured',
        message: 'BLUESKY_HANDLE and BLUESKY_APP_PASSWORD required',
      });
      return;
    }

    const { ObjectId } = await import('mongodb');
    const { ResponsePostingService } = await import('./services/response-posting-service.js');

    // Create authenticated Bluesky agent
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const identifier = handle.startsWith('@') ? handle.slice(1) : handle;
    await agent.login({ identifier, password: appPassword });

    // Create platform adapter and posting service
    const platformAdapter = new BlueskyAdapter(agent);
    const postingService = new ResponsePostingService(db, platformAdapter);

    // Post the response
    const response = await postingService.postResponse(new ObjectId(id));

    res.json(response);
  } catch (error) {
    console.error('Error posting response:', error);
    const message = error instanceof Error ? error.message : 'Failed to post response';
    
    // Determine appropriate status code based on error type
    let status = 500;
    if (message.includes('not found')) {
      status = 404;
    } else if (message.includes('not a draft') || message.includes('Invalid status')) {
      status = 400;
    }
    
    res.status(status).json({ error: message });
  }
});

// Update response text (ADR-009)
app.patch('/api/responses/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { text } = req.body;

    // Validate text is provided and non-empty
    if (!text || typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'text is required and must be non-empty' });
      return;
    }

    const { ObjectId } = await import('mongodb');
    const responsesCollection = db.collection('responses');

    // Load response to validate it exists and is a draft
    const response = await responsesCollection.findOne({ _id: new ObjectId(id) });
    
    if (!response) {
      res.status(404).json({ error: `Response with ID ${id} not found` });
      return;
    }

    if (response.status !== 'draft') {
      res.status(400).json({ error: `Cannot update response with status: ${response.status}` });
      return;
    }

    // Update the response text
    const result = await responsesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { text: text.trim(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: `Response with ID ${id} not found` });
      return;
    }

    // Return updated response
    const updatedResponse = await responsesCollection.findOne({ _id: new ObjectId(id) });
    res.json(updatedResponse);
  } catch (error) {
    console.error('Error updating response:', error);
    const message = error instanceof Error ? error.message : 'Failed to update response';
    res.status(500).json({ error: message });
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
// Bulk Dismiss API Endpoint (ADR-018)
// ============================================================================

/**
 * Bulk dismiss multiple opportunities at once
 *
 * Only dismisses pending opportunities belonging to the current account.
 * Non-pending or other-account opportunities are skipped (not errors).
 *
 * @see ADR-018: Expiration Mechanics
 */
app.post('/api/opportunities/bulk-dismiss', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { opportunityIds } = req.body;

    // Validate input
    if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      res.status(400).json({ error: 'opportunityIds array is required' });
      return;
    }

    // Get the current user's account (MVP: single account)
    const accountsCollection = db.collection('accounts');
    const account = await accountsCollection.findOne({});
    if (!account) {
      res.status(401).json({ error: 'No account found' });
      return;
    }

    const { ObjectId } = await import('mongodb');

    // Convert string IDs to ObjectIds (filter out invalid IDs)
    const objectIds: InstanceType<typeof ObjectId>[] = [];
    for (const id of opportunityIds) {
      try {
        objectIds.push(new ObjectId(id));
      } catch {
        // Invalid ObjectId format, skip
      }
    }

    // Find pending opportunities BEFORE updating (to compute skipped list accurately)
    const pendingDocs = await db
      .collection('opportunities')
      .find({
        _id: { $in: objectIds },
        accountId: account._id,
        status: 'pending',
      })
      .project({ _id: 1 })
      .toArray();

    const pendingIdStrings = new Set(pendingDocs.map((o) => o._id.toString()));

    // Update only pending opportunities belonging to this account
    const result = await db.collection('opportunities').updateMany(
      {
        _id: { $in: objectIds },
        accountId: account._id,
        status: 'pending',
      },
      {
        $set: { status: 'dismissed', updatedAt: new Date() },
      }
    );

    // Skipped = input IDs that were NOT pending (or not found, or wrong account)
    const skipped = opportunityIds.filter((id: string) => !pendingIdStrings.has(id));

    res.json({
      dismissed: result.modifiedCount,
      skipped,
    });
  } catch (error) {
    console.error('Error bulk dismissing opportunities:', error);
    res.status(500).json({ error: 'Failed to bulk dismiss opportunities' });
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

    // Initialize cleanup service (ADR-018)
    cleanupService = new CleanupService(db);
    cleanupService.start();
    console.log('✅ Cleanup service started (runs every 5 minutes)');

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
  
  // Stop cleanup service (ADR-018)
  if (cleanupService) {
    cleanupService.stop();
    console.log('✅ Cleanup service stopped');
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
  
  // Stop cleanup service (ADR-018)
  if (cleanupService) {
    cleanupService.stop();
    console.log('✅ Cleanup service stopped');
  }
  
  await closeDatabaseConnection();
  process.exit(0);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };

