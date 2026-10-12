import type { PublicationVersion } from "@/api/v1/publication-history";

type Verified = PublicationVersion & { readBackVerified: true };
export type PublicationChange = {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: string;
  after?: string;
};
const summary = (value: unknown): string => {
  if (Array.isArray(value)) return `[Array: ${value.length}]`;
  if (value && typeof value === "object")
    return `{Object: ${Object.keys(value).length}}`;
  const text = JSON.stringify(value) ?? "undefined";
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
};
const escapeKey = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

/** Bounded, iterative JSON-pointer comparison. No patch application or evaluation. */
export function comparePublicationBodies(left: Verified, right: Verified) {
  if (left.sceneId !== right.sceneId)
    throw new Error("publication_metadata_mismatch");
  const changes: PublicationChange[] = [];
  const stack = [
    {
      a: JSON.parse(left.canonicalBody) as unknown,
      b: JSON.parse(right.canonicalBody) as unknown,
      path: "",
      depth: 0,
    },
  ];
  let visited = 0;
  let truncated = false;
  while (stack.length) {
    if (++visited > 20000 || changes.length >= 200) {
      truncated = true;
      break;
    }
    const item = stack.pop()!;
    let { a, b } = item;
    if (Object.is(a, b)) continue;
    // Runtime scene/entity data is JSON encoded inside the canonical envelope.
    if (
      /^\/runtime\/(data|metas\/\d+\/data)$/.test(item.path) &&
      typeof a === "string" &&
      typeof b === "string"
    ) {
      try {
        const parsedA = JSON.parse(a);
        const parsedB = JSON.parse(b);
        a = parsedA;
        b = parsedB;
      } catch {
        /* Compare opaque text when not JSON. */
      }
    }
    if (item.depth >= 64 || item.path.length > 2048) {
      truncated = true;
      break;
    }
    if (object(a) && object(b) && Array.isArray(a) === Array.isArray(b)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
      if (keys.length + stack.length + visited > 20000) {
        truncated = true;
        break;
      }
      for (const key of keys.reverse()) {
        const path = `${item.path}/${escapeKey(key)}`;
        if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) {
          if (changes.length >= 200) {
            truncated = true;
            break;
          }
          changes.push({
            path,
            kind: Object.hasOwn(a, key) ? "removed" : "added",
            ...(Object.hasOwn(a, key)
              ? { before: summary(a[key]) }
              : { after: summary(b[key]) }),
          });
        } else
          stack.push({ a: a[key], b: b[key], path, depth: item.depth + 1 });
      }
      if (truncated) break;
    } else
      changes.push({
        path: item.path || "/",
        kind: "changed",
        before: summary(a),
        after: summary(b),
      });
  }
  return {
    sceneId: left.sceneId,
    from: left.publicationVersionId,
    to: right.publicationVersionId,
    fromHash: left.contentHash,
    toHash: right.contentHash,
    identicalBytes: left.canonicalBody === right.canonicalBody,
    readBackVerified: true as const,
    changes,
    truncated,
    limits: { changes: 200, nodes: 20000, depth: 64 },
    resourceBytesArchived: false as const,
    resourceVerification: "not_checked" as const,
  };
}

/** Preserve original canonical text; exporting never resolves or downloads URLs. */
export function exportPublicationArtifact(version: Verified) {
  const body = JSON.parse(version.canonicalBody);
  return {
    format: "xrugc-publication-export",
    formatVersion: 1,
    sceneId: version.sceneId,
    publicationVersionId: version.publicationVersionId,
    schemaVersion: version.schemaVersion,
    language: version.language,
    contentHash: version.contentHash,
    byteLength: version.byteLength,
    canonicalBody: version.canonicalBody,
    resourceReferences: body.runtime.resources as unknown[],
    readBackVerified: true,
    resourceBytesArchived: false,
    resourceVerification: "not_checked",
    restorableEditorProject: false,
  };
}
