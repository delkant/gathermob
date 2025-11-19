# PRD v0.5 — Basic Next.js UI with OTP Login (group-ops-ui)

## Project: niupi
## Version: 0.5
## Status: Implemented (Revised with Localization)

---

# 1. Objective
Build the first functional UI slice of the niupi app using the standardized Next.js architecture defined in prior internal guidance:

- Next.js App Router
- shadcn/ui as the design system
- TailwindCSS styling
- Zod validation
- React Hook Form for form logic
- class-variance-authority (CVA) for component variants
- Absolute imports (@/)
- Server-side session handling with HttpOnly cookies
- OTP-first authentication flow
- **Internationalization (i18n) support with next-intl**

This PRD ensures implementation clarity and provides explicit steps so another LLM (Claude) can begin writing the codebase.

---

# 2. Scope

## In Scope
- OTP login flow UI
- Login page
- Verify OTP page
- Home page (authenticated placeholder)
- All UI using shadcn-based components
- Zod schemas for all forms
- React Hook Form integration
- toast notifications (using Sonner)
- Resend OTP cooldown
- API client for OTP
- Middleware for route protection
- **Localization support for en-US (with infrastructure for future locales)**

## Out of Scope
- Full dashboard
- Admin-only views
- RBAC
- User settings
- Theming and branding
- **Multiple locale support (only en-US for now)**

---

# 3. User Stories

1. User can enter email or phone to request OTP.
2. User can verify OTP.
3. User receives clear error messages in their locale.
4. User gets a clean, responsive UI experience.
5. User session is persisted securely in cookies.
6. User is redirected to protected page after login.
7. User cannot access protected pages without authentication.
8. **User sees all interface text in proper English (US) format.**

---

# 4. System Behavior & Flow

1. User visits `/login`
2. Enters identifier (email or phone)
3. Form validates via Zod
4. Sends request → POST `/auth/otp` with action: "send"
5. On success → redirect to `/verify`
6. User enters 6-digit OTP
7. Validate form (Zod)
8. POST `/auth/otp` with action: "verify"
9. Backend sets HttpOnly auth cookie
10. Redirect to `/home`

Protected routes require middleware authentication.

---

# 5. Technical Requirements

## 5.1 Framework
- Next.js 16+ with App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- Zod
- React Hook Form
- CVA
- lucide-react icons
- **next-intl for internationalization**

## 5.2 Authentication
- Auth cookie set server-side
- No token stored in localStorage
- Server components read session
- Middleware:
  - Block /home for unauthenticated users
  - Allow /login, /verify only when not authenticated

## 5.3 Localization
- **next-intl for i18n management**
- **Locale files in JSON format**
- **Default locale: en-US**
- **Server-side locale detection**
- **Client-side locale provider**
- **All user-facing strings externalized**

---

# 6. UI Component Requirements

## 6.1 Use shadcn/ui components exclusively:
- Button
- Input
- Card
- Form suite (Form, FormField, FormMessage...)
- Sonner (for toast notifications)
- Separator
- Skeleton
- Label

## 6.2 Required Custom UI Components
To be implemented using CVA + shadcn styling:

- `ui/otp-input` - 6-digit OTP input with auto-focus
- `ui/phone-input` - Phone number input with US formatting
- `ui/spinner` - Loading spinner
- `ui/api-button` - Button with loading state
- `ui/form-error` - Error message display

All components must be fully typed with TypeScript.

---

# 7. Pages & Functional Requirements

## 7.1 `/login`
### Features:
- Card layout
- Identifier input
- Auto-detect phone/email
- Zod validation
- API call to `/auth/otp` with action: "send"
- On success redirect to `/verify`
- On error show toast
- **All text localized via next-intl**

### Required Components:
- Input / PhoneInput
- ApiButton
- Form
- FormMessage
- Card

---

## 7.2 `/verify`
### Features:
- 6-digit OTP input
- Zod validation
- API call to `/auth/otp` with action: "verify"
- Resend button w/ 30s cooldown
- Toast error handling
- On success: redirect to `/home`
- **All text localized via next-intl**

### Required Components:
- otp-input
- api-button
- Form
- Sonner toast

---

## 7.3 `/home`
### Features:
- Protected route
- Reads user session
- Simple "Welcome {identifier}" message
- Logout button
- Organization and Events cards
- Quick actions section
- **All text localized via next-intl**

---

# 8. API Requirements

## 8.1 Request OTP
POST `/auth/otp`
```json
{
  "action": "send",
  "phoneNumber": "+1234567890"
}
```
Response:
```json
{
  "success": true,
  "message": "OTP sent"
}
```

