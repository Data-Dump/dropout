/**
 * Strips HTML angle brackets and control characters to prevent stored XSS
 * and enforces strict maximum length on user-supplied text fields.
 */
export function sanitizeText(input: unknown, maxLength = 200): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes a phone number string to digits only (max 15 chars).
 */
export function sanitizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/\D/g, "").slice(0, 15);
}

/**
 * Returns a safe, non-verbose error message in production so internal
 * database/SDK stack details are never exposed to API callers.
 */
export function safeServerError(err: unknown, fallback = "Internal server error"): string {
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    return err.message;
  }
  return fallback;
}
