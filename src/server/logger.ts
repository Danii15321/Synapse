import "server-only"

const REDACTED = "[REDACTED]"
const SENSITIVE_FIELDS = new Set([
  "authorization",
  "body",
  "cookie",
  "cookies",
  "credential",
  "credentials",
  "databaseurl",
  "password",
  "passwordhash",
  "premiumbody",
  "secret",
  "session",
  "setcookie",
  "token",
])
const SENSITIVE_FIELD_PATTERNS = [
  /^(?:access|auth|client|csrf|id|refresh|session)token$/,
  /^(?:api|auth|client)secret$/,
  /^(?:api|auth|client|session)?credentials?$/,
  /^(?:api|secret)key$/,
  /^(?:current|new|old|user)password(?:hash)?$/,
  /^session(?:cookie|id|key)$/,
] as const

const AUTHORIZATION_VALUE_PATTERN =
  /\b(?:Bearer|Basic|Token)\s+[A-Za-z0-9._~+\/-]+=*/gi
const SENSITIVE_ASSIGNMENT_PATTERN =
  /((?:"?)(?:authorization|access[_\-\s]?token|api[_\-\s]?key|(?:api|auth|client)[_\-\s]?secret|cookie|credential(?:s)?|database[_\-\s]?url|password(?:[_\-\s]?hash)?|premium[_\-\s]?body|refresh[_\-\s]?token|secret(?:[_\-\s]?key)?|session[_\-\s]?token|set[_\-\s]?cookie|token)(?:"?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/gi

function isSensitiveField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")

  return (
    SENSITIVE_FIELDS.has(normalizedKey) ||
    SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey))
  )
}

function sanitizeString(value: string): string {
  return value
    .replace(AUTHORIZATION_VALUE_PATTERN, REDACTED)
    .replace(
      SENSITIVE_ASSIGNMENT_PATTERN,
      (_match, field: string) => `${field}${REDACTED}`,
    )
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, REDACTED)
}

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value)
  }
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (typeof value !== "object" || value === null) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveField(key) ? REDACTED : redact(nestedValue),
    ]),
  )
}

export function writeLog(entry: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(redact(entry))}\n`)
}
