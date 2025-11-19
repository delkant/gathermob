# Group Ops Platform API Documentation

## Base URL
- **Production**: TBD
- **Sandbox**: `https://rmb33fzf34.execute-api.us-east-1.amazonaws.com/sandbox`

## Authentication

The API uses JWT-based authentication with OTP verification for initial login.

### Auth Endpoints

#### 1. Request OTP
Sends a one-time password to the provided phone number.

**Endpoint**: `POST /auth/otp`

**Request Body**:
```json
{
  "phoneNumber": "+15555555555"  // E.164 format required
}
```

**Response** (200 - Success):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"  // Only included in sandbox environment for testing
}
```

**Response** (400 - Bad Request):
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

```json
{
  "success": false,
  "error": "Invalid phone number format. Use E.164 format (e.g., +1234567890)"
}
```

**Notes**:
- Phone number must be in E.164 format (e.g., +1234567890)
- OTP expires after 5 minutes
- In sandbox environment, the OTP is returned in the response for testing
- In production, OTP will be sent via SMS (Twilio integration pending)

---

#### 2. Verify OTP
Verifies the OTP and returns authentication tokens.

**Endpoint**: `POST /auth/verify`

**Request Body**:
```json
{
  "phoneNumber": "+15555555555",
  "otp": "123456"
}
```

**Response** (200 - Success):
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "phone": "+15555555555",
    "name": null,
    "role": "USER"
  },
  "accessToken": "base64-encoded-jwt",
  "refreshToken": "base64-encoded-refresh-token"
}
```

**Response** (400 - Bad Request):
```json
{
  "success": false,
  "error": "Phone number and OTP are required"
}
```

```json
{
  "success": false,
  "error": "OTP must be 6 digits"
}
```

**Response** (401 - Unauthorized):
```json
{
  "success": false,
  "error": "OTP expired or not found"
}
```

```json
{
  "success": false,
  "error": "Invalid OTP"
}
```

**Response** (429 - Too Many Requests):
```json
{
  "success": false,
  "error": "Too many attempts. Please request a new OTP"
}
```

**Notes**:
- Maximum 3 attempts per OTP
- After successful verification, the OTP is deleted
- New users are automatically created on first login
- Tokens are valid for 24 hours (access) and 30 days (refresh)

---

## GraphQL Endpoint

**Endpoint**: `POST /graphql`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

### Available Queries

#### Get Current User
```graphql
query me {
  me {
    id
    phone
    name
    email
    role
    avatar
    bio
    createdAt
    lastActiveAt
  }
}
```

#### List My Organizations
```graphql
query myOrganizations {
  myOrganizations {
    items {
      id
      name
      slug
      description
      logo
      memberCount
      role
      joinedAt
    }
    total
    hasMore
  }
}
```

### Available Mutations

#### Create Organization
```graphql
mutation createOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    id
    name
    slug
    description
    logo
    settings {
      allowPublicEvents
      requireMemberApproval
      defaultEventPrivacy
    }
    createdAt
  }
}
```

**Variables**:
```json
{
  "input": {
    "name": "Test Organization",
    "slug": "test-org",
    "description": "This is a test organization",
    "settings": {
      "allowPublicEvents": true,
      "requireMemberApproval": false,
      "defaultEventPrivacy": "PUBLIC"
    }
  }
}
```

#### Create Event
```graphql
mutation createEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    organizationId
    title
    description
    startTime
    endTime
    location {
      name
      address
      city
      state
      country
      postalCode
      latitude
      longitude
    }
    virtualLink
    capacity
    price
    currency
    status
    visibility
    tags
    createdAt
  }
}
```

**Variables**:
```json
{
  "input": {
    "organizationId": "org-id-here",
    "title": "Community Meetup",
    "description": "Monthly community gathering",
    "startTime": "2025-12-01T18:00:00Z",
    "endTime": "2025-12-01T20:00:00Z",
    "location": {
      "name": "Community Center",
      "address": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "postalCode": "94102"
    },
    "capacity": 50,
    "price": 0,
    "currency": "USD",
    "visibility": "PUBLIC",
    "tags": ["community", "networking", "meetup"]
  }
}
```

