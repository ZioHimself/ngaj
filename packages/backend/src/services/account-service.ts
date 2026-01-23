import { Db, ObjectId } from 'mongodb';
import { CronExpressionParser } from 'cron-parser';
import type { 
  Account, 
  CreateAccountInput, 
  UpdateAccountInput,
  Platform,
  AccountStatus,
  AccountWithProfile
} from '@ngaj/shared';
import { ValidationError, NotFoundError, ConflictError } from '@ngaj/shared';

/**
 * Service for managing Account entities
 * 
 * @see Design: .agents/artifacts/designer/designs/account-configuration-design.md
 * @see ADR-006: Profile and Account Separation
 */
export class AccountService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Create a new account
   * 
   * @throws NotFoundError - When profileId doesn't exist
   * @throws ValidationError - When input data is invalid
   * @throws ConflictError - When (platform, handle) combination already exists
   */
  async create(data: CreateAccountInput): Promise<Account> {
    // Validate input
    this.validateAccountData(data);

    // Check if profile exists
    const profile = await this.db.collection('profiles').findOne({ _id: data.profileId });
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Check for duplicate (platform, handle)
    const existingAccount = await this.db.collection<Account>('accounts').findOne({
      platform: data.platform,
      handle: data.handle
    });
    if (existingAccount) {
      throw new ConflictError(
        `Account already exists for platform '${data.platform}' and handle '${data.handle}'`
      );
    }

    // Create account document
    const now = new Date();
    const account: Account = {
      _id: new ObjectId(),
      profileId: data.profileId,
      platform: data.platform,
      handle: data.handle,
      discovery: {
        schedules: data.discovery.schedules,
        lastAt: undefined,
        error: undefined
      },
      status: data.status,
      createdAt: now,
      updatedAt: now
    };

    // Insert into database
    const result = await this.db.collection<Account>('accounts').insertOne(account);
    
    return {
      ...account,
      _id: result.insertedId
    };
  }

  /**
   * Find account by ID
   * 
   * @param id - Account ObjectId
   * @param populate - If true, include populated profile data
   * @returns Account if found (with or without profile), null otherwise
   * @throws Error - When ObjectId format is invalid
   */
  async findById(id: ObjectId, populate?: boolean): Promise<Account | AccountWithProfile | null> {
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId');
    }

    if (populate) {
      // Use aggregation with $lookup to populate profile
      const results = await this.db.collection<Account>('accounts').aggregate([
        { $match: { _id: id } },
        {
          $lookup: {
            from: 'profiles',
            localField: 'profileId',
            foreignField: '_id',
            as: 'profile'
          }
        },
        {
          $unwind: {
            path: '$profile',
            preserveNullAndEmptyArrays: true
          }
        }
      ]).toArray();

      return results[0] as AccountWithProfile || null;
    }

    const account = await this.db.collection<Account>('accounts').findOne({ _id: id });
    return account;
  }

  /**
   * Find all accounts with optional filters
   * 
   * @param filters - Optional filters (profileId, status)
   * @returns Array of accounts (empty array if none found)
   */
  async findAll(filters?: { 
    profileId?: ObjectId; 
    status?: AccountStatus 
  }): Promise<Account[]> {
    const query: { profileId?: ObjectId; status?: AccountStatus } = {};
    
    if (filters?.profileId) {
      query.profileId = filters.profileId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const accounts = await this.db.collection<Account>('accounts').find(query).toArray();
    return accounts;
  }

  /**
   * Update an existing account
   * 
   * @throws NotFoundError - When account not found
   * @throws ValidationError - When attempting to update immutable fields or invalid data
   */
  async update(id: ObjectId, data: UpdateAccountInput): Promise<Account> {
    // Check for immutable field updates
    if ('profileId' in data) {
      throw new ValidationError('profileId cannot be updated');
    }

    if ('platform' in data) {
      throw new ValidationError('platform cannot be updated');
    }

    // Check if account exists
    const existingAccount = await this.findById(id);
    if (!existingAccount) {
      throw new NotFoundError('Account not found');
    }

    // Validate update data
    if (data.discovery?.schedules && Array.isArray(data.discovery.schedules)) {
      for (const schedule of data.discovery.schedules) {
        if (schedule.cronExpression) {
          this.validateCronExpression(schedule.cronExpression);
        }
      }
    }

    // Update account
    const updateDoc = {
      ...data,
      updatedAt: new Date()
    };

    await this.db.collection<Account>('accounts').updateOne(
      { _id: id },
      { $set: updateDoc }
    );

    // Return updated account
    const updatedAccount = await this.findById(id);
    return updatedAccount!;
  }

  /**
   * Delete an account (hard delete)
   * 
   * @throws NotFoundError - When account not found
   */
  async delete(id: ObjectId): Promise<void> {
    const result = await this.db.collection<Account>('accounts').deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      throw new NotFoundError('Account not found');
    }
  }

  /**
   * Find accounts ready for discovery
   * Returns accounts with enabled discovery and active status,
   * with populated profile data.
   * 
   * @returns Array of accounts with profiles
   */
  async findAccountsForDiscovery(): Promise<AccountWithProfile[]> {
    const accounts = await this.db.collection<Account>('accounts').aggregate([
      {
        $match: {
          'discovery.schedules': {
            $elemMatch: { enabled: true }
          },
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
      {
        $unwind: {
          path: '$profile',
          preserveNullAndEmptyArrays: true
        }
      }
    ]).toArray();

    return accounts as AccountWithProfile[];
  }

  /**
   * Update discovery status after a discovery run
   * 
   * @param id - Account ObjectId
   * @param success - Whether discovery succeeded
   * @param error - Error message (if failed)
   */
  async updateDiscoveryStatus(
    id: ObjectId, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    const updateDoc: {
      updatedAt: Date;
      'discovery.lastAt'?: Date;
      'discovery.error'?: string;
      status?: AccountStatus;
    } = {
      updatedAt: new Date()
    };

    if (success) {
      updateDoc['discovery.lastAt'] = new Date();
      updateDoc['discovery.error'] = undefined;
    } else {
      updateDoc['discovery.error'] = error;
      updateDoc['status'] = 'error';
    }

    await this.db.collection<Account>('accounts').updateOne(
      { _id: id },
      { $set: updateDoc }
    );
  }

  /**
   * Validate credentials for a platform account
   * Checks if required environment variables are present.
   * 
   * @param platform - Platform identifier
   * @param _handle - Account handle (reserved for future use)
   * @returns true if credentials exist, false otherwise
   */
  async validateCredentials(platform: Platform, _handle: string): Promise<boolean> {
    switch (platform) {
      case 'bluesky':
        // Check for Bluesky credentials in environment
        return !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD);
      
      case 'linkedin':
        // v0.2: LinkedIn not implemented yet
        return false;
      
      case 'reddit':
        // v0.2: Reddit not implemented yet
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Validate complete account data
   * @private
   */
  private validateAccountData(data: CreateAccountInput): void {
    // Validate profileId
    if (!data.profileId) {
      throw new ValidationError('profileId is required');
    }

    // Validate platform
    if (!data.platform) {
      throw new ValidationError('platform is required');
    }

    const validPlatforms: Platform[] = ['bluesky', 'linkedin', 'reddit'];
    if (!validPlatforms.includes(data.platform)) {
      throw new ValidationError('platform must be one of: bluesky, linkedin, reddit');
    }

    // Validate handle
    if (!data.handle) {
      throw new ValidationError('handle is required');
    }

    // Validate cron expressions in schedules
    if (data.discovery?.schedules && Array.isArray(data.discovery.schedules)) {
      for (const schedule of data.discovery.schedules) {
        if (schedule.cronExpression) {
          this.validateCronExpression(schedule.cronExpression);
        }
      }
    }
  }

  /**
   * Validate cron expression syntax
   * @private
   */
  private validateCronExpression(cronExpression: string): void {
    if (!cronExpression || cronExpression.trim() === '') {
      throw new ValidationError('Invalid cron expression');
    }

    try {
      // Use cron-parser to validate
      CronExpressionParser.parse(cronExpression);
    } catch {
      throw new ValidationError('Invalid cron expression');
    }
  }
}

