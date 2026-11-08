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

- Existing active school accounts retain their roles and child links. For an unlinked existing account, automatic email matching is restricted to authoritative Gmail or Google Workspace addresses verified by Google. Other email providers must use their existing school password and contact the school for account linking; do not bypass this check.
- New parents register only from the parent portal. They receive an inactive, pending parent account and a restricted session showing approval status. They cannot read pupil, fee, payment, attendance or announcement records, or use staff actions.
- Staff cannot self-register or select their own role. The school must create the staff account first.
- In **Accounts & access**, an administrator reviews the pending registration, privately verifies the guardian, selects the correct active guardian record and confirms every listed child. Guardian records and child links are maintained under **Parents & guardians**. Approval rejects a changed child list and requires another review.
- Approval revokes the pending session. The parent signs in again and can view only children linked to the approved guardian record. Additional child links must continue to be verified by staff.
- Deactivated approved accounts cannot register again to bypass deactivation. Every protected API rejects pending accounts independently of the interface.

## Verify before launch

Test Google popup success with the configured client, consent cancellation, invalid/expired credentials, replayed challenges, wrong browser, a deactivated account, existing staff, a new pending parent and approval. Use two separate families and confirm that changing a student URL cannot reveal another family's records. Confirm password login remains functional.

The registration does not collect phone numbers or provide self-service multi-child access requests yet. Those remain separate work from Google registration and staff-reviewed guardian linking.

Reference: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
