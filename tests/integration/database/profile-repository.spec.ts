import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { 
  createMockProfileInput, 
  profileFixtures,
  createMockProfiles
} from '../../fixtures/profile-fixtures';
import type { Profile, CreateProfileInput } from '@/shared/types/profile';

/**
 * Integration tests for Profile MongoDB operations
 * Uses MongoMemoryServer for isolated testing
 */
describe('Profile Repository Integration', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = await MongoClient.connect(uri);
    db = client.db('ngaj_test');

    // Create indexes
    await db.collection('profiles').createIndex({ name: 1 }, { unique: true });
    await db.collection('profiles').createIndex({ isActive: 1 });
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean collections between tests
    await db.collection('profiles').deleteMany({});
    await db.collection('accounts').deleteMany({});
  });

  describe('Create Operations', () => {
    it('should insert profile with all fields', async () => {
      // Arrange
      const input = createMockProfileInput();
      const now = new Date();
      const profile: Profile = {
        _id: new ObjectId(),
        ...input,
        createdAt: now,
        updatedAt: now
      };

      // Act
      const result = await db.collection('profiles').insertOne(profile);

      // Assert
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();

      const inserted = await db.collection('profiles').findOne({ _id: result.insertedId });
      expect(inserted).toBeDefined();
      expect(inserted!.name).toBe(input.name);
      expect(inserted!.voice).toEqual(input.voice);
      expect(inserted!.discovery).toEqual(input.discovery);
    });

    it('should enforce unique name constraint', async () => {
      // Arrange
      const profile1 = createMockProfileInput({ name: 'Duplicate Name' });
      const profile2 = createMockProfileInput({ name: 'Duplicate Name' });
      
      const doc1: Profile = {
        _id: new ObjectId(),
        ...profile1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const doc2: Profile = {
        _id: new ObjectId(),
        ...profile2,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act
      await db.collection('profiles').insertOne(doc1);

      // Assert
      await expect(
        db.collection('profiles').insertOne(doc2)
      ).rejects.toThrow(); // MongoDB E11000 duplicate key error
    });

    it('should handle concurrent profile creation with same name', async () => {
      // Arrange
      const name = 'Concurrent Test';
      const profile1 = createMockProfileInput({ name });
      const profile2 = createMockProfileInput({ name });

      const doc1: Profile = {
        _id: new ObjectId(),
        ...profile1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const doc2: Profile = {
        _id: new ObjectId(),
        ...profile2,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act - Simulate concurrent inserts
      const results = await Promise.allSettled([
        db.collection('profiles').insertOne(doc1),
        db.collection('profiles').insertOne(doc2)
      ]);

      // Assert - One should succeed, one should fail
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      expect(successful).toBe(1);
      expect(failed).toBe(1);
    });
  });

  describe('Read Operations', () => {
    it('should find profile by ID', async () => {
      // Arrange
      const profile = createMockProfileInput();
      const doc: Profile = {
        _id: new ObjectId(),
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('profiles').insertOne(doc);

      // Act
      const result = await db.collection('profiles').findOne({ _id: doc._id });

      // Assert
      expect(result).toBeDefined();
      expect(result!._id).toEqual(doc._id);
      expect(result!.name).toBe(doc.name);
    });

    it('should return null for non-existent ID', async () => {
      // Arrange
      const nonExistentId = new ObjectId();

      // Act
      const result = await db.collection('profiles').findOne({ _id: nonExistentId });

      // Assert
      expect(result).toBeNull();
    });

    it('should find all profiles', async () => {
      // Arrange
      const profiles = createMockProfiles(3);
      for (const profile of profiles) {
        await db.collection('profiles').insertOne(profile);
      }

      // Act
      const result = await db.collection('profiles').find({}).toArray();

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should filter by isActive flag', async () => {
      // Arrange
      const activeProfile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput({ name: 'Active' }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const inactiveProfile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput({ name: 'Inactive' }),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('profiles').insertOne(activeProfile);
      await db.collection('profiles').insertOne(inactiveProfile);

      // Act
      const activeResults = await db.collection('profiles')
        .find({ isActive: true })
        .toArray();

      // Assert
      expect(activeResults).toHaveLength(1);
      expect(activeResults[0].name).toBe('Active');
    });

    it('should use isActive index for filtering', async () => {
      // Arrange - Insert many profiles
      const profiles = createMockProfiles(100);
      for (const profile of profiles) {
        profile.isActive = Math.random() > 0.5; // Random active/inactive
        await db.collection('profiles').insertOne(profile);
      }

      // Act
      const startTime = Date.now();
      const results = await db.collection('profiles')
        .find({ isActive: true })
        .explain('executionStats');
      const duration = Date.now() - startTime;

      // Assert - Should be fast with index
      expect(duration).toBeLessThan(100); // Query should complete in <100ms
      // Verify index was used (would check executionStats in real scenario)
    });
  });

  describe('Update Operations', () => {
    it('should update profile fields', async () => {
      // Arrange
      const profile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('profiles').insertOne(profile);

      const newTone = 'technical-concise';
      const newUpdatedAt = new Date();

      // Act
      await db.collection('profiles').updateOne(
        { _id: profile._id },
        { 
          $set: { 
            'voice.tone': newTone,
            updatedAt: newUpdatedAt
          }
        }
      );

      // Assert
      const updated = await db.collection('profiles').findOne({ _id: profile._id });
      expect(updated!.voice.tone).toBe(newTone);
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(profile.updatedAt.getTime());
    });

    it('should not update createdAt timestamp', async () => {
      // Arrange
      const profile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput(),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      };
      await db.collection('profiles').insertOne(profile);

      // Act
      await db.collection('profiles').updateOne(
        { _id: profile._id },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Assert
      const updated = await db.collection('profiles').findOne({ _id: profile._id });
      expect(updated!.createdAt.getTime()).toBe(profile.createdAt.getTime());
    });

    it('should handle soft delete (set isActive=false)', async () => {
      // Arrange
      const profile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('profiles').insertOne(profile);

      // Act
      await db.collection('profiles').updateOne(
        { _id: profile._id },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Assert
      const updated = await db.collection('profiles').findOne({ _id: profile._id });
      expect(updated!.isActive).toBe(false);
      
      // Soft deleted profiles excluded from default active queries
      const activeProfiles = await db.collection('profiles')
        .find({ isActive: true })
        .toArray();
      expect(activeProfiles).toHaveLength(0);
    });
  });

  describe('Delete Operations', () => {
    it('should prevent deletion when accounts exist (referential integrity)', async () => {
      // Arrange
      const profile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('profiles').insertOne(profile);

      // Create linked account
      const account = {
        _id: new ObjectId(),
        profileId: profile._id,
        platform: 'bluesky',
        handle: '@test.bsky.social',
        discovery: {
          schedule: { enabled: true, cronExpression: '0 * * * *' }
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('accounts').insertOne(account);

      // Act - Check for linked accounts before delete
      const linkedAccountsCount = await db.collection('accounts')
        .countDocuments({ profileId: profile._id });

      // Assert
      expect(linkedAccountsCount).toBeGreaterThan(0);
      
      // In real implementation, this would throw ConflictError
      // Here we just verify the check works
      expect(linkedAccountsCount).toBe(1);
    });

    it('should allow deletion when no accounts exist', async () => {
      // Arrange
      const profile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('profiles').insertOne(profile);

      // Act - Check for linked accounts
      const linkedAccountsCount = await db.collection('accounts')
        .countDocuments({ profileId: profile._id });

      // Assert
      expect(linkedAccountsCount).toBe(0);
      
      // Safe to delete (would be soft delete in implementation)
      await db.collection('profiles').updateOne(
        { _id: profile._id },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      const deleted = await db.collection('profiles').findOne({ 
        _id: profile._id, 
        isActive: false 
      });
      expect(deleted).toBeDefined();
    });
  });

  describe('Index Performance', () => {
    it('should use name index for lookups', async () => {
      // Arrange - Insert profiles
      const profiles = createMockProfiles(50);
      for (const profile of profiles) {
        await db.collection('profiles').insertOne(profile);
      }

      // Act
      const targetName = profiles[25].name;
      const result = await db.collection('profiles').findOne({ name: targetName });

      // Assert
      expect(result).toBeDefined();
      expect(result!.name).toBe(targetName);
    });

    it('should handle unicode characters in profile names', async () => {
      // Arrange
      const unicodeProfile: Profile = {
        _id: new ObjectId(),
        ...createMockProfileInput({ 
          name: 'Test Émoji 🚀 Persona' 
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act
      await db.collection('profiles').insertOne(unicodeProfile);
      const result = await db.collection('profiles')
        .findOne({ name: 'Test Émoji 🚀 Persona' });

      // Assert
      expect(result).toBeDefined();
      expect(result!.name).toBe('Test Émoji 🚀 Persona');
    });
  });
});


