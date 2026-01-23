import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB database.
 * Uses connection string from MONGODB_URI environment variable.
 * 
 * @see ADR-001: MongoDB for Storage
 * @see ADR-002: Environment Variables for Credentials
 */
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'ngaj';

  try {
    client = new MongoClient(uri);
    await client.connect();
    
    db = client.db(dbName);

    console.log(`📦 Connected to MongoDB database: ${dbName}`);
    
    // TODO: Phase 2 - Index creation will be handled by repository layer
    // This keeps infrastructure setup minimal and defers schema concerns
    // to the test-writer and implementer agents in Phase 2
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get the current database connection.
 * Throws an error if not connected.
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection.
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

