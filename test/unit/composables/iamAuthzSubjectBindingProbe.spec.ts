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

  it("captures an exact full-page Develop trigger once before router bootstrap", async () => {
    vi.resetModules();
    const {
      initializeIamAuthzSubjectBindingProbeBootstrap,
      takeIamAuthzSubjectBindingProbeBootstrap,
    } = await import("@/composables/useIamAuthzSubjectBindingProbe");
    initializeIamAuthzSubjectBindingProbeBootstrap({
      href: `https://d.dev.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
    });

    expect(takeIamAuthzSubjectBindingProbeBootstrap()).toEqual({
      hostname: "d.dev.xrugc.com",
      pathname: "/home/index",
      queryValue: IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY,
    });
    expect(takeIamAuthzSubjectBindingProbeBootstrap()).toBeUndefined();
  });

  it.each([
    `https://d.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
    `https://d.dev.xrugc.com/home/index?iamAuthzProbe=wrong`,
    `https://d.dev.xrugc.com/home/index?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}&iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
    `https://d.dev.xrugc.com/away?iamAuthzProbe=${IAM_AUTHZ_SUBJECT_BINDING_PROBE_QUERY}`,
  ])("does not bootstrap-capture an invalid trigger: %s", async (href) => {
    vi.resetModules();
    const {
      initializeIamAuthzSubjectBindingProbeBootstrap,
      takeIamAuthzSubjectBindingProbeBootstrap,
    } = await import("@/composables/useIamAuthzSubjectBindingProbe");
    initializeIamAuthzSubjectBindingProbeBootstrap({ href });

    expect(takeIamAuthzSubjectBindingProbeBootstrap()).toBeUndefined();
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
      "failed-unexpected-allow"
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
    expect(statuses).toEqual(["running", "failed-unexpected-allow"]);
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

  it("accepts the exact denied-response evidence body when the transport hides the header", async () => {
    const probe = createIamAuthzSubjectBindingProbe(
      vi.fn().mockRejectedValue({
        response: {
          status: 403,
          headers: {},
          data: {
            code: 2003,
            message: "没有权限执行此操作",
            iamAuthzProbeEvidence: IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
          },
        },
      })
    );
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "completed"
    );
    expect(statuses).toEqual(["running", "completed"]);
  });

  it.each([undefined, ""])(
    "accepts exact body evidence when AxiosHeaders returns %s",
    async (headerValue) => {
      const headers = new AxiosHeaders();
      if (headerValue !== undefined) {
        headers.set("x-identity-iam-authz-probe-evidence", headerValue);
      }
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue({
          response: {
            status: 403,
            headers,
            data: {
              iamAuthzProbeEvidence: IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
            },
          },
        })
      );

      await expect(probe(developContext, vi.fn())).resolves.toBe("completed");
    }
  );

  it("prefers matching header evidence over a conflicting body", async () => {
    const probe = createIamAuthzSubjectBindingProbe(
      vi.fn().mockRejectedValue({
        response: {
          status: 403,
          headers: {
            "x-identity-iam-authz-probe-evidence":
              IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
          },
          data: { iamAuthzProbeEvidence: "v1;binding=mismatch" },
        },
      })
    );

    await expect(probe(developContext, vi.fn())).resolves.toBe("completed");
  });

  it.each(["v1;binding=mismatch", true, { nested: "value" }])(
    "fails closed for invalid body-only evidence: %j",
    async (iamAuthzProbeEvidence) => {
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue({
          response: {
            status: 403,
            headers: {},
            data: { iamAuthzProbeEvidence },
          },
        })
      );

      await expect(probe(developContext, vi.fn())).resolves.toBe(
        "failed-evidence-mismatch"
      );
    }
  );

  it("fails closed when header and body evidence conflict", async () => {
    const probe = createIamAuthzSubjectBindingProbe(
      vi.fn().mockRejectedValue({
        response: {
          status: 403,
          headers: {
            "x-identity-iam-authz-probe-evidence": "v1;binding=mismatch",
          },
          data: {
            iamAuthzProbeEvidence: IAM_AUTHZ_SUBJECT_BINDING_PROBE_EVIDENCE,
          },
        },
      })
    );
    const statuses: string[] = [];

    expect(await probe(developContext, (status) => statuses.push(status))).toBe(
      "failed-evidence-mismatch"
    );
    expect(statuses).toEqual(["running", "failed-evidence-mismatch"]);
  });

  it.each([
    [{}, "failed-evidence-missing"],
    [
      { "x-identity-iam-authz-probe-evidence": "v1;binding=mismatch" },
      "failed-evidence-mismatch",
    ],
  ])(
    "fails closed with a safe 403 classification",
    async (headers, expected) => {
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue({ response: { status: 403, headers } })
      );
      const statuses: string[] = [];

      expect(
        await probe(developContext, (status) => statuses.push(status))
      ).toBe(expected);
      expect(statuses).toEqual(["running", expected]);
    }
  );

  it.each([
    [{ response: { status: 401 } }, "failed-unauthorized"],
    [{ response: { status: 404 } }, "failed-http-status"],
    [new Error("network"), "failed-transport"],
  ])(
    "fails closed with a safe non-evidence classification",
    async (error, expected) => {
      const probe = createIamAuthzSubjectBindingProbe(
        vi.fn().mockRejectedValue(error)
      );
      const statuses: string[] = [];

      expect(
        await probe(developContext, (status) => statuses.push(status))
      ).toBe(expected);
      expect(statuses).toEqual(["running", expected]);
    }
  );
});