## 8.2 Verify OTP
POST `/auth/otp`
```json
{
  "action": "verify",
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```
Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "phone": "+1234567890"
  }
}
```
Backend sets HttpOnly cookie.

---

# 9. Folder Structure

```
ui/
  app/
    (public)/
      login/page.tsx
      verify/page.tsx
    (app)/
      home/page.tsx
    layout.tsx
  components/
    ui/
      button.tsx
      input.tsx
      form.tsx
      otp-input.tsx
      phone-input.tsx
      spinner.tsx
      api-button.tsx
      form-error.tsx
    providers/
      intl-provider.tsx
  lib/
    api/
      auth.ts
    validation/
      login.ts
      login-localized.ts
      otp.ts
    utils/
      phone.ts
  locales/
    en-US/
      common.json
  middleware.ts
  i18n.ts
  next.config.ts
```

---

# 10. Localization Structure

## 10.1 Locale File Structure (en-US/common.json)
```json
{
  "app": {
    "name": "Group Ops",
    "description": "Community and event management platform"
  },
  "auth": {
    "login": {
      "title": "Welcome back",
      "description": "Enter your phone number or email to sign in",
      "phoneOrEmail": "Phone number or Email",
      "sendOtp": "Send OTP",
      "otpSent": "OTP sent successfully! Check your phone."
    },
    "verify": {
      "title": "Verify your identity",
      "description": "We sent a 6-digit code to {identifier}",
      "verificationCode": "Verification Code",
      "verifyOtp": "Verify OTP",
      "backToLogin": "Back to login",
      "resendCode": "Resend code",
      "resendIn": "Resend in {seconds}s"
    },
    "logout": {
      "button": "Logout",
      "success": "Logged out successfully"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome!",
    "loggedInAs": "Logged in as {identifier}"
  },
  "organizations": {
    "title": "Organizations",
    "description": "Manage your organizations",
    "viewButton": "View Organizations",
    "createButton": "Create Organization"
  },
  "events": {
    "title": "Events",
    "upcomingTitle": "Upcoming events",
    "viewButton": "View Events",
    "createButton": "Create Event"
  }
}
```

## 10.2 Implementation Requirements
- All user-facing strings must be externalized to locale files
- Use `useTranslations()` hook in client components
- Use `getTranslations()` in server components
- Support parameter interpolation for dynamic values
- Maintain type safety with TypeScript
- Format dates/times according to locale (America/New_York timezone for en-US)

---

# 11. Security Requirements

- Only HttpOnly cookies
- Inputs sanitized
- Disable autocomplete on sensitive fields
- Resend limiter enforced client + server
- No secrets exposed to client
- HTTPS enforced in non-dev environments

---

# 12. UX & Accessibility Requirements

- Clean minimal interface
- Fully responsive
- All forms keyboard-navigable
- ARIA labels required
- Error messages always visible and descriptive
- **All text properly localized**
- **Consistent date/time formatting per locale**
- **RTL support infrastructure (for future locales)**

---

# 13. Definition of Done

- Login and verify pages fully functional
- shadcn/ui installed and configured
- Custom components implemented
- Middleware enforcing route protection
- Session persists correctly
- Resend timeout works
- **Localization working for all user-facing text**
- **en-US locale file complete**
- **next-intl properly configured**
- End-to-end flow verified locally
- CI/CD deploys to sandbox
- PR reviewed and merged

---

# 14. Explicit Instructions for Claude (Important)

Claude must:

1. **Generate a fresh Next.js (App Router) project**
2. **Install and configure shadcn/ui**
3. **Install and configure next-intl for localization**
4. **Create locale files for en-US**
5. **Implement folders exactly as shown**
6. **Implement components exactly as defined**
7. **Implement Zod schemas first**
8. **Implement forms using React Hook Form**
9. **Write the API client in /lib/api/auth.ts**
10. **Implement middleware for auth protection**
11. **Use server components for reading session**
12. **Implement OTP UI using the custom otp-input component**
13. **Wrap app with IntlProvider**
14. **Use useTranslations hook for all user-facing strings**

Claude must not:
- invent new components
- change folder structure
- use external UI kits
- store tokens in localStorage
- bypass middleware
- hardcode user-facing strings
- ignore localization requirements

All code must follow modern Next.js best practices.

---

# 15. Future Localization Considerations

While only en-US is implemented initially, the infrastructure supports:
- Multiple locales (es-ES, fr-FR, etc.)
- RTL languages (ar-SA, he-IL)
- Locale-specific date/time formats
- Currency formatting
- Number formatting
- Pluralization rules
- Context-specific translations

The system is designed to easily add new locales by:
1. Creating new locale folder (e.g., `/locales/es-ES/`)
2. Translating the JSON files
3. Updating i18n configuration
4. No code changes required in components

---

# END OF DOCUMENT