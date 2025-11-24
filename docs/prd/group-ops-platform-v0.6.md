# Product Requirements Document (PRD)
## Group Ops Platform - Version 0.6

### Document Information
- **Version**: 0.6
- **Date**: November 2024
- **Status**: Implemented
- **Author**: Development Team

### Executive Summary

Version 0.6 introduces comprehensive organization management capabilities with role-based access control (RBAC). This release enables users to create and manage organizations, invite members, assign roles, and control permissions. The system ensures proper governance with admin-only operations and safeguards against removing the last administrator.

### Release Highlights

1. **Organization Management System**
   - Create, update, and delete organizations
   - Automatic admin assignment for creators
   - Organization visibility settings

2. **Member Management**
   - Invite members by phone number
   - Role assignment (Admin, Moderator, Member)
   - Member removal and self-exclusion

3. **Role-Based Access Control**
   - Admin-only permissions for critical operations
   - Configurable member permissions
   - Last admin protection

4. **UI Implementation**
   - Organization list and detail pages
   - Member management interface
   - Create organization workflow

### Functional Requirements

#### 1. Organization Creation and Management

##### 1.1 Create Organization
- **Description**: Users can create new organizations
- **Acceptance Criteria**:
  - ✅ Any authenticated user can create an organization
  - ✅ Creator automatically becomes ADMIN
  - ✅ Organization slug is auto-generated and unique
  - ✅ Settings include visibility, approval, and guest RSVP options

##### 1.2 Update Organization
- **Description**: Admins can update organization settings
- **Acceptance Criteria**:
  - ✅ Only ADMINs can update organization details
  - ✅ Settings can be modified after creation
  - ✅ Changes are immediately reflected

##### 1.3 Delete Organization
- **Description**: Admins can delete organizations
- **Acceptance Criteria**:
  - ✅ Only ADMINs can delete organizations
  - ✅ Deletion requires confirmation
  - ✅ All related data is removed (memberships, events)

#### 2. Member Management

##### 2.1 Invite Members
- **Description**: Admins can invite new members
- **Acceptance Criteria**:
  - ✅ Only ADMINs can invite members
  - ✅ Invitation includes role assignment
  - ✅ Phone number-based invitation system
  - ⏳ SMS notification (future enhancement)

##### 2.2 Manage Member Roles
- **Description**: Admins can change member roles
- **Acceptance Criteria**:
  - ✅ Three role levels: ADMIN, MODERATOR, MEMBER
  - ✅ Only ADMINs can change roles
  - ✅ Cannot demote last ADMIN
  - ✅ Role changes are immediate

##### 2.3 Remove Members
- **Description**: Admins can remove members
- **Acceptance Criteria**:
  - ✅ Only ADMINs can remove members
  - ✅ Cannot remove last ADMIN
  - ✅ Removal requires confirmation
  - ✅ Members can leave voluntarily

#### 3. Permission System

##### 3.1 Role Definitions
- **ADMIN**:
  - ✅ Full organization control
  - ✅ Member management
  - ✅ Settings modification
  - ✅ Organization deletion

- **MODERATOR**:
  - ✅ Event management
  - ✅ Content moderation
  - ❌ Cannot manage members
  - ❌ Cannot delete organization

- **MEMBER**:
  - ✅ View organization details
  - ✅ Participate in events
  - ❌ No management permissions
  - ✅ Can leave organization

##### 3.2 Permission Enforcement
- **Description**: Permissions enforced at API level
- **Acceptance Criteria**:
  - ✅ Backend validates all operations
  - ✅ UI respects permission levels
  - ✅ Proper error messages for unauthorized actions

### Technical Implementation

#### Backend Architecture

##### GraphQL Schema Updates
```graphql
enum MembershipRole {
  MEMBER
  MODERATOR
  ADMIN  # Changed from OWNER
}

type Organization {
  id: ObjectId!
  name: String!
  slug: String!
  settings: OrganizationSettings!
  members: MemberConnection!
  myRole: MembershipRole  # User's role in organization
}
```

##### Key Mutations
- `createOrganization`: Creates org with admin membership
- `updateMemberRole`: Changes member role with validation
- `removeMember`: Removes member with last admin check
- `deleteOrganization`: Deletes org and all related data

##### Database Transactions
- Organization creation uses MongoDB transactions
- Ensures atomic creation of org and membership
- Rollback on any failure

#### Frontend Implementation

##### Page Structure
```
/organizations
  └── page.tsx              # List all user's organizations
  └── new/
      └── page.tsx          # Create organization form
  └── [slug]/
      └── page.tsx          # Organization detail with tabs
```

##### Components
- `OrganizationMembersTable`: Member list with actions
- `InviteMemberDialog`: Invite new members
- `CreateOrganizationForm`: Organization creation

