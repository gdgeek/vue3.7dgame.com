import axios, { AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  consumeIamAuthzSubjectBindingProbeLocation,
  createIamAuthzSubjectBindingProbe,
  IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
  IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
  IAM_AUTHZ_SUBJECT_BINDING_PROBE_URL,
  shouldRunIamAuthzSubjectBindingProbe,
} from "@/composables/useIamAuthzSubjectBindingProbe";

const developContext = {
  hostname: "d.dev.xrugc.com",
  queryValue: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
};

describe("IAM AuthZ subject-binding probe", () => {
  it("pins the exact Phase A selected-subject safe evidence contract", () => {
    expect(IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE).toBe(
      "v1;binding=match;configured=identity-primary;rollout=allowlist;source=identity;decision=deny;reason=allowlist_subject_selected;selected=1;fallback=0;failClosed=0;severity=none;classification=match;permissionUnion=0"
    );
  });

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

  it("consumes the one-shot URL trigger before dispatch and preserves other settings", async () => {
    let href = `https://d.dev.xrugc.com/home/index?lang=zh-CN&iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}&theme=modern-blue#top`;
    const location = {
      get href() {
        return href;
      },
    };
    const replaceLocation = vi.fn().mockImplementation(async (next: string) => {
      href = new URL(next, href).href;
    });

    await expect(
      consumeIamAuthzSubjectBindingProbeLocation(location, replaceLocation)
    ).resolves.toBe(true);
    expect(replaceLocation).toHaveBeenCalledOnce();
    expect(replaceLocation).toHaveBeenCalledWith(
      "/home/index?lang=zh-CN&theme=modern-blue#top"
    );
  });

  it("does not dispatch when navigation resolves without consuming the trigger", async () => {
    const href = `https://d.dev.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`;
    const replaceLocation = vi.fn().mockResolvedValue(undefined);

    await expect(
      consumeIamAuthzSubjectBindingProbeLocation({ href }, replaceLocation)
    ).resolves.toBe(false);
    expect(replaceLocation).toHaveBeenCalledOnce();
  });

  it("does not consume or dispatch an invalid, duplicate, or non-Develop trigger", async () => {
    for (const href of [
      "https://d.dev.xrugc.com/home/index?iamAuthzProbe=wrong",
      `https://d.dev.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}&iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
      `https://d.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
    ]) {
      const replaceLocation = vi.fn().mockResolvedValue(undefined);
      await expect(
        consumeIamAuthzSubjectBindingProbeLocation({ href }, replaceLocation)
      ).resolves.toBe(false);
      expect(replaceLocation).not.toHaveBeenCalled();
    }
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
      baseURL: "",
      url: IAM_AUTHZ_SUBJECT_BINDING_PROBE_URL,
      method: "get",
      params: {
        iamAuthzProbe: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
      },
      skipErrorMessage: true,
    });
    expect(statuses).toEqual(["running", "failed"]);
  });

  it("targets the fixed Develop xrteeth API without inheriting /api", () => {
    const client = axios.create({ baseURL: "/api" });

    expect(
      client.getUri({
        baseURL: "",
        url: IAM_AUTHZ_SUBJECT_BINDING_PROBE_URL,
        params: {
          iamAuthzProbe: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
        },
      })
    ).toBe(
      "https://api.d.xrteeth.com/v1/organization/list?iamAuthzProbe=wp3-subject-binding-v1"
    );
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

  it("accepts exact safe evidence carried by real AxiosHeaders", async () => {
    const headers = new AxiosHeaders();
    headers.set(
      "x-identity-iam-authz-probe-evidence",
      IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE
    );
    const probe = createIamAuthzSubjectBindingProbe(
      vi.fn().mockRejectedValue({ response: { status: 403, headers } })
    );
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
