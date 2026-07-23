const LOGIN_FALLBACK_MESSAGE = "Login failed, please try again later.";

type LoginErrorResponse = {
  status?: number;
  data?: {
    code?: unknown;
    message?: unknown;
  };
};

type HttpErrorLike = {
  response?: LoginErrorResponse;
};

export class LoginRequestError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "LoginRequestError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeLoginError(error: unknown): Error {
  if (error instanceof LoginRequestError) {
    return error;
  }

  const response = (error as HttpErrorLike | null)?.response;
  if (response) {
    const code =
      typeof response.data?.code === "string" ? response.data.code : undefined;
    const message =
      typeof response.data?.message === "string" && response.data.message.trim()
        ? response.data.message
        : LOGIN_FALLBACK_MESSAGE;

    return new LoginRequestError(message, code, response.status);
  }

  return error instanceof Error
    ? error
    : new LoginRequestError(LOGIN_FALLBACK_MESSAGE);
}

export function isInvalidCredentialsError(error: unknown): boolean {
  return (
    error instanceof LoginRequestError &&
    (error.code === "INVALID_CREDENTIALS" || error.status === 401)
  );
}
