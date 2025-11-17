"use strict";
/**
 * File: /infra/migrations/init-schema.ts
 * Description: Initial database schema and index creation migration
 * Generated: 2025-10-28
 * PRD Reference: v0.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
/**
 * Initial schema migration for Group Ops Platform
 * Creates all required collections and indexes for Phase 1
 */
exports.migration = {
    id: '001_init_schema',
    description: 'Create initial collections and indexes',
    async up(db) {
        console.log('Running migration: 001_init_schema - UP');
        // Get existing collections
        const existingCollections = await db.listCollections().toArray();
        const collectionNames = existingCollections.map(c => c.name);
        // Helper function to safely create collection
        const safeCreateCollection = async (name, options) => {
            if (collectionNames.includes(name)) {
                console.log(`Collection ${name} already exists, skipping creation`);
                return db.collection(name);
            }
            return await db.createCollection(name, options);
        };
        // Helper function to safely create indexes
        const safeCreateIndexes = async (collection, indexes) => {
            try {
                await collection.createIndexes(indexes);
            }
            catch (error) {
                if (error.code === 86 || error.code === 85) {
                    // Index already exists or duplicate index
                    console.log(`Indexes for ${collection.collectionName} already exist, skipping`);
                }
                else {
                    throw error;
                }
            }
        };
        // ========================================
        // USERS COLLECTION
        // ========================================
        const users = await safeCreateCollection('users', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['phone', 'name', 'role', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        email: {
                            bsonType: 'string',
                            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                        },
                        phone: {
                            bsonType: 'string',
                            pattern: '^\\+[1-9]\\d{1,14}$'
                        },
                        name: { bsonType: 'string', minLength: 1 },
                        avatar: { bsonType: 'string' },
                        bio: { bsonType: 'string', maxLength: 500 },
                        role: {
                            enum: ['USER', 'ADMIN', 'SUPER_ADMIN']
                        },
                        preferences: {
                            bsonType: 'object',
                            properties: {
                                notifications: {
                                    bsonType: 'object',
                                    properties: {
                                        email: { bsonType: 'bool' },
                                        sms: { bsonType: 'bool' },
                                        push: { bsonType: 'bool' },
                                        eventReminders: { bsonType: 'bool' },
                                        rsvpUpdates: { bsonType: 'bool' },
                                        paymentAlerts: { bsonType: 'bool' }
                                    }
                                },
                                language: { bsonType: 'string' },
                                timezone: { bsonType: 'string' }
                            }
                        },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' },
                        lastActiveAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(users, [
            { key: { email: 1 }, unique: true, sparse: true },
            { key: { phone: 1 }, unique: true },
            { key: { createdAt: -1 } },
            { key: { lastActiveAt: -1 } }
        ]);
        // ========================================
        // ORGANIZATIONS COLLECTION
        // ========================================
        const organizations = await safeCreateCollection('organizations', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'slug', 'settings', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        name: { bsonType: 'string', minLength: 1 },
                        slug: {
                            bsonType: 'string',
                            pattern: '^[a-z0-9-]+$'
                        },
                        description: { bsonType: 'string', maxLength: 1000 },
                        logo: { bsonType: 'string' },
                        coverImage: { bsonType: 'string' },
                        settings: {
                            bsonType: 'object',
                            required: ['visibility', 'requireApproval', 'allowGuestRSVP', 'paymentMethods'],
                            properties: {
                                visibility: {
                                    enum: ['PUBLIC', 'MEMBERS_ONLY', 'INVITE_ONLY']
                                },
                                requireApproval: { bsonType: 'bool' },
                                allowGuestRSVP: { bsonType: 'bool' },
                                paymentMethods: {
                                    bsonType: 'array',
                                    items: {
                                        enum: ['WALLET', 'STRIPE', 'CASH', 'FREE']
                                    }
                                },
                                customDomain: { bsonType: 'string' }
                            }
                        },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(organizations, [
            { key: { slug: 1 }, unique: true },
            { key: { name: 'text' } },
            { key: { createdAt: -1 } }
        ]);
        // ========================================
        // MEMBERSHIPS COLLECTION
        // ========================================
        const memberships = await safeCreateCollection('memberships', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'organizationId', 'role', 'status', 'joinedAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        userId: { bsonType: 'objectId' },
                        organizationId: { bsonType: 'objectId' },
                        role: {
                            enum: ['MEMBER', 'MODERATOR', 'ADMIN', 'OWNER']
                        },
                        status: {
                            enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']
                        },
                        joinedAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(memberships, [
            { key: { userId: 1, organizationId: 1 }, unique: true },
            { key: { organizationId: 1, status: 1 } },
            { key: { userId: 1, status: 1 } },
            { key: { joinedAt: -1 } }
        ]);
        // ========================================
        // EVENTS COLLECTION
        // ========================================
        const events = await safeCreateCollection('events', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['organizationId', 'title', 'description', 'startTime', 'endTime', 'location', 'status', 'visibility', 'pricing', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        organizationId: { bsonType: 'objectId' },
                        title: { bsonType: 'string', minLength: 1 },
                        description: { bsonType: 'string', minLength: 1 },
                        startTime: { bsonType: 'date' },
                        endTime: { bsonType: 'date' },
                        location: {
                            bsonType: 'object',
                            required: ['type', 'name'],
                            properties: {
                                type: { enum: ['physical', 'virtual'] },
                                name: { bsonType: 'string' },
                                address: { bsonType: 'string' },
                                city: { bsonType: 'string' },
                                state: { bsonType: 'string' },
                                country: { bsonType: 'string' },
                                postalCode: { bsonType: 'string' },
                                coordinates: {
                                    bsonType: 'object',
                                    properties: {
                                        latitude: { bsonType: 'double' },
                                        longitude: { bsonType: 'double' }
                                    }
                                },
                                virtualUrl: { bsonType: 'string' },
                                instructions: { bsonType: 'string' }
                            }
                        },
                        maxCapacity: { bsonType: 'int', minimum: 0 },
                        currentCapacity: { bsonType: 'int', minimum: 0 },
                        waitlistEnabled: { bsonType: 'bool' },
                        status: {
                            enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']
                        },
                        visibility: {
                            enum: ['PUBLIC', 'MEMBERS_ONLY', 'INVITE_ONLY']
                        },
                        pricing: {
                            bsonType: 'object',
                            required: ['isFree', 'currency'],
                            properties: {
                                isFree: { bsonType: 'bool' },
                                amount: { bsonType: 'double', minimum: 0 },
                                currency: { bsonType: 'string' },
                                earlyBirdAmount: { bsonType: 'double', minimum: 0 },
                                earlyBirdDeadline: { bsonType: 'date' }
                            }
                        },
                        tags: {
                            bsonType: 'array',
                            items: { bsonType: 'string' }
                        },
                        coverImage: { bsonType: 'string' },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(events, [
            { key: { organizationId: 1, startTime: -1 } },
            { key: { startTime: 1, status: 1 } },
            { key: { status: 1, visibility: 1 } },
            { key: { tags: 1 } },
            { key: { 'location.city': 1, startTime: 1 } },
            { key: { 'location.coordinates': '2dsphere' }, sparse: true },
            { key: { createdAt: -1 } }
        ]);
        // ========================================
        // RSVPS COLLECTION
        // ========================================
        const rsvps = await safeCreateCollection('rsvps', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'eventId', 'status', 'guestCount', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        userId: { bsonType: 'objectId' },
                        eventId: { bsonType: 'objectId' },
                        status: {
                            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'WAITLISTED', 'NO_SHOW']
                        },
                        guestCount: { bsonType: 'int', minimum: 1 },
                        notes: { bsonType: 'string', maxLength: 500 },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(rsvps, [
            { key: { userId: 1, eventId: 1 }, unique: true },
            { key: { eventId: 1, status: 1 } },
            { key: { userId: 1, status: 1 } },
            { key: { createdAt: -1 } }
        ]);
        // ========================================
        // ATTENDANCE COLLECTION
        // ========================================
        const attendance = await safeCreateCollection('attendance', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'eventId', 'checkInTime', 'qrCode', 'status'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        userId: { bsonType: 'objectId' },
                        eventId: { bsonType: 'objectId' },
                        rsvpId: { bsonType: 'objectId' },
                        checkInTime: { bsonType: 'date' },
                        checkOutTime: { bsonType: 'date' },
                        qrCode: { bsonType: 'string' },
                        status: {
                            enum: ['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']
                        },
                        verifiedById: { bsonType: 'objectId' },
                        notes: { bsonType: 'string', maxLength: 500 }
                    }
                }
            }
        });
        await safeCreateIndexes(attendance, [
            { key: { userId: 1, eventId: 1 } },
            { key: { eventId: 1, checkInTime: -1 } },
            { key: { qrCode: 1 }, unique: true },
            { key: { checkInTime: -1 } }
        ]);
        // ========================================
        // WALLETS COLLECTION
        // ========================================
        const wallets = await safeCreateCollection('wallets', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'balance', 'currency', 'status', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        userId: { bsonType: 'objectId' },
                        balance: { bsonType: 'double', minimum: 0 },
                        currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
                        status: {
                            enum: ['ACTIVE', 'SUSPENDED', 'CLOSED']
                        },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(wallets, [
            { key: { userId: 1 }, unique: true },
            { key: { status: 1 } },
            { key: { createdAt: -1 } }
        ]);
        // ========================================
        // TRANSACTIONS COLLECTION
        // ========================================
        const transactions = await safeCreateCollection('transactions', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['walletId', 'type', 'amount', 'currency', 'status', 'description', 'createdAt'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        walletId: { bsonType: 'objectId' },
                        eventId: { bsonType: 'objectId' },
                        type: {
                            enum: ['CREDIT', 'DEBIT', 'REFUND', 'TRANSFER']
                        },
                        amount: { bsonType: 'double' },
                        currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
                        status: {
                            enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']
                        },
                        description: { bsonType: 'string', minLength: 1 },
                        metadata: { bsonType: 'object' },
                        createdAt: { bsonType: 'date' },
                        updatedAt: { bsonType: 'date' }
                    }
                }
            }
        });
        await safeCreateIndexes(transactions, [
            { key: { walletId: 1, createdAt: -1 } },
            { key: { eventId: 1, status: 1 } },
            { key: { status: 1, createdAt: -1 } },
            { key: { createdAt: -1 } }
        ]);
        // ========================================
        // MIGRATIONS COLLECTION
        // ========================================
        const migrations = await safeCreateCollection('migrations', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['id', 'description', 'appliedAt', 'status'],
                    properties: {
                        _id: { bsonType: 'objectId' },
                        id: { bsonType: 'string' },
                        description: { bsonType: 'string' },
                        appliedAt: { bsonType: 'date' },
                        status: {
                            enum: ['PENDING', 'RUNNING', 'APPLIED', 'FAILED']
                        },
                        error: { bsonType: 'string' }
                    }
                }
            }
        });
        // Only create indexes if the collection is empty (first time setup)
        // If there are existing documents, the migration runner has already been using it
        const migrationCount = await migrations.countDocuments();
        if (migrationCount === 0) {
            await safeCreateIndexes(migrations, [
                { key: { id: 1 }, unique: true },
                { key: { appliedAt: -1 } }
            ]);
        }
        else {
            console.log(`Migrations collection already has ${migrationCount} documents, skipping index creation`);
        }
        console.log('Migration 001_init_schema completed successfully');
    },
    async down(db) {
        console.log('Running migration: 001_init_schema - DOWN');
        // Drop all collections in reverse order
        const collections = [
            'migrations',
            'transactions',
            'wallets',
            'attendance',
            'rsvps',
            'events',
            'memberships',
            'organizations',
            'users'
        ];
        for (const collectionName of collections) {
            try {
                await db.dropCollection(collectionName);
                console.log(`Dropped collection: ${collectionName}`);
            }
            catch (error) {
                if (error.code !== 26) { // Collection doesn't exist
                    throw error;
                }
            }
        }
        console.log('Migration 001_init_schema rollback completed');
    }
};
exports.default = exports.migration;
