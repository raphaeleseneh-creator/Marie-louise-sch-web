# Marie Louise School — Parent Portal Airtable Schema & Integration Guide

This document defines the recommended Airtable base schema, field specifications, linked-record relationships, and secure integration architecture for the Marie Louise School Parent Portal.

---

## 1. Security Architecture & Zero-Exposure Policy

> [!CAUTION]
> **Never expose Airtable Personal Access Tokens (PAT) or API keys in client-side code.**
> Doing so allows users to inspect network requests or source bundles and obtain administrative access to your school database.

### Recommended Secure Proxy Architecture
```
┌─────────────────────────┐          HTTPS           ┌─────────────────────────────┐         Airtable API        ┌───────────────────────┐
│   Browser / Frontend    │ ◄──────────────────────► │   Backend API Proxy / Edge  │ ◄─────────────────────────► │    Airtable Base      │
│   (ParentPortalPage)    │   Session Cookie / JWT   │   (Next.js / Node / Worker) │   Server-side PAT Bearer    │    (Marie Louise Sch) │
└─────────────────────────┘                          └─────────────────────────────┘                             └───────────────────────┘
```

1. **Client Isolation:**
   The frontend communicates **only** with the application's portal service layer (`src/services/portalService.ts`), which in turn calls backend endpoints (e.g. `/api/portal/dashboard`).
2. **Server-Side Token Storage:**
   The Airtable Personal Access Token (`AIRTABLE_API_KEY` or `AIRTABLE_PAT`) and Base ID (`AIRTABLE_BASE_ID`) must reside exclusively in server-side environment variables (`.env.server`).
3. **Session & Scoped Access:**
   The backend proxy verifies the signed-in parent's session and filters queries so parents can **only read and write records linked to their own pupil(s)**.

---

## 2. Table Specifications & Linked Records

