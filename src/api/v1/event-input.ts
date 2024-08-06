import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const postEventInput = (data: any) => {
  const url = path.join("v1", "event-inputs");
  return request({
    url,
    method: "post",
    data,
  });
};

export const deleteEventInput = (id: number) => {
  const url = path.join("v1", "event-inputs", id.toString());
  return request({
    url,
    method: "delete",
  });
};
