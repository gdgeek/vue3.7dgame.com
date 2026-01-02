import request from "@/utils/request";

export const uploadFile = (data: unknown) => {
  console.error("uploadFile");
  console.error(data);
  return request({
    url: `/upload/file`,
    method: "post",
    data,
  });
};
