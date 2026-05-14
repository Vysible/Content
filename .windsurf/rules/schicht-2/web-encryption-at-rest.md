---
trigger: always_on
description: "PII and sensitive data must use envelope encryption at rest. No plaintext sensitive fields in DB."
---

# Web — Encryption at Rest

## Scope

Applies to all database models and data persistence code that handles
Personally Identifiable Information (PII) or sensitive business data.
Public, non-sensitive data is out of scope.

## Rule

### 1. Envelope Encryption for PII

PII fields (email, full name, phone, address, payment data) are encrypted
using the envelope encryption pattern before storage.

**Envelope encryption pattern (ADR-W005):**

```typescript
// lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY_V1!, 'hex');

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

### 2. No Plaintext PII in DB

Sensitive fields are never stored as plaintext strings in the database.

**Anti-pattern:**

```typescript
// Prisma model — plaintext PII
await db.user.create({ data: { email: 'user@example.com', phone: '+49123456789' } });
```

**Positive example:**

```typescript
await db.user.create({ data: { emailEncrypted: encrypt(email), phoneEncrypted: encrypt(phone) } });
```

### 3. Encryption Key via Environment Only

`ENCRYPTION_KEY_V1` is loaded exclusively from `process.env`.
Never hardcoded, never logged, never committed.

Key rotation uses a new `ENCRYPTION_KEY_V2` alongside `V1` during transition.
The version prefix in the encrypted value enables transparent migration.

### 4. DSGVO Erasure via Key Deletion

For DSGVO right-to-erasure compliance: each user's data can be made
unreadable by deleting their per-user data encryption key.
This is the recommended strategy for high-volume SaaS (ADR-W008).

## Deliberately Omitted

- Non-PII data (product IDs, prices, timestamps) does not require encryption.
- Full-database encryption (at infrastructure level) is complementary, not a substitute.
