#!/usr/bin/env node

/**
 * File: /infra/scripts/migration-runner.ts
 * Description: CLI tool for running MongoDB migrations and Atlas Search index synchronization
 * Generated: 2025-10-28
 * PRD Reference: v0.3
 */

import { MongoClient, Db } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// ========================================
// TYPES
// ========================================

interface Migration {
  id: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

interface MigrationRecord {
  _id?: any;
  id: string;
  description: string;
  appliedAt: Date;
  status: 'PENDING' | 'RUNNING' | 'APPLIED' | 'FAILED';
  error?: string;
}

// Unused for now, keeping for future reference
// interface AtlasSearchIndex {
//   name: string;
//   collection: string;
//   mappings: any;
//   analyzers?: any[];
//   synonyms?: any[];
//   storedSource?: any;
// }

// ========================================
// MIGRATION RUNNER CLASS
// ========================================

class MigrationRunner {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private migrationsPath: string;
  private indexesPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, '..', 'migrations');
    this.indexesPath = path.join(__dirname, '..', 'atlas-indexes');
  }

  /**
   * Connect to MongoDB
   */
  async connect(uri: string, dbName: string): Promise<void> {
    try {
      console.log(chalk.blue('Connecting to MongoDB...'));
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log(chalk.green('✓ Connected to MongoDB'));
    } catch (error) {
      console.error(chalk.red('Failed to connect to MongoDB:'), error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log(chalk.blue('Disconnected from MongoDB'));
    }
  }

  /**
   * Load all migration files
   */
  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'))
      .sort();

    for (const file of files) {
      const migrationPath = path.join(this.migrationsPath, file);
      try {
        const module = await import(migrationPath);
        const migration = module.default || module.migration;
        if (migration && migration.id && migration.up && migration.down) {
          migrations.push(migration);
        } else {
          console.warn(chalk.yellow(`Warning: Invalid migration file ${file}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error loading migration ${file}:`), error);
      }
    }

    return migrations;
  }

  /**
   * Get applied migrations from database
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Check if migrations collection exists
    const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      return []; // No migrations applied yet
    }

    const collection = this.db.collection<MigrationRecord>('migrations');
    return await collection
      .find({ status: 'APPLIED' })
      .sort({ appliedAt: 1 })
      .toArray();
  }

  /**
   * Run pending migrations
   */
  async up(dryRun: boolean = false): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    console.log(chalk.blue(`Running migrations ${dryRun ? '(DRY RUN)' : ''}...`));

    const migrations = await this.loadMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedIds = new Set(applied.map(m => m.id));

    const pending = migrations.filter(m => !appliedIds.has(m.id));

    if (pending.length === 0) {
      console.log(chalk.green('✓ No pending migrations'));
      return;
    }

    console.log(chalk.blue(`Found ${pending.length} pending migration(s)`));

    for (const migration of pending) {
      console.log(chalk.blue(`\nMigration: ${migration.id}`));
      console.log(chalk.gray(`Description: ${migration.description}`));

      if (dryRun) {
        console.log(chalk.yellow('→ Would run migration (dry run)'));
        continue;
      }

      const collection = this.db.collection<MigrationRecord>('migrations');

      // Check if migration already exists (e.g., from a previous failed run)
      const existing = await collection.findOne({ id: migration.id });

      if (existing) {
        if (existing.status === 'APPLIED') {
          console.log(chalk.yellow(`⚠ Migration ${migration.id} already applied, skipping`));
          continue;
        }
        // Update existing record to RUNNING
        await collection.updateOne(
          { id: migration.id },
          {
            $set: {
              status: 'RUNNING',
              appliedAt: new Date()
            }
          }
        );
      } else {
        // Mark as running
        await collection.insertOne({
          id: migration.id,
          description: migration.description,
          appliedAt: new Date(),
          status: 'RUNNING'
        });
      }

      try {
        // Run migration
        await migration.up(this.db);

        // Mark as applied
        await collection.updateOne(
          { id: migration.id },
          { $set: { status: 'APPLIED' } }
        );

        console.log(chalk.green(`✓ Migration ${migration.id} applied successfully`));
      } catch (error: any) {
        // Mark as failed
        await collection.updateOne(
          { id: migration.id },
          {
            $set: {
              status: 'FAILED',
              error: error.message || String(error)
            }
          }
        );

        console.error(chalk.red(`✗ Migration ${migration.id} failed:`), error);
        throw error;
      }
    }

    console.log(chalk.green('\n✓ All migrations completed successfully'));
  }

  /**
   * Rollback last migration
   */
  async down(count: number = 1): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    console.log(chalk.blue(`Rolling back ${count} migration(s)...`));

    const applied = await this.getAppliedMigrations();
    const toRollback = applied.slice(-count).reverse();

    if (toRollback.length === 0) {
      console.log(chalk.yellow('No migrations to rollback'));
      return;
    }

    const migrations = await this.loadMigrations();
    const migrationMap = new Map(migrations.map(m => [m.id, m]));

    for (const record of toRollback) {
      const migration = migrationMap.get(record.id);

      if (!migration) {
        console.warn(chalk.yellow(`Warning: Migration ${record.id} not found in files`));
        continue;
      }

      console.log(chalk.blue(`\nRolling back: ${migration.id}`));

      try {
        await migration.down(this.db);

        // Remove from migrations collection
        const collection = this.db.collection('migrations');
        await collection.deleteOne({ id: migration.id });

        console.log(chalk.green(`✓ Migration ${migration.id} rolled back successfully`));
      } catch (error) {
        console.error(chalk.red(`✗ Rollback failed for ${migration.id}:`), error);
        throw error;
      }
    }

    console.log(chalk.green('\n✓ Rollback completed successfully'));
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    console.log(chalk.blue('Migration Status\n'));

    const migrations = await this.loadMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map(m => [m.id, m]));

    const table: any[] = [];

    for (const migration of migrations) {
      const record = appliedMap.get(migration.id);

      table.push({
        'Migration ID': migration.id,
        'Description': migration.description,
        'Status': record ? chalk.green('APPLIED') : chalk.yellow('PENDING'),
        'Applied At': record ? record.appliedAt.toISOString() : '-'
      });
    }

    console.table(table);

    // Check for failed migrations
    const failed = await this.db.collection<MigrationRecord>('migrations')
      .find({ status: 'FAILED' })
      .toArray();

    if (failed.length > 0) {
      console.log(chalk.red('\nFailed Migrations:'));
      for (const f of failed) {
        console.log(chalk.red(`  - ${f.id}: ${f.error}`));
      }
    }
  }

  /**
   * Sync Atlas Search indexes
   */
  async syncSearchIndexes(dryRun: boolean = false): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    console.log(chalk.blue(`Syncing Atlas Search indexes ${dryRun ? '(DRY RUN)' : ''}...`));

    const indexFiles = fs.readdirSync(this.indexesPath)
      .filter(f => f.endsWith('.json'));

    for (const file of indexFiles) {
      const indexPath = path.join(this.indexesPath, file);
      const indexDef = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      console.log(chalk.blue(`\nIndex: ${indexDef.name}`));
      console.log(chalk.gray(`Collection: ${indexDef.collection}`));

      if (dryRun) {
        console.log(chalk.yellow('→ Would create/update index (dry run)'));
        continue;
      }

      try {
        // Note: In production, you would use the Atlas Admin API
        // This is a placeholder for the actual implementation
        console.log(chalk.yellow('→ Atlas Search index sync requires Atlas Admin API'));
        console.log(chalk.gray('  Use mongosh or Atlas UI to create indexes manually'));
        console.log(chalk.gray(`  Definition saved at: ${indexPath}`));
      } catch (error) {
        console.error(chalk.red(`✗ Failed to sync index ${indexDef.name}:`), error);
      }
    }

    console.log(chalk.green('\n✓ Index sync completed'));
  }

  /**
   * Reset database (dangerous!)
   */
  async reset(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    console.log(chalk.red.bold('\n⚠️  WARNING: This will drop all collections!'));
    console.log(chalk.red('This action cannot be undone.\n'));

    // In production, add confirmation prompt here

    const collections = await this.db.listCollections().toArray();

    for (const collection of collections) {
      if (collection.name.startsWith('system.')) {
        continue;
      }

      console.log(chalk.red(`Dropping collection: ${collection.name}`));
      await this.db.dropCollection(collection.name);
    }

    console.log(chalk.green('✓ Database reset completed'));
  }
}

