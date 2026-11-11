# School database hosting handover

Migration performed 7 November 2026.

## Verified migration

- The local MySQL source contains 42 tables, all using InnoDB. No stored routines, triggers or events were present.
- A full local SQL backup and checksum manifest are saved in the private .local/backups folder. This folder is excluded from Git and Vercel uploads. The backup file was checked for completion and checksum integrity; a standalone restoration of that SQL dump has not been tested.
- The destination is the school's MySQL-compatible TiDB Cloud Starter instance in AWS us-east-1. Its database is marie_louise_school.
- All 42 tables and 1,034 rows were copied. A private content comparison confirmed every copied row matches the local source and foreign-key counts are preserved.
- Active browser sessions were deliberately excluded. Existing account password hashes, roles and guardian links were preserved.
- The local MySQL database was not modified by the migration. Future changes to the two databases are independent; this is not continuous replication.

## Website connection

- Vercel uses a dedicated application SQL user limited to SELECT, INSERT, UPDATE and DELETE within the school database. It does not use the TiDB root password.
- Database settings are stored as sensitive Production environment variables in the existing Vercel project.
- Connections require TLS with certificate verification. The function runs in iad1, matching the database region, on Node.js 24.
- Vercel serves the existing Express API through api/index.js. It does not run migrations during ordinary requests.
- Direct staff and parent routes have explicit frontend rewrites. API routes remain directed to the backend function.
- Airtable credentials have not been added to Vercel as part of this repair; hosted Airtable sync remains unconfigured.

## Private local files

.env remains the local development database configuration. .env.tidb is the TiDB administration configuration; .env.tidb.app is the dedicated application configuration. These files are excluded from Git and deployment. Do not share their contents in chat or commit them.

## Verification boundaries

Cloud API tests run in a separate schema containing only disposable synthetic records, never in the migrated school database. Run the cloud suite with TZ=UTC to match Vercel/TiDB and DB_TEST_TIMEOUT_MS=300000 for network latency. Ordinary local tests keep their existing default timeout.

The staged Vercel deployment returned HTTP 200 for health and both portal routes; authentication returned HTTP 401 JSON when signed out and for an invalid synthetic login. It was promoted to the existing production URL after the isolated cloud API suite passed all 13 checks. Cloud importer, database configuration, validation and entry-point checks also passed across the verification runs. The first cloud API run exceeded the local timeout; a later run identified the host/UTC time-zone difference, and the final run passed with the Vercel/TiDB UTC environment.

After promotion, the live /api/health returned HTTP 200 with ok=true and database=connected; /api/auth/me correctly returned HTTP 401 JSON when signed out. Both /admin and /parent-portal returned HTTP 200 and their sign-in forms were observed in the browser. No real administrator password was entered in the live browser during these checks. Existing passwords were preserved by copying their hashes.

Production URL: https://marie-louise-sch-web.vercel.app

The earlier 404 and sign-in-unavailable deployment issues are resolved. This does not certify every live staff workflow or complete the proposed self-registration feature.

## Follow-up responsibilities

Keep periodic private backups and test recovery. Monitor the free TiDB allowance and the school's zero spending limit; availability is subject to the provider's quota. Complete real parent onboarding, verified child links, staff class assignments, shared rate limiting and production monitoring before opening the portal widely. Existing demo records were preserved as part of the exact copy and should be reviewed separately rather than silently deleted.
