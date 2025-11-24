/**
 * File: /src/api/graphql-handler.ts
 * Description: GraphQL Lambda handler with health check resolver
 * Generated: 2025-10-28
 * PRD Reference: v0.4
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');

// MongoDB connection
let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/group-ops';
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  return mongoClient;
}

// Custom scalar resolvers
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value).toISOString();
    }
    return null;
  },
  parseValue(value: unknown) {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

const objectIdScalar = new GraphQLScalarType({
  name: 'ObjectId',
  description: 'MongoDB ObjectId scalar type',
  serialize(value: unknown) {
    if (value instanceof ObjectId) {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && 'toString' in value) {
      return String((value as { toString(): string }).toString());
    }
    return null;
  },
  parseValue(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    return null;
  }
});

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON scalar type',
  serialize(value: unknown) {
    return value;
  },
  parseValue(value: unknown) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  }
});

// Resolvers
const resolvers = {
  DateTime: dateTimeScalar,
  ObjectId: objectIdScalar,
  JSON: jsonScalar,

  Query: {
    // Health check resolver (no auth required)
    health: async () => {
      const environment = process.env.ENVIRONMENT || 'unknown';
      const version = process.env.BUILD_VERSION || process.env.COMMIT_SHA || '0.4.0';

      // Optional: Check MongoDB connection
      let dbStatus = 'ok';
      try {
        const client = await getMongoClient();
        await client.db().admin().ping();
      } catch (error) {
        console.error('MongoDB health check failed:', error);
        dbStatus = 'degraded';
      }

      return {
        status: dbStatus,
        env: environment,
        timestamp: new Date().toISOString(),
        version: version
      };
    },

    // User queries (stub implementations)
    me: (_parent: any, _args: any, _context: any) => {
      // TODO: Implement with JWT auth
      return null;
    },

    user: async (_parent: any, args: { id: string }, _context: any) => {
      try {
        const client = await getMongoClient();
        const db = client.db('group-ops');
        const objectId = new ObjectId(args.id);
        const user = await db.collection('users').findOne({ _id: objectId });
        return user;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },

    users: async (_parent: any, args: { first?: number; after?: string; role?: string }) => {
      const client = await getMongoClient();
      const db = client.db('group-ops');
      const limit = args.first || 10;
      const users = await db.collection('users')
        .find(args.role ? { role: args.role } : {})
        .limit(limit)
        .toArray();

      return {
        edges: users.map(user => ({ node: user, cursor: user._id.toString() })),
        pageInfo: {
          hasNextPage: users.length === limit,
          hasPreviousPage: false,
          startCursor: users[0]?._id.toString(),
          endCursor: users[users.length - 1]?._id.toString()
        },
        totalCount: await db.collection('users').countDocuments()
      };
    },

    // Organization queries (stub implementations)
    organization: async (_parent: any, args: { id?: string; slug?: string }) => {
      try {
        const client = await getMongoClient();
        const db = client.db('group-ops');
        const query = args.id
          ? { _id: new ObjectId(args.id) }
          : args.slug
            ? { slug: args.slug }
            : null;

        if (!query) {
          return null;
        }
        return await db.collection('organizations').findOne(query);
      } catch (error) {
        console.error('Error fetching organization:', error);
        return null;
      }
    },

    organizations: async (_parent: any, args: { first?: number; after?: string }) => {
      const client = await getMongoClient();
      const db = client.db('group-ops');
      const limit = args.first || 10;
      const orgs = await db.collection('organizations')
        .find({})
        .limit(limit)
        .toArray();

      return {
        edges: orgs.map(org => ({ node: org, cursor: org._id.toString() })),
        pageInfo: {
          hasNextPage: orgs.length === limit,
          hasPreviousPage: false,
          startCursor: orgs[0]?._id.toString(),
          endCursor: orgs[orgs.length - 1]?._id.toString()
        },
        totalCount: await db.collection('organizations').countDocuments()
      };
    },

    myOrganizations: (_parent: any, _args: any, _context: any) => {
      // TODO: Implement with auth context
      return [];
    },

    // Event queries (stub implementations)
    event: async (_parent: any, args: { id: string }) => {
      try {
        const client = await getMongoClient();
        const db = client.db('group-ops');
        const objectId = new ObjectId(args.id);
        return await db.collection('events').findOne({ _id: objectId });
      } catch (error) {
        console.error('Error fetching event:', error);
        return null;
      }
    },

    events: async (_parent: any, args: any) => {
      const client = await getMongoClient();
      const db = client.db('group-ops');
      const limit = args.first || 10;
      const events = await db.collection('events')
        .find({})
        .limit(limit)
        .toArray();

      return {
        edges: events.map(event => ({ node: event, cursor: event._id.toString() })),
        pageInfo: {
          hasNextPage: events.length === limit,
          hasPreviousPage: false,
          startCursor: events[0]?._id.toString(),
          endCursor: events[events.length - 1]?._id.toString()
        },
        totalCount: await db.collection('events').countDocuments()
      };
    },

    searchEvents: (_parent: any, _args: { query: string; filters?: any }) => {
      // TODO: Implement Atlas Search
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        },
        totalCount: 0,
        facets: []
      };
    }
  },

  Mutation: {
    // Auth mutations (stub implementations)
    requestOTP: (_parent: any, args: { input: { phoneNumber: string } }) => {
      // TODO: Integrate with Twilio
      console.log(`OTP requested for ${args.input.phoneNumber}`);
      return { success: true, message: 'OTP sent successfully' };
    },

    verifyOTP: (_parent: any, args: { input: { phoneNumber: string; otp: string } }) => {
      // TODO: Implement OTP verification
      if (args.input.otp.match(/^\d{6}$/)) {
        return {
          user: {
            id: 'stub-user-id',
            phone: args.input.phoneNumber,
            name: 'Test User',
            role: 'USER',
            createdAt: new Date().toISOString()
          },
          accessToken: 'stub-access-token',
          refreshToken: 'stub-refresh-token'
        };
      }
      throw new Error('Invalid OTP');
    },

    // Organization mutations (stub implementations)
    createOrganization: async (_parent: any, args: { input: any }, context: any) => {
      // Check if user is authenticated
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');

      // Create organization
      const orgId = new ObjectId();
      const org = {
        _id: orgId,
        ...args.input,
        createdBy: context.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create membership for the creator as ADMIN
      const membershipId = new ObjectId();
      const membership = {
        _id: membershipId,
        userId: new ObjectId(context.user.id),
        organizationId: orgId,
        role: 'ADMIN',
        status: 'ACTIVE',
        permissions: {
          canManageMembers: true,
          canManageEvents: true,
          canManageSettings: true,
          canDelete: true
        },
        joinedAt: new Date(),
        updatedAt: new Date()
      };

      // Insert both in a transaction
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          await db.collection('organizations').insertOne(org, { session });
          await db.collection('memberships').insertOne(membership, { session });
        });
      } finally {
        await session.endSession();
      }

      return org;
    },

    updateOrganization: async (_parent: any, args: { id: string; input: any }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const orgId = new ObjectId(args.id);

      // Check if user is admin of the organization
      const membership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: orgId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });

      if (!membership) {
        throw new Error('You must be an admin to update this organization');
      }

      await db.collection('organizations').updateOne(
        { _id: orgId },
        { $set: { ...args.input, updatedAt: new Date() } }
      );

      return await db.collection('organizations').findOne({ _id: orgId });
    },

    deleteOrganization: async (_parent: any, args: { id: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const orgId = new ObjectId(args.id);

      // Only ADMIN can delete the organization
      const membership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: orgId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });

      if (!membership) {
        throw new Error('Only an admin can delete this organization');
      }

      // Delete in transaction
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          // Delete all memberships
          await db.collection('memberships').deleteMany(
            { organizationId: orgId },
            { session }
          );
          // Delete all events
          await db.collection('events').deleteMany(
            { organizationId: orgId },
            { session }
          );
          // Delete organization
          await db.collection('organizations').deleteOne(
            { _id: orgId },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      return true;
    },

    // Membership mutations
    inviteMember: async (_parent: any, args: { organizationId: string; userId: string; role: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const orgId = new ObjectId(args.organizationId);

      // Check if user is admin
      const adminMembership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: orgId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });

      if (!adminMembership) {
        throw new Error('You must be an admin to invite members');
      }

      // Check if membership already exists
      const existingMembership = await db.collection('memberships').findOne({
        userId: new ObjectId(args.userId),
        organizationId: orgId
      });

      if (existingMembership) {
        throw new Error('User is already a member of this organization');
      }

      // Create new membership
      const membershipId = new ObjectId();
      const membership = {
        _id: membershipId,
        userId: new ObjectId(args.userId),
        organizationId: orgId,
        role: args.role,
        status: 'PENDING',
        invitedBy: new ObjectId(context.user.id),
        joinedAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('memberships').insertOne(membership);
      return membership;
    },

    updateMemberRole: async (_parent: any, args: { membershipId: string; role: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const membershipId = new ObjectId(args.membershipId);

      // Get the membership to update
      const targetMembership = await db.collection('memberships').findOne({ _id: membershipId });
      if (!targetMembership) {
        throw new Error('Membership not found');
      }

      // Check if user is admin
      const adminMembership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: targetMembership.organizationId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });

      if (!adminMembership) {
        throw new Error('You must be an admin to change member roles');
      }

      // Prevent removing the last admin
      if (targetMembership.role === 'ADMIN' && args.role !== 'ADMIN') {
        const adminCount = await db.collection('memberships').countDocuments({
          organizationId: targetMembership.organizationId,
          role: 'ADMIN',
          status: 'ACTIVE'
        });

        if (adminCount <= 1) {
          throw new Error('Organization must have at least one admin');
        }
      }

      await db.collection('memberships').updateOne(
        { _id: membershipId },
        { $set: { role: args.role, updatedAt: new Date() } }
      );

      return await db.collection('memberships').findOne({ _id: membershipId });
    },

    removeMember: async (_parent: any, args: { membershipId: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const membershipId = new ObjectId(args.membershipId);

      // Get the membership to remove
      const targetMembership = await db.collection('memberships').findOne({ _id: membershipId });
      if (!targetMembership) {
        throw new Error('Membership not found');
      }

      // Check if user is admin
      const adminMembership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: targetMembership.organizationId,
        role: 'ADMIN',
        status: 'ACTIVE'
      });

      if (!adminMembership) {
        throw new Error('You must be an admin to remove members');
      }

      // Prevent removing the last admin
      if (targetMembership.role === 'ADMIN') {
        const adminCount = await db.collection('memberships').countDocuments({
          organizationId: targetMembership.organizationId,
          role: 'ADMIN',
          status: 'ACTIVE'
        });

        if (adminCount <= 1) {
          throw new Error('Cannot remove the last admin of the organization');
        }
      }

      await db.collection('memberships').deleteOne({ _id: membershipId });
      return true;
    },

    leaveOrganization: async (_parent: any, args: { organizationId: string }, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const client = await getMongoClient();
      const db = client.db('group-ops');
      const orgId = new ObjectId(args.organizationId);

      // Find user's membership
      const membership = await db.collection('memberships').findOne({
        userId: new ObjectId(context.user.id),
        organizationId: orgId,
        status: 'ACTIVE'
      });

      if (!membership) {
        throw new Error('You are not a member of this organization');
      }

      // Prevent the last admin from leaving
      if (membership.role === 'ADMIN') {
        const adminCount = await db.collection('memberships').countDocuments({
          organizationId: orgId,
          role: 'ADMIN',
          status: 'ACTIVE'
        });

        if (adminCount <= 1) {
          throw new Error('The last admin cannot leave the organization. Transfer admin role or delete the organization instead.');
        }
      }

      await db.collection('memberships').deleteOne({ _id: membership._id });
      return true;
    },

    // Event mutations (stub implementations)
    createEvent: async (_parent: any, args: { input: any }) => {
      const client = await getMongoClient();
      const db = client.db('group-ops');
      const event = {
        ...args.input,
        _id: new Date().getTime().toString(),
        status: 'DRAFT',
        currentCapacity: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('events').insertOne(event);
      return event;
    },

    updateEvent: async (_parent: any, args: { id: string; input: any }) => {
      try {
        const client = await getMongoClient();
        const db = client.db('group-ops');
        const objectId = new ObjectId(args.id);
        await db.collection('events').updateOne(
          { _id: objectId },
          { $set: { ...args.input, updatedAt: new Date() } }
        );
        return await db.collection('events').findOne({ _id: objectId });
      } catch (error) {
        console.error('Error updating event:', error);
        return null;
      }
    },

    // RSVP mutations (stub implementations)
    createRSVP: (_parent: any, args: { input: { eventId: string } }) => {
      const rsvp = {
        id: new Date().getTime().toString(),
        eventId: args.input.eventId,
        userId: 'stub-user-id',
        status: 'CONFIRMED',
        createdAt: new Date().toISOString()
      };
      return rsvp;
    },

    updateRSVP: (_parent: any, args: { id: string; status: string }) => {
      return {
        id: args.id,
        status: args.status,
        updatedAt: new Date().toISOString()
      };
    },

    cancelRSVP: (_parent: any, args: { id: string }) => {
      return {
        id: args.id,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      };
    }
  }
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true // Enable introspection for all environments
});

// Create and export Lambda handler
export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);