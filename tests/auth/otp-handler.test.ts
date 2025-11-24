/**
 * Unit tests for OTP Handler
 * Tests phone-only authentication flow with OTP generation and verification
 */

import { handler } from '../../src/auth/otp-handler';
import { MongoClient, Db, Collection } from 'mongodb';
import * as jwt from 'jsonwebtoken';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Mock MongoDB
jest.mock('mongodb');
const mockConnect = jest.fn();
const mockDb = jest.fn();
const mockCollection = jest.fn();
const mockFindOne = jest.fn();
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteMany = jest.fn();

// Mock JWT
jest.mock('jsonwebtoken');

// Mock Twilio (for future implementation)
jest.mock('twilio');

describe('OTP Handler', () => {
  let mockMongoClient: jest.Mocked<MongoClient>;
  let mockDatabase: jest.Mocked<Db>;
  let mockUsersCollection: jest.Mocked<Collection>;
  let mockOtpCollection: jest.Mocked<Collection>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup MongoDB mocks
    mockUsersCollection = {
      findOne: mockFindOne,
      insertOne: mockInsertOne,
      updateOne: mockUpdateOne,
    } as any;

    mockOtpCollection = {
      deleteMany: mockDeleteMany,
      insertOne: mockInsertOne,
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
    } as any;

    mockDatabase = {
      collection: mockCollection.mockImplementation((name: string) => {
        if (name === 'users') return mockUsersCollection;
        if (name === 'otps') return mockOtpCollection;
        return null;
      }),
    } as any;

    mockMongoClient = {
      connect: mockConnect.mockResolvedValue(undefined),
      db: mockDb.mockReturnValue(mockDatabase),
    } as any;

    (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(() => mockMongoClient);

    // Setup environment variables
    process.env.MONGODB_URI = 'mongodb://test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENVIRONMENT = 'test';
  });

  afterEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.ENVIRONMENT;
  });

  describe('POST /auth/otp', () => {
    it('should generate OTP for valid phone number', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({ phoneNumber: '+1234567890' }),
        headers: { 'content-type': 'application/json' },
      };

      mockDeleteMany.mockResolvedValue({});
      mockInsertOne.mockResolvedValue({ insertedId: 'otp-id' });

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(true);
      expect(body.message).toBe('OTP sent successfully');
      expect(body.otp).toBeDefined();
      expect(body.otp).toMatch(/^\d{6}$/);

      // Verify MongoDB operations
      expect(mockConnect).toHaveBeenCalled();
      expect(mockDeleteMany).toHaveBeenCalledWith({ phoneNumber: '+1234567890' });
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '+1234567890',
          otp: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should reject invalid phone number format', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({ phoneNumber: 'invalid' }),
        headers: { 'content-type': 'application/json' },
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid phone number format');
    });

    it('should reject missing phone number', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Phone number is required');
    });

    it('should handle MongoDB connection errors', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({ phoneNumber: '+1234567890' }),
        headers: { 'content-type': 'application/json' },
      };

      mockConnect.mockRejectedValue(new Error('Connection failed'));

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('POST /auth/verify', () => {
    beforeEach(() => {
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    });

    it('should verify valid OTP and return tokens', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          otp: '123456'
        }),
        headers: { 'content-type': 'application/json' },
      };

      const mockOtp = {
        phoneNumber: '+1234567890',
        otp: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const mockUser = {
        _id: 'user-id',
        phone: '+1234567890',
        name: '+1234567890',
        role: 'USER',
      };

      // Mock OTP lookup
      mockFindOne.mockImplementation((query: any) => {
        if (query.phoneNumber && query.otp) {
          return Promise.resolve(mockOtp);
        }
        if (query.phone) {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      });

      mockUpdateOne.mockResolvedValue({});

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.phone).toBe('+1234567890');
      expect(body.accessToken).toBe('mock-jwt-token');
      expect(body.refreshToken).toBe('mock-jwt-token');

      // Verify JWT was signed with correct payload
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          phone: '+1234567890',
          role: 'USER',
        }),
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should create new user on first verification', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          otp: '123456'
        }),
        headers: { 'content-type': 'application/json' },
      };

      const mockOtp = {
        phoneNumber: '+1234567890',
        otp: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      // Mock OTP lookup
      mockFindOne.mockImplementation((query: any) => {
        if (query.phoneNumber && query.otp) {
          return Promise.resolve(mockOtp);
        }
        if (query.phone) {
          return Promise.resolve(null); // User doesn't exist
        }
        return Promise.resolve(null);
      });

      mockInsertOne.mockResolvedValue({ insertedId: 'new-user-id' });
      mockUpdateOne.mockResolvedValue({});

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(true);

      // Verify new user was created
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+1234567890',
          name: '+1234567890',
          role: 'USER',
        })
      );
    });

    it('should reject invalid OTP', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          otp: '999999'
        }),
        headers: { 'content-type': 'application/json' },
      };

      mockFindOne.mockResolvedValue(null);

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid or expired OTP');
    });

    it('should reject expired OTP', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          otp: '123456'
        }),
        headers: { 'content-type': 'application/json' },
      };

      const mockOtp = {
        phoneNumber: '+1234567890',
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockFindOne.mockImplementation((query: any) => {
        if (query.phoneNumber && query.otp) {
          return Promise.resolve(mockOtp);
        }
        return Promise.resolve(null);
      });

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid or expired OTP');
    });

    it('should reject missing parameters', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({ phoneNumber: '+1234567890' }), // Missing OTP
        headers: { 'content-type': 'application/json' },
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Phone number and OTP are required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: 'invalid json',
        headers: { 'content-type': 'application/json' },
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid request body');
    });

    it('should handle unknown routes', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'GET /auth/unknown',
        rawPath: '/auth/unknown',
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Route not found');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.MONGODB_URI;
      delete process.env.JWT_SECRET;

      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({ phoneNumber: '+1234567890' }),
        headers: { 'content-type': 'application/json' },
      };

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body || '{}');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive information in errors', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/verify',
        rawPath: '/auth/verify',
        body: JSON.stringify({
          phoneNumber: '+1234567890',
          otp: '123456'
        }),
        headers: { 'content-type': 'application/json' },
      };

      mockFindOne.mockRejectedValue(new Error('Database connection string exposed'));

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body || '{}');
      expect(body.error).toBe('Internal server error');
      expect(body.error).not.toContain('connection string');
    });

    it('should sanitize phone numbers', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        routeKey: 'POST /auth/otp',
        rawPath: '/auth/otp',
        body: JSON.stringify({ phoneNumber: '+1 (234) 567-8900' }),
        headers: { 'content-type': 'application/json' },
      };

      mockDeleteMany.mockResolvedValue({});
      mockInsertOne.mockResolvedValue({ insertedId: 'otp-id' });

      const result = await handler(event as APIGatewayProxyEventV2) as APIGatewayProxyResultV2;

      expect(result.statusCode).toBe(200);

      // Verify phone number was sanitized
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '+12345678900', // Sanitized
        })
      );
    });

    it('should rate limit OTP requests (future implementation)', async () => {
      // This test is a placeholder for rate limiting implementation
      // In production, you would track requests per phone number
      // and reject if too many requests in a time window
      expect(true).toBe(true);
    });
  });
});