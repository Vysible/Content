export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(12, key.length - 8))}${key.slice(-4)}`
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4 }).format(amount)
}