The schema comprises 11 core tables and 1 circular notice table, fully matching the TypeScript models defined in [`src/types/portal.ts`](file:///c:/Users/HomePC/Downloads/marie-louise-school/src/types/portal.ts).

### Table 1: Parents (`tblParents`)
Stores verified parent/guardian accounts.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Full Name` | Single line text | Yes | *(Primary Field)* | E.g. `Mrs. Chidinma Chukwuma` |
| `First Name` | Single line text | Yes | — | E.g. `Chidinma` |
| `Last Name` | Single line text | Yes | — | E.g. `Chukwuma` |
| `Email` | Email | Yes | Unique | Primary email used for portal access |
| `Phone` | Phone number | Yes | — | Primary phone / WhatsApp number |
| `Admission Identity` | Single line text | Yes | — | Alternate identifier (e.g. `MLS-0012`) |
| `Relationship` | Single select | Yes | `Mother`, `Father`, `Guardian` | Relationship to registered pupils |
| `Address` | Long text | No | — | Residential address |
| `Pupil Links` | Link to another record | Yes | `tblParentPupilLinks` | Junction records linking children |
| `Pupils` | Link to another record | Yes | `tblPupils` | Direct reference to pupils |
| `Created Time` | Created time | System | — | Account creation timestamp |

---

### Table 2: Pupils (`tblPupils`)
Enrolled students at Marie Louise School.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Full Name` | Single line text | Yes | *(Primary Field)* | E.g. `Kamsiyochukwu Chukwuma` |
| `Admission Number` | Single line text | Yes | Unique | E.g. `MLS-P3-042` |
| `First Name` | Single line text | Yes | — | Pupil first name |
| `Last Name` | Single line text | Yes | — | Pupil last name |
| `Class` | Single select | Yes | `Nursery 1` through `Primary 6` | Current class placement |
| `Gender` | Single select | Yes | `Male`, `Female` | Pupil gender |
| `Date of Birth` | Date | Yes | `YYYY-MM-DD` | Date of birth |
| `House` | Single select | Yes | `Blue House`, `Yellow House`, `Red House`, `Green House` | School house affiliation |
| `Class Teacher` | Single line text | Yes | — | E.g. `Mrs A. Adeyemi` |
| `Teacher Role` | Single line text | No | — | E.g. `Primary 3 Lead Teacher` |
| `Status` | Single select | Yes | `Good standing`, `Active`, `Probation`, `Alumni` | Academic standing |
| `Avatar Initials` | Formula | Yes | `LEFT({First Name}, 1) & LEFT({Last Name}, 1)` | E.g. `KC` |
| `Attendance Rate` | Percent / Number | Yes | Precision 1 | E.g. `98.2%` |
| `Current Average` | Percent / Number | Yes | Precision 1 | E.g. `90.3%` |
| `Academic Term` | Single line text | Yes | — | E.g. `First term · 2026/2027 academic session` |
| `Teacher Remarks` | Long text | No | — | Lead teacher's term summary appraisal |
| `Parents` | Link to another record | Yes | `tblParents` | Linked parents |
| `Assignments` | Link to another record | No | `tblAssignments` | Pupil coursework and tests |
| `Attendance` | Link to another record | No | `tblAttendance` | Daily attendance clock-in records |
| `Invoices` | Link to another record | No | `tblInvoices` | Term bills and invoices |
| `Payments` | Link to another record | No | `tblPayments` | Verified payment receipts |

---

### Table 3: Parent-Pupil Links (`tblParentPupilLinks`)
Junction table managing multi-guardian permissions and pickup authorization.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Link ID` | Formula | Yes | *(Primary Field)* `CONCATENATE({Parent}, " ➔ ", {Pupil})` | Unique junction label |
| `Parent` | Link to another record | Yes | `tblParents` (Limit 1) | The parent/guardian |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | The linked child |
| `Relationship Type` | Single select | Yes | `Mother`, `Father`, `Legal Guardian`, `Authorized Pickup` | Contact role |
| `Is Primary Contact` | Checkbox | Yes | — | Whether this parent receives primary notices |
| `Can Pickup` | Checkbox | Yes | — | Authorized for school pickup |
| `Emergency Contact`| Checkbox | Yes | — | Authorized for emergency notifications |

---

### Table 4: Assignments (`tblAssignments`)
Continuous assessment marks, unit tests, homework, and projects.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Title` | Single line text | Yes | *(Primary Field)* | E.g. `Fractions and Decimals Reasoning` |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Student who took assignment |
| `Subject` | Single select | Yes | `Mathematics & problem solving`, `Literacy & reading`, `Science & discovery`, `Civic values` | School subject |
| `Description` | Long text | No | — | Brief overview of task |
| `Due Date` | Date | Yes | `YYYY-MM-DD` | Submission deadline |
| `Submitted Date` | Date | No | `YYYY-MM-DD` | Date submitted |
| `Score` | Number | Yes | Integer (0–100) | Points achieved (e.g. `92`) |
| `Max Score` | Number | Yes | Integer | Maximum points (e.g. `100`) |
| `Grade` | Single select | Yes | `Distinction`, `Excellent`, `Very Good`, `Good`, `Pass` | Grade tier |
| `Status` | Single select | Yes | `Graded`, `Submitted`, `Pending`, `Overdue` | Assessment workflow stage |
| `Teacher Feedback` | Long text | No | — | Constructive remarks from teacher |

---

### Table 5: Attendance (`tblAttendance`)
Daily morning roll-call entries.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Entry ID` | Formula | Yes | *(Primary Field)* `CONCATENATE({Pupil}, " - ", DATETIME_FORMAT({Date}, 'YYYY-MM-DD'))` | Record label |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Student |
| `Date` | Date | Yes | `YYYY-MM-DD` | Attendance date |
| `Status` | Single select | Yes | `Present`, `Late`, `Absent`, `Excused` | Attendance status |
| `Time In` | Single line text | No | E.g. `07:44 AM` | Morning clock-in timestamp |
| `Remarks` | Long text | No | — | Daily attendance notes |

---

### Table 6: Invoices (`tblInvoices`)
Tuition bills, uniforms, learning materials, and activity dues.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Invoice Number` | Single line text | Yes | *(Primary Field)* E.g. `MLS-INV-2026-0082` | Bill reference code |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Student billed |
| `Parent` | Link to another record | Yes | `tblParents` (Limit 1) | Responsible payer |
| `Title` | Single line text | Yes | — | E.g. `First Term Tuition & Core Academic Resources` |
| `Term` | Single select | Yes | `First Term 2026/2027`, etc. | Billing session |
| `Amount Due` | Currency (NGN ₦) | Yes | Precision 2 | Total billed amount |
| `Amount Paid` | Rollup | Yes | Sum of `{Amount}` from `tblPayments` | Total verified payments |
| `Balance` | Formula | Yes | `{Amount Due} - {Amount Paid}` | Outstanding balance |
| `Due Date` | Date | Yes | `YYYY-MM-DD` | Payment deadline |
| `Issue Date` | Date | Yes | `YYYY-MM-DD` | Invoice issue date |
| `Status` | Single select | Yes | `Settled`, `Partially Paid`, `Pending`, `Overdue` | Payment state |
| `Payments` | Link to another record | No | `tblPayments` | Linked transaction records |
| `Payment Proofs` | Link to another record | No | `tblPaymentProofs` | Linked proof submissions |

---

### Table 7: Payments (`tblPayments`)
Verified transactions and digital receipts.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Receipt Number` | Single line text | Yes | *(Primary Field)* E.g. `MLS-RCP-8921` | Official receipt ID |
| `Invoice` | Link to another record | Yes | `tblInvoices` (Limit 1) | Invoice being paid |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Student beneficiary |
| `Parent` | Link to another record | Yes | `tblParents` (Limit 1) | Paying parent |
| `Item Description` | Single line text | Yes | — | E.g. `Tuition & learning materials` |
| `Amount` | Currency (NGN ₦) | Yes | Precision 2 | Amount credited |
| `Payment Date` | Single line text / Date | Yes | E.g. `08 Sep 2026` | Date confirmed |
| `Payment Method` | Single select | Yes | `Bank Transfer`, `Card`, `Direct Debit`, `Cash` | Channel |
| `Status` | Single select | Yes | `Verified`, `Processing`, `Failed` | Verification status |
| `Reference` | Single line text | Yes | E.g. `FT-GTB-8921441` | Bank transfer reference |

---

### Table 8: Timetables (`tblTimetables`)
Weekly schedule per class.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Entry ID` | Formula | Yes | *(Primary Field)* `CONCATENATE({Class}, " ", {Day of Week}, " P", {Period})` | Unique identifier |
| `Class` | Single select | Yes | `Primary 3`, etc. | Class level |
| `Day of Week` | Single select | Yes | `Monday` through `Friday` | Weekday |
| `Period` | Number | Yes | 1 to 8 | Lesson index |
| `Start Time` | Single line text | Yes | E.g. `08:15` | Lesson start |
| `End Time` | Single line text | Yes | E.g. `09:00` | Lesson end |
| `Subject` | Single line text | Yes | — | Subject title |
| `Teacher` | Single line text | Yes | — | Teacher name |
| `Room` | Single line text | No | E.g. `Room 3A` | Classroom or laboratory |

---

### Table 9: Calendar Events (`tblCalendarEvents`)
Key term milestones, meetings, exhibitions, and breaks.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Event Title` | Single line text | Yes | *(Primary Field)* E.g. `Science exhibition` | Event title |
| `Description` | Long text | No | — | Details |
| `Date` | Date | Yes | `YYYY-MM-DD` | Event date |
| `Day Display` | Single line text | Yes | E.g. `23` | Short day |
| `Month Display` | Single line text | Yes | E.g. `SEP` | Short month |
| `Category` | Single select | Yes | `Academic`, `Sports`, `Arts & Culture`, `School Event`, `Holiday` | Calendar category |
| `Target Class` | Single line text | No | E.g. `All Primary` | Audience filter |
| `Location` | Single line text | No | E.g. `School Main Hall` | Venue |

---

### Table 10: Absence Reports (`tblAbsenceReports`)
Parent-submitted absence notices.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Report ID` | Formula | Yes | *(Primary Field)* `CONCATENATE("ABS-", {Pupil}, "-", {Start Date})` | Reference code |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Child being excused |
| `Parent` | Link to another record | Yes | `tblParents` (Limit 1) | Reporting parent |
| `Start Date` | Date | Yes | `YYYY-MM-DD` | First day absent |
| `End Date` | Date | Yes | `YYYY-MM-DD` | Expected return date |
| `Reason` | Single select | Yes | `Illness`, `Medical Appointment`, `Family Event`, `Travel`, `Other` | Excuse reason |
| `Notes` | Long text | Yes | — | Parent message / description |
| `Status` | Single select | Yes | `Submitted`, `Approved`, `Under Review`, `Declined` | Office status |
| `Submitted At` | Created time | System | — | Submission timestamp |
| `Reviewed By` | Single line text | No | — | School staff reviewer |
| `Acknowledgement Note` | Long text | No | — | School confirmation message |

---

### Table 11: Payment Proofs (`tblPaymentProofs`)
Uploads of bank transaction receipts submitted by parents.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Proof ID` | Formula | Yes | *(Primary Field)* `CONCATENATE("PRF-", {Invoice}, "-", {Reference Number})` | Reference code |
| `Invoice` | Link to another record | Yes | `tblInvoices` (Limit 1) | Targeted bill |
| `Pupil` | Link to another record | Yes | `tblPupils` (Limit 1) | Student |
| `Parent` | Link to another record | Yes | `tblParents` (Limit 1) | Submitting parent |
| `Amount` | Currency (NGN ₦) | Yes | Precision 2 | Transferred amount |
| `Bank Name` | Single line text | Yes | E.g. `Guaranty Trust Bank` | Source / destination bank |
| `Payment Date` | Date | Yes | `YYYY-MM-DD` | Transfer date |
| `Reference Number` | Single line text | Yes | E.g. `FT-GTB-8921441` | Bank transaction ID / session |
| `Receipt Attachment` | Multiple attachments | No | PDF / JPG / PNG | Proof document |
| `Notes` | Long text | No | — | Additional parent remarks |
| `Status` | Single select | Yes | `Submitted`, `Under Verification`, `Approved`, `Declined` | Verification status |
| `Uploaded At` | Created time | System | — | Upload timestamp |

---

### Table 12: Notices (`tblNotices`)
Official school bulletins and announcements.

| Field Name | Airtable Field Type | Required | Linked Table / Options | Description |
|---|---|---|---|---|
| `Title` | Single line text | Yes | *(Primary Field)* E.g. `Science exhibition preparation` | Notice heading |
| `Category` | Single select | Yes | `School office`, `Class update`, `Calendar`, `Important` | Notice category |
| `Date Display` | Single line text | Yes | E.g. `18 Sep` | Display date |
| `Notice Copy` | Long text | Yes | — | Announcement body |
| `Is Priority` | Checkbox | No | — | Highlights with badge |
| `Target Audience` | Single select | No | `All Parents`, `Primary Only`, `Nursery Only` | Visibility scope |

---

## 3. Step-by-Step Transition to Live Airtable

When ready to connect to a live Airtable base:
1. Create a base in Airtable with the 12 tables and fields specified above.
2. In your backend environment (`.env`), set:
   ```env
   AIRTABLE_PERSONAL_ACCESS_TOKEN=patXXXXXXXXXXXXXX
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```
3. Implement an endpoint (e.g. `POST /api/portal/dashboard`, `POST /api/portal/absence`, `POST /api/portal/payment-proof`) that uses the official `airtable` npm package on the server.
4. Update `src/services/portalService.ts` to call your backend endpoints instead of reading `LocalParentPortalService`.
5. **No changes to `ParentPortalPage.tsx` or any UI component are required.**
