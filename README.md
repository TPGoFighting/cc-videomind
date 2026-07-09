# Teach Player Android App

React Native + Expo client for Teach Player.

## Development

```powershell
npm install
npm run mobile:start
```

Create `apps/mobile/.env` with:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-teach-player-web-app.example.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

For an Android emulator talking to a local Next.js backend, use:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

## Backend Integration

The mobile app sends Supabase access tokens as Bearer auth. See:

- `docs/backend-mobile-auth.md`
- `docs/android-qa-performance.md`
