# Marie Louise School website

Public school website, staff dashboard and parent portal. The backend uses MySQL for accounts and school records. Airtable is an optional source for student imports.

## Local setup

1. Install Node.js and MySQL, then run `npm ci` from the project folder.
2. Create an empty MySQL database and a database user. Copy `.env.example` to `.env` and enter your local connection details.
3. In a MySQL client, select that database and run [schema/mysql-bootstrap.sql](schema/mysql-bootstrap.sql). The file creates the operational tables without loading school records.
4. Run `npm run db:migrate` to create the remaining application tables, then `npm run create-admin` to create the first administrator on a fresh database.
5. Run `npm run server` and `npm run dev` in separate terminals. Open the local [website](http://localhost:3000/), [staff dashboard](http://localhost:3000/admin), or [parent portal](http://localhost:3000/parent-portal).

Run `npm run lint`, `npm run build`, and `npm run test:server` to check the project.

## Parent portal demo

`npm run demo` resets a separate database (`marie_louise_school_demo`) to a few fictional families and starts the API against it. Then run `npm run dev` and open the [parent portal](http://localhost:3000/parent-portal). Sign-in codes appear on screen instead of being emailed, and the sign-in page lists sample logins. The real school database is never touched. On first use the script prints two lines for a MySQL administrator to run once so the app's database user can create the demo database. Stop the normal API (`npm run server`) first, because both use port 4000.

For the static live site, `npm run build:demo` builds `dist` with a browser-only version of the same demo: the parent portal answers its own requests in the visitor's browser using the fictional families in `shared/portal-demo.js`, and no server, database or email is involved. Publish that `dist` while the real setup is pending. When the API, email and Airtable setup are ready, run `npm run build` (which contains no demo code) and publish again.

## School access and data

The [school handover guide](SCHOOL-HANDOVER.md) explains account roles, parent–child links, and operational workflows. Staff sign in with school-issued accounts that administrators manage in the staff dashboard. Parents sign in with their email and their child's Student ID from the Airtable enrolment record, confirmed by an emailed one-time code; no staff approval is needed. School records and database backups belong in school-controlled storage. Share initial credentials through the school's approved secure channel and store tokens in the backend environment.

The [Airtable schema](schema/mls-airtable-schema.json) documents the base structure. The [academic calendar](schema/academic-calendar.json) supplies the term dropdowns. These files contain definitions and calendar metadata. The operational data and any Airtable exports are managed separately.
