> Historical proposal, superseded by PARENT-ACCOUNT-LINKING.md. Parent accounts now register directly; private school-issued linking codes replace repeated staff approval.

# Proposed parent registration and approval

This is a proposed workflow, not an implemented feature.

```mermaid
flowchart TD
    A[Parent opens portal] --> B{Already registered?}
    B -->|Yes| C[Sign in]
    B -->|No| D[Enter name, email, phone and password]
    D --> E[Verify email]
    E --> F[Request access to one or more children]
    F --> G[Enter first child's registration ID, name and relationship]
    G --> G2{Another child?}
    G2 -->|Add another child| G3[Add a separate row for the next child]
    G3 --> G2
    G2 -->|Ready| H[Submit requests: each child awaits separate school approval]
    H --> I[No pupil records visible]
    H --> J[Administrator reviews request privately]
    J --> K{Guardianship verified for this child?}
    K -->|More information needed| L[Ask parent for information about this child]
    L --> J
    K -->|No| M[Decline this request: no access to this child]
    K -->|Yes| N{Pupil record exists?}
    N -->|No| O[School verifies enrolment and creates or imports record]
    O --> P[School approves and records parent-child link]
    N -->|Yes| P
    P --> Q[Parent sees only approved children]
    C --> R{Approved child link exists?}
    R -->|No| H
    R -->|Yes| Q
    Q --> S[Published results, attendance, fees and notices]
```

Knowing a child's name or admission number is not proof of guardianship. Staff verify the relationship using trusted school records or an established contact. Each additional child requires a separately approved link. Every approval, decline and link change should record the responsible staff member and time.

## Multiple children in one parent account

The request form starts with one child row containing registration/admission ID, child's name, class if known, and the parent's relationship. An **Add another child** button adds another row; **Remove** removes an unsent row. Parents can submit several child requests together or request another child later without creating a new parent account. If an ID is unknown, they can submit details for private school review.

Each child has an independent status: pending, more information needed, approved or declined. Approving one child never approves the others. A parent can use an approved child's portal while other requests remain pending. Pending rows show only the details supplied by that parent; entering an ID must not reveal matching pupil data or confirm whether a pupil exists. Prevent duplicate active requests for the same child ID within the same account.

After approval, the existing child selector lists only approved, eligible children. An **Add another child** action remains available beside a separate **Access requests** section. Staff review and record a separate decision for each child.

Teachers use administrator-issued invitations with assigned roles and classes. Parents cannot select staff privileges. Google or Microsoft sign-in can simplify account authentication later; neither replaces guardian approval.
