import type { AxiosError, AxiosRequestConfig } from "axios";

export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY = "wp3-subject-binding-v1";
export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_PATH =
  "/api/iam-authz-subject-binding-probe";
export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE =
  "v1;binding=match;configured=legacy;rollout=off;source=legacy;decision=deny;reason=legacy_mode;selected=0;fallback=0;failClosed=0;severity=none;classification=not_compared;permissionUnion=0";

const IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER =
  "x-identity-iam-authz-probe-evidence";

export type IamAuthzSubjectBindingProbeStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed";

type ProbeRequest = (config: AxiosRequestConfig) => Promise<unknown>;

interface ProbeResponse {
  status?: number;
  headers?: Record<string, unknown> & {
    get?: (name: string) => unknown;
  };
}

interface ProbeContext {
  hostname: string;
  queryValue: unknown;
}

interface ProbeLocation {
  href: string;
}

type ProbeLocationReplace = (url: string) => Promise<unknown>;

const authenticatedRequest: ProbeRequest = async (config) => {
  const { default: request } = await import("@/utils/request");
  return request(config);
};

export const shouldRunIamAuthzSubjectBindingProbe = ({
  hostname,
  queryValue,
}: ProbeContext): boolean =>
  hostname.toLowerCase() === "d.dev.xrugc.com" &&
  queryValue === IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY;

export const consumeIamAuthzSubjectBindingProbeLocation = async (
  location: ProbeLocation,
  replaceLocation: ProbeLocationReplace
): Promise<boolean> => {
  try {
    const url = new URL(location.href);
    const values = url.searchParams.getAll("iamAuthzProbe");
    if (
      values.length !== 1 ||
      !shouldRunIamAuthzSubjectBindingProbe({
        hostname: url.hostname,
        queryValue: values[0],
      })
    ) {
      return false;
    }

    // Consume through Vue Router before dispatch. This keeps its internal
    // history state in sync, so away/back navigation or a Home remount
    // cannot restore and replay the approved one-shot trigger.
    url.searchParams.delete("iamAuthzProbe");
    await replaceLocation(`${url.pathname}${url.search}${url.hash}`);
    return (
      new URL(location.href).searchParams.getAll("iamAuthzProbe").length === 0
    );
  } catch {
    return false;
  }
};

export const createIamAuthzSubjectBindingProbe = (
  probeRequest: ProbeRequest = authenticatedRequest
) => {
  let started = false;

  return async (
    context: ProbeContext,
    onStatus: (status: IamAuthzSubjectBindingProbeStatus) => void
  ): Promise<IamAuthzSubjectBindingProbeStatus> => {
    if (started || !shouldRunIamAuthzSubjectBindingProbe(context)) {
      return "idle";
    }

    started = true;
    onStatus("running");

    try {
      await probeRequest({
        // Bypass the shared /api baseURL and address the exact Develop-only,
        // APP_API_1-pinned Nginx location. This prevents both a doubled /api
        // prefix and random routing to the secondary API upstream.
        baseURL: "",
        url: IAM_AUTHZ_SUBJECT_BINDING_PROBE_PATH,
        method: "get",
        params: {
          iamAuthzProbe: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
        },
        skipErrorMessage: true,
      });
      onStatus("failed");
      return "failed";
    } catch (error) {
      const response = (error as AxiosError | undefined)?.response as
        | ProbeResponse
        | undefined;
      // Only an ordinary-user deny carrying the exact in-process safe evidence
      // proves both traversal and subject binding. A 2xx is an unexpected allow.
      const status =
        response?.status === 403 && hasExpectedProbeEvidence(response)
          ? "completed"
          : "failed";
      onStatus(status);
      return status;
    }
  };
};

function hasExpectedProbeEvidence(
  response: ProbeResponse | undefined
): boolean {
  const headers = response?.headers;
  const raw =
    typeof headers?.get === "function"
      ? headers.get(IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER)
      : headers?.[IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER];
  return raw === IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE;
}
