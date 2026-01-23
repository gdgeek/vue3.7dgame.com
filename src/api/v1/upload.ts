import request from "@/utils/request";

export const uploadFile = (data: any) => {
  console.error("uploadFile");
  console.error(data);
  return request({
    url: `/v1/upload/file`,
    method: "post",
    data,
  });
};
