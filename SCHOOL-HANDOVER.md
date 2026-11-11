# Local school system

The staff dashboard is at http://localhost:3000/admin. Parents use http://localhost:3000/parent-portal.

## Start locally

Run `npm.cmd run server` in the project folder, then run `npm.cmd run dev` in a second terminal. Keep both running. MySQL must also be running. No deployment is performed by these commands.

The API adds missing account and enquiry tables automatically on startup. Existing school tables and records are preserved. To apply these additions separately, run `npm.cmd run db:migrate`.

## Administrator and accounts

The first administrator can be created once with `npm.cmd run create-admin`. It asks for a name and email and generates a strong password into `.local/initial-admin.txt`. This folder is excluded from Git. Open the file locally, save the details in a password manager, sign in, change the password in Account settings, and delete the local credential file when no longer needed.

Use Accounts in the dashboard to create additional administrators, teachers and bursars. Use at least 12 characters for passwords. Assign classes to teachers. Parents do not need an account created for them (see below); an administrator can still create or deactivate one.

### Parent sign-in (Email + Unique ID)

Parents sign in at the parent portal with the **email address on their Parents record** and their child's **unique ID**: the pupil's Student ID (`StudentIDCode` in Airtable, e.g. `ML-2025-014`, stored as `students.student_code`). Any of their linked children's IDs works. The server then emails a 6-digit one-time code to that address; entering it opens the portal. No staff approval, separate registration, password or Google account is needed. The first successful sign-in creates the parent's portal account automatically; an existing parent account for the same parent record is reused.

Access requires all of: an active pupil with that Student ID, an active parent record with that email, and a recorded guardian-child link between them (from Airtable or added by staff). After sign-in the parent sees every active child linked to their parent record. If anything is missing or ambiguous (for example the email also belongs to a staff account, or two parent records share an email), sign-in fails with the same generic message and no code is sent.

Why a code is required: Student IDs are sequential and appear on school documents, so they identify a child but cannot prove who is signing in. Codes expire after 10 minutes, are single-use and allow 5 attempts. Sign-in is limited to 10 code requests per IP and 5 per email address every 15 minutes. Student IDs and codes are never logged or stored (only hashes).

