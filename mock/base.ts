import path from "path";
import { createDefineMock } from "vite-plugin-mock-dev-server";
import env from "@/environment";
export const defineMock = createDefineMock((mock) => {
  // 拼接url
  mock.url = path.join(env.api + "/api/v1/", mock.url);
});
