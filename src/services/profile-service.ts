import { Db, ObjectId } from 'mongodb';
import type { Profile, CreateProfileInput, UpdateProfileInput } from '@/shared/types/profile';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors/service-errors';

/**
 * Service for managing Profile entities
 * 
 * @see Design: .agents/artifacts/designer/designs/account-configuration-design.md
 * @see ADR-006: Profile and Account Separation
 */
export class ProfileService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Create a new profile
   * 
   * @throws ValidationError - When input data is invalid
   * @throws ConflictError - When profile name already exists
   */
  async create(data: CreateProfileInput): Promise<Profile> {
    // Validate input
    this.validateProfileData(data);

    // Check for duplicate name
    const existingProfile = await this.db.collection<Profile>('profiles').findOne({ name: data.name });
    if (existingProfile) {
      throw new ConflictError(`Profile with name '${data.name}' already exists`);
    }

    // Create profile document
    const now = new Date();
    const profile: Profile = {
      _id: new ObjectId(),
      name: data.name,
      voice: data.voice,
      discovery: data.discovery,
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now
    };

    // Insert into database
    const result = await this.db.collection<Profile>('profiles').insertOne(profile as any);
    
    return {
      ...profile,
      _id: result.insertedId
    };
  }

  /**
   * Find profile by ID
   * 
   * @returns Profile if found, null otherwise
   * @throws Error - When ObjectId format is invalid
   */
  async findById(id: ObjectId): Promise<Profile | null> {
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId');
    }

    const profile = await this.db.collection<Profile>('profiles').findOne({ _id: id } as any);
    return profile;
  }

  /**
   * Find all profiles with optional filters
   * 
   * @param filters - Optional filters (e.g., { active: true })
   * @returns Array of profiles (empty array if none found)
   */
  async findAll(filters?: { active?: boolean }): Promise<Profile[]> {
    const query: any = {};
    
    if (filters?.active !== undefined) {
      query.isActive = filters.active;
    }

    const profiles = await this.db.collection<Profile>('profiles').find(query).toArray();
    return profiles;
  }

  /**
   * Update an existing profile
   * 
   * @throws NotFoundError - When profile not found
   * @throws ValidationError - When update data is invalid
   * @throws ConflictError - When updating to duplicate name
   */
  async update(id: ObjectId, data: UpdateProfileInput): Promise<Profile> {
    // Check if profile exists
    const existingProfile = await this.findById(id);
    if (!existingProfile) {
      throw new NotFoundError('Profile not found');
    }

    // Validate update data
    if (data.name !== undefined) {
      this.validateName(data.name);
      
      // Check for duplicate name (excluding current profile)
      const duplicateProfile = await this.db.collection<Profile>('profiles').findOne({ name: data.name } as any);
      if (duplicateProfile && !duplicateProfile._id.equals(id)) {
        throw new ConflictError(`Profile with name '${data.name}' already exists`);
      }
    }

    if (data.voice !== undefined) {
      this.validateVoice(data.voice);
    }

    // Update profile
    const updateDoc = {
      ...data,
      updatedAt: new Date()
    };

    await this.db.collection<Profile>('profiles').updateOne(
      { _id: id } as any,
      { $set: updateDoc }
    );

    // Return updated profile
    const updatedProfile = await this.findById(id);
    return updatedProfile!;
  }

  /**
   * Soft delete a profile (sets isActive = false)
   * 
   * @throws NotFoundError - When profile not found
   * @throws ConflictError - When profile has active accounts
   */
  async softDelete(id: ObjectId): Promise<void> {
    // Check if profile exists
    const existingProfile = await this.findById(id);
    if (!existingProfile) {
      throw new NotFoundError('Profile not found');
    }

    // Check for linked accounts
    const accountCount = await this.db.collection('accounts').countDocuments({ profileId: id } as any);
    if (accountCount > 0) {
      throw new ConflictError('Cannot delete profile with active accounts');
    }

    // Soft delete
    await this.db.collection<Profile>('profiles').updateOne(
      { _id: id } as any,
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        } 
      }
    );
  }

  /**
   * Check if a profile name is available
   * 
   * @returns true if name is available, false if taken
   */
  async validateProfileName(name: string): Promise<boolean> {
    const existingProfile = await this.db.collection<Profile>('profiles').findOne({ name } as any);
    return existingProfile === null;
  }

  /**
   * Check if a profile can be deleted
   * 
   * @returns Object with canDelete flag and optional reason
   */
  async canDelete(id: ObjectId): Promise<{ canDelete: boolean; reason?: string }> {
    // Check if profile exists (query directly to avoid findById's ObjectId validation)
    const profile = await this.db.collection<Profile>('profiles').findOne({ _id: id } as any);
    if (!profile) {
      return {
        canDelete: false,
        reason: 'Profile not found'
      };
    }

    // Check for linked accounts
    const accountCount = await this.db.collection('accounts').countDocuments({ profileId: id } as any);
    if (accountCount > 0) {
      return {
        canDelete: false,
        reason: `Profile has ${accountCount} linked account(s)`
      };
    }

    return { canDelete: true };
  }

  /**
   * Validate complete profile data
   * @private
   */
  private validateProfileData(data: CreateProfileInput): void {
    // Validate name
    this.validateName(data.name);

    // Validate voice
    this.validateVoice(data.voice);
  }

  /**
   * Validate profile name
   * @private
   */
  private validateName(name: string): void {
    if (!name) {
      throw new ValidationError('Name is required');
    }

    if (name.length < 3) {
      throw new ValidationError('Name must be at least 3 characters');
    }

    if (name.length > 100) {
      throw new ValidationError('Name must not exceed 100 characters');
    }
  }

  /**
   * Validate voice configuration
   * @private
   */
  private validateVoice(voice: any): void {
    if (!voice.tone) {
      throw new ValidationError('voice.tone is required');
    }

    if (voice.tone.length > 50) {
      throw new ValidationError('voice.tone must not exceed 50 characters');
    }

    if (!voice.style) {
      throw new ValidationError('voice.style is required');
    }

    if (voice.style.length > 500) {
      throw new ValidationError('voice.style must not exceed 500 characters');
    }

    if (!Array.isArray(voice.examples)) {
      throw new ValidationError('voice.examples must be an array');
    }

    if (voice.examples.length < 3 || voice.examples.length > 5) {
      throw new ValidationError('voice.examples must contain between 3 and 5 items');
    }

    for (const example of voice.examples) {
      if (example.length > 500) {
        throw new ValidationError('Each voice.example must not exceed 500 characters');
      }
    }
  }
}