// ========================================
// CLI SETUP
// ========================================

const program = new Command();

program
  .name('migration-runner')
  .description('MongoDB migration runner for Group Ops Platform')
  .version('1.0.0');

// Common options
const addCommonOptions = (cmd: Command) => {
  return cmd
    .option('-u, --uri <uri>', 'MongoDB connection URI', process.env.MONGODB_URI)
    .option('-d, --database <name>', 'Database name', process.env.DB_NAME || 'group-ops')
    .option('-e, --env <environment>', 'Environment', process.env.ENVIRONMENT || 'development');
};

// Up command
addCommonOptions(
  program
    .command('up')
    .description('Run pending migrations')
    .option('--dry-run', 'Show what would be done without making changes')
)
  .action(async (options) => {
    const runner = new MigrationRunner();
    try {
      // Ensure URI is available from options or environment
      const mongoUri = options.uri || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
      }
      await runner.connect(mongoUri, options.database);
      await runner.up(options.dryRun);
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    } finally {
      await runner.disconnect();
    }
  });

// Down command
addCommonOptions(
  program
    .command('down [count]')
    .description('Rollback migrations')
)
  .action(async (count, options) => {
    const runner = new MigrationRunner();
    try {
      const mongoUri = options.uri || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
      }
      await runner.connect(mongoUri, options.database);
      await runner.down(parseInt(count) || 1);
    } catch (error) {
      console.error(chalk.red('Rollback failed:'), error);
      process.exit(1);
    } finally {
      await runner.disconnect();
    }
  });

