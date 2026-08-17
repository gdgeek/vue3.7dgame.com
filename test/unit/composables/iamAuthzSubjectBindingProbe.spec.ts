import { describe, expect, it, vi } from "vitest";

import {
  createIamAuthzSubjectBindingProbe,
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

  it("issues exactly one authenticated organization-list GET", async () => {
    const probeRequest = vi.fn().mockResolvedValue({ status: 200 });
    const probe = createIamAuthzSubjectBindingProbe(probeRequest);
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "completed"
    );
    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "idle"
    );
    expect(probeRequest).toHaveBeenCalledTimes(1);
    expect(probeRequest).toHaveBeenCalledWith({
      url: "/v1/organization/list",
      method: "get",
      skipErrorMessage: true,
    });
    expect(statuses).toEqual(["running", "completed"]);
  });

  it("treats the ordinary-user 403 as completed AuthZ traversal", async () => {
    const probeRequest = vi
      .fn()
      .mockRejectedValue({ response: { status: 403 } });
    const probe = createIamAuthzSubjectBindingProbe(probeRequest);
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "completed"
    );
    expect(statuses).toEqual(["running", "completed"]);
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