Email delivery must be configured before parents can sign in: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM` in `.env` (use a school-owned mailbox). Without them the portal shows "Parent sign-in is not available yet". For local testing only, `MAIL_TRANSPORT=dev-outbox` writes messages to `.local/outbox` instead of sending them; it is ignored when `NODE_ENV=production`.

To remove a parent's access, delete or revoke the link in Airtable (`ParentStudentLinks.Link_Status = Revoked`, an `End_Date` in the past, or unlinking the Parents/Students link fields), set the parent's `Portal Access` to Suspended/Disabled, or set the pupil to Inactive. The change applies on the next Airtable sync. Deactivating the account in Accounts also blocks sign-in immediately. Account deactivation or password reset revokes existing sessions. Passwords are stored as salted scrypt hashes. Browser sessions expire after eight hours; logout and password change revoke them.

- Administrators manage school records and publish results.
- Teachers manage results, attendance, and notices for their assigned classes. They submit results as pending for administrator approval.
- Bursars manage invoices and payments.
- Parents see their linked active children, published results, attendance, invoices, receipts and applicable published notices.

## Results, imports and reports

Download the CSV template in Results. The required headings are `student_id,term_id,subject,ca1_score,ca2_score,exam_score`. Optional headings are `teacher_remarks,publication_status`. Maximum 1,000 result rows per import. Quoted commas, escaped quotes, line breaks, Windows line endings and UTF-8 BOM are supported. The total and grade are calculated on the server; scores must not exceed 100 combined. Default grade boundaries are A:70, B:60, C:50, D:45, E:40, otherwise F. Confirm the school's assessment weighting and grading policy before entering real marks. Existing marks for the same child, term and subject must be edited rather than reimported. An import is all-or-nothing: errors roll back the batch.

Choose an academic session and term when entering results. CSV imports use the term IDs listed under **Term IDs for CSV imports**. The calendar in `schema/academic-calendar.json` uses the school’s Airtable export IDs. Confirm source dates and session links before updating this catalog. Older results remain visible and can be linked to a term by editing them.

Results start as draft, may be submitted as pending, and are published by administrators. Parents see published results only. Report and receipt print views use the browser print dialog; choose Save as PDF if you need a file.

## Invoices, attendance and communication

Attendance is one record per student per day; saving the same date updates that record. Payments are attached to invoices; the backend locks the invoice while saving, rejects payments over the outstanding balance, and updates paid/partially-paid status. Receipts are unique. Announcement audience must match a chosen class or child; school-wide notices require an administrator. Expired or unpublished notices are hidden from parents.

Public admissions and tour forms save requests before showing confirmation. Their references are generated by the server. Administrators review them in Admissions and Tours and update the follow-up status. These requests do not automatically create enrolled students or send emails. The school should confirm tour availability manually.

## Airtable

Airtable is the source of enrolment and family records. New and corrected Airtable records reach the portal only when a sync runs; there is no instant push from Airtable.

- `npm.cmd run sync:airtable` reads Classes, Students, Parents, ParentStudentLinks, Academic Session, Terms, Academic Results, Attendance, Fees and Payments from the Airtable API and applies them with the validated importer below, in one database transaction. Add `-- --dry-run` to report without writing. Only one sync runs at a time.
- The dashboard's **Sync students from Airtable** button runs the same full sync.
- Schedule `npm.cmd run sync:airtable` (Windows Task Scheduler or cron), for example every 15 minutes. That interval is how long a new enrolment, a corrected email or a removed link takes to reach the portal.

The sync needs `AIRTABLE_API_TOKEN` (read access to the base) and `AIRTABLE_BASE_ID` in `.env`. Imported guardian-child links are removed when Airtable no longer records them; links that staff add directly in the portal are kept.

For each family to be able to sign in, Airtable must have: a Parents record with a valid, unique `ParentEmail`; the pupil's `StudentIDCode`; the pupil linked to a class (`Student Class`); and a link between parent and pupil, either through `Parents.Students` (or `Students 2`/`Students 3`) or a `ParentStudentLinks` row with `Parent` and `Student` set. Links found only by matching an email (`ParentEmail_Student`) are never used.

### Local Airtable JSON Importer

To validate and import local Airtable JSON exports (`AIRTABLE_EXPORT_DIR` in `.env`, defaulting to `.local/airtable-exports`) into the operational MySQL tables (`classes`, `students`, `parents`, `parent_students`, `academic_results`, `attendance`, `fee_invoices`, and `payments`):

1. **Dry-run (default, no database writes):**
   ```powershell
   npm.cmd run import:airtable
   ```
   Or with a custom export directory:
   ```powershell
   node server/import-airtable.js --source "./.local/airtable-exports"
   ```
2. **Apply reviewed import (idempotent via `airtable_record_id`):**
   ```powershell
   node server/import-airtable.js --apply
   ```

The importer validates class and term mappings, score boundaries, explicit publication status, invoice-to-payment student consistency, and verified guardian-student links (never linking by matching name, email, or class), and leaves `accounts`, `password_hash`, and `sessions` untouched.

## Verification

Run `npm.cmd run lint`, `npm.cmd run build` and `npm.cmd run test:server`. Database integration tests require `RUN_DB_TESTS=1` and the local database connection. Integration tests create uniquely named fixtures and remove only their own records afterward.

## Migration recovery and hosting

Before using production data, take a MySQL backup and test restoration. The new tables are `accounts`, `staff_classes`, `sessions`, `admissions`, `tours` and `parent_sign_in_challenges`. There is no automatic destructive rollback. To undo code deployment, stop the new API, restore the prior code, and leave the additive tables intact. If new account or enquiry data must be removed, export it first and explicitly review the exact tables; never drop the existing student or finance tables as part of this migration.

Hosting requires HTTPS with `NODE_ENV=production`, a correct `APP_ORIGIN`, a private database connection, regular backups, and school-owned hosting accounts. Secure cookies require HTTPS in production. The local API binds to loopback by default. Configure a trusted reverse proxy deliberately if changing that architecture. The in-memory request limiter protects the current single API process; shared rate limiting is needed if running multiple servers. The limiter keys on the connecting IP: if a reverse proxy is added, configure `trust proxy` deliberately or every parent will share one limit. There are no online card payments in this version; the only automatic emails are parent sign-in codes.
