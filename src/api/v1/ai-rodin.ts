import request from "@/utils/request";
import qs from "querystringify";

interface Job {
  status: string;
}

export const schedule = (jobs: Job[]) => {
  const length: number = jobs.length;
  const max = length * 2;
  let count = 0;
  jobs.forEach((job) => {
    switch (job.status.toLowerCase()) {
      case "generating":
        count += 1;
        break;
      case "done":
        count += 2;
        break;
      default:
        break;
    }
  });
  return count / max;
};
export const file = (id: number) => {
  const url =
    import.meta.env.VITE_APP_AI_API +
    `/file${qs.stringify({ id: id.toString() }, true)}`;

  return request({
    url,
    method: "get",
  });
};
export const rodin = (query: Record<string, string | number>) => {
  const url = `${import.meta.env.VITE_APP_AI_API}/rodin${qs.stringify(
    query,
    true
  )}`;

  return request({
    url,
    method: "get",
  });
};
export const check = (id: number) => {
  const url =
    import.meta.env.VITE_APP_AI_API +
    `/check${qs.stringify({ id: id.toString() }, true)}`;

  return request({
    url,
    method: "get",
  });
};

export const download = (id: number) => {
  const url =
    import.meta.env.VITE_APP_AI_API +
    `/download${qs.stringify({ id: id.toString() }, true)}`;

  return request({
    url,
    method: "get",
  });
};
export const get = (id: number, expand: string = "resource,step") => {
  const query: Record<string, string | number> = {
    expand,
  };
  const queryString = qs.stringify(query, true);
  return request({
    url: `/v1/ai-rodin/${id}${queryString}`,
    method: "get",
  });
};
export const del = (id: number) => {
  return request({
    url: `/v1/ai-rodin/${id}`,
    method: "delete",
  });
};
export const list = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0,
  expand: string = "resource,step"
) => {
  const query: Record<string, string | number> = {
    expand,
    sort,
  };

  if (search) {
    query["AiRodinSearch[name]"] = search;
  }
  if (page > 0) {
    query["page"] = page;
  }

  const queryString = qs.stringify(query, true);

  return request({
    url: `/v1/ai-rodin${queryString}`,
    method: "get",
  });
};
