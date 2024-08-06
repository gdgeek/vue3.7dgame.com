import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const postEventOutput = (data: any) => {
  const url = path.join("v1", "event-outputs");

  return request({
    url,
    method: "post",
    data,
  });
};

export const deleteEventOutput = (id: number) => {
  const url = path.join("v1", "event-outputs", id.toString());
  return request({
    url,
    method: "delete",
  });
};
