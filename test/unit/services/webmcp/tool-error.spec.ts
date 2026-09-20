import { ResourceDiagnosticError } from "@/services/webmcp/resource-diagnostic";
import { describe, expect, it } from "vitest";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
describe("native tool failure envelope", () => {
  it.each([401, 403, 404, 409])(
    "returns a serializable, redacted HTTP %s error",
    async (status) => {
      let registered!: WebMcpTool;
      registerWebMcpTools(
        [
          {
            name: "read",
            description: "read",
            inputSchema: {},
            annotations: { readOnlyHint: true },
            execute: async () => {
              throw {
                response: { status, data: { canonicalBody: "private" } },
                config: { headers: { Authorization: "secret" } },
                message: "secret",
              };
            },
          },
        ],
        {
          document: {
            modelContext: {
              registerTool: (tool: WebMcpTool) => {
                registered = tool;
              },
            },
          } as unknown as Document,
        }
      );
      const result = await registered.execute({});
      expect(result).toMatchObject({
        isError: true,
        status: "failed",
        httpStatus: status,
      });
      expect(JSON.stringify(result)).not.toMatch(
        /secret|private|canonicalBody/
      );
      expect(() => structuredClone(result)).not.toThrow();
    }
  );
  it("does not claim a mutation was unapplied after an unknown failure", async () => {
    let registered!: WebMcpTool;
    registerWebMcpTools(
      [
        {
          name: "write",
          description: "write",
          inputSchema: {},
          execute: () => {
            throw new Error("timeout");
          },
        },
      ],
      {
        document: {
          modelContext: {
            registerTool: (tool: WebMcpTool) => {
              registered = tool;
            },
          },
        } as unknown as Document,
      }
    );
    expect(await registered.execute({})).toMatchObject({
      isError: true,
      persistence: "unverified",
    });
  });
});

it("preserves allowlisted resource diagnostics across the native tool boundary", async () => {
  let registered!: WebMcpTool;
  registerWebMcpTools(
    [
      {
        name: "resource_diagnostic_contract",
        description: "test",
        inputSchema: {},
        annotations: { readOnlyHint: true },
        execute() {
          throw new ResourceDiagnosticError(
            "resource_version_incomplete",
            { id: 5514, type: "model", fileId: 11732 },
            ["md5"]
          );
        },
      },
    ],
    {
      document: {
        modelContext: {
          registerTool(tool: WebMcpTool) {
            registered = tool;
          },
        },
      } as unknown as Document,
    }
  );
  const result = await registered.execute({});
  expect(result).toMatchObject({
    isError: true,
    errorCode: "resource_version_incomplete",
    details: {
      resource: { id: 5514, type: "model", fileId: 11732 },
      fields: ["md5"],
    },
  });
  expect(structuredClone(result)).toEqual(result);
});

it("reports expired publication bodies without leaking the backend response or advising retry", async () => {
  const { webMcpToolError } = await import("@/services/webmcp/tool-error");
  const result = webMcpToolError(
    {
      response: {
        status: 410,
        data: {
          message: "publication_version_expired",
          canonicalBody: "private",
          token: "secret",
        },
      },
    },
    true
  );
  expect(result).toMatchObject({
    isError: true,
    errorCode: "publication_version_expired",
    httpStatus: 410,
  });
  expect(result.nextStep).toContain("xrugc_list_scene_publications");
  expect(result.nextStep).toContain("不要重试");
  expect(JSON.stringify(result)).not.toMatch(/private|secret|canonicalBody/);
  expect(structuredClone(result)).toEqual(result);
});
