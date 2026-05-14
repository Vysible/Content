---
trigger: glob
description: "All environment variables must be validated with Zod at startup. No raw process.env access in business logic."
globs:
  - "**/env.ts"
  - "**/env.mjs"
  - "**/env.js"
---

# Web — Environment Variable Validation

## Scope

Applies to all application code that consumes environment variables.
The validation schema file (`env.ts`) is the single source of truth for env config.

## Rule

### 1. Validate All Env Vars at Startup

Every environment variable used by the application must be declared
and validated in a central `env.ts` file using Zod (or t3-env).
The application must fail fast at startup if a required variable is missing or invalid.

**Positive example (t3-env pattern):**

```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    ENCRYPTION_KEY_V1: z.string().length(64), // 32 bytes hex
    AUTH_GITHUB_ID: z.string().min(1),
    AUTH_GITHUB_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
```

### 2. No Raw `process.env` in Business Logic

Business logic, services, and components access environment variables
only through the validated `env` object — never via `process.env.VAR` directly.

**Anti-pattern:**

```typescript
const dbUrl = process.env.DATABASE_URL; // unvalidated, possibly undefined
const key = process.env.ENCRYPTION_KEY_V1!; // non-null assertion masks missing config
```

**Positive example:**

```typescript
import { env } from '@/env'; // validated, typed
const dbUrl = env.DATABASE_URL;
```

### 3. Client Variables Explicitly Prefixed

Variables exposed to the browser are prefixed with `NEXT_PUBLIC_`
and declared in the `client` section of the env schema.
Server-only secrets must never appear in the `client` section.

## Deliberately Omitted

- Test environments may use `dotenv` for loading `.env.test` files directly.
- `process.env.NODE_ENV` is a framework constant — exempt from this rule.
