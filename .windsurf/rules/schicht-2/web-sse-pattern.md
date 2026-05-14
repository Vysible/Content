---
trigger: glob
description: "Server-Sent Events must be used before WebSocket for one-directional AI/data streams."
globs:
  - "**/app/api/**/*.ts"
  - "**/lib/stream/**/*.ts"
---

# Web — SSE Pattern (Server-Sent Events)

## Scope

Applies to all streaming endpoints and real-time data push implementations.
Bidirectional communication requirements (chat, collaboration) may use WebSocket
with explicit justification in `docs/framework-deviations.md`.

## Rule

### 1. SSE Before WebSocket

For one-directional server→client streams (AI responses, progress updates,
notifications), SSE is mandatory unless a technical constraint requires WebSocket.

Justification: SSE works over HTTP/1.1, reuses existing auth middleware,
requires no additional infrastructure, and auto-reconnects natively.

**Positive example:**

```typescript
// app/api/ai/stream/route.ts
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of aiService.stream(prompt)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

### 2. Cleanup on Stream Abort

SSE endpoints must handle client disconnect via `request.signal.addEventListener('abort', ...)`.
Unhandled stream abort leads to resource leaks (open DB connections, orphaned AI requests).

**Anti-pattern:**

```typescript
// Missing abort handling — resource leak
const stream = new ReadableStream({ async start(controller) {
  for await (const chunk of longRunningQuery()) { // runs forever after client leaves
    controller.enqueue(chunk);
  }
}});
```

### 3. Error Propagation in Stream

Stream errors must be sent as SSE `event: error` messages before closing,
not silently swallowed.

```typescript
controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`));
controller.close();
```

## Deliberately Omitted

- WebSocket is permitted for bidirectional use cases (collaborative editing, presence)
  with explicit deviation registration.
