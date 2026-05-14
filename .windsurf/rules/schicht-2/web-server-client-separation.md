---
trigger: always_on
description: "Server and Client components must be clearly separated. No browser APIs in Server components."
---

# Web — Server/Client Component Separation

## Scope

Applies to all React components in Next.js App Router projects.
Library code without React components is out of scope.

## Rule

### 1. 'use client' is Explicit and Justified

A file with `'use client'` must use at least one of:
- React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Browser-only APIs (`window`, `document`, `navigator`)
- Event handlers passed as props that require client interactivity

If none of these apply, remove `'use client'`.

**Anti-pattern:**

```typescript
'use client'; // unnecessary — no hooks, no browser APIs
export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
```

### 2. No Browser APIs in Server Components

Server components must not reference `window`, `document`, `localStorage`,
or any other browser-only global.

**Anti-pattern:**

```typescript
// ServerComponent.tsx — missing 'use client', but uses browser API
export async function ServerComponent() {
  const theme = localStorage.getItem('theme'); // crashes on server
  return <div className={theme}>...</div>;
}
```

### 3. Data Fetching in Server Components

Async data fetching belongs in Server components or in server actions.
Client components fetch only when user interaction triggers it (e.g. SWR, react-query).

**Positive example:**

```typescript
// ProductList.tsx — Server Component
export async function ProductList() {
  const products = await productService.findAll(); // server-side fetch
  return <ul>{products.map(p => <ProductCard key={p.id} product={p} />)}</ul>;
}
```

## Deliberately Omitted

- Interleaved Server/Client trees are valid Next.js architecture.
  This rule governs individual files, not tree composition.
