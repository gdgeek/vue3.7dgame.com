import { logger } from "@/utils/logger";
import request from "@/utils/request";

export const uploadFile = (data: unknown) => {
  logger.error("uploadFile");
  logger.error(data);
  return request({
    url: `/v1/upload/file`,
    method: "post",
    data,
  });
};
