const PREFIX = 'MAT-';

export type QRResult =
  | { valid: true; code: string }
  | { valid: false; reason: 'missing' | 'invalidFormat' };

export function validateQR(code?: string | null): QRResult {
  if (!code) return { valid: false, reason: 'missing' };
  if (!code.startsWith(PREFIX) || code.length <= PREFIX.length) {
    return { valid: false, reason: 'invalidFormat' };
  }
  return { valid: true, code };
}
