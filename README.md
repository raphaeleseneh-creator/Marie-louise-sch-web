# Marie Louise School website

Public school website, staff dashboard and parent portal. The backend uses MySQL for accounts and school records. Airtable is an optional source for student imports.

## Local setup

1. Install Node.js and MySQL, then run `npm ci` from the project folder.
2. Create an empty MySQL database and a database user. Copy `.env.example` to `.env` and enter your local connection details.
3. In a MySQL client, select that database and run [schema/mysql-bootstrap.sql](schema/mysql-bootstrap.sql). The file creates the operational tables without loading school records.
4. Run `npm run db:migrate` to create the remaining application tables, then `npm run create-admin` to create the first administrator on a fresh database.
5. Run `npm run server` and `npm run dev` in separate terminals. Open the local [website](http://localhost:3000/), [staff dashboard](http://localhost:3000/admin), or [parent portal](http://localhost:3000/parent-portal).

Run `npm run lint`, `npm run build`, and `npm run test:server` to check the project.

See [performance and capacity](PERFORMANCE-AND-CAPACITY.md) for measured improvements, cache behavior, concurrency checks and hosting limits.

## Parent portal demo

`npm run demo` resets a separate database (`marie_louise_school_demo`) to a few fictional families and starts the API against it. Then run `npm run dev` and open the [parent portal](http://localhost:3000/parent-portal). Sign-in codes appear on screen instead of being emailed, and the sign-in page lists sample logins. The real school database is never touched. On first use the script prints two lines for a MySQL administrator to run once so the app's database user can create the demo database. Stop the normal API (`npm run server`) first, because both use port 4000.

The live site also has a browser-only version of the same demo at `/parent-portal?demo`, linked from the parent sign-in page as "Try the parent portal demo". It answers every request in the visitor's browser with the fictional families in `shared/portal-demo.js` and never calls the school API, so it cannot show or change real records. Its code is downloaded only when the demo is opened. To remove the link, delete the "Try the parent portal demo" anchor in `ParentPortalPage.tsx`. `npm run build:demo` builds a site where the whole parent portal is the demo.

## School access and data

The [school handover guide](SCHOOL-HANDOVER.md) explains account roles, parent–child links, and operational workflows. Staff sign in with school-issued accounts that administrators manage in the staff dashboard. Parents sign in with their email and their child's Student ID from the Airtable enrolment record, confirmed by an emailed one-time code; no staff approval is needed. School records and database backups belong in school-controlled storage. Share initial credentials through the school's approved secure channel and store tokens in the backend environment.

The [Airtable schema](schema/mls-airtable-schema.json) documents the base structure. The [academic calendar](schema/academic-calendar.json) supplies the term dropdowns. These files contain definitions and calendar metadata. The operational data and any Airtable exports are managed separately.
