import { logger } from './logger'

const MAX_RETRIES = 3
const BACKOFF_BASE_MS = 2_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Wraps an async IO call with exponential-backoff retry.
 * Retries on network errors and HTTP 429/5xx. Does NOT retry on 4xx (except 429).
 * Max 3 attempts, backoff: 2s → 4s → 8s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (exc: unknown) {
      // Permanent 4xx (not 429) — no retry
      if (
        exc instanceof Response &&
        exc.status >= 400 &&
        exc.status < 500 &&
        exc.status !== 429
      ) {
        logger.error({ context, status: exc.status }, 'Permanent HTTP error — no retry')
        throw exc
      }

      lastError = exc
      const waitMs = BACKOFF_BASE_MS * Math.pow(2, attempt)
      const excMsg = exc instanceof Error ? exc.message : String(exc)
      logger.warn({ context, attempt: attempt + 1, maxRetries: MAX_RETRIES, waitMs, excMsg }, 'Retry attempt failed')
      await sleep(waitMs)
    }
  }

  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError)
  logger.error({ context, maxRetries: MAX_RETRIES, lastMsg }, 'All retry attempts exhausted')
  throw lastError
}
