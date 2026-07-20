import { AsyncLocalStorage } from 'async_hooks';

// Per-request context propagated implicitly through the async call chain. A
// middleware seeds it with the request id (from pino-http); the logger's mixin
// reads it so EVERY log line emitted while handling a request — including
// console-routed and deep service-layer logs — carries the same `requestId`,
// without threading a logger through every function signature.
export interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** The current request id, if we're inside a request's async context. */
export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
