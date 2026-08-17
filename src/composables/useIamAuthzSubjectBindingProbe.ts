import type { AxiosError, AxiosRequestConfig } from "axios";

import request from "@/utils/request";

export const IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY = "wp3-subject-binding-v1";

export type IamAuthzSubjectBindingProbeStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed";

type ProbeRequest = (config: AxiosRequestConfig) => Promise<unknown>;

interface ProbeContext {
  hostname: string;
  queryValue: unknown;
}

export const shouldRunIamAuthzSubjectBindingProbe = ({
  hostname,
  queryValue,
}: ProbeContext): boolean =>
  hostname.toLowerCase() === "d.dev.xrugc.com" &&
  queryValue === IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY;

export const createIamAuthzSubjectBindingProbe = (
  probeRequest: ProbeRequest = request
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
        url: "/v1/organization/list",
        method: "get",
        skipErrorMessage: true,
      });
      onStatus("completed");
      return "completed";
    } catch (error) {
      const httpStatus = (error as AxiosError | undefined)?.response?.status;
      // An ordinary user's expected 403 still proves that the authenticated
      // request traversed api.organization.global-rbac and emitted AuthZ evidence.
      const status = httpStatus === 403 ? "completed" : "failed";
      onStatus(status);
      return status;
    }
  };
};
