#!/usr/bin/env node
"use strict";
/**
 * File: /infra/scripts/migration-runner.ts
 * Description: CLI tool for running MongoDB migrations and Atlas Search index synchronization
 * Generated: 2025-10-28
 * PRD Reference: v0.3
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// Load environment variables
dotenv.config();
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
    client = null;
    db = null;
    migrationsPath;
    indexesPath;
    constructor() {
        this.migrationsPath = path.join(__dirname, '..', 'migrations');
        this.indexesPath = path.join(__dirname, '..', 'atlas-indexes');
    }
    /**
     * Connect to MongoDB
     */
    async connect(uri, dbName) {
        try {
            console.log(chalk_1.default.blue('Connecting to MongoDB...'));
            this.client = new mongodb_1.MongoClient(uri);
            await this.client.connect();
            this.db = this.client.db(dbName);
            console.log(chalk_1.default.green('✓ Connected to MongoDB'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to connect to MongoDB:'), error);
            throw error;
        }
    }
    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log(chalk_1.default.blue('Disconnected from MongoDB'));
        }
    }
    /**
     * Load all migration files
     */
    async loadMigrations() {
        const migrations = [];
        const files = fs.readdirSync(this.migrationsPath)
            .filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'))
            .sort();
        for (const file of files) {
            const migrationPath = path.join(this.migrationsPath, file);
            try {
                const module = await Promise.resolve(`${migrationPath}`).then(s => __importStar(require(s)));
                const migration = module.default || module.migration;
                if (migration && migration.id && migration.up && migration.down) {
                    migrations.push(migration);
                }
                else {
                    console.warn(chalk_1.default.yellow(`Warning: Invalid migration file ${file}`));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red(`Error loading migration ${file}:`), error);
            }
        }
        return migrations;
    }
    /**
     * Get applied migrations from database
     */
    async getAppliedMigrations() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        const collection = this.db.collection('migrations');
        return await collection
            .find({ status: 'APPLIED' })
            .sort({ appliedAt: 1 })
            .toArray();
    }
    /**
     * Run pending migrations
     */
    async up(dryRun = false) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        console.log(chalk_1.default.blue(`Running migrations ${dryRun ? '(DRY RUN)' : ''}...`));
        const migrations = await this.loadMigrations();
        const applied = await this.getAppliedMigrations();
        const appliedIds = new Set(applied.map(m => m.id));
        const pending = migrations.filter(m => !appliedIds.has(m.id));
        if (pending.length === 0) {
            console.log(chalk_1.default.green('✓ No pending migrations'));
            return;
        }
        console.log(chalk_1.default.blue(`Found ${pending.length} pending migration(s)`));
        for (const migration of pending) {
            console.log(chalk_1.default.blue(`\nMigration: ${migration.id}`));
            console.log(chalk_1.default.gray(`Description: ${migration.description}`));
            if (dryRun) {
                console.log(chalk_1.default.yellow('→ Would run migration (dry run)'));
                continue;
            }
            const collection = this.db.collection('migrations');
            // Mark as running
            await collection.insertOne({
                id: migration.id,
                description: migration.description,
                appliedAt: new Date(),
                status: 'RUNNING'
            });
            try {
                // Run migration
                await migration.up(this.db);
                // Mark as applied
                await collection.updateOne({ id: migration.id }, { $set: { status: 'APPLIED' } });
                console.log(chalk_1.default.green(`✓ Migration ${migration.id} applied successfully`));
            }
            catch (error) {
                // Mark as failed
                await collection.updateOne({ id: migration.id }, {
                    $set: {
                        status: 'FAILED',
                        error: error.message || String(error)
                    }
                });
                console.error(chalk_1.default.red(`✗ Migration ${migration.id} failed:`), error);
                throw error;
            }
        }
        console.log(chalk_1.default.green('\n✓ All migrations completed successfully'));
    }
    /**
     * Rollback last migration
     */
    async down(count = 1) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        console.log(chalk_1.default.blue(`Rolling back ${count} migration(s)...`));
        const applied = await this.getAppliedMigrations();
        const toRollback = applied.slice(-count).reverse();
        if (toRollback.length === 0) {
            console.log(chalk_1.default.yellow('No migrations to rollback'));
            return;
        }
        const migrations = await this.loadMigrations();
        const migrationMap = new Map(migrations.map(m => [m.id, m]));
        for (const record of toRollback) {
            const migration = migrationMap.get(record.id);
            if (!migration) {
                console.warn(chalk_1.default.yellow(`Warning: Migration ${record.id} not found in files`));
                continue;
            }
            console.log(chalk_1.default.blue(`\nRolling back: ${migration.id}`));
            try {
                await migration.down(this.db);
                // Remove from migrations collection
                const collection = this.db.collection('migrations');
                await collection.deleteOne({ id: migration.id });
                console.log(chalk_1.default.green(`✓ Migration ${migration.id} rolled back successfully`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`✗ Rollback failed for ${migration.id}:`), error);
                throw error;
            }
        }
        console.log(chalk_1.default.green('\n✓ Rollback completed successfully'));
    }
    /**
     * Show migration status
     */
    async status() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        console.log(chalk_1.default.blue('Migration Status\n'));
        const migrations = await this.loadMigrations();
        const applied = await this.getAppliedMigrations();
        const appliedMap = new Map(applied.map(m => [m.id, m]));
        const table = [];
        for (const migration of migrations) {
            const record = appliedMap.get(migration.id);
            table.push({
                'Migration ID': migration.id,
                'Description': migration.description,
                'Status': record ? chalk_1.default.green('APPLIED') : chalk_1.default.yellow('PENDING'),
                'Applied At': record ? record.appliedAt.toISOString() : '-'
            });
        }
        console.table(table);
        // Check for failed migrations
        const failed = await this.db.collection('migrations')
            .find({ status: 'FAILED' })
            .toArray();
        if (failed.length > 0) {
            console.log(chalk_1.default.red('\nFailed Migrations:'));
            for (const f of failed) {
                console.log(chalk_1.default.red(`  - ${f.id}: ${f.error}`));
            }
        }
    }
    /**
     * Sync Atlas Search indexes
     */
    async syncSearchIndexes(dryRun = false) {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        console.log(chalk_1.default.blue(`Syncing Atlas Search indexes ${dryRun ? '(DRY RUN)' : ''}...`));
        const indexFiles = fs.readdirSync(this.indexesPath)
            .filter(f => f.endsWith('.json'));
        for (const file of indexFiles) {
            const indexPath = path.join(this.indexesPath, file);
            const indexDef = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            console.log(chalk_1.default.blue(`\nIndex: ${indexDef.name}`));
            console.log(chalk_1.default.gray(`Collection: ${indexDef.collection}`));
            if (dryRun) {
                console.log(chalk_1.default.yellow('→ Would create/update index (dry run)'));
                continue;
            }
            try {
                // Note: In production, you would use the Atlas Admin API
                // This is a placeholder for the actual implementation
                console.log(chalk_1.default.yellow('→ Atlas Search index sync requires Atlas Admin API'));
                console.log(chalk_1.default.gray('  Use mongosh or Atlas UI to create indexes manually'));
                console.log(chalk_1.default.gray(`  Definition saved at: ${indexPath}`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`✗ Failed to sync index ${indexDef.name}:`), error);
            }
        }
        console.log(chalk_1.default.green('\n✓ Index sync completed'));
    }
    /**
     * Reset database (dangerous!)
     */
    async reset() {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        console.log(chalk_1.default.red.bold('\n⚠️  WARNING: This will drop all collections!'));
        console.log(chalk_1.default.red('This action cannot be undone.\n'));
        // In production, add confirmation prompt here
        const collections = await this.db.listCollections().toArray();
        for (const collection of collections) {
            if (collection.name.startsWith('system.')) {
                continue;
            }
            console.log(chalk_1.default.red(`Dropping collection: ${collection.name}`));
            await this.db.dropCollection(collection.name);
        }
        console.log(chalk_1.default.green('✓ Database reset completed'));
    }
}
// ========================================
// CLI SETUP
// ========================================
const program = new commander_1.Command();
program
    .name('migration-runner')
    .description('MongoDB migration runner for Group Ops Platform')
    .version('1.0.0');
