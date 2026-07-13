import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const source = readFileSync(
  `${process.cwd()}/src/components/StandardPage/StandardUploadDialog.vue`,
  "utf-8"
);

describe("StandardUploadDialog failure recovery", () => {
  it("settles failed uploads and restores the file picker", () => {
    expect(source).toContain("finishUploadFile(file, -1)");
    expect(source).toContain("isDisabled.value = false");
  });

  it("does not swallow file-record failures or report negative IDs as success", () => {
    expect(source).toContain("const response = await postFile(data)");
    expect(source).toContain("if (id > 0)");
    expect(source).not.toContain("catch (err) {\n    logger.error(err);");
  });
});
