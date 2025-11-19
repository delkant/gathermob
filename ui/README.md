# Group Ops UI

A Next.js-based frontend application for the Group Ops community and event management platform with full internationalization support.

## Features

- **OTP Authentication**: Secure phone number-based authentication
- **Responsive Design**: Mobile-first UI using Tailwind CSS
- **Component Library**: Built with shadcn/ui components
- **Type Safety**: Full TypeScript implementation
- **Form Validation**: Zod-based schema validation
- **Internationalization**: Full i18n support with next-intl (currently en-US)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Management**: React Hook Form
- **Validation**: Zod
- **HTTP Client**: Axios
- **Notifications**: Sonner
- **Internationalization**: next-intl

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=https://rmb33fzf34.execute-api.us-east-1.amazonaws.com/sandbox
```

### Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
ui/
├── app/                    # Next.js app directory
│   ├── (public)/          # Public routes (login, verify)
│   ├── (app)/             # Protected routes (home, dashboard)
│   └── layout.tsx         # Root layout with IntlProvider
├── components/
│   ├── ui/                # Reusable UI components
│   └── providers/         # Context providers (IntlProvider)
├── lib/
│   ├── api/               # API client modules
│   ├── validation/        # Zod schemas
│   └── utils/             # Utility functions
├── locales/
│   └── en-US/            # English (US) translations
│       └── common.json   # Translation strings
├── middleware.ts          # Route protection middleware
├── i18n.ts               # Internationalization config
└── next.config.ts        # Next.js config with i18n plugin
```

## Authentication Flow

1. User enters phone number on `/login`
2. OTP is sent to the user's phone
3. User enters OTP on `/verify`
4. JWT token is stored in HTTP-only cookie
5. User is redirected to `/home`

## Custom Components

- **OTPInput**: 6-digit OTP input with auto-focus
- **PhoneInput**: Formatted phone number input
- **ApiButton**: Button with loading state
- **FormError**: Error message display
- **Spinner**: Loading indicator

## Available Routes

- `/login` - Phone number entry
- `/verify` - OTP verification
- `/home` - Protected dashboard (requires auth)

## Development Guidelines

- Components use TypeScript for type safety
- Forms use React Hook Form with Zod validation
- API calls are centralized in `/lib/api`
- All protected routes require authentication via middleware
- All user-facing text must be externalized to locale files
- Use `useTranslations()` hook for localized strings in components
- Maintain translations in `/locales/en-US/common.json`

## Testing

To test the authentication flow:

1. Start the development server
2. Navigate to `/login`
3. Enter a valid phone number (e.g., +15555555555)
4. Use `123456` as the test OTP code
5. You'll be redirected to the home page upon success

## Deployment

The application can be deployed to any platform that supports Next.js:

- Vercel (recommended)
- AWS Amplify
- Netlify
- Docker container

## Localization

The application is fully internationalized using next-intl:

### Current Locale Support
- **en-US**: English (United States) - Complete

### Adding New Locales
1. Create a new folder in `/locales/` (e.g., `/locales/es-ES/`)
2. Copy `common.json` from `en-US` and translate all strings
3. Update `i18n.ts` configuration to include the new locale
4. No component changes required - all text is externalized

### Translation Keys Structure
```json
{
  "auth": {
    "login": { ... },
    "verify": { ... },
    "logout": { ... }
  },
  "dashboard": { ... },
  "organizations": { ... },
  "events": { ... }
}
```

## License

Private - All rights reserved