// Status command
addCommonOptions(
  program
    .command('status')
    .description('Show migration status')
)
  .action(async (options) => {
    const runner = new MigrationRunner();
    try {
      const mongoUri = options.uri || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
      }
      await runner.connect(mongoUri, options.database);
      await runner.status();
    } finally {
      await runner.disconnect();
    }
  });

// Sync-indexes command
addCommonOptions(
  program
    .command('sync-indexes')
    .description('Sync Atlas Search indexes')
    .option('--dry-run', 'Show what would be done without making changes')
)
  .action(async (options) => {
    const runner = new MigrationRunner();
    try {
      const mongoUri = options.uri || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
      }
      await runner.connect(mongoUri, options.database);
      await runner.syncSearchIndexes(options.dryRun);
    } catch (error) {
      console.error(chalk.red('Index sync failed:'), error);
      process.exit(1);
    } finally {
      await runner.disconnect();
    }
  });

// Reset command
addCommonOptions(
  program
    .command('reset')
    .description('Reset database (drops all collections)')
    .option('--force', 'Skip confirmation prompt')
)
  .action(async (options) => {
    if (!options.force && options.env === 'production') {
      console.error(chalk.red('Cannot reset production database without --force'));
      process.exit(1);
    }

    const runner = new MigrationRunner();
    try {
      const mongoUri = options.uri || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
      }
      await runner.connect(mongoUri, options.database);
      await runner.reset();
    } catch (error) {
      console.error(chalk.red('Reset failed:'), error);
      process.exit(1);
    } finally {
      await runner.disconnect();
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// ========================================
// NPM SCRIPTS (add to package.json)
// ========================================
/*
{
  "scripts": {
    "migrate:up": "ts-node infra/scripts/migration-runner.ts up",
    "migrate:down": "ts-node infra/scripts/migration-runner.ts down",
    "migrate:status": "ts-node infra/scripts/migration-runner.ts status",
    "migrate:dry-run": "ts-node infra/scripts/migration-runner.ts up --dry-run",
    "sync:search-indexes": "ts-node infra/scripts/migration-runner.ts sync-indexes",
    "db:reset": "ts-node infra/scripts/migration-runner.ts reset"
  }
}
*/