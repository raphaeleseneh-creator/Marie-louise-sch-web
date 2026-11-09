# Parent accounts and child linking

Parents register immediately using Google or email and a password of at least 12 characters. No staff approval is required to create or sign into an account. An account with no linked children can use the linking screen but cannot read pupil records.

## School workflow

1. Open **Family access codes** in the staff workspace. This is available to the school Administrator and Developer, not teachers or bursars.
2. Choose the family's guardian record, or add one if needed. This supplies the stable parent ID used for all siblings.
3. Select the pupils assigned to that family's code and generate the details. This issues a code; it does not approve an account or immediately give someone record access.
4. Give the parent the listed student IDs and the private linking code directly. A code expires after seven days, can be redeemed once, and is shown only in the generation response. Issuing a replacement invalidates previous unused codes for that parent ID.

## Parent workflow

1. Create an account or sign in at the parent portal.
2. Choose **Link children** and enter one or more school-issued student IDs, using **Add another child** for siblings.
3. Enter the private linking code and submit. All entered IDs must belong to that code; an invalid ID rolls back the whole submission without consuming the code.
4. Linked children appear immediately under the same parent record. There is no approval queue. Subsequent sign-ins show all linked children automatically.
5. To add another child later, obtain new details from the school and use **Link children** again. Existing children stay linked.

Student IDs and parent IDs are identifiers, not passwords. A private code is required for linking. Knowing a pupil's ID, name or email does not grant access. Codes are stored as hashes; they are never put in Git, logs or public URLs. Families cannot use a code to move an existing account to a different guardian record or claim a guardian already associated with another account.

Account deactivation revokes sessions and blocks future sign-ins, including Google. Developer preview remains separate from parent access. Staff accounts are still provisioned by the school and cannot self-register for staff permissions.

Before deploying this version, run the additive migration with a database administrator connection. It creates `parent_link_codes` and `parent_link_code_students`; the website SQL user continues to use data-access permissions only. Existing accounts and trusted child links are preserved. No data is copied automatically from the external admissions Google Form.
