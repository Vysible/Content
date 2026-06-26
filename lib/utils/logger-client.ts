type LogData = Record<string, unknown>

function format(data: LogData | string, msg?: string): [string, ...unknown[]] {
  if (typeof data === 'string') return [`[Vysible] ${data}`]
  return [`[Vysible] ${msg ?? ''}`, data]
}

// Isomorpher Client-Logger für React Client Components.
// Server Components und API Routes verwenden lib/utils/logger.ts (pino).
export const logClient = {
  info:  (data: LogData | string, msg?: string) => console.info(...format(data, msg)),
  warn:  (data: LogData | string, msg?: string) => console.warn(...format(data, msg)),
  error: (data: LogData | string, msg?: string) => console.error(...format(data, msg)),
}