---

## Health Check

**Endpoint**: `GET /health`

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T12:00:00Z"
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request - Invalid input or parameters
- **401**: Unauthorized - Invalid or missing authentication
- **404**: Not Found - Resource or endpoint not found
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server-side error

---

## CORS Configuration

The API supports CORS with the following configuration:
- **Allowed Origins**: `*` (all origins in sandbox)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `*`
- **Max Age**: 86400 seconds (24 hours)

---

## Rate Limiting

- OTP requests: Maximum 5 requests per phone number per hour
- OTP verification: Maximum 3 attempts per OTP
- API calls: No current rate limiting (will be added in production)

---

## Database Schema

### Users Collection
```javascript
{
  "_id": ObjectId,
  "phone": String,      // E.164 format
  "email": String,      // Optional
  "name": String,       // Optional
  "role": String,       // "USER" | "ADMIN"
  "avatar": String,     // Optional
  "bio": String,        // Optional
  "createdAt": Date,
  "updatedAt": Date
}
```

### OTPs Collection
```javascript
{
  "_id": ObjectId,
  "phoneNumber": String,  // E.164 format
  "otp": String,         // 6-digit code
  "expiresAt": Date,     // 5 minutes from creation
  "attempts": Number,    // Max 3
  "createdAt": Date
}
```

### Organizations Collection
```javascript
{
  "_id": ObjectId,
  "name": String,
  "slug": String,        // Unique identifier
  "description": String,
  "logo": String,        // Optional
  "settings": {
    "allowPublicEvents": Boolean,
    "requireMemberApproval": Boolean,
    "defaultEventPrivacy": String  // "PUBLIC" | "PRIVATE"
  },
  "createdBy": ObjectId,  // Reference to Users
  "createdAt": Date,
  "updatedAt": Date
}
```

### Events Collection
```javascript
{
  "_id": ObjectId,
  "organizationId": ObjectId,  // Reference to Organizations
  "title": String,
  "description": String,
  "startTime": Date,
  "endTime": Date,
  "location": {
    "name": String,
    "address": String,
    "city": String,
    "state": String,
    "country": String,
    "postalCode": String,
    "latitude": Number,    // Optional
    "longitude": Number    // Optional
  },
  "virtualLink": String,   // Optional
  "capacity": Number,
  "price": Number,
  "currency": String,
  "status": String,        // "DRAFT" | "PUBLISHED" | "CANCELLED"
  "visibility": String,    // "PUBLIC" | "PRIVATE"
  "tags": [String],
  "createdBy": ObjectId,   // Reference to Users
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Testing with Bruno

A Bruno collection is available in `/bruno` directory with pre-configured requests for all endpoints.

### Setup
1. Import the `/bruno` folder into Bruno
2. Set the `phoneNumber` environment variable (e.g., `+15555555555`)
3. The collection will automatically manage authentication tokens

### Test Flow
1. Run "Send OTP" request
2. Get the OTP from the response (sandbox) or CloudWatch logs
3. Run "Verify OTP" request with the code
4. Token is automatically saved for subsequent requests
5. Test GraphQL queries and mutations

---

## Deployment Status

### Sandbox Environment
- **API Gateway**: ✅ Deployed
- **Lambda Functions**: ✅ Deployed (GraphQL, Auth)
- **MongoDB Atlas**: ✅ Connected
- **Routes**:
  - `POST /auth/otp` ✅
  - `POST /auth/verify` ✅ (Pending deployment)
  - `POST /graphql` ✅
  - `GET /health` ✅

### Production Environment
- Not yet deployed

---

## Known Issues & TODOs

1. **SMS Integration**: Twilio integration pending for actual SMS delivery
2. **Rate Limiting**: Implement proper rate limiting for production
3. **Token Refresh**: Implement refresh token endpoint
4. **Email Support**: Add email-based OTP as alternative to phone
5. **Monitoring**: Add CloudWatch alarms and monitoring
6. **Testing**: Add comprehensive integration tests

---

## Support

For issues or questions, please refer to the GitHub repository or contact the development team.