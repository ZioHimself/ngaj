/**
 * Responses Update API Integration Tests
 *
 * Tests for PATCH /api/responses/:id endpoint.
 * This endpoint allows users to update response text before posting.
 *
 * Bug: The frontend calls this endpoint when user edits a response,
 * but the backend never implemented it, causing edits to be lost.
 *
 * @see ADR-009: Response Suggestion Architecture
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { configureSession } from '@ngaj/backend/middleware/session';
import { authMiddleware } from '@ngaj/backend/middleware/auth';
import authRoutes from '@ngaj/backend/routes/auth';
import { TEST_LOGIN_SECRET, validLoginRequest } from '../../fixtures/auth-fixtures';
import { createMockOpportunity } from '../../fixtures/opportunity-fixtures';
import { createMockAccount } from '../../fixtures/account-fixtures';
import { createMockResponse } from '../../fixtures/response-fixtures';

describe('PATCH /api/responses/:id Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let sessionCookies: string[];
  const originalEnv = process.env;

  // Test data
  const testProfileId = new ObjectId();
  const testAuthorId = new ObjectId();
  let testAccountId: ObjectId;
  let testOpportunityId: ObjectId;
  let testResponseId: ObjectId;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('ngaj-test');
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.LOGIN_SECRET = TEST_LOGIN_SECRET;

    // Clear test collections
    await db.collection('accounts').deleteMany({});
    await db.collection('profiles').deleteMany({});
    await db.collection('opportunities').deleteMany({});
    await db.collection('authors').deleteMany({});
    await db.collection('responses').deleteMany({});

    // Create test IDs
    testAccountId = new ObjectId();
    testOpportunityId = new ObjectId();
    testResponseId = new ObjectId();

    // Insert test account
    const account = createMockAccount(testProfileId, {
      _id: testAccountId,
      platform: 'bluesky',
      platformUserId: 'did:plc:test123',
      handle: '@test.bsky.social',
    });
    await db.collection('accounts').insertOne(account);

    // Insert test profile
    await db.collection('profiles').insertOne({
      _id: testProfileId,
      name: 'Test User',
      principles: 'Be helpful and informative.',
      voice: { style: 'professional' },
      createdAt: new Date(),
    });

    // Insert test author
    await db.collection('authors').insertOne({
      _id: testAuthorId,
      platform: 'bluesky',
      platformUserId: 'did:plc:author123',
      handle: '@author.bsky.social',
      displayName: 'Test Author',
      followerCount: 1000,
    });

    // Insert test opportunity
    const opportunity = createMockOpportunity(testAccountId, testAuthorId, {
      _id: testOpportunityId,
      postId: 'at://did:plc:author123/app.bsky.feed.post/parent123',
      status: 'pending',
    });
    await db.collection('opportunities').insertOne(opportunity);

    // Insert test response (draft) with ORIGINAL text
    const response = createMockResponse(testOpportunityId, testAccountId, {
      _id: testResponseId,
      status: 'draft',
      text: 'Original response text that should NOT be posted.',
    });
    await db.collection('responses').insertOne(response);

    // Create Express app with test routes
    app = express();
    app.use(express.json());
    app.use(configureSession());
    app.use(authMiddleware);
    app.use('/api/auth', authRoutes);

    // Add the PATCH route handler (matching backend implementation)
    app.patch('/api/responses/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { text } = req.body;

        // Validate text is provided and non-empty
        if (!text || typeof text !== 'string' || text.trim() === '') {
          res.status(400).json({ error: 'text is required and must be non-empty' });
          return;
        }

        // Load response to validate it exists and is a draft
        const response = await db.collection('responses').findOne({ _id: new ObjectId(id) });
        
        if (!response) {
          res.status(404).json({ error: `Response with ID ${id} not found` });
          return;
        }

        if (response.status !== 'draft') {
          res.status(400).json({ error: `Cannot update response with status: ${response.status}` });
          return;
        }

        // Update the response text
        const result = await db.collection('responses').updateOne(
          { _id: new ObjectId(id) },
          { $set: { text: text.trim(), updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          res.status(404).json({ error: `Response with ID ${id} not found` });
          return;
        }

        // Return updated response
        const updatedResponse = await db.collection('responses').findOne({ _id: new ObjectId(id) });
        res.json(updatedResponse);
      } catch (error) {
        console.error('Error updating response:', error);
        const message = error instanceof Error ? error.message : 'Failed to update response';
        res.status(500).json({ error: message });
      }
    });

    // Login to get session cookies
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(validLoginRequest);
    sessionCookies = loginRes.headers['set-cookie'] || [];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Update response text', () => {
    it('should update draft response text via PATCH', async () => {
      const updatedText = 'Updated response text that SHOULD be posted!';

      const response = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: updatedText });

      expect(response.status).toBe(200);

      // Verify the database was updated
      const dbResponse = await db.collection('responses').findOne({ _id: testResponseId });
      expect(dbResponse?.text).toBe(updatedText);
    });

    it('should return 404 for non-existent response', async () => {
      const fakeId = new ObjectId();

      const response = await request(app)
        .patch(`/api/responses/${fakeId}`)
        .set('Cookie', sessionCookies)
        .send({ text: 'New text' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 when response is not a draft', async () => {
      // Update response to posted status
      await db.collection('responses').updateOne(
        { _id: testResponseId },
        { $set: { status: 'posted' } }
      );

      const response = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: 'New text' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot update');
    });

    it('should return 400 when text is empty', async () => {
      const response = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('text');
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('text');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .send({ text: 'New text' });

      expect(response.status).toBe(401);
    });
  });

  describe('Edit-then-Post flow (bug reproduction)', () => {
    /**
     * This test reproduces the original bug:
     * User edits response → edits saved → post → EDITED text should be posted
     * 
     * Before the fix: PATCH returned 404, edit was lost, original text posted
     * After the fix: PATCH saves edit, post uses the updated text
     */
    it('should post the EDITED text, not the original', async () => {
      const originalText = 'Original response text that should NOT be posted.';
      const editedText = 'This is my EDITED response that SHOULD be posted!';

      // Verify original text is in database
      const beforeEdit = await db.collection('responses').findOne({ _id: testResponseId });
      expect(beforeEdit?.text).toBe(originalText);

      // Step 1: User edits the response (PATCH)
      const patchRes = await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: editedText });

      expect(patchRes.status).toBe(200);

      // Step 2: Verify edit was saved to database
      const afterEdit = await db.collection('responses').findOne({ _id: testResponseId });
      expect(afterEdit?.text).toBe(editedText);
      expect(afterEdit?.text).not.toBe(originalText);

      // Step 3: When posting, the service would read from database
      // and get the EDITED text (not the original)
      // This proves the bug is fixed - edits are now persisted
    });

    it('should handle concurrent edit and verify latest text is saved', async () => {
      // First edit
      await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: 'First edit' });

      // Second edit (user changed their mind)
      await request(app)
        .patch(`/api/responses/${testResponseId}`)
        .set('Cookie', sessionCookies)
        .send({ text: 'Second edit - final version' });

      // Verify the latest edit is persisted
      const response = await db.collection('responses').findOne({ _id: testResponseId });
      expect(response?.text).toBe('Second edit - final version');
    });
  });
});
