import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AccountService } from '@/services/account-service';
import { 
  createMockAccount, 
  createMockAccountInput,
  createAccountFixtures,
  createInvalidAccounts,
  cronExpressions
} from '../../fixtures/account-fixtures';
import { createMockProfile } from '../../fixtures/profile-fixtures';
import type { CreateAccountInput, UpdateAccountInput, Platform } from '@/shared/types/account';

describe('AccountService', () => {
  let service: AccountService;
  let mockDb: { collection: ReturnType<typeof vi.fn> };
  let mockAccountsCollection: Record<string, ReturnType<typeof vi.fn>>;
  let mockProfilesCollection: Record<string, ReturnType<typeof vi.fn>>;
  let testProfileId: ObjectId;

  beforeEach(() => {
    testProfileId = new ObjectId();

    // Mock MongoDB collections
    mockAccountsCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      aggregate: vi.fn()
    };

    mockProfilesCollection = {
      findOne: vi.fn()
    };

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'accounts') return mockAccountsCollection;
        if (name === 'profiles') return mockProfilesCollection;
        return mockAccountsCollection;
      })
    };

    service = new AccountService(mockDb);
  });

  describe('create()', () => {
    it('should create account with valid data', async () => {
      // Arrange
      const input = createMockAccountInput(testProfileId);
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true
      };
      
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null); // No duplicate
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toEqual(mockInsertResult.insertedId);
      expect(result.profileId).toEqual(input.profileId);
      expect(result.platform).toBe(input.platform);
      expect(result.handle).toBe(input.handle);
      expect(result.status).toBe(input.status);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockAccountsCollection.insertOne).toHaveBeenCalledOnce();
    });

    it('should throw NotFoundError when profileId does not exist', async () => {
      // Arrange
      const input = createMockAccountInput(testProfileId);
      mockProfilesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('Profile not found');
    });

    it('should throw ValidationError when profileId is missing', async () => {
      // Arrange
      const invalidAccounts = createInvalidAccounts(testProfileId);
      const input = invalidAccounts.missingProfileId as CreateAccountInput;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('profileId is required');
    });

    it('should throw ValidationError when platform is missing', async () => {
      // Arrange
      const input = {
        profileId: testProfileId,
        handle: '@test.bsky.social',
        discovery: {
          schedule: {
            enabled: true,
            cronExpression: '0 */2 * * *'
          }
        },
        status: 'active'
      } as CreateAccountInput;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('platform is required');
    });

    it('should throw ValidationError when invalid platform enum', async () => {
      // Arrange
      const invalidAccounts = createInvalidAccounts(testProfileId);
      const input = invalidAccounts.invalidPlatform;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'platform must be one of: bluesky, linkedin, reddit'
      );
    });

    it('should throw ValidationError when handle is missing', async () => {
      // Arrange
      const invalidAccounts = createInvalidAccounts(testProfileId);
      const input = invalidAccounts.missingHandle as CreateAccountInput;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('handle is required');
    });

    it('should throw ConflictError when (platform, handle) duplicate exists', async () => {
      // Arrange
      const input = createMockAccountInput(testProfileId);
      const existingAccount = createMockAccount(testProfileId, {
        platform: input.platform,
        handle: input.handle
      });

      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(existingAccount);

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        `Account already exists for platform '${input.platform}' and handle '${input.handle}'`
      );
    });

    it('should throw ValidationError when invalid cron expression', async () => {
      // Arrange
      const invalidAccounts = createInvalidAccounts(testProfileId);
      const input = invalidAccounts.invalidCron;
      
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('Invalid cron expression');
    });

    it('should initialize discovery.lastAt as undefined', async () => {
      // Arrange
      const input = createMockAccountInput(testProfileId);
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true
      };
      
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null);
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result.discovery.lastAt).toBeUndefined();
    });

    it('should initialize discovery.error as undefined', async () => {
      // Arrange
      const input = createMockAccountInput(testProfileId);
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true
      };
      
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null);
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result.discovery.error).toBeUndefined();
    });

    it('should validate cron expression with various valid formats', async () => {
      // Arrange
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null);
      mockAccountsCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId(),
        acknowledged: true
      });

      // Act & Assert - All should succeed
      for (const [, cron] of Object.entries(cronExpressions.valid)) {
        const input = createMockAccountInput(testProfileId, {
          discovery: {
            schedule: {
              enabled: true,
              cronExpression: cron
            }
          }
        });

        await expect(service.create(input)).resolves.toBeDefined();
      }
    });

    it('should reject invalid cron expressions', async () => {
      // Arrange
      mockProfilesCollection.findOne.mockResolvedValue(createMockProfile());
      mockAccountsCollection.findOne.mockResolvedValue(null);

      // Act & Assert - All should fail
      for (const [name, cron] of Object.entries(cronExpressions.invalid)) {
        const input = createMockAccountInput(testProfileId, {
          discovery: {
            schedule: {
              enabled: true,
              cronExpression: cron
            }
          }
        });

        await expect(service.create(input), `Failed for ${name}: "${cron}"`).rejects.toThrow('Invalid cron expression');
      }
    });
  });

  describe('findById()', () => {
    it('should return account when found', async () => {
      // Arrange
      const mockAccount = createMockAccount(testProfileId);
      mockAccountsCollection.findOne.mockResolvedValue(mockAccount);

      // Act
      const result = await service.findById(mockAccount._id);

      // Assert
      expect(result).toEqual(mockAccount);
      expect(mockAccountsCollection.findOne).toHaveBeenCalledWith({ _id: mockAccount._id });
    });

    it('should return account with populated profile when populate=true', async () => {
      // Arrange
      const mockProfile = createMockProfile();
      const mockAccount = createMockAccount(testProfileId);
      
      mockAccountsCollection.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{
          ...mockAccount,
          profile: mockProfile
        }])
      });

      // Act
      const result = await service.findById(mockAccount._id, true);

      // Assert
      expect(result).toBeDefined();
      expect(result.profile).toEqual(mockProfile);
      expect(mockAccountsCollection.aggregate).toHaveBeenCalled();
    });

    it('should return null when account not found', async () => {
      // Arrange
      const id = new ObjectId();
      mockAccountsCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when invalid ObjectId format', async () => {
      // Arrange
      const invalidId = 'not-an-objectid';

      // Act & Assert
      await expect(service.findById(invalidId as unknown as ObjectId)).rejects.toThrow('Invalid ObjectId');
    });
  });

  describe('findAll()', () => {
    it('should return all accounts when no filter provided', async () => {
      // Arrange
      const mockAccounts = [
        createMockAccount(testProfileId, { handle: '@user1.bsky.social' }),
        createMockAccount(testProfileId, { handle: '@user2.bsky.social' })
      ];
      mockAccountsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAccounts)
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockAccounts);
      expect(mockAccountsCollection.find).toHaveBeenCalledWith({});
    });

    it('should filter by profileId when provided', async () => {
      // Arrange
      const profile1Id = new ObjectId();
      const profile1Accounts = [
        createMockAccount(profile1Id, { handle: '@user1.bsky.social' })
      ];
      
      mockAccountsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(profile1Accounts)
      });

      // Act
      const result = await service.findAll({ profileId: profile1Id });

      // Assert
      expect(result).toEqual(profile1Accounts);
      expect(mockAccountsCollection.find).toHaveBeenCalledWith({ profileId: profile1Id });
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const activeAccounts = [
        createMockAccount(testProfileId, { status: 'active' })
      ];
      
      mockAccountsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(activeAccounts)
      });

      // Act
      const result = await service.findAll({ status: 'active' });

      // Assert
      expect(result).toEqual(activeAccounts);
      expect(mockAccountsCollection.find).toHaveBeenCalledWith({ status: 'active' });
      expect(result.every(a => a.status === 'active')).toBe(true);
    });

    it('should return empty array when no accounts exist', async () => {
      // Arrange
      mockAccountsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('update()', () => {
    it('should update account with valid partial data', async () => {
      // Arrange
      const existingAccount = createMockAccount(testProfileId);
      const updateData: UpdateAccountInput = {
        status: 'paused',
        discovery: {
          schedule: {
            enabled: false,
            cronExpression: '0 */2 * * *'
          }
        }
      };
      
      mockAccountsCollection.findOne.mockResolvedValue(existingAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      const updatedAccount = {
        ...existingAccount,
        ...updateData,
        updatedAt: new Date()
      };
      mockAccountsCollection.findOne
        .mockResolvedValueOnce(existingAccount)
        .mockResolvedValueOnce(updatedAccount);

      // Act
      const result = await service.update(existingAccount._id, updateData);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('paused');
      expect(result.discovery.schedule.enabled).toBe(false);
      expect(mockAccountsCollection.updateOne).toHaveBeenCalledOnce();
    });

    it('should throw ValidationError when attempting to update profileId', async () => {
      // Arrange
      const existingAccount = createMockAccount(testProfileId);
      const updateData: UpdateAccountInput = {
        profileId: new ObjectId() // Attempting to change profileId
      };

      // Act & Assert
      await expect(service.update(existingAccount._id, updateData)).rejects.toThrow(
        'profileId cannot be updated'
      );
    });

    it('should throw ValidationError when attempting to update platform', async () => {
      // Arrange
      const existingAccount = createMockAccount(testProfileId);
      const updateData: UpdateAccountInput = {
        platform: 'linkedin' as Platform // Attempting to change platform
      };

      // Act & Assert
      await expect(service.update(existingAccount._id, updateData)).rejects.toThrow(
        'platform cannot be updated'
      );
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      const id = new ObjectId();
      const updateData: UpdateAccountInput = { status: 'paused' };
      mockAccountsCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, updateData)).rejects.toThrow('Account not found');
    });

    it('should update updatedAt timestamp', async () => {
      // Arrange
      const existingAccount = createMockAccount(testProfileId);
      const updateData: UpdateAccountInput = { status: 'paused' };
      
      mockAccountsCollection.findOne.mockResolvedValue(existingAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      // Act
      await service.update(existingAccount._id, updateData);

      // Assert
      expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: existingAccount._id },
        { 
          $set: expect.objectContaining({
            ...updateData,
            updatedAt: expect.any(Date)
          })
        }
      );
    });

    it('should validate cron expression when updating schedule', async () => {
      // Arrange
      const existingAccount = createMockAccount(testProfileId);
      const updateData: UpdateAccountInput = {
        discovery: {
          schedule: {
            enabled: true,
            cronExpression: '0 60 * * *' // Out of range: minute must be 0-59
          }
        }
      };
      
      mockAccountsCollection.findOne.mockResolvedValue(existingAccount);

      // Act & Assert
      await expect(service.update(existingAccount._id, updateData)).rejects.toThrow(
        'Invalid cron expression'
      );
    });
  });

  describe('delete()', () => {
    it('should delete account successfully (hard delete)', async () => {
      // Arrange
      const account = createMockAccount(testProfileId);
      mockAccountsCollection.deleteOne.mockResolvedValue({ 
        deletedCount: 1 
      });

      // Act
      await service.delete(account._id);

      // Assert
      expect(mockAccountsCollection.deleteOne).toHaveBeenCalledWith({ 
        _id: account._id 
      });
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      const id = new ObjectId();
      mockAccountsCollection.deleteOne.mockResolvedValue({ 
        deletedCount: 0 
      });

      // Act & Assert
      await expect(service.delete(id)).rejects.toThrow('Account not found');
    });
  });

  describe('Business Logic', () => {
    describe('findAccountsForDiscovery()', () => {
      it('should return only enabled and active accounts', async () => {
        // Arrange
        const fixtures = createAccountFixtures(testProfileId);
        const enabledActiveAccounts = [
          fixtures.blueskyActive,
          fixtures.recentDiscovery
        ];

        mockAccountsCollection.aggregate.mockReturnValue({
          toArray: vi.fn().mockResolvedValue(enabledActiveAccounts)
        });

        // Act
        const result = await service.findAccountsForDiscovery();

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(a => 
          a.discovery.schedule.enabled === true && 
          a.status === 'active'
        )).toBe(true);
        
        // Verify aggregate query includes correct filters
        expect(mockAccountsCollection.aggregate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              $match: expect.objectContaining({
                'discovery.schedule.enabled': true,
                status: 'active'
              })
            })
          ])
        );
      });

      it('should exclude paused accounts', async () => {
        // Arrange
        mockAccountsCollection.aggregate.mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        });

        // Act
        await service.findAccountsForDiscovery();

        // Assert
        expect(mockAccountsCollection.aggregate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              $match: expect.objectContaining({
                status: 'active'
              })
            })
          ])
        );
      });

      it('should include profile data with $lookup', async () => {
        // Arrange
        const fixtures = createAccountFixtures(testProfileId);
        const mockProfile = createMockProfile();
        const accountWithProfile = {
          ...fixtures.blueskyActive,
          profile: mockProfile
        };

        mockAccountsCollection.aggregate.mockReturnValue({
          toArray: vi.fn().mockResolvedValue([accountWithProfile])
        });

        // Act
        const result = await service.findAccountsForDiscovery();

        // Assert
        expect(result[0].profile).toBeDefined();
        expect(result[0].profile).toEqual(mockProfile);
        
        // Verify aggregate includes $lookup stage
        expect(mockAccountsCollection.aggregate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              $lookup: expect.objectContaining({
                from: 'profiles',
                localField: 'profileId',
                foreignField: '_id',
                as: 'profile'
              })
            })
          ])
        );
      });

      it('should return empty array when no accounts match criteria', async () => {
        // Arrange
        mockAccountsCollection.aggregate.mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        });

        // Act
        const result = await service.findAccountsForDiscovery();

        // Assert
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('updateDiscoveryStatus()', () => {
      it('should update lastAt and clear error on success', async () => {
        // Arrange
        const accountId = new ObjectId();
        mockAccountsCollection.updateOne.mockResolvedValue({ 
          matchedCount: 1, 
          modifiedCount: 1 
        });

        // Act
        await service.updateDiscoveryStatus(accountId, true);

        // Assert
        expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
          { _id: accountId },
          { 
            $set: {
              'discovery.lastAt': expect.any(Date),
              'discovery.error': undefined,
              updatedAt: expect.any(Date)
            }
          }
        );
      });

      it('should set error and status=error on failure', async () => {
        // Arrange
        const accountId = new ObjectId();
        const errorMessage = 'Rate limit exceeded';
        mockAccountsCollection.updateOne.mockResolvedValue({ 
          matchedCount: 1, 
          modifiedCount: 1 
        });

        // Act
        await service.updateDiscoveryStatus(accountId, false, errorMessage);

        // Assert
        expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
          { _id: accountId },
          { 
            $set: {
              'discovery.error': errorMessage,
              status: 'error',
              updatedAt: expect.any(Date)
            }
          }
        );
      });

      it('should update timestamp on status update', async () => {
        // Arrange
        const accountId = new ObjectId();
        mockAccountsCollection.updateOne.mockResolvedValue({ 
          matchedCount: 1, 
          modifiedCount: 1 
        });

        // Act
        await service.updateDiscoveryStatus(accountId, true);

        // Assert
        expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
          { _id: accountId },
          expect.objectContaining({
            $set: expect.objectContaining({
              updatedAt: expect.any(Date)
            })
          })
        );
      });
    });

    describe('validateCredentials()', () => {
      it('should return true when Bluesky credentials present', async () => {
        // Arrange
        vi.stubEnv('BLUESKY_HANDLE', 'test.bsky.social');
        vi.stubEnv('BLUESKY_APP_PASSWORD', 'test-password');

        // Act
        const result = await service.validateCredentials('bluesky', '@test.bsky.social');

        // Assert
        expect(result).toBe(true);
        
        // Cleanup
        vi.unstubAllEnvs();
      });

      it('should return false when Bluesky credentials missing', async () => {
        // Arrange
        vi.unstubAllEnvs(); // Ensure no env vars set

        // Act
        const result = await service.validateCredentials('bluesky', '@test.bsky.social');

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for LinkedIn credentials (v0.2)', async () => {
        // Act
        const result = await service.validateCredentials('linkedin', 'user@example.com');

        // Assert
        expect(result).toBe(false); // Not implemented in v0.1
      });

      it('should return false for Reddit credentials (v0.2)', async () => {
        // Act
        const result = await service.validateCredentials('reddit', 'u/testuser');

        // Assert
        expect(result).toBe(false); // Not implemented in v0.1
      });
    });
  });
});


