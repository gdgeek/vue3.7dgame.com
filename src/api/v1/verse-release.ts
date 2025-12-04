import request from "@/utils/request";
import qs from "querystringify";

export const post = (data: any) => {
  return request({
    url: `/verse-releases`,
    data,
    method: "post",
  });
};
const remove = (id: number) => {
  return request({
    url: `/verse-releases/${id}`,
    method: "delete",
  });
};
export default { post, remove };
