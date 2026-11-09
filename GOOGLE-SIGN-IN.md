# Google sign-in setup

Google sign-in uses Google Identity Services and verified ID tokens. MySQL/TiDB continues to store school accounts, sessions, roles and guardian links. No Google client secret, access token or refresh token is stored.

## Activate

1. In Google Cloud Console, select a school-owned project. Open **Google Auth Platform**, configure the app name, support email and audience. Choose an external audience so parents outside the school organization can use it.
2. Open **Clients → Create client → Web application**. Add these **Authorized JavaScript origins**:
   - `https://marie-louise-sch-web.vercel.app`
   - `http://localhost:3000` (local testing)
   - `http://127.0.0.1:3000` (optional local testing)
   This popup ID-token flow does not use a redirect URI.
3. Copy the **Client ID**, ending in `.apps.googleusercontent.com`. Do not send a client secret or password.
4. Set `GOOGLE_CLIENT_ID` in the private local environment and in Vercel's Production environment. The Google button stays hidden when this value is empty.
5. Run the additive database migration using a database administrator connection **before deploying the updated code**. It adds `accounts.google_sub`, `accounts.registration_pending` and `google_login_nonces`. Do not grant schema-changing privileges to the website database user.
6. Redeploy after the database migration and environment changes. While the Google app is in testing, add the intended test accounts in Google Auth Platform. Review branding, privacy policy and Google's publishing requirements before making sign-in available to all families.

## How access works

- Google verifies account identity. Existing active school accounts retain their roles and child links.
- Parents can register and sign in immediately. New accounts use **Link children**, entering school-issued student IDs and a private, one-time code. There is no parent approval queue and no automatic child access based on email or a parent ID.
- **Family access codes** lets the school's Administrator or Developer issue the student IDs and code for a family. Codes expire after seven days and are stored as hashes. Siblings share one parent record.
- Parents see only their linked children. Staff still cannot self-register or choose a privileged role. Deactivated accounts remain blocked.
- Existing accounts and guardian links are preserved. Developer preview is separate from parent access.

See [Parent account and linking guide](PARENT-ACCOUNT-LINKING.md) for setup, code issuance, replacement and sibling linking.

## Verify before launch

Test Google's real popup with the configured client, cancellation, expired credentials, wrong browser and deactivated accounts. Test email/password registration without approval, linking several children, wrong student IDs, code replay and expiry, adding a sibling later and isolation between two families. Confirm only the school's Administrator and Developer can issue codes.

Reference: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
