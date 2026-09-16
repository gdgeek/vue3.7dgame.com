import request from "@/utils/request";

export type TaskSnapshot = {
  taskId: string;
  name: string;
  revision: number;
  plan: unknown[];
  progress: { index: number; status: string; states: unknown[] };
  leaseUntil: number;
};
export type TaskStore = {
  create: (plan: {
    taskId: string;
    name: string;
    steps: unknown[];
  }) => Promise<TaskSnapshot>;
  get: (id: string) => Promise<TaskSnapshot>;
  list: (offset: number) => Promise<unknown>;
  claim: (
    id: string,
    revision: number,
    claimId: string
  ) => Promise<TaskSnapshot>;
  checkpoint: (
    id: string,
    revision: number,
    claimId: string,
    progress: TaskSnapshot["progress"],
    release: boolean
  ) => Promise<TaskSnapshot>;
};
const base = "/v1/authoring-tasks";
export const serverTaskStore: TaskStore = {
  create: async (data) =>
    (await request<TaskSnapshot>({ url: base, method: "post", data })).data,
  get: async (id) =>
    (
      await request<TaskSnapshot>({
        url: `${base}/${encodeURIComponent(id)}`,
        method: "get",
        skipErrorMessage: true,
      })
    ).data,
  list: async (offset) =>
    (
      await request({
        url: `${base}?offset=${offset}`,
        method: "get",
        skipErrorMessage: true,
      })
    ).data,
  claim: async (id, revision, claimId) =>
    (
      await request<TaskSnapshot>({
        url: `${base}/${encodeURIComponent(id)}/claim`,
        method: "post",
        data: { revision, claimId },
        skipErrorMessage: true,
      })
    ).data,
  checkpoint: async (id, revision, claimId, progress, release) =>
    (
      await request<TaskSnapshot>({
        url: `${base}/${encodeURIComponent(id)}/checkpoint`,
        method: "put",
        data: { revision, claimId, progress, release },
        skipErrorMessage: true,
      })
    ).data,
};
