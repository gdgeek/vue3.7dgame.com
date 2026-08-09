import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let workflow: string;

const getIndentedBlock = (
  source: string,
  name: string,
  indentation: number
) => {
  const lines = source.split(/\r?\n/);
  const header = `${" ".repeat(indentation)}${name}:`;
  const start = lines.findIndex((line) => line === header);

  if (start === -1) {
    throw new Error(`Missing ${name} block at indentation ${indentation}`);
  }

  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;

    if (line.trim() && leadingSpaces <= indentation) {
      break;
    }

    end += 1;
  }

  return lines.slice(start, end).join("\n");
};

const getJobBlocks = (source: string) => {
  const jobsBlock = getIndentedBlock(source, "jobs", 0);
  const lines = jobsBlock.split(/\r?\n/);
  const jobStarts = lines.flatMap((line, index) => {
    const match = line.match(/^ {2}([A-Za-z0-9_-]+):$/);
    return match ? [{ index, name: match[1] }] : [];
  });

  return Object.fromEntries(
    jobStarts.map(({ index, name }, position) => {
      const end = jobStarts[position + 1]?.index ?? lines.length;
      return [name, lines.slice(index, end).join("\n")];
    })
  );
};

const getInlineList = (source: string, name: string, indentation: number) => {
  const pattern = new RegExp(
    `^${" ".repeat(indentation)}${name}: \\[([^\\]]*)\\]$`,
    "m"
  );
  const match = source.match(pattern);

  if (!match) {
    throw new Error(
      `Missing inline ${name} list at indentation ${indentation}`
    );
  }

  return match[1].split(",").map((item) => item.trim());
};

beforeAll(() => {
  workflow = readFileSync(
    resolve(__dirname, "../../../.github/workflows/ci-cd.yml"),
    "utf-8"
  );
});

describe("CI/CD release workflow", () => {
  it("uses the same Node 24 baseline as local and Docker builds", () => {
    expect(workflow).toContain('NODE_VERSION: "24"');
    expect(workflow).toContain("node-version: ${{ env.NODE_VERSION }}");
  });

  it("keeps the per-ref workflow lock without cancelling an active run", () => {
    const workflowConcurrency = getIndentedBlock(workflow, "concurrency", 0);

    expect(workflowConcurrency).toContain(
      "group: ci-cd-${{ github.repository }}-${{ github.ref }}"
    );
    expect(workflowConcurrency).toContain("cancel-in-progress: false");
  });

  it("serializes every registry-writing job across all branches", () => {
    const jobs = getJobBlocks(workflow);
    const registryWriters = Object.entries(jobs).filter(([, job]) =>
      /^\s+push: true$/m.test(job)
    );

    expect(registryWriters.map(([name]) => name)).toEqual(["build"]);

    for (const [, job] of registryWriters) {
      const imagePushConcurrency = getIndentedBlock(job, "concurrency", 4);
      expect(imagePushConcurrency).toContain(
        "group: image-push-${{ github.repository }}"
      );
      expect(imagePushConcurrency).toContain("cancel-in-progress: false");
      expect(imagePushConcurrency).toContain("queue: max");
    }
  });

  it("limits registry-writing pushes to the three release branches", () => {
    const onBlock = getIndentedBlock(workflow, "on", 0);
    const pushTrigger = getIndentedBlock(onBlock, "push", 2);
    const buildJob = getJobBlocks(workflow).build;
    const buildCondition = buildJob
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith("if:"));

    expect(buildCondition).toBeDefined();
    const buildRefs = Array.from(
      buildCondition!.matchAll(/github\.ref == 'refs\/heads\/([^']+)'/g),
      (match) => match[1]
    );

    expect(getInlineList(pushTrigger, "branches", 4)).toEqual([
      "main",
      "develop",
      "publish",
    ]);
    expect(buildRefs).toEqual(["main", "develop", "publish"]);
    expect(buildJob).toContain("if: github.event_name == 'push'");
  });

  it("tests release pull requests without granting them image writes", () => {
    const onBlock = getIndentedBlock(workflow, "on", 0);
    const pullRequestTrigger = getIndentedBlock(onBlock, "pull_request", 2);
    const buildJob = getJobBlocks(workflow).build;

    expect(getInlineList(pullRequestTrigger, "branches", 4)).toEqual([
      "main",
      "master",
      "develop",
      "publish",
    ]);
    expect(buildJob).toContain("if: github.event_name == 'push'");
  });

  it("emits only a branch tag plus publish-only latest", () => {
    const buildJob = getJobBlocks(workflow).build;
    const metadataTags = buildJob
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("type="));

    expect(metadataTags).toEqual([
      "type=ref,event=branch",
      "type=raw,value=latest,enable=${{ github.ref == 'refs/heads/publish' }}",
    ]);
    expect(buildJob).toContain("digest: ${{ steps.build.outputs.digest }}");
    expect(buildJob).toContain("id: build");
  });

  it("emits latest only from the publish branch", () => {
    const buildJob = getJobBlocks(workflow).build;
    const latestRules = buildJob
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes("value=latest"));

    expect(latestRules).toEqual([
      "type=raw,value=latest,enable=${{ github.ref == 'refs/heads/publish' }}",
    ]);
  });
});
