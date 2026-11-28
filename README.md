# Vensar Connect sign in

React and Vite frontend for Vensar Connect employee sign in.

The independent PostgreSQL API project is maintained separately at `/Users/ritesh/Backends/vensar-connect-backend`. It has its own package, environment variables, and run commands.

## Run locally

```sh
npm install
npm run dev
```

## Login screen options

The login designs have separate routes and share the same sign in and OTP behavior:

| Route | Screen |
| --- | --- |
| `/` and `/login` | Current login design (`src/login/LoginClassic.tsx`) |
| `/login/option-b` | Alternate login design (`src/login/LoginOptionB.tsx`) |
| `/login/option-c` | Centered logo and compact image-card design (`src/login/LoginOptionC.tsx`) |

To make another design the default, change the `/` and `/login` entries in `src/login/LoginRoutes.tsx` to `LoginOptionB` or `LoginOptionC`. New designs can be added as another screen component and an entry in that route map. Option C has its own screen markup; all designs use the login state and API handlers in `src/App.tsx`.

## Authentication integration

The login UI is ready for an authentication API. Set `VITE_AUTH_API_URL` in a local `.env` file, using [`.env.example`](./.env.example) as a guide.

The control panel is available from the account menu after an administrator or developer signs in. Administrators can create users and change roles; both administrators and developers can manage projects, access and view sign-in activity. Management users see their assigned workspaces only. For local setup, create `.env.local` with `VITE_AUTH_API_URL=http://localhost:8001`, then restart Vite. Open the frontend at `http://localhost:5173` so the session cookie stays on the same site.

When running `npm run dev` without an API URL, the app uses a development-only authentication fallback: enter any valid 10-digit Indian mobile number and any nonempty password to open the OTP screen. Use `123456` as the test code. The UI uses final product copy and does not display development instructions. No email is sent and no account session is created. The fallback is disabled in production builds and whenever an API URL is configured.

The frontend expects JSON responses from these endpoints under the configured base URL:

| Endpoint | Request body | Successful response |
| --- | --- | --- |
| `POST /auth/start` | `{ "mobile": "+91XXXXXXXXXX", "password": "..." }` | `{ "challengeId": "...", "maskedEmail": "a***@vensar.com", "resendAfterSeconds": 30 }` |
| `POST /auth/verify` | `{ "challengeId": "...", "code": "123456" }` | `{ "authenticated": true }` and a secure HTTP-only session cookie |
| `POST /auth/resend` | `{ "challengeId": "..." }` | A fresh `challengeId`, `maskedEmail`, and `resendAfterSeconds` |

Errors should return a non-2xx status with `{ "message": "..." }`. Cross-origin deployments must allow credentialed requests from the frontend origin.

The backend must verify the mobile number and password, look up the employee's registered company email, enforce the `@vensar.com` domain, send and rate-limit OTPs, expire challenges and codes, and create the authenticated session after verification. The browser does not generate OTPs or store passwords or session tokens.

## Checks

```sh
npm run build
npm run lint
```
