import * as Sentry from "@sentry/node";

let initialized = false;

function initOnce() {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Math.min(1, Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.05") || 0.05)),
    sendDefaultPii: false,
  });
}

/**
 * Report serverless handler failures (no-op when SENTRY_DSN unset).
 * @param {unknown} error
 * @param {Record<string, unknown>} [context]
 */
export function captureApiException(error, context = {}) {
  try {
    initOnce();
    if (!process.env.SENTRY_DSN) return;
    Sentry.captureException(error, { extra: context });
  } catch {
    /* never break API responses */
  }
}
