# Vensar Connect sign in

React and Vite frontend for Vensar Connect employee sign in.

## Run locally

```sh
npm install
npm run dev
```

## Authentication integration

The login UI is ready for an authentication API. Set `VITE_AUTH_API_URL` in a local `.env` file, using [`.env.example`](./.env.example) as a guide.

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