##### State Management
- Apollo Client for GraphQL
- Optimistic updates for better UX
- Cache invalidation on mutations

### User Interface

#### Organization List Page
- Grid layout showing all organizations
- Quick stats (members, events)
- User's role badge
- Create organization CTA

#### Organization Detail Page
- **Header**: Name, description, role
- **Stats**: Member count, event count
- **Tabs**:
  - Members (with management table)
  - Events (future implementation)
  - Settings (admin only)

#### Member Management
- Table with user details
- Role badges with distinct colors
- Dropdown actions for admins
- Confirmation dialogs

### Security Considerations

1. **Authentication**: JWT-based with phone verification
2. **Authorization**: Role-based with backend enforcement
3. **Data Protection**: User data encrypted at rest
4. **Audit Trail**: All admin actions logged
5. **Rate Limiting**: API throttling for mutations

### Business Rules

1. **Organization Lifecycle**
   - Any user can create organizations
   - Organizations must have at least one admin
   - Deletion is permanent and cascading

2. **Member Management**
   - Phone number uniqueness per organization
   - Role changes immediate
   - Invitation expiry (future)

3. **Permission Hierarchy**
   - ADMIN > MODERATOR > MEMBER
   - Higher roles inherit lower permissions
   - Configurable member permissions (future)

### Performance Requirements

- Organization list: < 200ms load time
- Member table: Support 1000+ members with pagination
- Role updates: < 500ms response time
- Search functionality: < 100ms for indexed queries

### Localization

- All UI text uses next-intl
- Support for multiple languages (future)
- Date/time formatting per locale
- Phone number formatting

### Testing Coverage

#### Unit Tests
- Permission validation logic
- Business rule enforcement
- GraphQL resolver functions

#### Integration Tests
- Full CRUD operations
- Role change workflows
- Transaction rollback

#### E2E Tests
- Organization creation flow
- Member invitation process
- Permission denial scenarios

### Migration Path

1. **Database Migration**
   - Update existing OWNER roles to ADMIN
   - Add indexes for performance
   - Backfill missing fields

2. **API Compatibility**
   - GraphQL schema is backwards compatible
   - Deprecated fields marked appropriately

### Known Limitations

1. **Current Version**
   - No SMS notifications yet
   - No bulk member import
   - No organization templates
   - Basic search functionality

2. **Technical Debt**
   - Member lookup by phone needs optimization
   - Cache invalidation needs refinement
   - Pagination implementation pending

### Future Enhancements

#### Phase 2 (v0.7)
- [ ] SMS invitation system
- [ ] Bulk member import
- [ ] Organization categories
- [ ] Advanced search

#### Phase 3 (v0.8)
- [ ] Organization analytics
- [ ] Activity tracking
- [ ] Sub-organizations
- [ ] API webhooks

### Success Metrics

1. **Adoption Metrics**
   - Organizations created per day
   - Active organizations (30-day)
   - Member growth rate

2. **Engagement Metrics**
   - Admin actions per organization
   - Member retention rate
   - Feature utilization

3. **Performance Metrics**
   - API response times
   - Error rates
   - Transaction success rate

### Dependencies

#### External Services
- MongoDB Atlas for database
- AWS Lambda for compute
- Twilio for SMS (pending)

#### Internal Systems
- Authentication service
- GraphQL API
- Frontend application

### Rollout Plan

1. **Beta Testing**
   - Internal team testing
   - Selected user group
   - Feedback collection

2. **Production Release**
   - Gradual rollout (10%, 50%, 100%)
   - Monitoring and alerts
   - Rollback procedure ready

### Support Documentation

#### User Guide
- How to create an organization
- Managing members
- Understanding roles
- Troubleshooting common issues

#### Admin Guide
- Best practices for organization management
- Security recommendations
- Bulk operations
- API usage

### Changelog

#### Version 0.6 (Current)
- ✅ Organization CRUD operations
- ✅ Member management with RBAC
- ✅ Admin role (renamed from OWNER)
- ✅ UI implementation with localization
- ✅ Permission enforcement
- ✅ Last admin protection

#### Version 0.5
- Phone-only authentication
- Basic UI scaffolding
- GraphQL setup

#### Version 0.4
- Initial backend implementation
- Database schema
- Authentication flow

### Appendix

#### A. Database Schema
See `/docs/design/organization-management.md` for detailed schema

#### B. API Documentation
GraphQL schema at `/src/api/schema.graphql`

#### C. UI Mockups
Implemented in `/ui/app/(app)/organizations/`

#### D. Test Cases
Test suite in `/tests/organizations/`

### Sign-offs

- **Product**: Approved for implementation
- **Engineering**: Implementation complete
- **QA**: Testing in progress
- **Security**: Review pending
- **Legal**: Compliance verified

---

*This PRD represents the implemented state of v0.6. For design details, see `/docs/design/organization-management.md`*