import * as Sentry from '@sentry/react'

const PII_KEY_PATTERN = /email|address|notes|narrative|vigilance|synthesis|name|phone|content|summary/i

function maskPII(value, key) {
  if (typeof value === 'string' && PII_KEY_PATTERN.test(key)) return '[redacted]'
  if (value && typeof value === 'object' && !Array.isArray(value)) return maskObject(value)
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'object' && item !== null ? maskObject(item) : item))
  return value
}

function maskObject(obj) {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = maskPII(v, k)
  }
  return result
}

export function reportError(err, context = {}) {
  const masked = maskObject(context)
  if (import.meta.env.DEV) {
    console.error(err, masked)
    return
  }
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setExtras(masked)
      Sentry.captureException(err)
    })
  }
}

export function reportEvent(name, context = {}) {
  const masked = maskObject(context)
  if (import.meta.env.DEV) {
    console.error(`[event] ${name}`, masked)
    return
  }
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setExtras(masked)
      Sentry.captureMessage(name, 'info')
    })
  }
}
