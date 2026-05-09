# Security Spec

## 1. Data Invariants
- A `document` cannot exist without a valid `userId` that belongs to the user creating it.
- The `uploadedAt` field must match the server timestamp upon creation.

## 2. The "Dirty Dozen" Payloads
1. Null user missing userId completely (create)
2. Spoofed userId (setting userId to another user's ID)
3. Omitting required field (letterNo)
4. Invalid type for description (integer instead of string)
5. Modifying uploadedAt during an update
6. Massive string payload (e.g., 2MB letterNo)
7. Ghost Field injection (`isAdmin: true`)
8. Unauthenticated read of list
9. Read of list without verifying query
10. Spoofed timestamp for uploadedAt (client time instead of server time)
11. Array mutation (N/A for Document but standard test)
12. Invalid ID string format for documentId

## 3. Test Runner
We will generate a test runner to verify these invariants.
