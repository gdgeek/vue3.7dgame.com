import type { AxiosError, AxiosRequestConfig } from "axios";

export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY = "wp3-subject-binding-v1";
export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_URL =
  "https://api.d.xrteeth.com/v1/organization/list";
export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE =
  "v1;binding=match;configured=identity-primary;rollout=allowlist;source=identity;decision=deny;reason=allowlist_subject_selected;selected=1;fallback=0;failClosed=0;severity=none;classification=match;permissionUnion=0";

const IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER =
  "x-identity-iam-authz-probe-evidence";

export type IamAuthzSubjectBindingProbeStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed-unexpected-allow"
  | "failed-unauthorized"
  | "failed-http-status"
  | "failed-evidence-missing"
  | "failed-evidence-mismatch"
  | "failed-transport";

type ProbeRequest = (config: AxiosRequestConfig) => Promise<unknown>;

interface ProbeResponse {
  status?: number;
  data?: unknown;
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

interface CapturedProbeContext extends ProbeContext {
  pathname: string;
}

type ProbeLocationReplace = (url: string) => Promise<unknown>;

let bootstrapCaptureInitialized = false;
let bootstrapCaptureTaken = false;
let bootstrapProbeContext: CapturedProbeContext | undefined;

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

/**
 * Capture the approved full-page trigger before Vue Router starts its initial
 * navigation. Home is lazy-loaded, so reading only route.query from Home can
 * be too late after an initial redirect/history synchronization.
 */
export const initializeIamAuthzSubjectBindingProbeBootstrap = (
  location: ProbeLocation = window.location
): void => {
  if (bootstrapCaptureInitialized) {
    return;
  }

  bootstrapCaptureInitialized = true;
  try {
    const url = new URL(location.href);
    const values = url.searchParams.getAll("iamAuthzProbe");
    if (
      url.pathname === "/home/index" &&
      values.length === 1 &&
      shouldRunIamAuthzSubjectBindingProbe({
        hostname: url.hostname,
        queryValue: values[0],
      })
    ) {
      bootstrapProbeContext = {
        hostname: url.hostname,
        pathname: url.pathname,
        queryValue: values[0],
      };
    }
  } catch {
    bootstrapProbeContext = undefined;
  }
};

export const takeIamAuthzSubjectBindingProbeBootstrap = ():
  | CapturedProbeContext
  | undefined => {
  if (bootstrapCaptureTaken) {
    return undefined;
  }

  bootstrapCaptureTaken = true;
  return bootstrapProbeContext;
};

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
        // Address the reviewed Develop xrteeth API directly. The API CORS
        // contract permits the exact d.dev origin, Authorization request
        // header and safe evidence response header. This avoids both the
        // shared /api upstream pool and any dependency on mutable frontend
        // Stack source or a runtime probe flag.
        baseURL: "",
        url: IAM_AUTHZ_SUBJECT_BINDING_PROBE_URL,
        method: "get",
        params: {
          iamAuthzProbe: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
        },
        skipErrorMessage: true,
      });
      onStatus("failed-unexpected-allow");
      return "failed-unexpected-allow";
    } catch (error) {
      const response = (error as AxiosError | undefined)?.response as
        | ProbeResponse
        | undefined;
      // Only an ordinary-user deny carrying the exact in-process safe evidence
      // proves both traversal and subject binding. A 2xx is an unexpected allow.
      const status = classifyProbeResponse(response);
      onStatus(status);
      return status;
    }
  };
};

function classifyProbeResponse(
  response: ProbeResponse | undefined
): IamAuthzSubjectBindingProbeStatus {
  if (response === undefined) {
    return "failed-transport";
  }
  if (response.status === 401) {
    return "failed-unauthorized";
  }
  if (response.status !== 403) {
    return "failed-http-status";
  }
  const evidence = readProbeEvidence(response);
  if (evidence === undefined || evidence === null || evidence === "") {
    return "failed-evidence-missing";
  }
  return evidence === IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE
    ? "completed"
    : "failed-evidence-mismatch";
}

function readProbeEvidence(response: ProbeResponse | undefined): unknown {
  const headers = response?.headers;
  const headerEvidence =
    typeof headers?.get === "function"
      ? headers.get(IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER)
      : headers?.[IAM_AUTHZ_SUBJECT_BINDING_PROBE_HEADER];
  if (
    headerEvidence !== undefined &&
    headerEvidence !== null &&
    headerEvidence !== ""
  ) {
    return headerEvidence;
  }
  const data = response?.data;
  return isRecord(data) ? data.iamAuthzProbeEvidence : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
