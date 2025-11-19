# Group Ops Platform (GatherMob)

A community and event management platform built with modern cloud technologies.

## 🚀 Project Overview

Group Ops (codename: GatherMob) is a full-stack platform for managing communities, organizations, and events. It features phone-based OTP authentication, GraphQL API, and a modern React UI with internationalization support.

## 📁 Project Structure

```
gathermob/
├── src/                      # Backend source code
│   ├── api/                  # GraphQL API handlers
│   └── auth/                 # Authentication handlers
├── ui/                       # Frontend Next.js application
│   ├── app/                  # Next.js app directory
│   ├── components/           # React components
│   ├── lib/                  # Utilities and API clients
│   └── locales/             # Internationalization files
├── infra/                    # Infrastructure as Code
│   ├── cloudformation/       # AWS CloudFormation templates
│   ├── migrations/           # Database migrations
│   └── scripts/             # Deployment scripts
├── bruno/                    # API testing collection
├── docs/                     # Documentation
│   ├── prd/                 # Product Requirements Documents
│   └── API.md               # API documentation
└── .github/                  # GitHub Actions workflows
```

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18.x on AWS Lambda
- **API**: GraphQL with Apollo Server
- **Database**: MongoDB Atlas
- **Authentication**: JWT with OTP verification
- **Infrastructure**: AWS (Lambda, API Gateway, Secrets Manager)

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui with Tailwind CSS
- **State Management**: React Hook Form + Zod
- **Internationalization**: next-intl (en-US)
- **Authentication**: HTTP-only cookies

### DevOps
- **CI/CD**: GitHub Actions
- **IaC**: AWS CloudFormation
- **Monitoring**: CloudWatch Logs
- **Secrets**: AWS Secrets Manager

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- MongoDB Atlas account
- GitHub repository access

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Create .env file with:
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   ENVIRONMENT=development
   ```

3. **Run migrations**:
   ```bash
   npm run migrate:up
   ```

### Frontend Setup

1. **Navigate to UI directory**:
   ```bash
   cd ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Create .env.local with:
   NEXT_PUBLIC_API_URL=https://your-api-url/sandbox
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Complete API reference
- **[PRD v0.5](docs/prd/group-ops-ui-v0.5.md)** - UI Product Requirements
- **[Bruno Collection](bruno/)** - API testing collection

## 🔑 Authentication Flow

1. User enters phone number
2. System sends 6-digit OTP (via SMS in production)
3. User verifies OTP
4. System returns JWT tokens
5. Frontend stores token in HTTP-only cookie

**Test Credentials** (Sandbox):
- Phone: `+15555555555`
- OTP: `123456` (or check CloudWatch logs)

## 🌍 API Endpoints

### Base URL
- **Sandbox**: `https://rmb33fzf34.execute-api.us-east-1.amazonaws.com/sandbox`

### Key Endpoints
- `POST /auth/otp` - Request OTP
- `POST /auth/verify` - Verify OTP
- `POST /graphql` - GraphQL API
- `GET /health` - Health check

See [API Documentation](docs/API.md) for complete reference.

## 🧪 Testing

### API Testing with Bruno
1. Import `/bruno` folder into Bruno app
2. Set `phoneNumber` environment variable
3. Run requests in sequence:
   - Send OTP
   - Verify OTP
   - Test GraphQL queries

### Local Testing
```bash
# Run backend tests
npm test

# Run frontend tests
cd ui && npm test
```

## 🚀 Deployment

### Sandbox Deployment
Automatic deployment via GitHub Actions on push to `sandbox` branch:

```bash
git checkout sandbox
git add .
git commit -m "feat: your changes"
git push origin sandbox
```

### Manual Deployment
```bash
# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file infra/cloudformation/sandbox-stack-simple.yml \
  --stack-name group-ops-sandbox \
  --capabilities CAPABILITY_NAMED_IAM

# Deploy Lambda functions
npm run deploy:sandbox
```

## 📊 Monitoring

- **CloudWatch Logs**: All Lambda function logs
- **API Gateway Metrics**: Request/response metrics
- **MongoDB Atlas**: Database performance metrics

## 🔐 Security

- Phone number validation (E.164 format)
- OTP expiration (5 minutes)
- Rate limiting (3 attempts per OTP)
- JWT token expiration (24 hours)
- HTTP-only cookies for web security
- AWS Secrets Manager for credentials

## 📝 Known Issues & TODOs

- [ ] Twilio SMS integration pending
- [ ] Production deployment configuration
- [ ] Comprehensive test coverage
- [ ] API rate limiting implementation
- [ ] Multi-language support (beyond en-US)
- [ ] WebSocket support for real-time features

## 🤝 Contributing

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Deploy to sandbox for testing
6. Merge after review

## 📄 License

Private - All rights reserved

## 📞 Support

For questions or issues:
- Check [API Documentation](docs/API.md)
- Review [GitHub Issues](https://github.com/delkant/gathermob/issues)
- Contact development team

---

**Current Version**: v0.5 (Sandbox)
**Last Updated**: November 2024