type TranslateFn = (key: string) => string;

type AxiosLikeError = {
  response?: {
    data?: unknown;
  };
};

type ErrorRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return typeof value === "string" && value.trim() ? [value] : [];
}

function collectPayloads(data: unknown): unknown[] {
  const payloads = [data];

  if (isRecord(data)) {
    payloads.push(data.errors);
    payloads.push(parseJson(data.message));
  }

  if (typeof data === "string") {
    payloads.push(parseJson(data));
  }

  return payloads.filter((payload) => payload !== undefined);
}

function isUsernameEmailError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email format") || normalized.includes("valid email")
  );
}

function mapPlainMessage(message: string, t: TranslateFn): string {
  if (isUsernameEmailError(message)) {
    return t("login.registerErrors.usernameEmailFormat");
  }

  return message;
}

export function getWechatRegisterErrorMessages(
  error: unknown,
  t: TranslateFn
): string[] {
  const data = (error as AxiosLikeError | undefined)?.response?.data;

  for (const payload of collectPayloads(data)) {
    if (!isRecord(payload)) continue;

    const usernameErrors = toStringList(payload.username);
    if (usernameErrors.length > 0) {
      if (usernameErrors.some(isUsernameEmailError)) {
        return [t("login.registerErrors.usernameEmailFormat")];
      }

      return [t("login.registerErrors.usernameTaken")];
    }

    const passwordErrors = toStringList(payload.password);
    if (passwordErrors.length > 0) {
      return passwordErrors;
    }
  }

  if (isRecord(data)) {
    const plainMessages = [
      ...toStringList(data.message),
      ...toStringList(data.error),
    ];

    if (plainMessages.length > 0) {
      return plainMessages.map((message) => mapPlainMessage(message, t));
    }
  }

  return [t("login.error")];
}
