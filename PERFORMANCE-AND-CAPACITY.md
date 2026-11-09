# Performance and capacity

Updated 9 November 2026.

## Changes

- The public website, staff workspace and parent portal load separately. Visitors no longer download every dashboard on first arrival.
- Compressed JavaScript for a direct parent or staff visit is approximately 41% smaller than the previous shared bundle. Homepage JavaScript is approximately 12% smaller. These compare complete static dependency graphs, excluding CSS and images; they are not measured page-load-time promises.
- Parent records use one authenticated request per selected child instead of five. Six scoped data reads provide results, attendance, invoices, receipts and notices; totals reuse those rows. Only transient read failures receive one bounded retry. Writes are never automatically replayed.
- The staff workspace deduplicates student, class and guardian lists for up to 30 seconds in component memory. Account changes, writes and explicit refresh clear this cache. No school records are stored in browser storage or public caches.
- Mobile parent sign-in avoids downloading the desktop-only background photo.
- Hashed scripts and styles receive long browser cache lifetimes. School photos use Vercel's CDN. HTML revalidates so new deployments are picked up, and a refresh action handles an old open tab whose lazy chunk was replaced.
- Private API responses remain `no-store`; all parent and staff permissions still run on the server.
- Results and payment lookup indexes are installed by the database migration without duplicating equivalent indexes. They have also been applied to production without changing school records.
- Each Vercel function instance retains a bounded database pool of five connections and a queue limit of 50. Increasing the pool is not a substitute for database capacity planning.

## Verification

TypeScript and production builds pass. Unit checks cover account-scoped cache isolation, duplicate request suppression, invalidation, partial record failures, scoped reads, exact monetary totals and equivalent-index detection.

Browser checks with synthetic records confirmed that public navigation opens the separately loaded portal, a parent receives records through a single combined request, and changing portal tabs reuses those records. At 390px width the sign-in page has no horizontal overflow and selects a small inline placeholder instead of the hidden desktop photo.

Database-enabled regression run: 35 checks passed, three integration requests hit the old 10-second client deadline, and the hosting-entry check hit its old 20-second whole-test deadline. The integration group was consequently marked unsuccessful. After matching the test request deadline to the 30-second hosted handler and allowing startup recovery in the hosting test, all five rerun checks passed, with no failures or cancellations. The latest four performance unit checks also passed. The new parent read helper retries a transient connection failure once; the same permission assertions remain enforced.

Eight concurrent synthetic parent page loads were compared from the developer computer against a dedicated TiDB test schema using the production pool limit of five. The same page data was loaded after warmup; temporary synthetic records were removed afterward. No live school records were used.

| Metric | Previous five-request flow | Combined request flow |
| --- | ---: | ---: |
| Concurrent page loads | 8 | 8 |
| HTTP requests | 40 | 8 |
| SQL statements, including session and permission checks | 184 | 72 |
| Failed page loads | 0 | 0 |
| Median completion | 10.855 seconds | 3.261 seconds |
| Slowest completion / empirical p95 | 11.179 seconds | 4.527 seconds |

This run used 80% fewer HTTP requests and approximately 61% fewer SQL statements. Its slowest completion improved by approximately 60%. It is a small synthetic comparison from one network, not a production load guarantee, a representative long-history dataset, or a statistical capacity certification. Published timings include network distance to TiDB and can vary.

## Operating limits and next capacity step

These changes reduce work per visitor; they do not establish unlimited capacity. TiDB Cloud Starter's free allowance and the Vercel project's plan limits still apply. TiDB can throttle work when a zero spending limit and its free allowance are reached. Check usage during busy admission and report-release periods.

Before advertising a specific larger concurrency target, agree the expected simultaneous users and acceptable response time, then run a staged test against a representative non-production database from the hosting region. Monitor response latency, errors, database connections, request units and function usage. Increase the database/hosting capacity only with the school's budget approval.

Official references: [TiDB Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/), [TiDB Starter pricing details](https://www.pingcap.com/tidb-cloud-starter-pricing-details/), [Vercel cache headers](https://vercel.com/docs/caching/cache-control-headers).
