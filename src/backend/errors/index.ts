export interface ErrorDefinition {
  code: string;
  message: string;
  status: number;
}

export const Errors = {
  ARTICLE_NOT_FOUND: {
    code: 'ARTICLE_NOT_FOUND',
    message: 'The requested article could not be found.',
    status: 404,
  },
  USER_UNAUTHORIZED: {
    code: 'USER_UNAUTHORIZED',
    message: 'You do not have permission to access this resource.',
    status: 401,
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'The provided input is invalid.',
    status: 400,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'An error occurred while accessing the database.',
    status: 500,
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'An unexpected server error occurred. Please try again later.',
    status: 500,
  },
} as const;

export function isKnownError(error: unknown): error is ErrorDefinition {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as { code?: string; message?: string; status?: number };

  return (
    typeof err.code === 'string' &&
    typeof err.message === 'string' &&
    typeof err.status === 'number' &&
    Object.keys(Errors).includes(err.code)
  );
}
