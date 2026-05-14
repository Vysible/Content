import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry } from '@/lib/utils/retry'

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('erfolgreiche Funktion beim ersten Versuch gibt Wert zurück', async () => {
    const fn = vi.fn().mockResolvedValueOnce('ok')
    const result = await withRetry(fn, 'test.success')
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('Funktion schlägt 2x fehl, 3. Versuch erfolgreich', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success')

    const promise = withRetry(fn, 'test.retry')
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('Funktion schlägt 3x fehl → wirft letzten Error', async () => {
    const lastError = new Error('final failure')
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(lastError)

    const promise = withRetry(fn, 'test.all-fail')
    // Error-Handler VOR runAllTimersAsync anhängen, damit keine unhandled rejection entsteht
    const assertion = expect(promise).rejects.toBe(lastError)
    await vi.runAllTimersAsync()
    await assertion
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('HTTP 404 Response → kein Retry, sofortiger Throw (permanenter 4xx)', async () => {
    const notFound = new Response('Not Found', { status: 404 })
    const fn = vi.fn().mockRejectedValueOnce(notFound)

    await expect(withRetry(fn, 'test.404')).rejects.toBe(notFound)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('HTTP 429 Response → wird retried (Ausnahme von permanentem 4xx)', async () => {
    const tooMany = new Response('Too Many Requests', { status: 429 })
    const fn = vi.fn()
      .mockRejectedValueOnce(tooMany)
      .mockResolvedValueOnce('ok-after-429')

    const promise = withRetry(fn, 'test.429')
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe('ok-after-429')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
