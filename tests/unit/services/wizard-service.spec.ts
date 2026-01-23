/**
 * Wizard Service Unit Tests
 *
 * Tests for WizardService business logic.
 *
 * @see ADR-012: First-Launch Setup Wizard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { WizardService } from '@ngaj/backend/services/wizard-service';
import type { WizardServiceDb } from '@ngaj/backend/services/wizard-service';
import {
  createMockWizardProfileInput,
  createMockWizardAccountInput,
  createMockWizardDiscoveryInput,
  createMockTestConnectionInput,
  invalidWizardProfileInputs,
  mockEnvVariables,
} from '@tests/fixtures/wizard-fixtures';
import { createMockProfile } from '@tests/fixtures/profile-fixtures';
import { createMockAccount } from '@tests/fixtures/account-fixtures';

describe('WizardService', () => {
  let service: WizardService;
  let mockDb: WizardServiceDb;
  let mockProfilesCollection: Record<string, ReturnType<typeof vi.fn>>;
  let mockAccountsCollection: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MongoDB collections
    mockProfilesCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn(),
    };

    mockAccountsCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      updateOne: vi.fn(),
    };

    mockDb = {
      collection: (name: string) => {
        if (name === 'profiles') return mockProfilesCollection;
        if (name === 'accounts') return mockAccountsCollection;
        return mockProfilesCollection;
      },
    };

    service = new WizardService(mockDb);
  });

  describe('hasProfile()', () => {
    it('should return true when profile exists', async () => {
      // Arrange
      mockProfilesCollection.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.hasProfile();

      // Assert
      expect(result).toBe(true);
      expect(mockProfilesCollection.countDocuments).toHaveBeenCalledWith({});
    });

    it('should return false when no profile exists', async () => {
      // Arrange
      mockProfilesCollection.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.hasProfile();

      // Assert
      expect(result).toBe(false);
      expect(mockProfilesCollection.countDocuments).toHaveBeenCalledWith({});
    });
  });

  describe('getExistingWizardData()', () => {
    it('should return profile data when profile exists', async () => {
      // Arrange
      const mockProfile = createMockProfile();
      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);

      // Act
      const result = await service.getExistingWizardData();

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe(mockProfile.name);
    });

    it('should return null when no profile exists', async () => {
      // Arrange
      mockProfilesCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getExistingWizardData();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createProfileFromWizard()', () => {
    it('should create profile with wizard input data', async () => {
      // Arrange
      const input = createMockWizardProfileInput();
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };
      mockProfilesCollection.findOne.mockResolvedValue(null); // Name not taken
      mockProfilesCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createProfileFromWizard(input);

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toEqual(mockInsertResult.insertedId);
      expect(result.name).toBe(input.name);
      expect(result.principles).toBe(input.principles);
      expect(mockProfilesCollection.insertOne).toHaveBeenCalledOnce();
    });

    it('should transform voice to profile format with defaults', async () => {
      // Arrange
      const input = createMockWizardProfileInput({
        voice: 'My custom voice style',
      });
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };
      mockProfilesCollection.findOne.mockResolvedValue(null);
      mockProfilesCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createProfileFromWizard(input);

      // Assert
      expect(result.voice.style).toBe(input.voice);
      expect(result.voice.tone).toBe('professional-friendly'); // Default
      expect(result.voice.examples).toEqual([]); // Default empty
    });

    it('should transform interests to discovery format', async () => {
      // Arrange
      const input = createMockWizardProfileInput({
        interests: ['ai', 'typescript', 'testing'],
      });
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };
      mockProfilesCollection.findOne.mockResolvedValue(null);
      mockProfilesCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createProfileFromWizard(input);

      // Assert
      expect(result.discovery.interests).toEqual(input.interests);
      expect(result.discovery.keywords).toEqual([]); // Default empty
      expect(result.discovery.communities).toEqual([]); // Default empty
    });

    it('should set isActive to true by default', async () => {
      // Arrange
      const input = createMockWizardProfileInput();
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };
      mockProfilesCollection.findOne.mockResolvedValue(null);
      mockProfilesCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createProfileFromWizard(input);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should throw ValidationError when input is invalid', async () => {
      // Arrange
      const input = invalidWizardProfileInputs.nameTooShort;

      // Act & Assert
      await expect(service.createProfileFromWizard(input)).rejects.toThrow(
        'Profile name must be at least 3 characters'
      );
      expect(mockProfilesCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when profile name exists', async () => {
      // Arrange
      const input = createMockWizardProfileInput();
      const existingProfile = createMockProfile({ name: input.name });
      mockProfilesCollection.findOne.mockResolvedValue(existingProfile);

      // Act & Assert
      await expect(service.createProfileFromWizard(input)).rejects.toThrow(
        `Profile with name '${input.name}' already exists`
      );
    });
  });

  describe('testConnection()', () => {
    it('should return success when credentials are valid', async () => {
      // Arrange
      vi.stubEnv('BLUESKY_HANDLE', mockEnvVariables.valid.BLUESKY_HANDLE);
      vi.stubEnv(
        'BLUESKY_APP_PASSWORD',
        mockEnvVariables.valid.BLUESKY_APP_PASSWORD
      );
      const input = createMockTestConnectionInput();

      // Act
      const result = await service.testConnection(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.handle).toBe(`@${mockEnvVariables.valid.BLUESKY_HANDLE}`);
      expect(result.error).toBeUndefined();

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should return failure with error message when connection fails', async () => {
      // Arrange
      vi.stubEnv('BLUESKY_HANDLE', 'invalid.bsky.social');
      vi.stubEnv('BLUESKY_APP_PASSWORD', 'wrong-password');
      const input = createMockTestConnectionInput();

      // Simulate authentication failure
      // In implementation, this would make a real API call

      // Act
      const result = await service.testConnection(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should return failure when credentials are missing', async () => {
      // Arrange
      vi.unstubAllEnvs(); // Ensure no env vars
      const input = createMockTestConnectionInput();

      // Act
      const result = await service.testConnection(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Bluesky credentials not configured in .env.');

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should return handle from environment variables', async () => {
      // Arrange
      vi.stubEnv('BLUESKY_HANDLE', 'myhandle.bsky.social');
      vi.stubEnv('BLUESKY_APP_PASSWORD', 'test-password');
      const input = createMockTestConnectionInput();

      // Act
      const result = await service.testConnection(input);

      // Assert
      expect(result.handle).toBe('@myhandle.bsky.social');

      // Cleanup
      vi.unstubAllEnvs();
    });
  });

  describe('createAccountFromWizard()', () => {
    it('should create account linked to profile', async () => {
      // Arrange
      const profileId = new ObjectId().toString();
      const input = createMockWizardAccountInput(profileId);
      const mockProfile = createMockProfile({ _id: new ObjectId(profileId) });
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };

      vi.stubEnv('BLUESKY_HANDLE', 'test.bsky.social');

      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);
      mockAccountsCollection.findOne.mockResolvedValue(null); // No duplicate
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createAccountFromWizard(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.profileId.toString()).toBe(profileId);
      expect(result.platform).toBe('bluesky');
      expect(mockAccountsCollection.insertOne).toHaveBeenCalledOnce();

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should read handle from environment variables', async () => {
      // Arrange
      const profileId = new ObjectId().toString();
      const input = createMockWizardAccountInput(profileId);
      const mockProfile = createMockProfile({ _id: new ObjectId(profileId) });
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };

      vi.stubEnv('BLUESKY_HANDLE', 'custom.bsky.social');

      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);
      mockAccountsCollection.findOne.mockResolvedValue(null);
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createAccountFromWizard(input);

      // Assert
      expect(result.handle).toBe('@custom.bsky.social');

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should initialize discovery with empty schedules', async () => {
      // Arrange
      const profileId = new ObjectId().toString();
      const input = createMockWizardAccountInput(profileId);
      const mockProfile = createMockProfile({ _id: new ObjectId(profileId) });
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true,
      };

      vi.stubEnv('BLUESKY_HANDLE', 'test.bsky.social');

      mockProfilesCollection.findOne.mockResolvedValue(mockProfile);
      mockAccountsCollection.findOne.mockResolvedValue(null);
      mockAccountsCollection.insertOne.mockResolvedValue(mockInsertResult);

      // Act
      const result = await service.createAccountFromWizard(input);

      // Assert
      expect(result.discovery.schedules).toEqual([]);
      expect(result.status).toBe('active');

      // Cleanup
      vi.unstubAllEnvs();
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      const profileId = new ObjectId().toString();
      const input = createMockWizardAccountInput(profileId);
      mockProfilesCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createAccountFromWizard(input)).rejects.toThrow(
        'Profile not found'
      );
    });
  });

  describe('setDiscoverySchedule()', () => {
    it('should update account with preset schedule', async () => {
      // Arrange
      const accountId = new ObjectId();
      const input = createMockWizardDiscoveryInput({ schedulePreset: '1hr' });
      const mockAccount = createMockAccount(new ObjectId(), { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(mockAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      // Act
      const result = await service.setDiscoverySchedule(
        accountId.toString(),
        input
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockAccountsCollection.updateOne).toHaveBeenCalled();
    });

    it('should set both replies and search schedules to same cron', async () => {
      // Arrange
      const accountId = new ObjectId();
      const input = createMockWizardDiscoveryInput({ schedulePreset: '2hr' });
      const mockAccount = createMockAccount(new ObjectId(), { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(mockAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      // Act
      await service.setDiscoverySchedule(accountId.toString(), input);

      // Assert
      expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        expect.objectContaining({
          $set: expect.objectContaining({
            'discovery.schedules': expect.arrayContaining([
              expect.objectContaining({
                type: 'replies',
                cronExpression: '0 */2 * * *',
              }),
              expect.objectContaining({
                type: 'search',
                cronExpression: '0 */2 * * *',
              }),
            ]),
          }),
        })
      );
    });

    it('should enable both schedules', async () => {
      // Arrange
      const accountId = new ObjectId();
      const input = createMockWizardDiscoveryInput({ schedulePreset: '30min' });
      const mockAccount = createMockAccount(new ObjectId(), { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(mockAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      // Act
      await service.setDiscoverySchedule(accountId.toString(), input);

      // Assert
      expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        expect.objectContaining({
          $set: expect.objectContaining({
            'discovery.schedules': expect.arrayContaining([
              expect.objectContaining({ type: 'replies', enabled: true }),
              expect.objectContaining({ type: 'search', enabled: true }),
            ]),
          }),
        })
      );
    });

    it('should throw NotFoundError when account does not exist', async () => {
      // Arrange
      const accountId = new ObjectId();
      const input = createMockWizardDiscoveryInput();
      mockAccountsCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.setDiscoverySchedule(accountId.toString(), input)
      ).rejects.toThrow('Account not found');
    });

    it('should handle all preset options', async () => {
      // Arrange
      const accountId = new ObjectId();
      const mockAccount = createMockAccount(new ObjectId(), { _id: accountId });

      mockAccountsCollection.findOne.mockResolvedValue(mockAccount);
      mockAccountsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const presetCronMap: Record<string, string> = {
        '15min': '*/15 * * * *',
        '30min': '*/30 * * * *',
        '1hr': '0 * * * *',
        '2hr': '0 */2 * * *',
        '4hr': '0 */4 * * *',
      };

      // Act & Assert - test each preset
      for (const [preset, expectedCron] of Object.entries(presetCronMap)) {
        vi.clearAllMocks();
        mockAccountsCollection.findOne.mockResolvedValue(mockAccount);
        mockAccountsCollection.updateOne.mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        const input = createMockWizardDiscoveryInput({
          schedulePreset: preset as any,
        });
        await service.setDiscoverySchedule(accountId.toString(), input);

        expect(mockAccountsCollection.updateOne).toHaveBeenCalledWith(
          { _id: accountId },
          expect.objectContaining({
            $set: expect.objectContaining({
              'discovery.schedules': expect.arrayContaining([
                expect.objectContaining({ cronExpression: expectedCron }),
              ]),
            }),
          })
        );
      }
    });
  });
});
