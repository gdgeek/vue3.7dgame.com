import request from "@/utils/request";
import type {
  CyberType,
  CreateCyberRequest,
  UpdateCyberRequest,
} from "./types/cyber";

export type cybersType = CyberType;

export const putCyber = (id: number, data: UpdateCyberRequest) => {
  return request<CyberType>({
    url: `/v1/cybers/${id}`,
    method: "put",
    data: data,
  });
};

export const postCyber = (data: CreateCyberRequest) => {
  return request<CyberType>({
    url: `/v1/cybers`,
    method: "post",
    data,
  });
};
