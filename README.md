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

## School access and data

The [school handover guide](SCHOOL-HANDOVER.md) explains account roles, parent–child links, and operational workflows. Staff and parents access records through the website using their own school-issued accounts. Administrators manage account access in the staff dashboard. School records and database backups belong in school-controlled storage. Share initial credentials through the school's approved secure channel and store tokens in the backend environment.

The [Airtable schema](schema/mls-airtable-schema.json) documents the base structure. The [academic calendar](schema/academic-calendar.json) supplies the term dropdowns. These files contain definitions and calendar metadata. The operational data and any Airtable exports are managed separately.
