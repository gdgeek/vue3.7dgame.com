import type { AxiosResponse } from "axios";

import request from "@/utils/request";

interface HostSessionResponse {
  data?: unknown;
}

export function probeHostSession(): Promise<
  AxiosResponse<HostSessionResponse>
> {
  return request.get("/v1/user/info", {
    authScope: "host",
    skipErrorMessage: true,
  });
}
