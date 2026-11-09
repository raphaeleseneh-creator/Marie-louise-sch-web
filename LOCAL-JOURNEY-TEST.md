> Historical verification from 6 November 2026. Some findings were fixed later; consult PERFORMANCE-AND-CAPACITY.md and the current workflow guides for the latest status.

# Local preview and journey verification

Verified 6 November 2026. Preview restored at http://127.0.0.1:3000/ with API on loopback port 4000. Homepage, staff route, parent route and proxied API health each return HTTP 200. Nothing was deployed.

## Browser checks

Used two synthetic families, an administrator, teacher and bursar. All temporary accounts and records were removed afterward.

| Journey | Observed result |
| --- | --- |
| Teacher sign-in and scope | Only assigned test class and child visible; finance/admin menu items absent. |
| Result entry | Mathematics saved pending, 10 + 20 + 60 = 90. |
| CSV results | English imported pending, 15 + 15 + 50 = 80. This browser check pasted CSV content; file upload itself was not exercised. |
| Attendance | Present entry saved and displayed to the linked parent. |
| Parent before approval | Pending results hidden. |
| Administrator approval | Mathematics published; English remained pending. |
| Parent after approval | Mathematics visible with grade A; pending English hidden; term filter correctly excluded the result when another term was selected. |
| Invoice and payment | Synthetic invoice of NGN 1,000 and payment of NGN 400 saved; parent and bursar saw NGN 600 balance and partial payment. Receipt appeared in parent list. |
| Targeted notice | Published class notice reached linked family; second family saw no notice. |
| Second parent | Only their own child visible; no first-family attendance or fee totals. Direct unauthorized access is also covered by automated tests. |
| Public admissions | Primary 4 selection carried into dialog. After date-submission fix, request saved with a reference and correct birth date. Staff changed status to contacted. |
| Public tours | Request saved with preferred date and reference; staff reviewed and confirmed the synthetic request. |
| Bursar | Finance workspace visible; results, announcements and account management absent. |
| Sign-out | Returns to sign-in for both staff and parents. |
| Responsive views | Staff finance checked at desktop width; mobile staff sign-in checked at 390px with no horizontal page overflow. Parent screens inspected at the initial narrow browser width. |

## Changes made

- Admissions and tours now read their date field from the submitted form, preventing a visible date from being omitted when component state has not updated. Added accessible date labels.
- Database test suites run sequentially by default to prevent account-count assertions colliding with another suite's temporary accounts.

## Automated verification

RUN_DB_TESTS=1 with npm.cmd run test:server: 20 passed, zero failures or skips. TypeScript and production build passed. Existing non-fatal Vite __dirname and large bundle warnings remain.

## Cleanup

Synthetic fixture cleanup was verified after the historical test run.

## Limits

This verifies the tested local workflows, not production readiness or complete accessibility compliance. Physical printing/PDF output, browser CSV file upload, account creation/reset UI, email delivery, online payments, full Airtable synchronization and every device/browser combination were not tested in this browser run. Automated tests cover account creation, password changes, revocation, permissions and CSV validation. No real user password was changed. Live Airtable sync was not invoked.

Screenshots with synthetic data are saved under C:/Users/HomePC/.codex/visualizations/2026/10/13/01a136b2-6288-7d81-bbeb-ca858fed72ef/journey-check/.
