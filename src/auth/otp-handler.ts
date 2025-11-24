/**
 * File: /src/auth/otp-handler.ts
 * Description: Auth Lambda handler for OTP-based authentication
 * Generated: 2025-10-28
 * PRD Reference: v0.4
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { MongoClient, ObjectId } from 'mongodb';
import * as crypto from 'crypto';

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

// Generate 6-digit OTP
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Validate phone number format
function validatePhoneNumber(phone: string): boolean {
  // Basic validation for E.164 format (+1234567890)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

// Lambda handler
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log('Auth handler invoked:', {
    path: event.rawPath,
    method: event.requestContext.http.method,
    environment: process.env.ENVIRONMENT
  });

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS request for CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const path = event.rawPath;

    // Remove stage prefix from path if present
    const pathWithoutStage = path.replace(/^\/[^\/]+/, '');

    // Route: POST /auth/otp - Request OTP
    if (pathWithoutStage === '/auth/otp' && event.requestContext.http.method === 'POST') {
      const { phoneNumber } = body;

      // Validate input
      if (!phoneNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Phone number is required'
          })
        };
      }

      if (!validatePhoneNumber(phoneNumber)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
          })
        };
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database (in production, use Redis for better performance)
      const client = await getMongoClient();
      const db = client.db('group-ops');

      // Upsert OTP record
      await db.collection('otps').replaceOne(
        { phoneNumber },
        {
          phoneNumber,
          otp,
          expiresAt,
          attempts: 0,
          createdAt: new Date()
        },
        { upsert: true }
      );

      // TODO: Send OTP via Twilio
      console.log(`OTP for ${phoneNumber}: ${otp}`);

      // In production, remove the OTP from response
      const isDevelopment = process.env.ENVIRONMENT === 'sandbox';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'OTP sent successfully',
          ...(isDevelopment && { otp }) // Include OTP in sandbox for testing
        })
      };
    }

    // Route: POST /auth/verify - Verify OTP
    if (pathWithoutStage === '/auth/verify' && event.requestContext.http.method === 'POST') {
      const { phoneNumber, otp } = body;

      // Validate input
      if (!phoneNumber || !otp) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Phone number and OTP are required'
          })
        };
      }

      if (!otp.match(/^\d{6}$/)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'OTP must be 6 digits'
          })
        };
      }

      // Verify OTP from database
      const client = await getMongoClient();
      const db = client.db('group-ops');

      const otpRecord = await db.collection('otps').findOne({
        phoneNumber,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'OTP expired or not found'
          })
        };
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Too many attempts. Please request a new OTP'
          })
        };
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await db.collection('otps').updateOne(
          { phoneNumber },
          { $inc: { attempts: 1 } }
        );

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid OTP'
          })
        };
      }

      // OTP is valid - delete it
      await db.collection('otps').deleteOne({ phoneNumber });

      // Find or create user
      let user = await db.collection('users').findOne({ phone: phoneNumber });

      if (!user) {
        // Create new user
        const newUserId = new ObjectId();
        const newUser = {
          _id: newUserId,
          phone: phoneNumber,
          name: phoneNumber, // Use phone number as default name
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await db.collection('users').insertOne(newUser);
        user = newUser;
      }

      // Generate JWT tokens (stub for v0.4)
      const accessToken = Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        phone: phoneNumber,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      })).toString('base64');

      const refreshToken = Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        type: 'refresh',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      })).toString('base64');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: user._id.toString(),
            phone: user.phone,
            name: user.name || null,
            role: user.role
          },
          accessToken,
          refreshToken
        })
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Route not found'
      })
    };

  } catch (error) {
    console.error('Auth handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};