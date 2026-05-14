export function checkHwgGate(hwgFlag: boolean): { blocked: boolean; reason?: string } {
  if (hwgFlag) {
    return { blocked: true, reason: 'hwg_flag_set' }
  }
  return { blocked: false }
}
