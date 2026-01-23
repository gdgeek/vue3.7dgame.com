import request from "@/utils/request";

export type cybersType = {
  id: number;
  data: string;
  script: string;
};

export const putCyber = (id: number, data: any) => {
  return request<cybersType>({
    url: `/v1/cybers/${id}`,
    method: "put",
    data: data,
  });
};

export const postCyber = (data: any) => {
  return request({
    url: `/v1/cybers`,
    method: "post",
    data,
  });
};
