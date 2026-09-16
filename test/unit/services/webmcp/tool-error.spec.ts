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
