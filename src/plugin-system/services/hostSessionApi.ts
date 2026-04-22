import type { AxiosResponse } from "axios";

import request from "@/utils/request";

interface HostSessionResponse {
  data?: unknown;
}

export function verifyPluginHostSession(): Promise<
  AxiosResponse<HostSessionResponse>
> {
  return request.get("/v1/plugin/verify-token", {
    authScope: "host",
    skipErrorMessage: true,
  });
}
