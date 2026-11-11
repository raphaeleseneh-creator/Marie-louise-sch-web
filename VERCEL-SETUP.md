# Vercel backend deployment

Status on 7 November 2026: the school database has been migrated to TiDB, Vercel server settings are configured, and the repaired release has been promoted and verified at the existing production URL. See TIDB-MIGRATION.md for migration evidence and remaining work. The steps below are the repeatable setup procedure; the statement about missing local authentication describes the original repair prerequisite.

The repository now includes a Vercel Function in api/index.js that serves the existing Express API. vercel.json sends /api requests to the function and serves the React application for direct /admin and /parent-portal visits. Existing assets keep their normal URLs.

## Required before a working production sign-in

1. Sign in to the Vercel account that owns the existing marie-louise-sch-web project. The local CLI currently has no valid authentication.
2. Create or identify a hosted MySQL database. The current local .env points at this computer. Vercel cannot use that local database address.
3. Back up the local database. Restore the reviewed school schema and records, including account password hashes and parent-child links, into the hosted database using the provider's secure migration tools. Do not upload exports to GitHub or Vercel deployment files. Avoid importing demo/test data into production.
4. Configure the following values privately in the existing Vercel project's Production environment settings:

| Name | Value |
| --- | --- |
| MYSQL_HOST | Provider's hosted hostname, never localhost or 127.0.0.1 |
| MYSQL_PORT | Provider's MySQL port |
| MYSQL_DATABASE | Hosted school database name |
| MYSQL_USER | Dedicated application user |
| MYSQL_PASSWORD | Application user's password |
| MYSQL_SSL | true |
| MYSQL_SSL_CA | Provider CA certificate if required; literal newline escapes are supported |
| NODE_ENV | production |
| APP_ORIGIN | https://marie-louise-sch-web.vercel.app |

The TLS certificate is verified. Do not disable verification to solve a connection error. Allow only the connectivity required by the selected hosting arrangement. Use a separate migration administrator when practical; the application user should have only the permissions the API needs.

5. Run npm.cmd run db:migrate once from a trusted environment configured for the hosted database. It makes additive schema changes; review the target and take a backup first. It does not run inside ordinary Vercel requests. The operational school tables must already exist before migration.
6. Verify the project root is this repository folder and use its Vite build configuration. Deploy the reviewed changes to a protected Preview first using a separate test database. Production school records must not be exposed through preview environments.
7. Verify /api/health returns HTTP 200 with ok=true. Verify /api/auth/me returns HTTP 401 JSON when signed out (not 404 or a successful student-data response). Direct /admin and /parent-portal visits and browser refreshes should load the React page.
8. Verify sign-in, logout, parent-child isolation, teacher classes and secure cookies with synthetic records in Preview. Then deploy the same reviewed code to the existing production project and check its read-only health/routes. Do not create test families in the live database without approval.

## Connection behavior

The Vercel function refuses an incomplete, loopback or non-TLS database configuration with a generic HTTP 503 response. This is a real setup failure, not a successful connection. It never exposes database credentials in the response. It uses Vercel's pool lifecycle helper and a bounded MySQL connection pool. Local development can continue using the existing local MySQL connection.

Local .env files and database exports are excluded from deployment. Secrets go in hosting environment settings, not browser variables or source code. Set Airtable credentials there separately only if Airtable sync is needed; MySQL sign-in does not require them.

## Remaining production work

The current request limiter is per-instance memory and is not a shared limit across Vercel instances. Configure shared throttling or an appropriate Vercel firewall rule before opening high-volume public access. Database hosting, backups, production migration, real account onboarding, monitoring and credential handover require verification; adding these deployment files alone does not complete them.

## Local checks

Run npm.cmd run lint and npm.cmd run build. Run npm.cmd run test:server with RUN_DB_TESTS=1 only against an approved test database; tests create temporary fixtures and clean up their own rows.
