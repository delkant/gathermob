# Contributing to Group Ops Platform

Thank you for your interest in contributing to the Group Ops Platform! This document provides guidelines and best practices for contributing to this repository.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Security Guidelines](#security-guidelines)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Infrastructure Changes](#infrastructure-changes)
- [Database Migrations](#database-migrations)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct to ensure a positive experience for everyone.

## 🔒 Security Guidelines

### Critical Security Rules

1. **NEVER commit secrets or credentials**
   - Do not commit `.env` files
   - Do not commit `.env.local`, `.env.production`, or any environment files
   - Do not commit API keys, passwords, or connection strings
   - Do not commit AWS credentials or access keys

2. **Ignore sensitive directories**
   - Never commit `.claude/` directories
   - Never commit `.vscode/` with personal settings
   - Never commit `node_modules/` or `dist/` directories

3. **Use AWS Secrets Manager**
   - All secrets must be stored in AWS Secrets Manager
   - Reference secrets using CloudFormation parameters
   - Never hardcode credentials in code

4. **Security Review Checklist**
   Before committing, verify:
   - [ ] No hardcoded credentials
   - [ ] No sensitive URLs with embedded passwords
   - [ ] No private keys or certificates
   - [ ] No personal access tokens
   - [ ] `.gitignore` is properly configured

### Handling Secrets

```bash
# Correct way to handle secrets
aws secretsmanager create-secret \
  --name group-ops/mongodb \
  --secret-string '{"connectionString":"mongodb+srv://..."}'

# In CloudFormation
MongoDBConnectionString:
  Type: String
  NoEcho: true
  Default: '{{resolve:secretsmanager:group-ops/mongodb:SecretString:connectionString}}'
```

## 🚀 Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS CLI configured
- MongoDB connection (for local testing)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/group-ops-platform.git
cd group-ops-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Run type checking
npm run type-check

# Run tests
npm run test:unit

# Build the project
npm run build
```

## 🌳 Branching Strategy

We follow a structured branching model:

| Branch | Purpose | Auto-Deploy | Protection |
|--------|---------|-------------|------------|
| `sandbox` | Development environment | ✅ Yes | Basic |
| `qa` | Testing environment | ✅ With approval | Protected |
| `prod` | Production environment | ✅ With approval | Highly protected |

### Branch Naming Conventions

- Features: `feature/description`
- Bugfixes: `fix/description`
- Hotfixes: `hotfix/description`
- Documentation: `docs/description`

### Workflow

1. Create feature branch from `sandbox`
2. Make changes and test locally
3. Create PR to `sandbox`
4. After sandbox validation, promote to `qa`
5. After QA validation, promote to `prod`

## 📝 Pull Request Process

### Before Creating a PR

1. **Run all checks locally**
   ```bash
   npm run lint
   npm run type-check
   npm run test:unit
   npm run build
   ```

2. **Test your changes**
   - Ensure all tests pass
   - Add tests for new functionality
   - Update existing tests if needed

3. **Update documentation**
   - Update README if needed
   - Add JSDoc comments for new functions
   - Update API documentation

### PR Requirements

- **Title**: Clear and descriptive
- **Description**: Include:
  - What changed
  - Why it changed
  - How to test
  - Breaking changes (if any)
- **Labels**: Add appropriate labels
- **Reviews**: Requires at least 1 approval

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] No secrets committed
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
```

## 💻 Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces over type aliases for objects
- Follow ESLint rules

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `IPascalCase`

### Code Quality

```typescript
// ✅ Good
interface IUserData {
  id: string;
  name: string;
  email: string;
}

async function getUserById(id: string): Promise<IUserData> {
  // Implementation
}

// ❌ Bad
async function getUser(id: any): Promise<any> {
  // Implementation
}
```

## 🏗️ Infrastructure Changes

### CloudFormation Requirements

1. **All infrastructure must be defined in CloudFormation**
   - No manual AWS Console changes
   - All changes via IaC templates
   - Version control all templates

2. **Template Organization**
   ```
   /infra/cloudformation/
   ├── sandbox-stack.yml
   ├── qa-stack.yml
   ├── prod-stack.yml
   └── nested/
       ├── vpc.yml
       ├── lambda.yml
       └── database.yml
   ```

3. **Testing Infrastructure Changes**
   ```bash
   # Validate template
   aws cloudformation validate-template \
     --template-body file://infra/cloudformation/sandbox-stack.yml

   # Deploy to sandbox first
   aws cloudformation deploy \
     --template-file infra/cloudformation/sandbox-stack.yml \
     --stack-name group-ops-sandbox \
     --capabilities CAPABILITY_IAM
   ```

## 🗄️ Database Migrations

### Migration Requirements

1. **All schema changes must use migrations**
   ```bash
   # Create new migration
   npm run migrate:create add-user-preferences

   # Test migration
   npm run migrate:dry-run

   # Apply migration
   npm run migrate:up
   ```

2. **Migration File Structure**
   ```typescript
   export async function up(db: Db): Promise<void> {
     // Forward migration
   }

   export async function down(db: Db): Promise<void> {
     // Rollback migration
   }
   ```

3. **Atlas Search Index Updates**
   - Define indexes in `/infra/atlas-indexes/`
   - Sync using `npm run sync:search-indexes`

## 🧪 Testing Requirements

### Test Coverage

- Minimum 80% code coverage
- All new features must have tests
- All bug fixes must have regression tests

### Test Types

1. **Unit Tests** (`/tests/unit/`)
   - Test individual functions
   - Mock external dependencies
   - Fast execution

2. **Integration Tests** (`/tests/integration/`)
   - Test component interactions
   - Use test database
   - Test API endpoints

3. **E2E Tests** (`/tests/e2e/`)
   - Test complete user flows
   - Run against deployed environment
   - Smoke tests for critical paths

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📚 Documentation

### Documentation Requirements

1. **Code Documentation**
   - JSDoc for all public functions
   - Inline comments for complex logic
   - Type definitions with descriptions

2. **API Documentation**
   - GraphQL schema descriptions
   - Example queries/mutations
   - Error response documentation

3. **README Updates**
   - Keep README.md current
   - Document new features
   - Update setup instructions

### Documentation Structure

```
/docs/
├── prd/           # Product requirements
├── design/        # Technical design
├── api/           # API documentation
└── guides/        # User guides
```

## 🚨 Incident Response

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email security@groupops.platform
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## 📮 Getting Help

- **Discord**: [Join our Discord](https://discord.gg/groupops)
- **Issues**: [GitHub Issues](https://github.com/your-org/group-ops-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/group-ops-platform/discussions)

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to Group Ops Platform! 🎉