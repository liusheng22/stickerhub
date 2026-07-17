import type { H3Event } from 'h3'

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}

class PublicApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

export function throwApiError(statusCode: number, code: string, message: string): never {
  throw new PublicApiError(statusCode, code, message)
}

export async function withApiErrorBoundary<T>(
  event: H3Event,
  handler: () => Promise<T>,
): Promise<T | ApiErrorResponse> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof PublicApiError) {
      setResponseStatus(event, error.statusCode)
      return { error: { code: error.code, message: error.message } }
    }

    console.error('Unhandled API error', {
      method: event.method,
      path: event.path,
      error,
    })
    setResponseStatus(event, 500)
    return {
      error: {
        code: 'internal_error',
        message: 'The service could not complete this request.',
      },
    }
  }
}
