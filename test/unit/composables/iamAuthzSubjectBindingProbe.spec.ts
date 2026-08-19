import { describe, expect, it, vi } from "vitest";

import {
  createIamAuthzSubjectBindingProbe,
  IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
  IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
  shouldRunIamAuthzSubjectBindingProbe,
} from "@/composables/useIamAuthzSubjectBindingProbe";

const developContext = {
  hostname: "d.dev.xrugc.com",
  queryValue: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
};

describe("IAM AuthZ subject-binding probe", () => {
  it("is fail-closed outside the exact Develop host and query", () => {
    expect(shouldRunIamAuthzSubjectBindingProbe(developContext)).toBe(true);
    expect(
      shouldRunIamAuthzSubjectBindingProbe({
        ...developContext,
        hostname: "d.xrugc.com",
      })
    ).toBe(false);
    expect(
      shouldRunIamAuthzSubjectBindingProbe({
        ...developContext,
        queryValue: "1",
      })
    ).toBe(false);
    expect(
      shouldRunIamAuthzSubjectBindingProbe({
        ...developContext,
        queryValue: [IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY],
      })
    ).toBe(false);
  });

  it("issues exactly one authenticated organization-list GET and rejects an unexpected allow", async () => {
    const probeRequest = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        "x-identity-iam-authz-probe-evidence":
          IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
      },
    });
    const probe = createIamAuthzSubjectBindingProbe(probeRequest);
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "failed"
    );
    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "idle"
    );
    expect(probeRequest).toHaveBeenCalledTimes(1);
    expect(probeRequest).toHaveBeenCalledWith({
      url: "/v1/organization/list",
      method: "get",
      params: {
        iamAuthzProbe: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
      },
      skipErrorMessage: true,
    });
    expect(statuses).toEqual(["running", "failed"]);
  });

  it("requires the ordinary-user 403 and exact safe subject-binding evidence", async () => {
    const probeRequest = vi.fn().mockRejectedValue({
      response: {
        status: 403,
        headers: {
          "x-identity-iam-authz-probe-evidence":
            IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
        },
      },
    });
    const probe = createIamAuthzSubjectBindingProbe(probeRequest);
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "completed"
    );
    expect(statuses).toEqual(["running", "completed"]);
  });

  it("fails closed when a 403 omits or changes the safe evidence", async () => {
    for (const headers of [
      {},
      { "x-identity-iam-authz-probe-evidence": "v1;binding=mismatch" },
    ]) {
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue({ response: { status: 403, headers } })
      );
      const statuses: string[] = [];

      expect(
        await probe(developContext, (status) => statuses.push(status))
      ).toBe("failed");
      expect(statuses).toEqual(["running", "failed"]);
    }
  });

  it("fails closed on 401 or transport errors", async () => {
    for (const error of [{ response: { status: 401 } }, new Error("network")]) {
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue(error)
      );
      const statuses: string[] = [];

      expect(
        await probe(developContext, (status) => statuses.push(status))
      ).toBe("failed");
      expect(statuses).toEqual(["running", "failed"]);
    }
  });
});
