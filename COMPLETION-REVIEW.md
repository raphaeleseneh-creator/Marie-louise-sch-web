> Historical verification from 6 November 2026. Some findings were fixed later; consult PERFORMANCE-AND-CAPACITY.md and the current workflow guides for the latest status.

# School website completion review

Follow-up: the local preview has since been restored and the core browser journeys tested. See LOCAL-JOURNEY-TEST.md for current evidence, fixes and remaining verification limits. The unavailable-preview statements below describe the earlier audit.

Reviewed 6 November 2026 against the requests in this conversation. This is a source, database and automated-test review. The local browser preview refused connection, so no current visual or accessibility sign-off is provided. Nothing was published.

## Verified

- TypeScript check and production build pass. Build warns about the large JavaScript bundle and Vite config use of __dirname.
- Database-enabled tests: 20 pass when run sequentially with `node --test --test-concurrency=1 server/tests/*.test.js` and RUN_DB_TESTS=1. The default concurrent run fails an importer account-count assertion because another suite creates accounts concurrently. Fix test isolation or serialize the database suites.
- Airtable Students read request returns HTTP 200. Credentials were not printed, and no Airtable records were imported during this review.
- Tests cover parent child isolation, teacher class permissions, account revocation, password changes, CSV rollback, publication permissions, announcement targeting/expiry, payment balances, admissions and tours.

## Request checklist

| Request | Status and remaining work |
| --- | --- |
| Mobile header and admissions priority | Implemented in source; current mobile visual check blocked by unavailable preview. |
| Selected class, dialog focus and Escape | Implemented using selected class state and shared native dialog; browser retest outstanding. |
| Contact and prospectus actions | Contact links and separate email prospectus request implemented; downloadable prospectus and a school-approved response time remain outstanding. |
| Friendly portal outage handling | Implemented in both portal entry flows; browser verification outstanding. |
| Staff dashboard and MySQL API | Implemented; local browser availability remains unresolved during this audit. |
| Staff/parent accounts and record permissions | Implemented and tested. Only one account and one guardian link exist; full school onboarding remains. |
| Parent portal connected to MySQL | Implemented and tested; real family onboarding and user acceptance testing remain. |
| Results and CSV | Entry, import, editing, publication and parent reports implemented/tested; no operational results currently present. Confirm grading policy. |
| Attendance | Entry/update and parent viewing implemented/tested; no term-wide attendance filter. |
| Fees/payments | Invoice creation, manual payment recording, balance checks and receipts implemented/tested; no operational finance records, online payment gateway or automatic bank verification. |
| Announcements | Targeting, publishing and expiry implemented/tested for portal use. Public news is separate static content. |
| Admissions and tours | Submission and staff status workflows implemented/tested; no automatic confirmation emails or admission-to-enrolment conversion. |
| Sessions and terms | Dropdowns/filter implemented from static schema/academic-calendar.json. No live calendar management; two terms lack session links, and Term 1 dates need checking against the labelled session. |
| Airtable schema and JSON | Schema catalog and mirror-table support exist. Operational tables remain a separate simplified model. Schema matching does not prove complete record import or formula equivalence. |
| Airtable live sync | Access verified, but dashboard sync handles students only. Its mapping uses Student_ID and Class Name/Class_Name; reconcile with StudentIDCode and Class Name (from Student Class), and use stable Airtable IDs consistently. Add timeout, retry, preview and sync history. |
| Staff control of every website function | Incomplete. Public news/stories come from src/data/school.ts; no general staff content/media publishing interface. |
| School ownership handover | Local instructions exist; school-owned hosting/database accounts, secure credential handover, backups, restore testing and staff training remain. |

## Public promises needing implementation or revised wording

Parent portal promotional text promises school calendar, live morning clock-in records, instant payment verification, field-trip consent forms and teacher messaging. The current portal provides daily attendance, manually recorded payments, notices and reports. Add the promised workflows or change the wording. View All News & Events currently opens the featured story rather than a full news listing.

## Fourteen-area standards checklist

1. Frontend: implemented; browser/mobile/accessibility verification outstanding.
2. API/backend: main workflows tested; missing full sync/content workflows above.
3. Database/storage: MySQL working; operational data incomplete; media/document storage absent.
4. Authentication/permissions: core boundaries tested; finish family/staff onboarding and secure recovery process.
5. Hosting/deployment: no full-stack deployment verified; current hosting configuration targets static dist only. Publication remains deferred as requested.
6. Cloud infrastructure: no school-owned production setup verified.
7. Git/version control: present; verify deployed branch matches reviewed work; secrets/data stay excluded.
8. CI/CD: no .github workflow found; add automated checks and controlled deployment.
9. Application security: hashed passwords, sessions, origin checks and validation present; complete dependency/security review and production configuration. Confirm the token shared in chat was replaced.
10. Rate limiting: login and public inquiry limits exist in memory; assess other write routes and use shared limits when scaling.
11. Caching/CDN: private API responses use no-store; production public-asset CDN not verified.
12. Balancing/scaling: database pool exists; no multi-server deployment verified. Add complexity only when traffic requires it.
13. Tracking/logging: basic console errors; add staff audit trail, redacted error reporting and uptime alerts.
14. Availability/disaster recovery: health endpoint and recovery guidance exist; automatic backups, proven restoration, monitoring and recovery ownership remain unverified.

## Recommended order

1. Restore a reachable local preview and test desktop/mobile with real staff and parent accounts.
2. Reconcile authoritative school records, import reviewed data, verify explicit guardian links and create accounts.
3. Correct and expand live Airtable mappings/sync; make terms/sessions live and fix source calendar relationships.
4. Complete staff content management and any promised calendar, messaging, consent or payment integrations.
5. Resolve concurrent-test isolation, run checks automatically, and perform final security/performance review.
6. Before any authorized publication, prepare school-owned hosting, private database access, HTTPS, monitoring, backups, restoration and handover.
