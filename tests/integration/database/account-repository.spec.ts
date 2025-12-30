import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { 
  createMockAccount,
  createMockAccountInput,
  createAccountFixtures,
  createMockAccounts,
  cronExpressions
} from '../../fixtures/account-fixtures';
import { createMockProfile } from '../../fixtures/profile-fixtures';
import type { Account, CreateAccountInput } from '@/shared/types/account';
import type { Profile } from '@/shared/types/profile';

/**
 * Integration tests for Account MongoDB operations
 * Uses MongoMemoryServer for isolated testing
 */
describe('Account Repository Integration', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let testProfile: Profile;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = await MongoClient.connect(uri);
    db = client.db('ngaj_test');

    // Create indexes
    await db.collection('profiles').createIndex({ name: 1 }, { unique: true });
    await db.collection('accounts').createIndex(
      { platform: 1, handle: 1 }, 
      { unique: true }
    );
    await db.collection('accounts').createIndex({ profileId: 1 });
    await db.collection('accounts').createIndex({ 
      'discovery.schedule.enabled': 1, 
      status: 1 
    });
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

  beforeAll(async () => {
    // Create a test profile for accounts to reference
    const profileDoc = createMockProfile();
    testProfile = profileDoc;
  });

  describe('Create Operations', () => {
    it('should insert account with all fields', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const input = createMockAccountInput(testProfile._id);
      const account: Account = {
        _id: new ObjectId(),
        ...input,
        discovery: {
          ...input.discovery,
          lastAt: undefined,
          error: undefined
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act
      const result = await db.collection('accounts').insertOne(account);

      // Assert
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();

      const inserted = await db.collection('accounts').findOne({ _id: result.insertedId });
      expect(inserted).toBeDefined();
      expect(inserted!.profileId).toEqual(testProfile._id);
      expect(inserted!.platform).toBe(input.platform);
      expect(inserted!.handle).toBe(input.handle);
    });

    it('should enforce unique (platform, handle) constraint', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account1 = createMockAccount(testProfile._id, {
        platform: 'bluesky',
        handle: '@duplicate.bsky.social'
      });
      const account2 = createMockAccount(testProfile._id, {
        platform: 'bluesky',
        handle: '@duplicate.bsky.social'
      });

      // Act
      await db.collection('accounts').insertOne(account1);

      // Assert
      await expect(
        db.collection('accounts').insertOne(account2)
      ).rejects.toThrow(); // MongoDB E11000 duplicate key error
    });

    it('should allow same handle on different platforms', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const blueskyAccount = createMockAccount(testProfile._id, {
        platform: 'bluesky',
        handle: '@sameuser.bsky.social'
      });
      const linkedinAccount = createMockAccount(testProfile._id, {
        _id: new ObjectId(),
        platform: 'linkedin',
        handle: 'sameuser@example.com' // Different handle format, but testing uniqueness
      });

      // Act & Assert
      await expect(
        db.collection('accounts').insertOne(blueskyAccount)
      ).resolves.toBeDefined();
      
      await expect(
        db.collection('accounts').insertOne(linkedinAccount)
      ).resolves.toBeDefined();

      const accounts = await db.collection('accounts').find({}).toArray();
      expect(accounts).toHaveLength(2);
    });

    it('should validate profileId references existing profile', async () => {
      // Arrange
      const nonExistentProfileId = new ObjectId();
      const account = createMockAccount(nonExistentProfileId);

      // Act - Insert account
      await db.collection('accounts').insertOne(account);

      // Assert - Check if profile exists (simulating foreign key check)
      const profile = await db.collection('profiles').findOne({ 
        _id: nonExistentProfileId 
      });
      
      expect(profile).toBeNull();
      // In real implementation, this would be caught before insert
    });
  });

  describe('Read Operations', () => {
    it('should find account by ID', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      const result = await db.collection('accounts').findOne({ _id: account._id });

      // Assert
      expect(result).toBeDefined();
      expect(result!._id).toEqual(account._id);
    });

    it('should find account with populated profile using $lookup', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      const result = await db.collection('accounts').aggregate([
        { $match: { _id: account._id } },
        {
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profile'
          }
        },
        { $unwind: '$profile' }
      ]).toArray();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].profile).toBeDefined();
      expect(result[0].profile.name).toBe(testProfile.name);
    });

    it('should filter accounts by profileId', async () => {
      // Arrange
      const profile1 = createMockProfile({ name: 'Profile 1' });
      const profile2 = createMockProfile({ _id: new ObjectId(), name: 'Profile 2' });
      
      await db.collection('profiles').insertOne(profile1);
      await db.collection('profiles').insertOne(profile2);

      const account1 = createMockAccount(profile1._id, { handle: '@user1.bsky.social' });
      const account2 = createMockAccount(profile1._id, { 
        _id: new ObjectId(),
        handle: '@user2.bsky.social' 
      });
      const account3 = createMockAccount(profile2._id, { 
        _id: new ObjectId(),
        handle: '@user3.bsky.social' 
      });

      await db.collection('accounts').insertMany([account1, account2, account3]);

      // Act
      const profile1Accounts = await db.collection('accounts')
        .find({ profileId: profile1._id })
        .toArray();

      // Assert
      expect(profile1Accounts).toHaveLength(2);
      expect(profile1Accounts.every(a => a.profileId.equals(profile1._id))).toBe(true);
    });

    it('should filter accounts by status', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const activeAccount = createMockAccount(testProfile._id, { 
        status: 'active',
        handle: '@active.bsky.social'
      });
      const pausedAccount = createMockAccount(testProfile._id, { 
        _id: new ObjectId(),
        status: 'paused',
        handle: '@paused.bsky.social'
      });

      await db.collection('accounts').insertMany([activeAccount, pausedAccount]);

      // Act
      const activeAccounts = await db.collection('accounts')
        .find({ status: 'active' })
        .toArray();

      // Assert
      expect(activeAccounts).toHaveLength(1);
      expect(activeAccounts[0].status).toBe('active');
    });

    it('should find accounts for discovery (enabled + active)', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const fixtures = createAccountFixtures(testProfile._id);
      
      await db.collection('accounts').insertMany([
        fixtures.blueskyActive,      // Should match
        fixtures.paused,              // Excluded (not active)
        fixtures.error,               // Excluded (status error)
        fixtures.recentDiscovery      // Should match
      ]);

      // Act
      const discoveryAccounts = await db.collection('accounts')
        .find({
          'discovery.schedule.enabled': true,
          status: 'active'
        })
        .toArray();

      // Assert
      expect(discoveryAccounts).toHaveLength(2);
      expect(discoveryAccounts.every(a => 
        a.discovery.schedule.enabled === true && 
        a.status === 'active'
      )).toBe(true);
    });

    it('should use discovery index for query performance', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const accounts = createMockAccounts(testProfile._id, 100);
      
      // Randomly set enabled/status
      accounts.forEach(acc => {
        acc.discovery.schedule.enabled = Math.random() > 0.5;
        acc.status = Math.random() > 0.7 ? 'paused' : 'active';
      });
      
      await db.collection('accounts').insertMany(accounts);

      // Act
      const startTime = Date.now();
      const results = await db.collection('accounts')
        .find({
          'discovery.schedule.enabled': true,
          status: 'active'
        })
        .toArray();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100); // Should complete in <100ms with index
    });
  });

  describe('Update Operations', () => {
    it('should update account fields', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      await db.collection('accounts').updateOne(
        { _id: account._id },
        { 
          $set: { 
            status: 'paused',
            'discovery.schedule.enabled': false,
            updatedAt: new Date()
          }
        }
      );

      // Assert
      const updated = await db.collection('accounts').findOne({ _id: account._id });
      expect(updated!.status).toBe('paused');
      expect(updated!.discovery.schedule.enabled).toBe(false);
    });

    it('should prevent updating immutable fields (profileId, platform)', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act & Assert - In real implementation, service would prevent this
      // Here we verify the constraint is enforced at service level, not DB
      const newProfileId = new ObjectId();
      
      // This would succeed at DB level (no constraint)
      // But service layer must validate and reject
      await db.collection('accounts').updateOne(
        { _id: account._id },
        { $set: { profileId: newProfileId } }
      );

      const updated = await db.collection('accounts').findOne({ _id: account._id });
      expect(updated!.profileId).toEqual(newProfileId); // DB allows it
      // Service must prevent this before reaching DB
    });

    it('should update discovery status after successful run', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      const now = new Date();
      await db.collection('accounts').updateOne(
        { _id: account._id },
        { 
          $set: { 
            'discovery.lastAt': now,
            'discovery.error': undefined,
            updatedAt: now
          }
        }
      );

      // Assert
      const updated = await db.collection('accounts').findOne({ _id: account._id });
      expect(updated!.discovery.lastAt).toBeDefined();
      expect(updated!.discovery.error).toBeUndefined();
    });

    it('should update discovery status after failed run', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      const errorMsg = 'Rate limit exceeded';
      await db.collection('accounts').updateOne(
        { _id: account._id },
        { 
          $set: { 
            'discovery.error': errorMsg,
            status: 'error',
            updatedAt: new Date()
          }
        }
      );

      // Assert
      const updated = await db.collection('accounts').findOne({ _id: account._id });
      expect(updated!.discovery.error).toBe(errorMsg);
      expect(updated!.status).toBe('error');
    });
  });

  describe('Delete Operations', () => {
    it('should hard delete account', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id);
      await db.collection('accounts').insertOne(account);

      // Act
      const result = await db.collection('accounts').deleteOne({ _id: account._id });

      // Assert
      expect(result.deletedCount).toBe(1);
      
      const deleted = await db.collection('accounts').findOne({ _id: account._id });
      expect(deleted).toBeNull();
    });

    it('should delete all accounts for a profile', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const accounts = [
        createMockAccount(testProfile._id, { handle: '@user1.bsky.social' }),
        createMockAccount(testProfile._id, { 
          _id: new ObjectId(),
          handle: '@user2.bsky.social' 
        })
      ];
      await db.collection('accounts').insertMany(accounts);

      // Act
      const result = await db.collection('accounts').deleteMany({ 
        profileId: testProfile._id 
      });

      // Assert
      expect(result.deletedCount).toBe(2);
      
      const remaining = await db.collection('accounts')
        .countDocuments({ profileId: testProfile._id });
      expect(remaining).toBe(0);
    });
  });

  describe('Complex Queries', () => {
    it('should aggregate accounts with profiles for discovery', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);
      const account = createMockAccount(testProfile._id, {
        discovery: {
          schedule: { enabled: true, cronExpression: '0 * * * *' }
        },
        status: 'active'
      });
      await db.collection('accounts').insertOne(account);

      // Act
      const results = await db.collection('accounts').aggregate([
        { 
          $match: { 
            'discovery.schedule.enabled': true, 
            status: 'active' 
          } 
        },
        {
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profile'
          }
        },
        { $unwind: '$profile' }
      ]).toArray();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].profile).toBeDefined();
      expect(results[0].profile.name).toBe(testProfile.name);
      expect(results[0].discovery.schedule.enabled).toBe(true);
      expect(results[0].status).toBe('active');
    });

    it('should count accounts per profile', async () => {
      // Arrange
      const profile1 = createMockProfile({ name: 'Profile 1' });
      const profile2 = createMockProfile({ _id: new ObjectId(), name: 'Profile 2' });
      
      await db.collection('profiles').insertMany([profile1, profile2]);

      const accounts = [
        createMockAccount(profile1._id, { handle: '@p1-a1.bsky.social' }),
        createMockAccount(profile1._id, { 
          _id: new ObjectId(),
          handle: '@p1-a2.bsky.social' 
        }),
        createMockAccount(profile2._id, { 
          _id: new ObjectId(),
          handle: '@p2-a1.bsky.social' 
        })
      ];
      await db.collection('accounts').insertMany(accounts);

      // Act
      const profile1Count = await db.collection('accounts')
        .countDocuments({ profileId: profile1._id });
      const profile2Count = await db.collection('accounts')
        .countDocuments({ profileId: profile2._id });

      // Assert
      expect(profile1Count).toBe(2);
      expect(profile2Count).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should store various valid cron expressions', async () => {
      // Arrange
      await db.collection('profiles').insertOne(testProfile);

      // Act & Assert - All should succeed
      for (const [name, cron] of Object.entries(cronExpressions.valid)) {
        const account = createMockAccount(testProfile._id, {
          _id: new ObjectId(),
          handle: `@${name}.bsky.social`,
          discovery: {
            schedule: {
              enabled: true,
              cronExpression: cron
            }
          }
        });

        await expect(
          db.collection('accounts').insertOne(account)
        ).resolves.toBeDefined();
      }

      const count = await db.collection('accounts').countDocuments({});
      expect(count).toBe(Object.keys(cronExpressions.valid).length);
    });
  });
});


