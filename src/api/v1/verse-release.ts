import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const post = (data: any) => {
  return request({
    url: "v1/verse-releases",
    data,
    method: "post",
  });
};
const remove = (id: number) => {
  return request({
    url: path.join("v1", "verse-releases", id.toString()),
    method: "delete",
  });
}
export default { post, remove };