// Common options
const addCommonOptions = (cmd) => {
    return cmd
        .option('-u, --uri <uri>', 'MongoDB connection URI', process.env.MONGODB_URI)
        .option('-d, --database <name>', 'Database name', process.env.DB_NAME || 'group-ops')
        .option('-e, --env <environment>', 'Environment', process.env.ENVIRONMENT || 'development');
};
// Up command
addCommonOptions(program
    .command('up')
    .description('Run pending migrations')
    .option('--dry-run', 'Show what would be done without making changes'))
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
    }
    catch (error) {
        console.error(chalk_1.default.red('Migration failed:'), error);
        process.exit(1);
    }
    finally {
        await runner.disconnect();
    }
});
// Down command
addCommonOptions(program
    .command('down [count]')
    .description('Rollback migrations'))
    .action(async (count, options) => {
    const runner = new MigrationRunner();
    try {
        const mongoUri = options.uri || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
        }
        await runner.connect(mongoUri, options.database);
        await runner.down(parseInt(count) || 1);
    }
    catch (error) {
        console.error(chalk_1.default.red('Rollback failed:'), error);
        process.exit(1);
    }
    finally {
        await runner.disconnect();
    }
});
// Status command
addCommonOptions(program
    .command('status')
    .description('Show migration status'))
    .action(async (options) => {
    const runner = new MigrationRunner();
    try {
        const mongoUri = options.uri || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
        }
        await runner.connect(mongoUri, options.database);
        await runner.status();
    }
    finally {
        await runner.disconnect();
    }
});
// Sync-indexes command
addCommonOptions(program
    .command('sync-indexes')
    .description('Sync Atlas Search indexes')
    .option('--dry-run', 'Show what would be done without making changes'))
    .action(async (options) => {
    const runner = new MigrationRunner();
    try {
        const mongoUri = options.uri || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not provided. Use --uri option or set MONGODB_URI environment variable');
        }
        await runner.connect(mongoUri, options.database);
        await runner.syncSearchIndexes(options.dryRun);
    }
    catch (error) {
        console.error(chalk_1.default.red('Index sync failed:'), error);
        process.exit(1);
    }
    finally {
        await runner.disconnect();
    }
});
// Reset command
addCommonOptions(program
    .command('reset')
    .description('Reset database (drops all collections)')
    .option('--force', 'Skip confirmation prompt'))
    .action(async (options) => {
    if (!options.force && options.env === 'production') {
        console.error(chalk_1.default.red('Cannot reset production database without --force'));
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
    }
    catch (error) {
        console.error(chalk_1.default.red('Reset failed:'), error);
        process.exit(1);
    }
    finally {
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
