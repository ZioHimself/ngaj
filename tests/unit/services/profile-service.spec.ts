import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { ProfileService } from '@ngaj/backend/services/profile-service';
import { 
  createMockProfile, 
  createMockProfileInput, 
  invalidProfiles 
} from '../../fixtures/profile-fixtures';
import type { CreateProfileInput, UpdateProfileInput } from '@ngaj/shared';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockDb: { collection: ReturnType<typeof vi.fn> };
  let mockCollection: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    // Mock MongoDB collection
    mockCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      countDocuments: vi.fn()
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };

    service = new ProfileService(mockDb);
  });

  describe('create()', () => {
    it('should create profile with valid data', async () => {
      // Arrange
      const input = createMockProfileInput();
      const mockInsertResult = {
        insertedId: new ObjectId(),
        acknowledged: true
      };
      mockCollection.insertOne.mockResolvedValue(mockInsertResult);
      mockCollection.findOne.mockResolvedValue(null); // Name not taken

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toEqual(mockInsertResult.insertedId);
      expect(result.name).toBe(input.name);
      expect(result.voice).toEqual(input.voice);
      expect(result.discovery).toEqual(input.discovery);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockCollection.insertOne).toHaveBeenCalledOnce();
    });

    it('should throw ValidationError when name is missing', async () => {
      // Arrange
      const input = invalidProfiles.missingName as CreateProfileInput;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('Name is required');
    });

    it('should throw ValidationError when name is too short', async () => {
      // Arrange
      const input = invalidProfiles.shortName;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('Name must be at least 3 characters');
    });

    it('should throw ValidationError when name is too long', async () => {
      // Arrange
      const input = invalidProfiles.longName;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('Name must not exceed 100 characters');
    });

    it('should throw ConflictError when name already exists', async () => {
      // Arrange
      const input = createMockProfileInput();
      const existingProfile = createMockProfile({ name: input.name });
      mockCollection.findOne.mockResolvedValue(existingProfile);

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        `Profile with name '${input.name}' already exists`
      );
    });

    it('should throw ValidationError when voice.tone is missing', async () => {
      // Arrange
      const input = invalidProfiles.missingTone as CreateProfileInput;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow('voice.tone is required');
    });

    it('should throw ValidationError when voice.examples has less than 3 items', async () => {
      // Arrange
      const input = invalidProfiles.tooFewExamples;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'voice.examples must contain between 3 and 5 items'
      );
    });

    it('should throw ValidationError when voice.examples has more than 5 items', async () => {
      // Arrange
      const input = invalidProfiles.tooManyExamples;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'voice.examples must contain between 3 and 5 items'
      );
    });

    it('should throw ValidationError when voice.tone is too long', async () => {
      // Arrange
      const input = invalidProfiles.longTone;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'voice.tone must not exceed 50 characters'
      );
    });

    it('should throw ValidationError when voice.style is too long', async () => {
      // Arrange
      const input = invalidProfiles.longStyle;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'voice.style must not exceed 500 characters'
      );
    });

    it('should throw ValidationError when example is too long', async () => {
      // Arrange
      const input = invalidProfiles.longExample;

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'Each voice.example must not exceed 500 characters'
      );
    });
  });

  describe('findById()', () => {
    it('should return profile when found', async () => {
      // Arrange
      const mockProfile = createMockProfile();
      mockCollection.findOne.mockResolvedValue(mockProfile);

      // Act
      const result = await service.findById(mockProfile._id);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: mockProfile._id });
    });

    it('should return null when profile not found', async () => {
      // Arrange
      const id = new ObjectId();
      mockCollection.findOne.mockResolvedValue(null);

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
    it('should return all profiles when no filter provided', async () => {
      // Arrange
      const mockProfiles = [
        createMockProfile({ name: 'Profile 1' }),
        createMockProfile({ name: 'Profile 2' })
      ];
      mockCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockProfiles)
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockProfiles);
      expect(mockCollection.find).toHaveBeenCalledWith({});
    });

    it('should return only active profiles when active=true filter', async () => {
      // Arrange
      const activeProfiles = [
        createMockProfile({ name: 'Active 1', isActive: true }),
        createMockProfile({ name: 'Active 2', isActive: true })
      ];
      mockCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(activeProfiles)
      });

      // Act
      const result = await service.findAll({ active: true });

      // Assert
      expect(result).toEqual(activeProfiles);
      expect(mockCollection.find).toHaveBeenCalledWith({ isActive: true });
      expect(result.every(p => p.isActive === true)).toBe(true);
    });

    it('should return empty array when no profiles exist', async () => {
      // Arrange
      mockCollection.find.mockReturnValue({
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
    it('should update profile with valid partial data', async () => {
      // Arrange
      const existingProfile = createMockProfile();
      const updateData: UpdateProfileInput = {
        voice: {
          tone: 'technical-concise',
          style: 'Direct and to the point',
          examples: ['Updated 1', 'Updated 2', 'Updated 3']
        }
      };
      
      mockCollection.findOne.mockResolvedValue(existingProfile);
      mockCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      const updatedProfile = {
        ...existingProfile,
        ...updateData,
        updatedAt: new Date()
      };
      mockCollection.findOne.mockResolvedValueOnce(existingProfile) // First call for validation
                            .mockResolvedValueOnce(updatedProfile);  // Second call to return updated

      // Act
      const result = await service.update(existingProfile._id, updateData);

      // Assert
      expect(result).toBeDefined();
      expect(result.voice.tone).toBe(updateData.voice!.tone);
      expect(result.updatedAt.getTime()).toBeGreaterThan(existingProfile.updatedAt.getTime());
      expect(mockCollection.updateOne).toHaveBeenCalledOnce();
    });

    it('should update updatedAt timestamp', async () => {
      // Arrange
      const existingProfile = createMockProfile();
      const updateData: UpdateProfileInput = { isActive: false };
      
      mockCollection.findOne.mockResolvedValue(existingProfile);
      mockCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      // Act
      await service.update(existingProfile._id, updateData);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: existingProfile._id },
        { 
          $set: expect.objectContaining({
            ...updateData,
            updatedAt: expect.any(Date)
          })
        }
      );
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      const id = new ObjectId();
      const updateData: UpdateProfileInput = { isActive: false };
      mockCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, updateData)).rejects.toThrow('Profile not found');
    });

    it('should throw ValidationError when invalid data provided', async () => {
      // Arrange
      const existingProfile = createMockProfile();
      const invalidUpdate = { 
        name: 'AB' // Too short
      };
      mockCollection.findOne.mockResolvedValue(existingProfile);

      // Act & Assert
      await expect(service.update(existingProfile._id, invalidUpdate)).rejects.toThrow(
        'Name must be at least 3 characters'
      );
    });

    it('should throw ConflictError when updating to duplicate name', async () => {
      // Arrange
      const existingProfile = createMockProfile();
      const otherProfile = createMockProfile({ 
        _id: new ObjectId(), 
        name: 'Other Profile' 
      });
      const updateData: UpdateProfileInput = { 
        name: 'Other Profile' 
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(existingProfile) // First call for target profile
        .mockResolvedValueOnce(otherProfile);    // Second call for name conflict check

      // Act & Assert
      await expect(service.update(existingProfile._id, updateData)).rejects.toThrow(
        "Profile with name 'Other Profile' already exists"
      );
    });
  });

  describe('softDelete()', () => {
    it('should set isActive=false when no accounts linked', async () => {
      // Arrange
      const profile = createMockProfile();
      mockCollection.findOne.mockResolvedValue(profile);
      mockCollection.countDocuments.mockResolvedValue(0); // No linked accounts
      mockCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      // Act
      await service.softDelete(profile._id);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: profile._id },
        { 
          $set: { 
            isActive: false,
            updatedAt: expect.any(Date)
          } 
        }
      );
    });

    it('should throw ConflictError when active accounts exist', async () => {
      // Arrange
      const profile = createMockProfile();
      mockCollection.findOne.mockResolvedValue(profile);
      
      // Mock accounts collection to return count > 0
      const mockAccountsCollection = {
        countDocuments: vi.fn().mockResolvedValue(2) // 2 linked accounts
      };
      mockDb.collection.mockImplementation((name: string) => {
        if (name === 'accounts') return mockAccountsCollection;
        return mockCollection;
      });

      // Act & Assert
      await expect(service.softDelete(profile._id)).rejects.toThrow(
        'Cannot delete profile with active accounts'
      );
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      // Arrange
      const id = new ObjectId();
      mockCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.softDelete(id)).rejects.toThrow('Profile not found');
    });

    it('should update updatedAt timestamp on soft delete', async () => {
      // Arrange
      const profile = createMockProfile();
      mockCollection.findOne.mockResolvedValue(profile);
      mockCollection.countDocuments.mockResolvedValue(0);
      mockCollection.updateOne.mockResolvedValue({ 
        matchedCount: 1, 
        modifiedCount: 1 
      });

      // Act
      await service.softDelete(profile._id);

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: profile._id },
        { 
          $set: { 
            isActive: false,
            updatedAt: expect.any(Date)
          } 
        }
      );
    });
  });

  describe('Business Logic', () => {
    describe('validateProfileName()', () => {
      it('should return true for available name', async () => {
        // Arrange
        const name = 'Available Name';
        mockCollection.findOne.mockResolvedValue(null);

        // Act
        const result = await service.validateProfileName(name);

        // Assert
        expect(result).toBe(true);
        expect(mockCollection.findOne).toHaveBeenCalledWith({ name });
      });

      it('should return false for existing name', async () => {
        // Arrange
        const name = 'Existing Name';
        const existingProfile = createMockProfile({ name });
        mockCollection.findOne.mockResolvedValue(existingProfile);

        // Act
        const result = await service.validateProfileName(name);

        // Assert
        expect(result).toBe(false);
      });

      it('should be case-sensitive for name comparison', async () => {
        // Arrange
        const existingProfile = createMockProfile({ name: 'Test Profile' });
        mockCollection.findOne
          .mockResolvedValueOnce(null)               // 'test profile' (different case)
          .mockResolvedValueOnce(existingProfile);   // 'Test Profile' (exact match)

        // Act
        const result1 = await service.validateProfileName('test profile');
        const result2 = await service.validateProfileName('Test Profile');

        // Assert
        expect(result1).toBe(true);  // Different case, available
        expect(result2).toBe(false); // Exact match, not available
      });
    });

    describe('canDelete()', () => {
      it('should return canDelete=true when no accounts linked', async () => {
        // Arrange
        const profileId = new ObjectId();
        const profile = createMockProfile({ _id: profileId });
        const mockAccountsCollection = {
          countDocuments: vi.fn().mockResolvedValue(0)
        };
        
        mockCollection.findOne.mockResolvedValue(profile);
        mockDb.collection.mockImplementation((name: string) => {
          if (name === 'accounts') return mockAccountsCollection;
          return mockCollection;
        });

        // Act
        const result = await service.canDelete(profileId);

        // Assert
        expect(result.canDelete).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should return canDelete=false when accounts linked', async () => {
        // Arrange
        const profileId = new ObjectId();
        const profile = createMockProfile({ _id: profileId });
        const mockAccountsCollection = {
          countDocuments: vi.fn().mockResolvedValue(3)
        };
        
        mockCollection.findOne.mockResolvedValue(profile);
        mockDb.collection.mockImplementation((name: string) => {
          if (name === 'accounts') return mockAccountsCollection;
          return mockCollection;
        });

        // Act
        const result = await service.canDelete(profileId);

        // Assert
        expect(result.canDelete).toBe(false);
        expect(result.reason).toBe('Profile has 3 linked account(s)');
      });

      it('should check for non-existent profile', async () => {
        // Arrange
        const profileId = new ObjectId();
        mockCollection.findOne.mockResolvedValue(null);

        // Act
        const result = await service.canDelete(profileId);

        // Assert
        expect(result.canDelete).toBe(false);
        expect(result.reason).toBe('Profile not found');
      });
    });
  });
});


